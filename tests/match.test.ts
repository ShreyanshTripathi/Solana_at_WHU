import { describe, expect, it } from "vitest";
import { matchInterval, type Demand, type Supply } from "@/lib/match/engine";

const base = { lat: 50.401, lon: 7.622 };
const supply = (siteId: string, kwh: number, extra: Partial<Supply> = {}): Supply => ({
  ...base,
  siteId,
  memberId: siteId,
  kwh,
  minPriceCt: 0,
  ...extra,
});
const demand = (siteId: string, kwh: number, extra: Partial<Demand> = {}): Demand => ({
  ...base,
  siteId,
  memberId: siteId,
  kwh,
  maxPriceCt: 25,
  maxDistanceM: 3_000,
  preferred: [],
  blocked: [],
  ...extra,
});
const total = (rows: { kwh: number }[]) => rows.reduce((s, r) => s + r.kwh, 0);

describe("matchInterval", () => {
  it("never allocates more than a seller exports or a buyer needs", () => {
    const rows = matchInterval([supply("anna", 1), supply("carla", 0.5)], [demand("ben", 0.8), demand("dana", 0.4)], {
      priceCt: 20,
    });
    expect(total(rows)).toBeCloseTo(1.2, 4);
    expect(total(rows.filter((r) => r.sellerSiteId === "anna"))).toBeLessThanOrEqual(1);
    expect(total(rows.filter((r) => r.buyerSiteId === "ben"))).toBeLessThanOrEqual(0.8);
  });

  it("serves the anchor buyer first, at its own price, up to its cap", () => {
    const rows = matchInterval(
      [supply("anna", 1)],
      [demand("ben", 1), demand("baeckerei", 2, { anchor: { remainingKwh: 0.7, priceCt: 17 } })],
      { priceCt: 20 },
    );
    const anchor = rows.filter((r) => r.buyerSiteId === "baeckerei");
    expect(anchor).toEqual([{ sellerSiteId: "anna", buyerSiteId: "baeckerei", kwh: 0.7, priceCt: 17 }]);
    expect(total(rows.filter((r) => r.buyerSiteId === "ben"))).toBeCloseTo(0.3, 4);
  });

  it("respects blocked suppliers, price limits and distance", () => {
    const far = { lat: 50.5, lon: 7.622 }; // about 11 km north
    const rows = matchInterval(
      [supply("anna", 1, { minPriceCt: 22 }), supply("carla", 1), supply("farm", 1, far)],
      [demand("ben", 3, { blocked: ["carla"] })],
      { priceCt: 20 },
    );
    expect(rows).toEqual([]);
  });

  it("prefers a buyer's chosen supplier when distances are equal", () => {
    const rows = matchInterval([supply("anna", 0.5), supply("carla", 0.5)], [demand("ben", 0.5, { preferred: ["carla"] })], {
      priceCt: 20,
    });
    expect(rows).toEqual([{ sellerSiteId: "carla", buyerSiteId: "ben", kwh: 0.5, priceCt: 20 }]);
  });

  it("lets a seller serve its priority buyer first", () => {
    const rows = matchInterval([supply("anna", 0.5, { priorityBuyers: ["dana"] })], [demand("ben", 0.5), demand("dana", 0.5)], {
      priceCt: 20,
    });
    expect(rows).toEqual([{ sellerSiteId: "anna", buyerSiteId: "dana", kwh: 0.5, priceCt: 20 }]);
  });
});
