import { describe, expect, it } from "vitest";
import { changesToWish, checkWish, proposalJsonSchema, resolveNeighbour, type RuleContext, toProposal } from "@/lib/ai/rules";

const neighbours = [
  { id: "anna", name: "Anna Schmitt" },
  { id: "ben", name: "Ben Wagner" },
  { id: "weber", name: "Familie Weber" },
  { id: "baeckerei", name: "Bäckerei Müller" },
];
const ctx = (over: Partial<RuleContext> = {}): RuleContext => ({
  canSell: true,
  batteryKwh: 10,
  evChargerKw: 0,
  seller: { minPriceCt: 15, batteryReserveKwh: 3, priorityBuyers: [] },
  buyer: { maxPriceCt: 25, maxDistanceM: 3000, preferred: [], blocked: [] },
  agent: { smartBattery: false, smartEv: false, evReadyByHour: 7 },
  neighbours,
  ...over,
});

describe("language model proposals", () => {
  it("turns euros and kilometres into the app's cents and metres", () => {
    const p = toProposal({ summary: "x", minSellPriceEur: 0.18, maxBuyPriceEur: 0.22, maxDistanceKm: 1 }, ctx());
    expect(p.changes).toEqual([
      { field: "sellerMinPriceCt", from: 15, to: 18 },
      { field: "buyerMaxPriceCt", from: 25, to: 22 },
      { field: "maxDistanceM", from: 3000, to: 1000 },
    ]);
  });

  it("clamps values outside the allowed range and says so", () => {
    const p = toProposal({ maxBuyPriceEur: 0.6, batteryReserveKwh: 25 }, ctx());
    expect(p.changes).toContainEqual({ field: "buyerMaxPriceCt", from: 25, to: 38, clamped: true });
    expect(p.changes).toContainEqual({ field: "batteryReserveKwh", from: 3, to: 10, clamped: true });
  });

  it("only lists real changes", () => {
    expect(toProposal({ minSellPriceEur: 0.15, smartBattery: false }, ctx()).changes).toEqual([]);
  });

  it("resolves neighbours by first name, surname or family, and flags unknown ones", () => {
    expect(resolveNeighbour("Ben", neighbours)).toBe("ben");
    expect(resolveNeighbour("the Webers", neighbours)).toBe("weber");
    expect(resolveNeighbour("Bäckerei", neighbours)).toBe("baeckerei");
    expect(resolveNeighbour("Baeckerei Mueller", neighbours)).toBeNull(); // no guessing beyond the names
    const p = toProposal({ preferredSellers: ["Weber", "Elon"] }, ctx());
    expect(p.changes).toEqual([{ field: "preferredSellers", from: [], to: ["weber"] }]);
    expect(p.problems).toEqual([{ code: "unknown_neighbour", name: "Elon" }]);
  });

  it("refuses settings the site can't use", () => {
    const p = toProposal({ smartEv: true, minSellPriceEur: 0.2 }, ctx({ canSell: false, batteryKwh: 0 }));
    expect(p.changes).toEqual([]);
    expect(p.problems.map((x) => x.code).sort()).toEqual(["no_ev", "no_solar"]);
  });

  it("passes on wishes no setting can express", () => {
    expect(toProposal({ unsupported: ["buy Tesla shares"] }, ctx()).problems).toEqual([{ code: "unsupported", text: "buy Tesla shares" }]);
  });

  it("asks the model only for settings this member has", () => {
    const keys = (c: RuleContext) => Object.keys(proposalJsonSchema(c).properties);
    expect(keys(ctx())).toContain("smartBattery");
    expect(keys(ctx())).not.toContain("smartEv");
    expect(keys(ctx({ canSell: false, batteryKwh: 0 }))).not.toContain("minSellPriceEur");
  });

  it("checks applied changes again, against the current settings", () => {
    const wish = changesToWish([{ field: "sellerMinPriceCt", to: 99 }, { field: "smartBattery", to: true }]);
    expect(checkWish(wish, ctx()).changes).toEqual([
      { field: "sellerMinPriceCt", from: 15, to: 38, clamped: true },
      { field: "smartBattery", from: false, to: true },
    ]);
    expect(() => changesToWish([{ field: "walletKey", to: "x" }])).toThrow();
  });
});
