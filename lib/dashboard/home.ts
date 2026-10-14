import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { localMidnight, localTime } from "@/lib/sim/clock";
import { hourRecord } from "@/lib/settlement/publish";
import { recordHash } from "@/lib/settlement/record";
import { getAdminOverview } from "./admin";

const { intervalReadings, allocations, sites, members } = schema;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const GRID_CO2_KG_PER_KWH = 0.36; // approximate German grid average

export function getHome() {
  const admin = getAdminOverview();
  const lastTs =
    db
      .select({ ts: sql<number | null>`max(${intervalReadings.ts})` })
      .from(intervalReadings)
      .get()?.ts ?? null;
  const simulatedDays = new Set(
    db
      .selectDistinct({ ts: intervalReadings.ts })
      .from(intervalReadings)
      .all()
      .map((r) => localTime(r.ts).dateKey),
  ).size;

  const counts = {
    households: admin.members.filter((m) => m.kind === "household").length,
    businesses: admin.members.filter((m) => m.kind === "sme").length,
    investors: admin.members.filter((m) => m.kind === "investor").length,
    sellers: admin.members.filter((m) => (m.site?.pvKwp ?? 0) > 0).length,
  };

  // The latest simulated day, hour by hour: all solar generated, and how much of it neighbours used.
  let day = null;
  if (lastTs !== null) {
    const dayStart = localMidnight(lastTs);
    const readings = db
      .select({
        ts: intervalReadings.ts,
        generation: intervalReadings.generationKwh,
      })
      .from(intervalReadings)
      .where(
        and(
          gte(intervalReadings.ts, dayStart),
          lt(intervalReadings.ts, dayStart + DAY_MS),
        ),
      )
      .all();
    const shared = db
      .select({ ts: allocations.ts, kwh: allocations.kwh })
      .from(allocations)
      .where(
        and(
          eq(allocations.kind, "final"),
          gte(allocations.ts, dayStart),
          lt(allocations.ts, dayStart + DAY_MS),
        ),
      )
      .all();
    const hours = Array.from({ length: 24 }, (_, h) => {
      const from = dayStart + h * HOUR_MS;
      const inHour = (ts: number) => ts >= from && ts < from + HOUR_MS;
      const measured = readings.some((r) => inHour(r.ts));
      return {
        hourTs: from,
        generated: measured
          ? readings
              .filter((r) => inHour(r.ts))
              .reduce((sum, r) => sum + r.generation, 0)
          : null,
        shared: measured
          ? shared
              .filter((a) => inHour(a.ts))
              .reduce((sum, a) => sum + a.kwh, 0)
          : null,
      };
    });
    const generatedKwh = hours.reduce((sum, h) => sum + (h.generated ?? 0), 0);
    const sharedKwh = hours.reduce((sum, h) => sum + (h.shared ?? 0), 0);
    day = {
      dayStart,
      hours,
      generatedKwh,
      sharedKwh,
      sharedShare: generatedKwh > 0 ? sharedKwh / generatedKwh : 0,
    };
  }

  return {
    community: admin.community,
    lastTs,
    simulatedDays,
    counts,
    totals: {
      ...admin.totals,
      co2Kg: admin.totals.sharedKwh * GRID_CO2_KG_PER_KWH,
    },
    day,
    payouts: admin.batches.filter((b) => b.status === "confirmed").slice(0, 6),
  };
}

// A recent quarter-hour with real trading: who sent power to whom, largest first (for the live map's
// list on the home page). The latest one with at least half the day's busiest volume, so an evening
// with a few watt-hours doesn't stand for the street.
export function latestFlows(limit = 6) {
  const newest = db
    .select({ ts: sql<number | null>`max(${allocations.ts})` })
    .from(allocations)
    .where(eq(allocations.kind, "final"))
    .get()?.ts;
  if (newest == null) return null;
  const perTs = db
    .select({ ts: allocations.ts, kwh: sql<number>`sum(${allocations.kwh})` })
    .from(allocations)
    .where(
      and(eq(allocations.kind, "final"), gte(allocations.ts, newest - DAY_MS)),
    )
    .groupBy(allocations.ts)
    .all();
  const busiest = Math.max(...perTs.map((r) => r.kwh), 0);
  const last =
    perTs
      .filter((r) => r.kwh >= busiest / 2)
      .reduce((a, r) => Math.max(a, r.ts), 0) || newest;
  const nameOfSite = new Map(
    db
      .select({ id: sites.id, name: members.name })
      .from(sites)
      .innerJoin(members, eq(members.id, sites.memberId))
      .all()
      .map((r) => [r.id, r.name]),
  );
  const pairs = new Map<string, { from: string; to: string; kwh: number }>();
  for (const a of db
    .select()
    .from(allocations)
    .where(and(eq(allocations.kind, "final"), eq(allocations.ts, last)))
    .all()) {
    const from = nameOfSite.get(a.sellerSiteId) ?? a.sellerSiteId;
    const to = nameOfSite.get(a.buyerSiteId) ?? a.buyerSiteId;
    const key = `${from}→${to}`;
    const p = pairs.get(key) ?? { from, to, kwh: 0 };
    p.kwh += a.kwh;
    pairs.set(key, p);
  }
  const flows = [...pairs.values()]
    .filter((p) => p.kwh > 0.0005)
    .sort((a, b) => b.kwh - a.kwh);
  return { ts: last, total: flows.length, flows: flows.slice(0, limit) };
}

// The latest confirmed hour as a "receipt": what was paid, and the fingerprint written to Solana.
export function latestReceipt() {
  const b = getAdminOverview().batches.find((x) => x.status === "confirmed");
  return b ? receiptFor(b) : null;
}

// The settled hour that paid out most in the 24 hours up to the latest one: a sunny hour, so the
// landing page shows what a roof really earns rather than an evening hour with almost nothing.
export function busiestRecentReceipt() {
  const confirmed = getAdminOverview().batches.filter(
    (x) => x.status === "confirmed",
  );
  if (confirmed.length === 0) return null;
  const newest = Math.max(...confirmed.map((x) => x.periodStart));
  const recent = confirmed.filter((x) => x.periodStart > newest - DAY_MS);
  return receiptFor(
    recent.reduce((best, x) => (x.paidEur > best.paidEur ? x : best)),
  );
}

function receiptFor(b: ReturnType<typeof getAdminOverview>["batches"][number]) {
  const record = hourRecord(b.periodStart, b.periodEnd);
  // Who earned what in that hour: each roof's sales at the matched price (before fees), top four.
  const nameOfSite = new Map(
    db
      .select({ id: sites.id, name: members.name })
      .from(sites)
      .innerJoin(members, eq(members.id, sites.memberId))
      .all()
      .map((r) => [r.id, r.name]),
  );
  const earned = new Map<string, { kwh: number; eur: number }>();
  for (const a of db
    .select()
    .from(allocations)
    .where(
      and(
        eq(allocations.kind, "final"),
        gte(allocations.ts, b.periodStart),
        lt(allocations.ts, b.periodEnd),
      ),
    )
    .all()) {
    const e = earned.get(a.sellerSiteId) ?? { kwh: 0, eur: 0 };
    e.kwh += a.kwh;
    e.eur += (a.kwh * a.priceCt) / 100;
    earned.set(a.sellerSiteId, e);
  }
  const earners = [...earned.entries()]
    .map(([siteId, e]) => ({ name: nameOfSite.get(siteId) ?? siteId, ...e }))
    .sort((x, y) => y.eur - x.eur)
    .slice(0, 4);
  return {
    batchId: b.id,
    periodStart: b.periodStart,
    periodEnd: b.periodEnd,
    trades: record.trades.length,
    paidEur: b.paidEur,
    hash: recordHash(record),
    earners,
  };
}
