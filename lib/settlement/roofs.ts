import { type Keypair, type PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { type InvestorPosition, PLATFORM_ACCOUNT, type ProjectTerms, reserveAccount, splitProjectSale } from "@/lib/ledger/ledger";
import { ensureSettlementSol, settlementKey, walletStatus } from "@/lib/solana/p2p";
import { ensureTokenAccounts, memoInstruction } from "@/lib/solana/payout";
import { initRoofInstruction, MAX_SALES_PER_PAY, payInstruction, readRoof, roofAddress, roofSplitProgramId, type RoofState } from "@/lib/solana/roofSplit";
import { type DevnetConfig, getConnection, toPublicKey } from "@/lib/solana/wallets";

// Every payment to a funded roof goes through the roof-split program: the payer's tokens go to the
// fee, reserve, investors and host by the terms stored on-chain, and nobody can pay them differently.
// Before paying, the hour's sales are split again from the roof's on-chain state, in the exact order
// they will be paid; where that differs from the ledger (only in the hour a reserve or repayment cap is
// reached) the pending ledger entries are corrected, so the ledger always matches the chain.

const { ledgerEntries, projects, investments, sites, settlementTransfers } = schema;
type Entry = typeof ledgerEntries.$inferSelect;
type Project = typeof projects.$inferSelect;
const ROOF_KINDS = new Set(["fee", "reserve", "investor", "host"]);

export const roofMarker = (projectId: string) => `roof:${projectId}`;

interface Sale {
  txnId: string;
  ts: number;
  payer: string;
  amountMicro: number;
}

const termsAt = (p: Project, repaidMicro: number, reserveMicro: number): ProjectTerms => ({ ...(p as ProjectTerms), repaidMicro, reserveMicro });
const positionsOf = (projectId: string): InvestorPosition[] => db.select().from(investments).where(eq(investments.projectId, projectId)).all();
const sameLegs = (a: { accountId: string; amountMicro: number; kind: string }[], b: typeof a) => {
  const key = (x: typeof a) => x.map((l) => `${l.kind}:${l.accountId}:${l.amountMicro}`).sort().join("|");
  return key(a) === key(b);
};

// Registers a roof on-chain the first time it is paid, with its terms and the state before any
// unsettled sales (those are paid through the program now).
async function ensureRoof(project: Project, hostMemberId: string, authority: Keypair, mint: PublicKey, walletOf: (a: string) => PublicKey): Promise<RoofState | null> {
  const programId = roofSplitProgramId()!;
  const connection = getConnection();
  const address = roofAddress(programId, authority.publicKey, project.id);
  const existing = await readRoof(connection, address);
  if (existing) return existing;

  const positions = positionsOf(project.id);
  if (positions.length === 0 || positions.length > 8) return null;
  const site = db.select().from(sites).where(eq(sites.id, project.hostSiteId)).get()!;
  const unsettled = db
    .select()
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.status, "pending"), inArray(ledgerEntries.kind, ["investor", "reserve"])))
    .all()
    .filter((e) => e.txnId.split(":")[1] === site.id);
  const pendingOf = (kind: string) => unsettled.filter((e) => e.kind === kind).reduce((s, e) => s + e.amountMicro, 0);

  const payees = {
    fee: walletOf(PLATFORM_ACCOUNT),
    reserve: walletOf(reserveAccount(project.id)),
    host: walletOf(hostMemberId),
    investors: positions.map((p) => ({ owner: walletOf(p.investorMemberId), weight: p.amountMicro })),
  };
  await ensureTokenAccounts(connection, authority, mint, [payees.fee, payees.reserve, payees.host, ...payees.investors.map((i) => i.owner)]);
  const ix = initRoofInstruction(programId, authority.publicKey, mint, project.id, {
    feeBps: project.feeBps,
    reserveBps: project.reserveBps,
    investorShareBps: project.investorShareBps,
    owedTotalMicro: project.principalMicro + Math.floor((project.principalMicro * project.returnBps) / 10_000),
    repaidMicro: project.repaidMicro - pendingOf("investor"),
    reserveMicro: project.reserveMicro - pendingOf("reserve"),
    reserveTargetMicro: project.reserveTargetMicro,
  }, payees);
  await sendAndConfirmTransaction(connection, new Transaction().add(memoInstruction(`Volty roof ${project.id} registered`), ix), [authority]);
  return readRoof(connection, address);
}

// The program pays exactly the accounts registered for the roof; a payee whose wallet changed since
// would be paid at the old account, so such a roof falls back to the direct transfers.
function payeesMatch(state: RoofState, project: Project, hostMemberId: string, mint: PublicKey, walletOf: (a: string) => PublicKey) {
  const ata = (account: string) => getAssociatedTokenAddressSync(mint, walletOf(account)).toBase58();
  const positions = positionsOf(project.id);
  return (
    state.feeAccount.toBase58() === ata(PLATFORM_ACCOUNT) &&
    state.reserveAccount.toBase58() === ata(reserveAccount(project.id)) &&
    state.hostAccount.toBase58() === ata(hostMemberId) &&
    state.investors.length === positions.length &&
    state.investors.every((i, n) => i.account.toBase58() === ata(positions[n].investorMemberId) && i.weight === positions[n].amountMicro)
  );
}

// Splits the sales again from the on-chain state, in payment order, and corrects pending ledger
// entries that differ.
function reconcile(project: Project, hostMemberId: string, state: RoofState, ordered: Sale[], legsByTxn: Map<string, Entry[]>) {
  const positions = positionsOf(project.id);
  let repaid = state.repaidMicro;
  let reserve = state.reserveMicro;
  let corrected = 0;
  db.transaction((tx) => {
    for (const sale of ordered) {
      const legs = splitProjectSale(sale.amountMicro, hostMemberId, termsAt(project, repaid, reserve), positions);
      repaid += legs.filter((l) => l.kind === "investor").reduce((s, l) => s + l.amountMicro, 0);
      reserve += legs.filter((l) => l.kind === "reserve").reduce((s, l) => s + l.amountMicro, 0);
      const posted = (legsByTxn.get(sale.txnId) ?? []).filter((l) => l.amountMicro > 0);
      if (sameLegs(posted, legs)) continue;

      corrected++;
      const first = posted[0];
      tx.delete(ledgerEntries).where(inArray(ledgerEntries.id, posted.map((l) => l.id))).run();
      tx.insert(ledgerEntries)
        .values(legs.map((l) => ({ ...l, txnId: sale.txnId, intervalTs: first?.intervalTs ?? sale.ts, status: "pending" as const, batchId: null })))
        .run();
      // Keep the project's running totals in step with the corrected entries.
      const sum = (xs: { kind: string; amountMicro: number; accountId: string }[], kind: string, account?: string) =>
        xs.filter((l) => l.kind === kind && (!account || l.accountId === account)).reduce((s, l) => s + l.amountMicro, 0);
      const current = tx.select().from(projects).where(eq(projects.id, project.id)).get()!;
      tx.update(projects)
        .set({
          repaidMicro: current.repaidMicro + sum(legs, "investor") - sum(posted, "investor"),
          reserveMicro: current.reserveMicro + sum(legs, "reserve") - sum(posted, "reserve"),
        })
        .where(eq(projects.id, project.id))
        .run();
      for (const p of positions) {
        const delta = sum(legs, "investor", p.investorMemberId) - sum(posted, "investor", p.investorMemberId);
        if (delta === 0) continue;
        const row = tx.select().from(investments).where(and(eq(investments.projectId, project.id), eq(investments.investorMemberId, p.investorMemberId))).get()!;
        tx.update(investments).set({ repaidMicro: row.repaidMicro + delta }).where(eq(investments.id, row.id)).run();
      }
    }
  });
  if (corrected > 0) console.log(`roof ${project.id}: ${corrected} pending sales re-split to match the on-chain state`);
}

export interface RoofSettlement {
  signatures: string[];
  handled: Set<string>; // txn ids paid through the program
}

export async function settleRoofPayments(args: {
  batchId: string;
  pending: Entry[];
  mode: "supplier" | "p2p";
  memo: string;
  treasury: Keypair;
  config: DevnetConfig;
  walletOf: (accountId: string) => PublicKey;
  supplierId: string;
}): Promise<RoofSettlement> {
  const { batchId, pending, mode, memo, treasury, config, walletOf, supplierId } = args;
  const out: RoofSettlement = { signatures: [], handled: new Set() };
  const programId = roofSplitProgramId();
  if (!programId) return out;

  const byTxn = new Map<string, Entry[]>();
  for (const e of pending) byTxn.set(e.txnId, [...(byTxn.get(e.txnId) ?? []), e]);
  const roofSales = new Map<string, Sale[]>(); // host site -> sales
  for (const [txnId, legs] of byTxn) {
    const debit = legs.find((l) => l.amountMicro < 0);
    if (!debit || !legs.some((l) => ROOF_KINDS.has(l.kind))) continue;
    const [ts, sellerSiteId] = txnId.split(":");
    roofSales.set(sellerSiteId, [...(roofSales.get(sellerSiteId) ?? []), { txnId, ts: Number(ts), payer: debit.accountId, amountMicro: -debit.amountMicro }]);
  }
  if (roofSales.size === 0) return out;

  const connection = getConnection();
  const mint = toPublicKey(config.mint);
  const sent = db.select().from(settlementTransfers).where(eq(settlementTransfers.batchId, batchId)).all();
  const record = (fromAccount: string, toAccount: string, amountMicro: number, direct: boolean, signature: string) =>
    db.insert(settlementTransfers).values({ batchId, fromAccount, toAccount, amountMicro, direct, signature }).run();
  let settlementSolReady = false;

  for (const [siteId, sales] of roofSales) {
    const project = db.select().from(projects).where(eq(projects.hostSiteId, siteId)).get();
    const hostMemberId = db.select().from(sites).where(eq(sites.id, siteId)).get()?.memberId;
    if (!project || !hostMemberId) continue;
    const state = await ensureRoof(project, hostMemberId, treasury, mint, walletOf);
    if (!state || !payeesMatch(state, project, hostMemberId, mint, walletOf)) continue;

    // Payment order: payers by their first sale, each payer's sales by time.
    const ordered = [...sales].sort((a, b) => a.ts - b.ts || a.txnId.localeCompare(b.txnId));
    const payers = [...new Set(ordered.map((s) => s.payer))];
    const groups = payers.map((payer) => ordered.filter((s) => s.payer === payer));
    // A retried hour already paid some groups through the program; its on-chain state includes them.
    if (!sent.some((t) => t.toAccount === roofMarker(project.id))) reconcile(project, hostMemberId, state, groups.flat(), byTxn);
    const legsAfter = (txnId: string) =>
      db.select().from(ledgerEntries).where(and(eq(ledgerEntries.txnId, txnId), eq(ledgerEntries.status, "pending"))).all().filter((l) => l.amountMicro > 0);

    const roof = roofAddress(programId, treasury.publicKey, project.id);
    for (const group of groups) {
      const payer = group[0].payer;
      if (sent.some((t) => t.fromAccount === payer && t.toAccount === roofMarker(project.id) && t.signature)) {
        for (const s of group) out.handled.add(s.txnId);
        continue;
      }
      const due = group.reduce((s, x) => s + x.amountMicro, 0);
      // Peer-to-peer: the buyer's wallet pays through the program when its approved limit covers it.
      let direct = false;
      if (mode === "p2p" && payer !== supplierId) {
        const wallet = await walletStatus(connection, mint, walletOf(payer));
        direct = wallet.approvedMicro >= due && wallet.balanceMicro >= due;
      }
      const signer = direct ? settlementKey() : treasury;
      if (direct && !settlementSolReady) {
        await ensureSettlementSol(connection, treasury);
        settlementSolReady = true;
      }
      const source = getAssociatedTokenAddressSync(mint, direct ? walletOf(payer) : treasury.publicKey);

      let signature = "";
      for (let i = 0; i < group.length; i += MAX_SALES_PER_PAY) {
        const chunk = group.slice(i, i + MAX_SALES_PER_PAY);
        const tx = new Transaction().add(
          memoInstruction(`${memo} roof ${project.id}${direct ? "" : " covered by Stadtwerk"}`),
          payInstruction(programId, roof, state, signer.publicKey, source, chunk.map((s) => s.amountMicro)),
        );
        tx.feePayer = signer.publicKey;
        signature = await sendAndConfirmTransaction(connection, tx, [signer]);
        out.signatures.push(signature);
      }
      // Who received what, as in the direct transfers, so statements show these payments too.
      const toPayee = new Map<string, number>();
      for (const s of group) for (const l of legsAfter(s.txnId)) toPayee.set(l.accountId, (toPayee.get(l.accountId) ?? 0) + l.amountMicro);
      for (const [payee, amount] of toPayee) record(direct ? payer : supplierId, payee, amount, direct, signature);
      record(payer, roofMarker(project.id), due, direct, signature);
      for (const s of group) out.handled.add(s.txnId);
    }
  }
  return out;
}
