import "server-only";
import { and, desc, eq, gte, inArray, like, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { localMidnight, localTime } from "@/lib/sim/clock";
import { MICRO_PER_CT } from "@/lib/config";
import { GRID } from "@/lib/ledger/ledger";
import { type BatchRow, computeStatement, type LedgerRow, parseTxn, type StatementData } from "./compute";

const { ledgerEntries, allocations, settlementBatches, intervalReadings, sites, members, projects } = schema;

export const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

// A local calendar month in the community's time zone, as [start, end) timestamps.
export function monthBounds(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { start: localMidnight(Date.parse(`${monthKey}-01T12:00:00Z`)), end: localMidnight(Date.parse(`${next}-01T12:00:00Z`)) };
}

const siteOf = (memberId: string) => db.select().from(sites).where(eq(sites.memberId, memberId)).orderBy(desc(sites.closedAt)).get() ?? null;
const sellsFrom = (siteId: string) => like(ledgerEntries.txnId, `%:${siteId}:%`);

// Months with anything to show, newest first.
export function statementMonths(memberId: string): string[] {
  const site = siteOf(memberId);
  const rows = db
    .selectDistinct({ ts: ledgerEntries.intervalTs })
    .from(ledgerEntries)
    .where(site ? or(eq(ledgerEntries.accountId, memberId), sellsFrom(site.id)) : eq(ledgerEntries.accountId, memberId))
    .all();
  const months = new Set(rows.map((r) => localTime(r.ts).dateKey.slice(0, 7)));
  return [...months].sort().reverse();
}

export interface Statement extends StatementData {
  number: string;
  monthKey: string;
  periodStart: number;
  periodEnd: number;
  member: { id: string; name: string; kind: string };
  site: { address: string | null; meterId: string | null } | null;
  roofNames: Record<string, string>; // seller site -> project name, for repayment lines
}

export function loadStatement(memberId: string, monthKey: string): Statement | null {
  const member = db.select().from(members).where(eq(members.id, memberId)).get();
  if (!member || !MONTH_KEY.test(monthKey)) return null;
  const site = siteOf(memberId);
  const { start, end } = monthBounds(monthKey);
  const inMonth = and(gte(ledgerEntries.intervalTs, start), lt(ledgerEntries.intervalTs, end));

  // Every leg of every transaction the member (or their roof) took part in this month.
  const txns = db
    .selectDistinct({ txnId: ledgerEntries.txnId })
    .from(ledgerEntries)
    .where(and(inMonth, site ? or(eq(ledgerEntries.accountId, memberId), sellsFrom(site.id)) : eq(ledgerEntries.accountId, memberId)));
  const rows = db.select().from(ledgerEntries).where(inArray(ledgerEntries.txnId, txns)).all() as LedgerRow[];

  const kwhByTxn = new Map<string, number>();
  if (site) {
    for (const a of db
      .select()
      .from(allocations)
      .where(
        and(
          eq(allocations.kind, "final"),
          gte(allocations.ts, start),
          lt(allocations.ts, end),
          or(eq(allocations.buyerSiteId, site.id), eq(allocations.sellerSiteId, site.id)),
        ),
      )
      .all()) {
      kwhByTxn.set(`${a.ts}:${a.sellerSiteId}:${a.buyerSiteId}:${a.priceCt}`, a.kwh);
    }
  }

  // Power a funded roof fed into the grid has no allocation; its kWh follow from the feed-in payment.
  for (const r of rows) {
    const t = parseTxn(r.txnId);
    if (t.buyerSiteId === GRID && r.kind === "energy" && r.amountMicro < 0) kwhByTxn.set(r.txnId, -r.amountMicro / (t.priceCt * MICRO_PER_CT));
  }

  const batchIds = [...new Set(rows.map((r) => r.batchId).filter((b): b is string => b !== null))];
  // Peer-to-peer batches: who paid from their own wallet, and the transactions this member took part in.
  const transfers = batchIds.length ? db.select().from(schema.settlementTransfers).where(inArray(schema.settlementTransfers.batchId, batchIds)).all() : [];
  const batches = new Map<string, BatchRow>(
    (batchIds.length ? db.select().from(settlementBatches).where(inArray(settlementBatches.id, batchIds)).all() : []).map((b) => {
      const mine = transfers.filter((t) => t.batchId === b.id && (t.fromAccount === memberId || t.toAccount === memberId) && t.signature);
      return [
        b.id,
        {
          id: b.id,
          periodStart: b.periodStart,
          status: b.status,
          mode: b.mode,
          txSignatures: b.mode === "p2p" ? [...new Set(mine.map((t) => t.signature!))] : b.txSignatures,
          directPayers: [...new Set(transfers.filter((t) => t.batchId === b.id && t.direct).map((t) => t.fromAccount))],
        },
      ];
    }),
  );

  const meter = site
    ? db
        .select({
          loadKwh: sql<number>`coalesce(sum(${intervalReadings.loadKwh}), 0)`,
          importKwh: sql<number>`coalesce(sum(${intervalReadings.importKwh}), 0)`,
          exportKwh: sql<number>`coalesce(sum(${intervalReadings.exportKwh}), 0)`,
          generationKwh: sql<number>`coalesce(sum(${intervalReadings.generationKwh}), 0)`,
        })
        .from(intervalReadings)
        .where(and(eq(intervalReadings.siteId, site.id), gte(intervalReadings.ts, start), lt(intervalReadings.ts, end)))
        .get()!
    : null;

  const data = computeStatement({ memberId, isBusiness: member.kind === "sme", siteId: site?.id ?? null, rows, kwhByTxn, batches, meter });
  const roofNames = Object.fromEntries(db.select().from(projects).all().map((p) => [p.hostSiteId, p.name]));

  return {
    ...data,
    number: `KW-${monthKey.replace("-", "")}-${member.id}`,
    monthKey,
    periodStart: start,
    periodEnd: end,
    member: { id: member.id, name: member.name, kind: member.kind },
    site: site ? { address: site.address, meterId: site.meterId } : null,
    roofNames,
  };
}
