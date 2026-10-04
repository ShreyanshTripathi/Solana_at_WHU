import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { grossPayments, netByAccount } from "@/lib/ledger/ledger";
import { type DirectTransfer, sendDirectTransfers, walletStatus } from "@/lib/solana/p2p";
import { sendPayouts, type Payout } from "@/lib/solana/payout";
import { type DevnetConfig, getConnection, loadKeypair, readDevnetConfig, toPublicKey } from "@/lib/solana/wallets";
import { hourRecord } from "./publish";
import { settleRoofPayments } from "./roofs";
import { settleFederation, unsettledFlows } from "@/lib/federation/run";
import { memoFor, recordHash } from "./record";

const { ledgerEntries, allocations, settlementBatches, communities, members, settlementTransfers } = schema;
type Keypair = NonNullable<ReturnType<typeof loadKeypair>>;
type Entry = typeof ledgerEntries.$inferSelect;

export interface SettlementResult {
  batchId: string;
  status: "confirmed" | "simulated" | "failed";
  payouts: { accountId: string; amountMicro: number }[];
  signatures: string[];
  allocationHash: string;
  error?: string;
}

// Ledger account -> devnet wallet name. Reserve accounts are "reserve:<projectId>".
const walletNameFor = (accountId: string) =>
  accountId.startsWith("reserve:") ? `reserve-${accountId.slice("reserve:".length)}` : accountId;

// Settle all pending entries in [periodStart, periodEnd).
// Supplier mode (Germany): the supplier is the counterparty. It pays everyone with a positive net
// position from its treasury on Solana and bills buyers' negative positions on its monthly statement.
// Peer-to-peer mode (Austria, 1a): buyers pay sellers directly from their wallets (see settleP2p).
export async function settlePeriod(periodStart: number, periodEnd: number, onChain: boolean): Promise<SettlementResult | null> {
  const community = db.select().from(communities).get();
  if (!community) throw new Error("No community found. Run `npm run seed` first.");

  let pending = db
    .select()
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.status, "pending"), gte(ledgerEntries.intervalTs, periodStart), lt(ledgerEntries.intervalTs, periodEnd)))
    .all();
  if (pending.length === 0 && unsettledFlows(periodStart, periodEnd).length === 0) return null;

  // The hour's public record; its hash goes on-chain with the payments.
  const allocationHash = recordHash(hourRecord(periodStart, periodEnd));

  const batchId = `b-${community.id}-${periodStart}`;
  const payouts = [...netByAccount(pending)]
    .filter(([, amount]) => amount > 0)
    .map(([accountId, amountMicro]) => ({ accountId, amountMicro }));

  let status: SettlementResult["status"] = "simulated";
  let signatures: string[] = [];
  let error: string | undefined;

  const config = readDevnetConfig();
  const treasury = loadKeypair("stadtwerk");
  const mode = community.settlementMode;
  if (onChain && config && treasury) {
    try {
      // Members are paid at the wallet on their account (their embedded wallet once they log in);
      // reserve wallets and members without one fall back to the demo wallets from setup.
      const memberWallets = new Map(db.select().from(members).all().map((m) => [m.id, m.walletPubkey]));
      const walletOf = (accountId: string) => {
        const wallet = memberWallets.get(accountId) ?? config.wallets[walletNameFor(accountId)];
        if (!wallet) throw new Error(`No devnet wallet for account ${accountId}`);
        return toPublicKey(wallet);
      };
      const memo = memoFor(batchId, allocationHash);
      // Sales by funded roofs are paid through the roof-split program; everything else as before.
      const roofs = await settleRoofPayments({ batchId, pending, mode, memo, treasury, config, walletOf, supplierId: community.supplierMemberId });
      // The program may have re-split some pending entries: read the hour's entries again.
      const current = db
        .select()
        .from(ledgerEntries)
        .where(and(eq(ledgerEntries.status, "pending"), gte(ledgerEntries.intervalTs, periodStart), lt(ledgerEntries.intervalTs, periodEnd)))
        .all();
      pending = current;
      const rest = current.filter((e) => !roofs.handled.has(e.txnId));
      if (mode === "p2p") {
        signatures = await settleP2p({ batchId, pending: rest, memo, treasury, config, walletOf, supplierId: community.supplierMemberId });
      } else {
        const restPayouts = [...netByAccount(rest)].filter(([, amount]) => amount > 0).map(([accountId, amountMicro]) => ({ accountId, amountMicro }));
        const onChainPayouts: Payout[] = restPayouts.map((p) => ({ owner: walletOf(p.accountId), amountMicro: p.amountMicro }));
        signatures = await sendPayouts(getConnection(), treasury, toPublicKey(config.mint), onChainPayouts, memo);
      }
      // The hour's exchanges with neighbouring communities, between the communities' treasuries.
      const federation = await settleFederation({ batchId, periodStart, periodEnd, memo, treasury, config, onChain: true });
      signatures = [...roofs.signatures, ...signatures, ...federation];
      status = "confirmed";
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
    }
  }

  // Without devnet the hour's federation exchanges are recorded as settled too (simulated).
  if (status === "simulated") await settleFederation({ batchId, periodStart, periodEnd, memo: "", treasury: treasury!, config: config!, onChain: false });

  db.transaction((tx) => {
    tx.insert(settlementBatches)
      .values({
        id: batchId,
        communityId: community.id,
        periodStart,
        periodEnd,
        allocationHash,
        txSignatures: signatures,
        status,
        mode,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({ target: settlementBatches.id, set: { txSignatures: signatures, status, allocationHash, mode } })
      .run();
    if (status !== "failed") {
      tx.update(ledgerEntries)
        .set({ status: "settled", batchId })
        .where(inArray(ledgerEntries.id, pending.map((e) => e.id)))
        .run();
      tx.update(allocations)
        .set({ batchId })
        .where(and(eq(allocations.kind, "final"), gte(allocations.ts, periodStart), lt(allocations.ts, periodEnd)))
        .run();
    }
  });

  return { batchId, status, payouts, signatures, allocationHash, error };
}

// Peer-to-peer settlement for one hour. Each buyer pays every party of their purchases directly, as
// long as they approved enough for Volty's settlement key and hold enough tEURC. A buyer who
// hasn't is covered by the Stadtwerk (which pays those parties and bills the buyer as usual), so sellers
// are always paid. Every transfer is recorded as soon as it's confirmed, so a retried hour never pays twice.
async function settleP2p(args: {
  batchId: string;
  pending: Entry[];
  memo: string;
  treasury: Keypair;
  config: DevnetConfig;
  walletOf: (accountId: string) => ReturnType<typeof toPublicKey>;
  supplierId: string;
}): Promise<string[]> {
  const { batchId, pending, memo, treasury, config, walletOf, supplierId } = args;
  const connection = getConnection();
  const mint = toPublicKey(config.mint);
  const plan = grossPayments(pending);

  const sent = db.select().from(settlementTransfers).where(eq(settlementTransfers.batchId, batchId)).all();
  const alreadySent = (from: string, to: string) => sent.some((t) => t.fromAccount === from && t.toAccount === to && t.signature);
  const record = (fromAccount: string, toAccount: string, amountMicro: number, direct: boolean, signature: string) =>
    db.insert(settlementTransfers).values({ batchId, fromAccount, toAccount, amountMicro, direct, signature }).run();

  const direct: (DirectTransfer & { fromAccount: string; toAccount: string })[] = [];
  const covered = new Map<string, number>(); // payee -> what the Stadtwerk pays for buyers who can't
  for (const [payer, payees] of plan) {
    const due = [...payees.values()].reduce((s, x) => s + x, 0);
    const wallet = await walletStatus(connection, mint, walletOf(payer));
    const canPay = wallet.approvedMicro >= due && wallet.balanceMicro >= due;
    for (const [payee, amountMicro] of payees) {
      if (canPay) {
        if (!alreadySent(payer, payee)) direct.push({ from: walletOf(payer), to: walletOf(payee), amountMicro, fromAccount: payer, toAccount: payee });
      } else {
        covered.set(payee, (covered.get(payee) ?? 0) + amountMicro);
      }
    }
  }

  const signatures = await sendDirectTransfers(connection, treasury, mint, direct, memo, (chunk, signature) => {
    for (const t of chunk as typeof direct) record(t.fromAccount, t.toAccount, t.amountMicro, true, signature);
  });

  const fallback = [...covered]
    .filter(([payee]) => !alreadySent(supplierId, payee))
    .map(([payee, amountMicro]) => ({ owner: walletOf(payee), amountMicro, payee }));
  if (fallback.length > 0) {
    const covering = await sendPayouts(connection, treasury, mint, fallback, `${memo} covered by Stadtwerk`, (chunk, signature) => {
      for (const p of chunk as typeof fallback) record(supplierId, p.payee, p.amountMicro, false, signature);
    });
    signatures.push(...covering);
  }
  return signatures;
}
