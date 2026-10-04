import { describe, expect, it } from "vitest";
import { decideBattery, type EnergyPoint, ownNeedKwh, planCharging, type PricePoint } from "@/lib/agents/trading";
import { stepBattery } from "@/lib/sim/battery";

const Q = 15 * 60_000;
// A day from noon: 6 quarter-hours of surplus, then 12 of evening use, then morning sun again.
const day = (surplusKwh = 0.5, useKwh = 0.3): EnergyPoint[] => [
  ...Array.from({ length: 6 }, (_, i) => ({ ts: i * Q, generationKwh: surplusKwh + 0.2, loadKwh: 0.2 })),
  ...Array.from({ length: 12 }, (_, i) => ({ ts: (6 + i) * Q, generationKwh: 0, loadKwh: useKwh })),
  ...Array.from({ length: 4 }, (_, i) => ({ ts: (18 + i) * Q, generationKwh: 1, loadKwh: 0.2 })),
];
const prices = (points: EnergyPoint[], sell: (i: number) => number): PricePoint[] => points.map((p, i) => ({ ts: p.ts, sellCt: sell(i), buyCt: 38 }));
const input = (over: Partial<Parameters<typeof decideBattery>[0]> = {}) => {
  const forecast = over.forecast ?? day();
  return { socKwh: 2, capacityKwh: 10, minReserveKwh: 0, forecast, prices: prices(forecast, (i) => (i < 6 ? 9 : 25)), feedInCt: 8, ...over };
};

describe("battery agent", () => {
  it("knows how much the home needs until the sun is back", () => {
    expect(ownNeedKwh(day()).needKwh).toBeCloseTo((12 * 0.3) / 0.95);
    expect(ownNeedKwh(day()).deficitTs).toHaveLength(12);
  });

  it("stores midday surplus when the evening pays more after losses", () => {
    const d = decideBattery(input());
    expect(d.kind).toBe("battery_hold");
    expect(d.chargeLimitKwh).toBe(10);
  });

  it("sells surplus now when the evening wouldn't pay for the losses, keeping the home's own need", () => {
    const forecast = day();
    const d = decideBattery(input({ prices: prices(forecast, (i) => (i < 6 ? 20 : 21)) }));
    expect(d.kind).toBe("battery_sell_now");
    expect(d.chargeLimitKwh).toBeCloseTo(ownNeedKwh(forecast).needKwh);
  });

  it("never keeps less than the member's own reserve", () => {
    const forecast = day();
    const d = decideBattery(input({ minReserveKwh: 8, prices: prices(forecast, () => 20) }));
    expect(d.chargeLimitKwh).toBe(8);
  });

  it("in the evening sells only what is above the home's need, at the best price left", () => {
    const evening = day().slice(6);
    const best = decideBattery(input({ forecast: evening, socKwh: 9, prices: prices(evening, () => 25) }));
    expect(best.kind).toBe("battery_discharge");
    expect(best.sellFromBatteryKwh).toBeGreaterThan(0);
    expect(best.sellFromBatteryKwh).toBeLessThanOrEqual(10 * 0.5 * 0.25); // half its capacity per hour
    const tooLittle = decideBattery(input({ forecast: evening, socKwh: 3, prices: prices(evening, () => 25) }));
    expect(tooLittle.kind).toBe("battery_keep");
  });

  it("waits when a better price is still coming tonight", () => {
    const evening = day().slice(6);
    const d = decideBattery(input({ forecast: evening, socKwh: 9, prices: prices(evening, (i) => (i < 4 ? 15 : 28)) }));
    expect(d.kind).toBe("battery_keep");
  });

  it("the battery sells only after serving the home", () => {
    const s = stepBattery(5, 10, -1, 0.95, 10, 2);
    expect(s.importKwh).toBe(0);
    expect(s.exportKwh).toBe(2);
    expect(s.socKwh).toBeCloseTo(5 - 1 / 0.95 - 2 / 0.95);
    expect(stepBattery(0.5, 10, -1, 0.95, 10, 2).exportKwh).toBe(0); // nothing left to sell
  });
});

describe("EV agent", () => {
  const window: PricePoint[] = [30, 38, 12, 20, 12].map((buyCt, i) => ({ ts: i * Q, sellCt: 8, buyCt }));

  it("charges in the cheapest quarter-hours, earliest first on ties", () => {
    const plan = planCharging(4, 11, window); // 2.75 kWh per quarter-hour
    expect([...plan.slots.keys()]).toEqual([2 * Q, 4 * Q]);
    expect([...plan.slots.values()].reduce((s, k) => s + k, 0)).toBeCloseTo(4);
    expect(plan.plannedCostCt).toBeCloseTo(4 * 12);
    expect(plan.asapCostCt).toBeCloseTo(2.75 * 30 + 1.25 * 38);
  });

  it("never costs more than charging straight away", () => {
    const plan = planCharging(9, 11, window);
    expect(plan.plannedCostCt).toBeLessThanOrEqual(plan.asapCostCt);
  });
});
