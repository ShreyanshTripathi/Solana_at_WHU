import { and, eq, gte, lt } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { localMidnight, localTime } from "@/lib/sim/clock";
import { clearSkyKwhPerKwp, expectedSiteLoadKwh, type LoadSite } from "@/lib/sim/profiles";
import { SCENARIOS } from "./battery";

// A forecast that learns from each home's own meter data (the last 14 days), instead of the fixed
// solar model. Two small statistical models, refitted on every request:
//  - solar: for each hour of the day, the share of the clear-sky maximum this roof actually got
//    (it learns local clouds, shade and the panels' real output); P10/P90 from how much days varied;
//  - use: the average use for each quarter-hour, separately for weekdays and weekends (EV included),
//    blended with the standard profile and trusted more as history grows (days / (days + 7)).
// It also checks itself: trained on the days before yesterday, how far off was it yesterday,
// compared with the fixed model? That number is shown on the seller page.

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 14;
const MIN_DAYS = 3;

export interface ForecastSite extends LoadSite {
  pvKwp: number;
  lat: number;
  lon: number;
}

export type Scenario = "p10" | "p50" | "p90";

export interface SiteModel {
  learned: boolean; // false: not enough history yet, so this is the fixed model
  daysUsed: number;
  generation: (ts: number, scenario: Scenario) => number;
  load: (ts: number) => number;
  // Error as a share of what actually happened (solar + use), yesterday: learned vs fixed model.
  accuracy: { learnedPct: number; baselinePct: number } | null;
}

interface Reading {
  ts: number;
  generationKwh: number;
  loadKwh: number;
}

const slotOf = (ts: number) => {
  const { minuteOfDay, weekday } = localTime(ts);
  return { hour: Math.floor(minuteOfDay / 60), quarter: Math.floor(minuteOfDay / 15), weekend: weekday === 0 || weekday === 6 };
};
const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
};

const baselineGeneration = (site: ForecastSite, ts: number, scenario: Scenario) => site.pvKwp * clearSkyKwhPerKwp(ts, site.lat, site.lon) * SCENARIOS[scenario];

const dayCount = (rs: Reading[]) => new Set(rs.map((r) => localTime(r.ts).dateKey)).size;
const PRIOR_DAYS = 7; // how many days of history count as much as the standard load profile

function fit(site: ForecastSite, readings: Reading[]) {
  const weight = dayCount(readings) / (dayCount(readings) + PRIOR_DAYS);
  // Solar: share of clear sky per hour, falling back to the whole-day share where an hour has little light.
  const num = new Array(24).fill(0);
  const den = new Array(24).fill(0);
  const dayRatio = new Map<string, { gen: number; sky: number }>();
  for (const r of readings) {
    const sky = site.pvKwp * clearSkyKwhPerKwp(r.ts, site.lat, site.lon);
    if (sky <= 0) continue;
    const { hour } = slotOf(r.ts);
    num[hour] += r.generationKwh;
    den[hour] += sky;
    const day = localTime(r.ts).dateKey;
    const d = dayRatio.get(day) ?? { gen: 0, sky: 0 };
    d.gen += r.generationKwh;
    d.sky += sky;
    dayRatio.set(day, d);
  }
  const overall = den.reduce((a, b) => a + b, 0) > 0 ? num.reduce((a, b) => a + b, 0) / den.reduce((a, b) => a + b, 0) : SCENARIOS.p50;
  const shareByHour = num.map((n, h) => (den[h] > site.pvKwp * 0.05 ? n / den[h] : overall));
  const ratios = [...dayRatio.values()].filter((d) => d.sky > 0.5).map((d) => d.gen / d.sky);
  const mean = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
  const spread =
    ratios.length >= MIN_DAYS && mean > 0
      ? { p10: Math.max(0.2, quantile(ratios, 0.1) / mean), p50: 1, p90: Math.min(1.6, quantile(ratios, 0.9) / mean) }
      : { p10: SCENARIOS.p10 / SCENARIOS.p50, p50: 1, p90: SCENARIOS.p90 / SCENARIOS.p50 };

  // Use: mean per quarter-hour, weekdays and weekends apart; the quarter-hour across all days as a fallback.
  const sums = new Map<string, { total: number; n: number }>();
  const add = (key: string, x: number) => {
    const s = sums.get(key) ?? { total: 0, n: 0 };
    s.total += x;
    s.n += 1;
    sums.set(key, s);
  };
  for (const r of readings) {
    const { quarter, weekend } = slotOf(r.ts);
    add(`${weekend}:${quarter}`, r.loadKwh);
    add(`all:${quarter}`, r.loadKwh);
  }
  const mean2 = (key: string) => {
    const s = sums.get(key);
    return s && s.n > 0 ? s.total / s.n : undefined;
  };

  return {
    generation: (ts: number, scenario: Scenario) =>
      site.pvKwp * clearSkyKwhPerKwp(ts, site.lat, site.lon) * shareByHour[slotOf(ts).hour] * spread[scenario],
    load: (ts: number) => {
      const { quarter, weekend } = slotOf(ts);
      const prior = expectedSiteLoadKwh(site, ts);
      const learned = mean2(`${weekend}:${quarter}`) ?? mean2(`all:${quarter}`);
      return learned === undefined ? prior : weight * learned + (1 - weight) * prior;
    },
  };
}

const readingsFor = (siteId: string, from: number, to: number): Reading[] =>
  db
    .select({ ts: schema.intervalReadings.ts, generationKwh: schema.intervalReadings.generationKwh, loadKwh: schema.intervalReadings.loadKwh })
    .from(schema.intervalReadings)
    .where(and(eq(schema.intervalReadings.siteId, siteId), gte(schema.intervalReadings.ts, from), lt(schema.intervalReadings.ts, to)))
    .all();


export function learnSiteModel(site: ForecastSite & { id: string }, asOf: number): SiteModel {
  const today = localMidnight(asOf);
  const history = readingsFor(site.id, today - HISTORY_DAYS * DAY_MS, asOf);
  const days = dayCount(history);
  if (days < MIN_DAYS) {
    return {
      learned: false,
      daysUsed: days,
      generation: (ts, scenario) => baselineGeneration(site, ts, scenario),
      load: (ts) => expectedSiteLoadKwh(site, ts),
      accuracy: null,
    };
  }

  // Self-check: train on the days before yesterday, score both models on yesterday.
  const yesterday = today - DAY_MS;
  const train = history.filter((r) => r.ts < yesterday);
  const test = history.filter((r) => r.ts >= yesterday && r.ts < today);
  let accuracy: SiteModel["accuracy"] = null;
  if (dayCount(train) >= MIN_DAYS - 1 && test.length >= 80) {
    const past = fit(site, train);
    let learnedErr = 0;
    let baseErr = 0;
    let actual = 0;
    for (const r of test) {
      learnedErr += Math.abs(past.generation(r.ts, "p50") - r.generationKwh) + Math.abs(past.load(r.ts) - r.loadKwh);
      baseErr += Math.abs(baselineGeneration(site, r.ts, "p50") - r.generationKwh) + Math.abs(expectedSiteLoadKwh(site, r.ts) - r.loadKwh);
      actual += r.generationKwh + r.loadKwh;
    }
    if (actual > 0) accuracy = { learnedPct: learnedErr / actual, baselinePct: baseErr / actual };
  }

  const model = fit(site, history);
  return { learned: true, daysUsed: days, ...model, accuracy };
}
