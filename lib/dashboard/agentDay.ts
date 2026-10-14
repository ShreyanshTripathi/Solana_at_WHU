import "server-only";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { suggestSpendingLimit } from "@/lib/agents/spending";
import { INTERVAL_MS } from "@/lib/config";
import { learnSiteModel } from "@/lib/forecast/learned";
import { localMidnight } from "@/lib/sim/clock";
import { clearSkyKwhPerKwp } from "@/lib/sim/profiles";
import { resolveAsOf } from "./time";

const {
  sites,
  members,
  allocations,
  intervalReadings,
  agentDecisions,
  ledgerEntries,
} = schema;
type Site = typeof sites.$inferSelect;

const DAY_MS = 24 * 60 * 60 * 1000;
const PER_HOUR = 3_600_000 / INTERVAL_MS; // kWh per quarter-hour × 4 = average kW
const MAX_FORECAST_SITES = 60; // the street view sums at most this many roofs

// One quarter-hour of the solar predictor, in average kW.
export interface SunPoint {
  ts: number;
  clearSky: number; // what the roofs would make under a clear sky
  p10: number;
  p50: number;
  p90: number;
  actual: number | null; // measured, up to now
}

export interface SunDay {
  points: SunPoint[];
  sunrise: number | null;
  sunset: number | null;
  peakTs: number | null;
  kwh: { p10: number; p50: number; p90: number; clearSky: number };
  actualKwh: number | null; // measured so far today
  expectedSoFarKwh: number | null; // what the forecast expected by now
}

function sunDay(
  models: { site: Site; model: ReturnType<typeof learnSiteModel> }[],
  dayStart: number,
  asOf: number,
  actualByTs: Map<number, number> | null,
): SunDay {
  const points: SunPoint[] = [];
  for (let ts = dayStart; ts < dayStart + DAY_MS; ts += INTERVAL_MS) {
    let clearSky = 0;
    let p10 = 0;
    let p50 = 0;
    let p90 = 0;
    for (const { site, model } of models) {
      clearSky += site.pvKwp * clearSkyKwhPerKwp(ts, site.lat, site.lon);
      p10 += model.generation(ts, "p10");
      p50 += model.generation(ts, "p50");
      p90 += model.generation(ts, "p90");
    }
    const actual = actualByTs && ts <= asOf ? (actualByTs.get(ts) ?? 0) : null;
    points.push({
      ts,
      clearSky: clearSky * PER_HOUR,
      p10: p10 * PER_HOUR,
      p50: p50 * PER_HOUR,
      p90: p90 * PER_HOUR,
      actual: actual === null ? null : actual * PER_HOUR,
    });
  }
  const lit = points.filter((p) => p.clearSky > 0.001);
  const peak = points.reduce<SunPoint | null>(
    (best, p) => (p.p50 > (best?.p50 ?? 0) ? p : best),
    null,
  );
  const kwh = (key: "p10" | "p50" | "p90" | "clearSky") =>
    points.reduce((s, p) => s + p[key], 0) / PER_HOUR;
  const past = points.filter((p) => p.actual !== null);
  return {
    points,
    sunrise: lit[0]?.ts ?? null,
    sunset: lit.length ? lit[lit.length - 1].ts + INTERVAL_MS : null,
    peakTs: peak?.ts ?? null,
    kwh: {
      p10: kwh("p10"),
      p50: kwh("p50"),
      p90: kwh("p90"),
      clearSky: kwh("clearSky"),
    },
    actualKwh: actualByTs
      ? past.reduce((s, p) => s + (p.actual ?? 0), 0) / PER_HOUR
      : null,
    expectedSoFarKwh: actualByTs
      ? past.reduce((s, p) => s + p.p50, 0) / PER_HOUR
      : null,
  };
}

// Everything the agent page shows about today: what each agent saw, decided and achieved, and the
// solar predictor (this roof, or the street's roofs for a home without solar).
export function getAgentDay(memberId: string, site: Site) {
  const asOf = resolveAsOf(site.id);
  if (asOf == null) return null;
  const dayStart = localMidnight(asOf);
  const hasSolar = site.pvKwp > 0;

  // Forecast agent: this home's own learned model, plus every roof's for the street view.
  const own = learnSiteModel(site, asOf);
  const roofs = hasSolar
    ? [{ site, model: own }]
    : db
        .select()
        .from(sites)
        .where(isNull(sites.closedAt))
        .all()
        .filter((s) => s.pvKwp > 0)
        .slice(0, MAX_FORECAST_SITES)
        .map((s) => ({ site: s, model: learnSiteModel(s, asOf) }));
  const roofIds = new Set(roofs.map((r) => r.site.id));
  const actualByTs = new Map<number, number>();
  for (const r of db
    .select({
      siteId: intervalReadings.siteId,
      ts: intervalReadings.ts,
      kwh: intervalReadings.generationKwh,
    })
    .from(intervalReadings)
    .where(
      and(gte(intervalReadings.ts, dayStart), lte(intervalReadings.ts, asOf)),
    )
    .all()) {
    if (roofIds.has(r.siteId))
      actualByTs.set(r.ts, (actualByTs.get(r.ts) ?? 0) + r.kwh);
  }
  const today = sunDay(roofs, dayStart, asOf, actualByTs);
  const tomorrow = sunDay(roofs, dayStart + DAY_MS, asOf, null);
  let expectedUseKwh = 0;
  for (let ts = dayStart; ts < dayStart + DAY_MS; ts += INTERVAL_MS)
    expectedUseKwh += own.load(ts);

  // Matching agent: what was matched for this home today.
  const nameOfSite = new Map(
    db
      .select({ id: sites.id, name: members.name })
      .from(sites)
      .innerJoin(members, eq(members.id, sites.memberId))
      .all()
      .map((r) => [r.id, r.name]),
  );
  const todays = db
    .select()
    .from(allocations)
    .where(
      and(
        eq(allocations.kind, "final"),
        gte(allocations.ts, dayStart),
        lte(allocations.ts, asOf),
      ),
    )
    .all();
  const bought = todays.filter((a) => a.buyerSiteId === site.id);
  const sold = todays.filter((a) => a.sellerSiteId === site.id);
  const bySeller = new Map<string, number>();
  for (const a of bought)
    bySeller.set(a.sellerSiteId, (bySeller.get(a.sellerSiteId) ?? 0) + a.kwh);
  const topSeller = [...bySeller.entries()].sort((a, b) => b[1] - a[1])[0];
  const importKwh = db
    .select({ kwh: intervalReadings.importKwh })
    .from(intervalReadings)
    .where(
      and(
        eq(intervalReadings.siteId, site.id),
        gte(intervalReadings.ts, dayStart),
        lte(intervalReadings.ts, asOf),
      ),
    )
    .all()
    .reduce((s, r) => s + r.kwh, 0);
  const boughtKwh = bought.reduce((s, a) => s + a.kwh, 0);

  // Sun agent: today's battery and car decisions.
  const decisions = db
    .select()
    .from(agentDecisions)
    .where(
      and(
        eq(agentDecisions.memberId, memberId),
        gte(agentDecisions.ts, dayStart),
        lte(agentDecisions.ts, asOf + INTERVAL_MS),
      ),
    )
    .all()
    .sort((a, b) => b.ts - a.ts);
  const battery = decisions.filter((d) => d.kind.startsWith("battery_"));
  const ev = decisions.find((d) => d.kind === "ev_plan") ?? null;

  // Payment agent: today's energy payments in and out of this workspace's wallet.
  const legs = db
    .select()
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.accountId, memberId),
        eq(ledgerEntries.kind, "energy"),
        gte(ledgerEntries.intervalTs, dayStart),
        lte(ledgerEntries.intervalTs, asOf),
      ),
    )
    .all();
  const hourOf = (ts: number) => Math.floor(ts / 3_600_000);
  const sum = (xs: typeof legs) =>
    xs.reduce((s, l) => s + l.amountMicro, 0) / 1_000_000;
  const paid = legs.filter((l) => l.amountMicro < 0);
  const earned = legs.filter((l) => l.amountMicro > 0);

  return {
    asOf,
    hasSolar,
    forecast: {
      learned: own.learned,
      daysUsed: own.daysUsed,
      accuracy: own.accuracy,
      roofCount: roofs.length,
      expectedUseKwh,
      today,
      tomorrow,
    },
    matching: {
      intervals: new Set([...bought, ...sold].map((a) => a.ts)).size,
      boughtKwh,
      sellers: bySeller.size,
      topSeller: topSeller
        ? (nameOfSite.get(topSeller[0]) ?? topSeller[0])
        : null,
      soldKwh: sold.reduce((s, a) => s + a.kwh, 0),
      buyers: new Set(sold.map((a) => a.buyerSiteId)).size,
      localShare: importKwh > 0 ? boughtKwh / importKwh : 0,
    },
    sun: {
      hasBattery: site.batteryKwh > 0,
      hasEv: site.evChargerKw > 0,
      decisions: battery.length,
      kept: battery.filter(
        (d) => d.kind === "battery_keep" || d.kind === "battery_hold",
      ).length,
      sold: battery.filter(
        (d) => d.kind === "battery_sell_now" || d.kind === "battery_discharge",
      ).length,
      latestBattery: battery[0] ?? null,
      ev,
    },
    payments: {
      paidEur: -sum(paid),
      paidHours: new Set(
        paid
          .filter((l) => l.status === "settled")
          .map((l) => hourOf(l.intervalTs)),
      ).size,
      earnedEur: sum(earned),
      earnedHours: new Set(
        earned
          .filter((l) => l.status === "settled")
          .map((l) => hourOf(l.intervalTs)),
      ).size,
      pendingEur: Math.abs(sum(legs.filter((l) => l.status === "pending"))),
      suggestion:
        boughtKwh > 0 || paid.length > 0
          ? suggestSpendingLimit(memberId, asOf)
          : null,
    },
  };
}

export type AgentDay = NonNullable<ReturnType<typeof getAgentDay>>;
