import { describe, expect, it } from "vitest";
import { buildMarket, type MarketContext } from "@/lib/market";
import { SME_RECHECK_MS, smeStatus } from "@/lib/sme";

const ts = Date.parse("2026-10-01T10:00:00Z");
const site = (id: string, memberId: string) => ({ id, memberId, lat: 50.4, lon: 7.62 }) as unknown as MarketContext["siteById"] extends Map<string, infer S> ? S : never;

function ctxWith(sme: { verified: boolean; checkedAt: number | null } | null): MarketContext {
  return {
    community: { communityPriceCt: 20 },
    siteById: new Map([
      ["site-anna", site("site-anna", "anna")],
      ["site-shop", site("site-shop", "shop")],
    ]),
    sellerRuleByMember: new Map(),
    buyerRuleByMember: new Map(),
    anchors: [],
    smeByMember: new Map(sme ? [["shop", { id: "shop", ...sme }]] : []),
  } as unknown as MarketContext;
}
const rows = [
  { siteId: "site-anna", exportKwh: 1, importKwh: 0 },
  { siteId: "site-shop", exportKwh: 0, importKwh: 2 },
];
const noUsage = () => 0;

describe("SME check (FR-SME-01)", () => {
  it("is valid for a year after an eligible check", () => {
    expect(smeStatus(true, ts, ts + 10)).toBe("eligible");
    expect(smeStatus(true, ts, ts + SME_RECHECK_MS + 1)).toBe("expired");
    expect(smeStatus(false, ts, ts)).toBe("ineligible");
    expect(smeStatus(false, null, ts)).toBe("unchecked");
  });

  it("lets a verified business buy from neighbours", () => {
    expect(buildMarket(ctxWith({ verified: true, checkedAt: ts - 1000 }), ts, rows, noUsage).demands.map((d) => d.siteId)).toEqual(["site-shop"]);
  });

  it("leaves an unchecked, ineligible or expired business to its utility", () => {
    for (const sme of [
      { verified: false, checkedAt: null },
      { verified: false, checkedAt: ts - 1000 },
      { verified: true, checkedAt: ts - SME_RECHECK_MS - 1000 },
    ]) {
      expect(buildMarket(ctxWith(sme), ts, rows, noUsage).demands).toEqual([]);
    }
  });

  it("never affects households", () => {
    expect(buildMarket(ctxWith({ verified: false, checkedAt: null }), ts, rows, noUsage).supplies.map((s) => s.siteId)).toEqual(["site-anna"]);
  });
});
