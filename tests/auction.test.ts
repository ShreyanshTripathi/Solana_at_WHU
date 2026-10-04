import { describe, expect, it } from "vitest";
import { buyerTranches, clearAuction, sellerTranches } from "@/lib/match/auction";

const FLOOR = 8;
const CAP = 38;
const sellers = (kwh: number, min = 0) => sellerTranches({ siteId: "s1", kwh, limitCt: min }, FLOOR, CAP);
const buyers = (kwh: number, max = CAP) => buyerTranches({ siteId: "b1", kwh, limitCt: max }, FLOOR, CAP);
const total = (m: Map<string, number>) => [...m.values()].reduce((s, x) => s + x, 0);

describe("trading agents", () => {
  it("split an order into tranches that add up to it, starting at the member's limit", () => {
    const asks = sellerTranches({ siteId: "s", kwh: 10, limitCt: 12 }, FLOOR, CAP);
    expect(asks.reduce((s, a) => s + a.kwh, 0)).toBeCloseTo(10);
    expect(asks[0].priceCt).toBe(12);
    expect(asks.every((a, i) => i === 0 || a.priceCt > asks[i - 1].priceCt)).toBe(true);
    const bids = buyerTranches({ siteId: "b", kwh: 4, limitCt: 30 }, FLOOR, CAP);
    expect(bids[0].priceCt).toBe(30);
    expect(bids.every((b, i) => i === 0 || b.priceCt < bids[i - 1].priceCt)).toBe(true);
  });

  it("never ask below the feed-in tariff or bid above the grid price", () => {
    expect(sellerTranches({ siteId: "s", kwh: 1, limitCt: 0 }, FLOOR, CAP)[0].priceCt).toBe(FLOOR);
    expect(buyerTranches({ siteId: "b", kwh: 1, limitCt: 99 }, FLOOR, CAP)[0].priceCt).toBe(CAP);
  });
});

describe("clearing price", () => {
  it("falls to the feed-in tariff when sun is plentiful", () => {
    const c = clearAuction(sellers(10), buyers(2), FLOOR, CAP);
    expect(c.priceCt).toBe(FLOOR);
    expect(c.tradedKwh).toBeCloseTo(2);
  });

  it("rises as supply gets scarce, and every buyer is served when supply allows", () => {
    const plenty = clearAuction(sellers(10), buyers(4), FLOOR, CAP).priceCt;
    const tight = clearAuction(sellers(4), buyers(4), FLOOR, CAP).priceCt;
    expect(tight).toBeGreaterThan(plenty);
  });

  it("sells everything at the grid price when supply can't cover demand", () => {
    const c = clearAuction(sellers(1), buyers(10), FLOOR, CAP);
    expect(c.priceCt).toBe(CAP);
    expect(c.tradedKwh).toBeCloseTo(1);
  });

  it("sells scarce supply at the highest price buyers still bid, not above it", () => {
    const c = clearAuction(sellers(1), buyers(10, 25), FLOOR, CAP);
    expect(c.priceCt).toBe(25);
    // The seller's top tranche asks 26 ct, above every bid, so 0.8 of its 1 kWh sells.
    expect(c.tradedKwh).toBeCloseTo(0.8);
  });

  it("only trades what both sides accept, and both sides trade the same amount", () => {
    const c = clearAuction(sellers(6, 20), buyers(5, 25), FLOOR, CAP);
    expect(c.priceCt).toBeGreaterThanOrEqual(20);
    expect(c.priceCt).toBeLessThanOrEqual(25);
    expect(total(c.sold)).toBeCloseTo(c.tradedKwh);
    expect(total(c.bought)).toBeCloseTo(c.tradedKwh);
  });

  it("doesn't trade when the seller wants more than the buyer will pay", () => {
    const c = clearAuction(sellers(5, 30), buyers(5, 15), FLOOR, CAP);
    expect(c.tradedKwh).toBe(0);
  });

  it("is quiet when nobody offers or nobody bids", () => {
    expect(clearAuction([], buyers(3), FLOOR, CAP).tradedKwh).toBe(0);
    expect(clearAuction(sellers(3), [], FLOOR, CAP).tradedKwh).toBe(0);
  });
});
