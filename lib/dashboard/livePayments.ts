import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { MICRO_PER_EUR } from "@/lib/config";
import { GRID } from "@/lib/ledger/ledger";

// The latest payments a member made or received, one line per settled hour (with everyone paid or
// paying in that hour), so a whole day fits in the list. For
// the live panels on the seller and receiver pages. Works in both payment modes: amounts come from
// the ledger; the Solana transaction is the direct transfer (peer-to-peer) or the hour's payout.

const {
  ledgerEntries,
  settlementBatches,
  settlementTransfers,
  sites,
  members,
} = schema;

export interface LivePayment {
  key: string;
  batchId: string;
  periodStart: number;
  counterparties: string[]; // names, largest amount first
  eur: number;
  status: string; // confirmed, simulated, failed…
  signature: string | null;
}

export function livePayments(
  memberId: string,
  direction: "received" | "paid",
  limit = 12,
): LivePayment[] {
  // The member's settled legs in the latest hours.
  const batches = db
    .select()
    .from(settlementBatches)
    .orderBy(desc(settlementBatches.periodStart))
    .limit(48)
    .all();
  if (batches.length === 0) return [];
  const batchById = new Map(batches.map((b) => [b.id, b]));
  const mine = db
    .select()
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.accountId, memberId),
        isNotNull(ledgerEntries.batchId),
        inArray(ledgerEntries.batchId, [...batchById.keys()]),
      ),
    )
    .all()
    .filter((e) =>
      direction === "received" ? e.amountMicro > 0 : e.amountMicro < 0,
    );
  if (mine.length === 0) return [];

  const names = new Map(
    db
      .select({ id: members.id, name: members.name })
      .from(members)
      .all()
      .map((m) => [m.id, m.name]),
  );
  const ownerOfSite = new Map(
    db
      .select({ id: sites.id, memberId: sites.memberId })
      .from(sites)
      .all()
      .map((s) => [s.id, s.memberId]),
  );
  // The other side of each transaction: who paid (the debit leg) or whose roof sold (the seller site).
  const legs = db
    .select()
    .from(ledgerEntries)
    .where(inArray(ledgerEntries.txnId, [...new Set(mine.map((e) => e.txnId))]))
    .all();
  const payerOf = new Map(
    legs.filter((l) => l.amountMicro < 0).map((l) => [l.txnId, l.accountId]),
  );

  const grouped = new Map<
    string,
    { batchId: string; other: string; micro: number }
  >();
  for (const e of mine) {
    const [, sellerSiteId, buyerSiteId] = e.txnId.split(":");
    const other =
      direction === "received"
        ? (payerOf.get(e.txnId) ?? "")
        : buyerSiteId === GRID
          ? ""
          : (ownerOfSite.get(sellerSiteId) ?? sellerSiteId);
    if (!other || other === memberId) continue;
    const key = `${e.batchId}|${other}`;
    const g = grouped.get(key) ?? { batchId: e.batchId!, other, micro: 0 };
    g.micro += Math.abs(e.amountMicro);
    grouped.set(key, g);
  }

  const transfers = db
    .select()
    .from(settlementTransfers)
    .where(
      inArray(settlementTransfers.batchId, [
        ...new Set([...grouped.values()].map((g) => g.batchId)),
      ]),
    )
    .all();
  const name = (id: string) => names.get(id) ?? id;
  // One line per hour: the counterparties' amounts summed (tiny ones too: a household may get only a few Wh).
  const hours = new Map<
    string,
    { batchId: string; parts: { other: string; micro: number }[] }
  >();
  for (const g of grouped.values()) {
    if (g.micro <= 0) continue;
    const h = hours.get(g.batchId) ?? { batchId: g.batchId, parts: [] };
    h.parts.push({ other: g.other, micro: g.micro });
    hours.set(g.batchId, h);
  }
  return [...hours.values()]
    .map((h) => {
      const batch = batchById.get(h.batchId)!;
      const parts = h.parts.sort((a, b) => b.micro - a.micro);
      // The hour's transaction: a direct transfer between this member and the largest counterparty, else the payout.
      const [from, to] =
        direction === "received"
          ? [parts[0].other, memberId]
          : [memberId, parts[0].other];
      const direct = transfers.find(
        (t) =>
          t.batchId === h.batchId &&
          t.signature &&
          t.toAccount === to &&
          (t.fromAccount === from || !t.direct),
      );
      return {
        key: h.batchId,
        batchId: h.batchId,
        periodStart: batch.periodStart,
        counterparties: parts.map((p) => name(p.other)),
        eur: parts.reduce((sum, p) => sum + p.micro, 0) / MICRO_PER_EUR,
        status: batch.status,
        signature: direct?.signature ?? batch.txSignatures[0] ?? null,
      };
    })
    .sort((a, b) => b.periodStart - a.periodStart)
    .slice(0, limit);
}
