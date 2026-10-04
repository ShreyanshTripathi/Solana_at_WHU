import { INTERVAL_MS } from "@/lib/config";

// The AI trading agents (pure, so every rule has a test). They act on forecasts, not on rules of thumb:
//  - the price forecast is the market itself, run ahead on every home's learned forecast (planAhead):
//    sellCt is what one more kWh would sell for in that quarter-hour, buyCt what one more would cost;
//  - each home's own solar and use come from its learned model.
//
// Battery agent (sellers with a battery): sell the surplus now, or store it and sell in the evening?
//   1. Keep what the home itself will need until the sun is back: that saves the grid price, which
//      always beats selling.
//   2. With surplus now: store the rest too if the best evening price, after ~10% battery losses,
//      beats today's price by more than a cent. Otherwise sell it now.
//   3. Without surplus: sell from the battery only what is above the home's own need, and only when
//      now is (about) the best price left this evening.
// EV agent (buyers with a charger): charge the car's need in the cheapest quarter-hours before it leaves.

export interface PricePoint {
  ts: number;
  sellCt: number;
  buyCt: number;
}

export interface EnergyPoint {
  ts: number;
  generationKwh: number;
  loadKwh: number;
}

export interface BatteryInput {
  socKwh: number;
  capacityKwh: number;
  minReserveKwh: number; // the member's own evening reserve, which the agent never goes below
  forecast: EnergyPoint[]; // from this interval on (P50)
  prices: PricePoint[]; // aligned with the forecast where available
  feedInCt: number;
}

export type BatteryDecisionKind = "battery_hold" | "battery_sell_now" | "battery_keep" | "battery_discharge";

export interface BatteryDecision {
  kind: BatteryDecisionKind;
  chargeLimitKwh: number;
  sellFromBatteryKwh: number;
  params: { priceNowCt: number; bestLaterCt: number; ownNeedKwh: number; socKwh: number; sellKwh: number };
}

export const ROUND_TRIP = 0.9; // charging and discharging losses
const MARGIN_CT = 1;
const MAX_C_RATE = 0.5; // the battery delivers at most half its capacity per hour

// kWh the home will draw from the battery until its solar covers it again (next morning).
export function ownNeedKwh(forecast: EnergyPoint[]): { needKwh: number; deficitTs: number[] } {
  let needKwh = 0;
  const deficitTs: number[] = [];
  let seenDeficit = false;
  for (const f of forecast) {
    const net = f.generationKwh - f.loadKwh;
    if (net > 0 && seenDeficit) break; // the sun is back
    if (net <= 0) {
      seenDeficit = true;
      needKwh -= net;
      deficitTs.push(f.ts);
    }
  }
  return { needKwh: needKwh / 0.95, deficitTs };
}

export function decideBattery(input: BatteryInput): BatteryDecision {
  const { socKwh, capacityKwh, minReserveKwh, forecast, prices } = input;
  const now = forecast[0];
  const priceAt = new Map(prices.map((p) => [p.ts, p]));
  const priceNowCt = priceAt.get(now.ts)?.sellCt ?? input.feedInCt;
  const { needKwh, deficitTs } = ownNeedKwh(forecast);
  const keep = Math.min(capacityKwh, Math.max(minReserveKwh, needKwh));
  const later = deficitTs.map((ts) => priceAt.get(ts)?.sellCt).filter((p): p is number => p !== undefined);
  const bestLaterCt = later.length > 0 ? Math.max(...later) : input.feedInCt;
  const base = { priceNowCt, bestLaterCt, ownNeedKwh: needKwh, socKwh };

  if (now.generationKwh - now.loadKwh > 0) {
    const hold = bestLaterCt * ROUND_TRIP > priceNowCt + MARGIN_CT;
    return hold
      ? { kind: "battery_hold", chargeLimitKwh: capacityKwh, sellFromBatteryKwh: 0, params: { ...base, sellKwh: 0 } }
      : { kind: "battery_sell_now", chargeLimitKwh: keep, sellFromBatteryKwh: 0, params: { ...base, sellKwh: 0 } };
  }

  const spare = socKwh - keep;
  const nowIsBest = priceNowCt >= bestLaterCt - MARGIN_CT && priceNowCt > input.feedInCt + MARGIN_CT;
  if (spare > 0.05 && nowIsBest) {
    const sellKwh = Math.min(spare, capacityKwh * MAX_C_RATE * (INTERVAL_MS / 3_600_000));
    return { kind: "battery_discharge", chargeLimitKwh: capacityKwh, sellFromBatteryKwh: sellKwh, params: { ...base, sellKwh } };
  }
  return { kind: "battery_keep", chargeLimitKwh: capacityKwh, sellFromBatteryKwh: 0, params: { ...base, sellKwh: 0 } };
}

export interface ChargePlan {
  slots: Map<number, number>; // ts -> kWh
  plannedCostCt: number;
  asapCostCt: number; // plugging in and charging at full power straight away
}

// Spread the car's need over the cheapest quarter-hours of its window (earliest first on ties).
export function planCharging(needKwh: number, chargerKw: number, window: PricePoint[]): ChargePlan {
  const perSlot = chargerKw * (INTERVAL_MS / 3_600_000);
  const fill = (order: PricePoint[]) => {
    const slots = new Map<number, number>();
    let left = needKwh;
    let cost = 0;
    for (const p of order) {
      if (left <= 1e-6) break;
      const kwh = Math.min(left, perSlot);
      slots.set(p.ts, kwh);
      cost += kwh * p.buyCt;
      left -= kwh;
    }
    return { slots, cost };
  };
  const byTime = [...window].sort((a, b) => a.ts - b.ts);
  const cheapest = [...byTime].sort((a, b) => a.buyCt - b.buyCt || a.ts - b.ts);
  const planned = fill(cheapest);
  return { slots: planned.slots, plannedCostCt: planned.cost, asapCostCt: fill(byTime).cost };
}
