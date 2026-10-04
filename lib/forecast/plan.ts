import { INTERVAL_MS } from "@/lib/config";
import { anchorUsageFromDb, buildMarket, clearMarket, type AnchorUsage, type MarketContext, type MeterRow } from "@/lib/market";
import type { Allocation } from "@/lib/match/engine";
import { type BatteryDecision, decideBattery, type EnergyPoint, type PricePoint } from "@/lib/agents/trading";
import { PRICES } from "@/lib/config";
import { chargeLimitFor, stepBattery } from "@/lib/sim/battery";
import { localMidnight } from "@/lib/sim/clock";
import { learnSiteModel } from "./learned";

export interface PlannedInterval {
  ts: number;
  allocations: Allocation[]; // matched on the expected (P50) meter values
  rows: MeterRow[]; // expected (P50) export and import per site
  p10ExportBySite: Map<string, number>; // a cloudy-case export per seller, for switching
  priceCt: number; // the expected clearing price (auction) or the community price
  marginal?: { sellCt: number; buyCt: number }; // with opts.marginal: the trading agents' price forecast
  batteryDecisions?: Map<string, BatteryDecision>; // with opts.batteryAgents
}

export interface PlanOptions {
  marginal?: boolean;
  // Sites whose battery is run by a trading agent, with the prices that agent expects.
  batteryAgents?: Map<string, { minReserveKwh: number; prices: PricePoint[] }>;
}

// Plan the next hours the way the matching engine will run them, using the clear-sky PV model
// and usual load (design doc, section 12). This is the "scheduled supply" members see.
export function planAhead(ctx: MarketContext, fromTs: number, socNow: Map<string, number>, hours = 24, opts: PlanOptions = {}): PlannedInterval[] {
  const soc50 = new Map(socNow);
  const soc10 = new Map(socNow);
  const anchorUsed = new Map<string, number>();
  // Each home's learned forecast (its own last 14 days), or the fixed model while history is short.
  const models = new Map([...ctx.siteById.values()].map((s) => [s.id, learnSiteModel(s, fromTs)]));
  const usage: AnchorUsage = (siteId, priceCt, dayStart) => {
    const key = `${siteId}:${dayStart}`;
    if (!anchorUsed.has(key)) anchorUsed.set(key, anchorUsageFromDb(siteId, priceCt, dayStart, fromTs + INTERVAL_MS));
    return anchorUsed.get(key)!;
  };

  // An agent-run battery looks a day ahead from every interval of the plan.
  const energyAhead = new Map<string, EnergyPoint[]>();
  for (const siteId of opts.batteryAgents?.keys() ?? []) {
    const model = models.get(siteId);
    if (!model) continue;
    const points: EnergyPoint[] = [];
    for (let ts = fromTs + INTERVAL_MS; ts <= fromTs + (hours + 24) * 3_600_000; ts += INTERVAL_MS) {
      points.push({ ts, generationKwh: model.generation(ts, "p50"), loadKwh: model.load(ts) });
    }
    energyAhead.set(siteId, points);
  }

  const plan: PlannedInterval[] = [];
  for (let ts = fromTs + INTERVAL_MS, i = 0; ts <= fromTs + hours * 3_600_000; ts += INTERVAL_MS, i++) {
    const rows: MeterRow[] = [];
    const p10ExportBySite = new Map<string, number>();
    const batteryDecisions = new Map<string, BatteryDecision>();
    for (const site of ctx.siteById.values()) {
      if (site.closedAt) continue; // closed workspaces no longer trade
      const model = models.get(site.id)!;
      const load = model.load(ts);
      let limit = chargeLimitFor(site.batteryKwh, ctx.sellerRuleByMember.get(site.memberId)?.batteryReserveKwh);
      let sell = 0;
      const agent = opts.batteryAgents?.get(site.id);
      if (agent && site.batteryKwh > 0) {
        const decision = decideBattery({
          socKwh: soc50.get(site.id) ?? 0,
          capacityKwh: site.batteryKwh,
          minReserveKwh: agent.minReserveKwh,
          forecast: energyAhead.get(site.id)!.slice(i, i + 96),
          prices: agent.prices,
          feedInCt: PRICES.feedInCt,
        });
        batteryDecisions.set(site.id, decision);
        limit = decision.chargeLimitKwh;
        sell = decision.sellFromBatteryKwh;
      }
      const mid = stepBattery(soc50.get(site.id) ?? 0, site.batteryKwh, model.generation(ts, "p50") - load, undefined, limit, sell);
      const low = stepBattery(soc10.get(site.id) ?? 0, site.batteryKwh, model.generation(ts, "p10") - load, undefined, limit);
      soc50.set(site.id, mid.socKwh);
      soc10.set(site.id, low.socKwh);
      rows.push({ siteId: site.id, exportKwh: mid.exportKwh, importKwh: mid.importKwh });
      p10ExportBySite.set(site.id, low.exportKwh);
    }

    const market = buildMarket(ctx, ts, rows, usage);
    const { allocations, clearing, marginal } = clearMarket(ctx, market, { marginal: opts.marginal });

    // Count planned anchor purchases against the day's cap, so later intervals see less room.
    const dayStart = localMidnight(ts);
    for (const d of market.demands) {
      if (!d.anchor) continue;
      const taken = allocations
        .filter((a) => a.buyerSiteId === d.siteId && a.priceCt === d.anchor!.priceCt)
        .reduce((sum, a) => sum + a.kwh, 0);
      const key = `${d.siteId}:${dayStart}`;
      anchorUsed.set(key, (anchorUsed.get(key) ?? 0) + taken);
    }

    plan.push({ ts, allocations, rows, p10ExportBySite, priceCt: clearing?.priceCt ?? market.priceCt, marginal, batteryDecisions });
  }
  return plan;
}
