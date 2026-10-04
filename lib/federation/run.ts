import { type Keypair, type PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { createTransferCheckedInstruction, getAssociatedTokenAddressSync, transferChecked } from "@solana/spl-token";
import { and, asc, eq, gt, gte, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { MICRO_PER_EUR, TOKEN } from "@/lib/config";
import { ensureTokenAccounts, memoInstruction } from "@/lib/solana/payout";
import { type DevnetConfig, getConnection, loadOrCreateKeypair, toPublicKey } from "@/lib/solana/wallets";
import { CREDIT_DAYS, FEDERATION_PRICE_CT, matchFederation, netMoneyByPeer, repayLots } from "./match";
import { FEDERATION_PEERS, peerDistanceKm, peerNetKwh, peerProfile } from "./peers";

// The federation inside the 15-minute pipeline and the hourly settlement: what the community has
// left after its members shared is matched with neighbouring communities, credits are repaid or
// aged, and every hour the money part settles on Solana between the communities' treasuries.

const { federationPeers, federationFlows, communities } = schema;
const DAY_MS = 24 * 60 * 60 * 1000;

// Adds the demo's neighbouring communities (keeps the Stadtwerk's mode and on/off per community).
export function ensurePeers() {
  for (const p of FEDERATION_PEERS) {
    const facts = { name: p.name, operator: p.operator, relation: p.relation, distanceKm: Math.round(peerDistanceKm(p) * 10) / 10 };
    db.insert(federationPeers)
      .values({ id: p.id, ...facts, mode: p.mode, active: true })
      .onConflictDoUpdate({ target: federationPeers.id, set: facts })
      .run();
  }
}

// Energy still owed between us and each community (credit lots not yet repaid).
export function creditBalances(): Map<string, { weOweKwh: number; theyOweKwh: number }> {
  const out = new Map<string, { weOweKwh: number; theyOweKwh: number }>();
  for (const r of db
    .select({ peerId: federationFlows.peerId, direction: federationFlows.direction, kwh: sql<number>`sum(${federationFlows.remainingKwh})` })
    .from(federationFlows)
    .where(and(eq(federationFlows.kind, "credit"), gt(federationFlows.remainingKwh, 0)))
    .groupBy(federationFlows.peerId, federationFlows.direction)
    .all()) {
    const b = out.get(r.peerId) ?? { weOweKwh: 0, theyOweKwh: 0 };
    if (r.direction === "import") b.weOweKwh += r.kwh;
    else b.theyOweKwh += r.kwh;
    out.set(r.peerId, b);
  }
  return out;
}

// Repaying in kind closes the oldest open credit lots first.
function closeLots(peerId: string, lotDirection: "import" | "export", kwh: number) {
  const lots = db
    .select({ id: federationFlows.id, remainingKwh: federationFlows.remainingKwh })
    .from(federationFlows)
    .where(and(eq(federationFlows.peerId, peerId), eq(federationFlows.kind, "credit"), eq(federationFlows.direction, lotDirection), gt(federationFlows.remainingKwh, 0)))
    .orderBy(asc(federationFlows.ts), asc(federationFlows.id))
    .all();
  for (const lot of repayLots(lots, kwh)) {
    db.update(federationFlows).set({ remainingKwh: lot.remainingKwh }).where(eq(federationFlows.id, lot.id)).run();
  }
}

// Credits not repaid in kind within 30 days are paid in money at the federation price.
function ageCredits(ts: number) {
  const old = db
    .select()
    .from(federationFlows)
    .where(and(eq(federationFlows.kind, "credit"), gt(federationFlows.remainingKwh, 0), lt(federationFlows.ts, ts - CREDIT_DAYS * DAY_MS)))
    .all();
  for (const lot of old) {
    db.insert(federationFlows)
      .values({ ts, peerId: lot.peerId, direction: lot.direction, kind: "credit_settled", kwh: lot.remainingKwh, priceCt: FEDERATION_PRICE_CT })
      .run();
    db.update(federationFlows).set({ remainingKwh: 0 }).where(eq(federationFlows.id, lot.id)).run();
  }
}

// One interval: match what the community has left with its neighbours. Re-running an interval is a no-op.
export function runFederationInterval(ts: number, ours: { surplusKwh: number; deficitKwh: number }) {
  const community = db.select().from(communities).get();
  if (!community?.federationEnabled) return;
  if (db.select({ id: federationFlows.id }).from(federationFlows).where(eq(federationFlows.ts, ts)).get()) return;
  ageCredits(ts);

  const balances = creditBalances();
  const peers = db
    .select()
    .from(federationPeers)
    .where(eq(federationPeers.active, true))
    .all()
    .flatMap((p) => {
      const profile = peerProfile(p.id);
      if (!profile) return [];
      const b = balances.get(p.id) ?? { weOweKwh: 0, theyOweKwh: 0 };
      return [{ id: p.id, relation: p.relation, mode: p.mode, netKwh: peerNetKwh(profile, ts), ...b }];
    });
  const { flows } = matchFederation(ours, peers, ts);
  for (const f of flows) {
    db.insert(federationFlows)
      .values({ ts, ...f, remainingKwh: f.kind === "credit" ? f.kwh : 0 })
      .run();
    if (f.kind === "repay") closeLots(f.peerId, f.direction === "export" ? "import" : "export", f.kwh);
  }
}

export const unsettledFlows = (periodStart: number, periodEnd: number) =>
  db
    .select()
    .from(federationFlows)
    .where(and(isNull(federationFlows.batchId), gte(federationFlows.ts, periodStart), lt(federationFlows.ts, periodEnd)))
    .all();

export const flowsIn = (periodStart: number, periodEnd: number) =>
  db
    .select()
    .from(federationFlows)
    .where(and(gte(federationFlows.ts, periodStart), lt(federationFlows.ts, periodEnd)))
    .orderBy(asc(federationFlows.ts), asc(federationFlows.id))
    .all();

// The neighbouring communities are simulated, so the demo holds their treasury keys; each starts
// with test euros so it can pay for what it buys.
const PEER_FLOAT_EUR = 2_000;
export const peerWallet = (peerId: string) => loadOrCreateKeypair(`peer-${peerId}`);

async function ensurePeerWallets(peerIds: string[], treasury: Keypair, mint: PublicKey) {
  const connection = getConnection();
  const keys = peerIds.map(peerWallet);
  await ensureTokenAccounts(connection, treasury, mint, keys.map((k) => k.publicKey));
  for (const key of keys) {
    const ata = getAssociatedTokenAddressSync(mint, key.publicKey);
    const balance = Number((await connection.getTokenAccountBalance(ata)).value.amount);
    if (balance < (PEER_FLOAT_EUR / 4) * MICRO_PER_EUR) {
      await transferChecked(connection, treasury, getAssociatedTokenAddressSync(mint, treasury.publicKey), mint, ata, treasury, BigInt(PEER_FLOAT_EUR * MICRO_PER_EUR), TOKEN.decimals);
    }
  }
  return keys;
}

// The hour's money between communities, on Solana: we pay a community for what we bought from it,
// it pays us for what it bought, netted per community. Credits move no money until they age out.
export async function settleFederation(args: { batchId: string; periodStart: number; periodEnd: number; memo: string; treasury: Keypair; config: DevnetConfig; onChain: boolean }) {
  const { batchId, periodStart, periodEnd, memo, treasury, config, onChain } = args;
  const flows = unsettledFlows(periodStart, periodEnd);
  if (flows.length === 0) return [];
  const net = [...netMoneyByPeer(flows)].filter(([, micro]) => micro !== 0);
  const signatures: string[] = [];

  if (onChain && net.length > 0) {
    const connection = getConnection();
    const mint = toPublicKey(config.mint);
    const keys = await ensurePeerWallets(net.map(([id]) => id), treasury, mint);
    const tx = new Transaction().add(memoInstruction(`${memo} federation`));
    for (const [i, [, micro]] of net.entries()) {
      const peer = keys[i].publicKey;
      const [from, to, owner] = micro > 0 ? [treasury.publicKey, peer, treasury.publicKey] : [peer, treasury.publicKey, peer];
      tx.add(
        createTransferCheckedInstruction(getAssociatedTokenAddressSync(mint, from), mint, getAssociatedTokenAddressSync(mint, to), owner, BigInt(Math.abs(micro)), TOKEN.decimals),
      );
    }
    tx.feePayer = treasury.publicKey;
    const signers = [treasury, ...keys.filter((_, i) => net[i][1] < 0)];
    const signature = await sendAndConfirmTransaction(connection, tx, signers);
    signatures.push(signature);
    for (const [peerId, micro] of net) {
      db.insert(schema.settlementTransfers)
        .values({
          batchId,
          fromAccount: micro > 0 ? "federation:us" : `federation:${peerId}`,
          toAccount: micro > 0 ? `federation:${peerId}` : "federation:us",
          amountMicro: Math.abs(micro),
          direct: true,
          signature,
        })
        .run();
    }
  }
  for (const f of flows) db.update(federationFlows).set({ batchId }).where(eq(federationFlows.id, f.id)).run();
  return signatures;
}

