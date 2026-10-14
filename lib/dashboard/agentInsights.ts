import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { INTERVAL_MS } from "@/lib/config";
import { accuracyHistory } from "@/lib/forecast/learned";
import { localMidnight, localTime } from "@/lib/sim/clock";
import { getBuyerDashboard } from "./buyer";
import { marketDay, marketSettings } from "./market";

const { agentDecisions, evPlans, allocations, intervalReadings } = schema;
type Site = typeof schema.sites.$inferSelect;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 3_600_000;

function monthStart(ts: number) {
  const [year, month] = localTime(ts).dateKey.split("-");
  return localMidnight(Date.parse(`${year}-${month}-01T12:00:00Z`));
}

// What the agent page shows beyond today's four cards: the day's decisions on a timeline, what the
// battery and car agents gained this month, the price forecast, why the matching agent picks its
// suppliers, and how the forecast has done over the last two weeks.
export function getAgentInsights(memberId: string, site: Site, asOf: number) {
  const dayStart = localMidnight(asOf);
  const fromMonth = monthStart(asOf);

  // 1. Timeline: today's decisions, plus the car's charging slots from its plans.
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
    .sort((a, b) => a.ts - b.ts);
  const charging: { ts: number; kwh: number }[] = [];
  for (const plan of db
    .select()
    .from(evPlans)
    .where(eq(evPlans.siteId, site.id))
    .all()) {
    for (const [ts, kwh] of Object.entries(plan.slots)) {
      const t = Number(ts);
      if (t >= dayStart && t < dayStart + DAY_MS && kwh > 0)
        charging.push({ ts: t, kwh });
    }
  }
  charging.sort((a, b) => a.ts - b.ts);

  // 2. What the battery and car agents gained this month (estimates, against doing nothing).
  const monthDecisions = db
    .select()
    .from(agentDecisions)
    .where(
      and(
        eq(agentDecisions.memberId, memberId),
        gte(agentDecisions.ts, fromMonth),
        lte(agentDecisions.ts, asOf + INTERVAL_MS),
      ),
    )
    .all();
  const evMonth = monthDecisions.filter((d) => d.kind === "ev_plan");
  const evSavedEur = evMonth.reduce(
    (s, d) =>
      s +
      Math.max(
        0,
        Number(d.params.asapCostEur) - Number(d.params.plannedCostEur),
      ),
    0,
  );
  // Battery: power this roof sold while its panels made (almost) nothing can only have come from the
  // battery; it is worth the evening price it got minus what the same kWh fetched at midday.
  let battery: {
    eveningKwh: number;
    eveningCt: number;
    middayCt: number;
    gainEur: number;
  } | null = null;
  if (site.batteryKwh > 0) {
    const genAt = new Map(
      db
        .select({
          ts: intervalReadings.ts,
          gen: intervalReadings.generationKwh,
        })
        .from(intervalReadings)
        .where(
          and(
            eq(intervalReadings.siteId, site.id),
            gte(intervalReadings.ts, fromMonth),
            lte(intervalReadings.ts, asOf),
          ),
        )
        .all()
        .map((r) => [r.ts, r.gen]),
    );
    const sales = db
      .select()
      .from(allocations)
      .where(
        and(
          eq(allocations.kind, "final"),
          eq(allocations.sellerSiteId, site.id),
          gte(allocations.ts, fromMonth),
          lte(allocations.ts, asOf),
        ),
      )
      .all();
    const evening = sales.filter((a) => (genAt.get(a.ts) ?? 0) < 0.01);
    const midday = sales.filter((a) => {
      const h = localTime(a.ts).minuteOfDay / 60;
      return h >= 11 && h < 14;
    });
    const avg = (xs: typeof sales) => {
      const kwh = xs.reduce((s, a) => s + a.kwh, 0);
      return kwh > 0 ? xs.reduce((s, a) => s + a.kwh * a.priceCt, 0) / kwh : 0;
    };
    const eveningKwh = evening.reduce((s, a) => s + a.kwh, 0);
    if (eveningKwh > 0 && midday.length > 0) {
      const eveningCt = avg(evening);
      const middayCt = avg(midday);
      battery = {
        eveningKwh,
        eveningCt,
        middayCt,
        gainEur: Math.max(0, (eveningKwh * (eveningCt - middayCt)) / 100),
      };
    }
  }

  // 3 and 4. Prices and suppliers, from the buyer view (one 24-hour plan for both).
  const buyer = getBuyerDashboard(memberId);
  const settings = marketSettings();
  const today = marketDay(dayStart, asOf);
  const prices = {
    auction: settings.priceMode === "auction",
    fixedCt: settings.communityPriceCt,
    past: today.points
      .filter((p) => p.tradedKwh > 0)
      .map((p) => ({ ts: p.ts, priceCt: p.priceCt })),
    forecast: (buyer?.priceForecast ?? []).filter((p) => p.ts > asOf),
  };
  const next =
    buyer?.schedule.find((h) => h.hourTs + HOUR_MS > asOf && h.backup) ?? null;
  const suppliers = buyer
    ? {
        pick: buyer.pick ? { name: buyer.pick.name } : null,
        ranked: buyer.potential
          .filter((p) => p.available && !p.blocked)
          .slice(0, 3)
          .map((p) => ({
            name: p.name,
            likelyKwh: p.likelyKwh,
            reliability: p.reliability,
            distanceM: p.distanceM,
            priceCt: p.priceCt,
            preferred: p.preferred,
            score: p.score,
          })),
        next: next
          ? {
              hourTs: next.hourTs,
              main: next.main ?? null,
              backup: next.backup ?? null,
              backupPct: next.backupPct ?? null,
            }
          : null,
      }
    : null;

  // 5. Forecast accuracy, day by day.
  const accuracy = accuracyHistory(site, asOf, 14);

  return {
    timeline: { decisions, charging },
    month: { evPlans: evMonth.length, evSavedEur, battery },
    prices,
    suppliers,
    accuracy,
  };
}

export type AgentInsights = ReturnType<typeof getAgentInsights>;
