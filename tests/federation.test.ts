import { describe, expect, it } from "vitest";
import { CREDIT_LIMIT_KWH, FEDERATION_PRICE_CT, matchFederation, netMoneyByPeer, type PeerPosition, repayLots } from "@/lib/federation/match";
import { legality } from "@/lib/federation/topology";

const OCT_2026 = Date.parse("2026-10-04T12:00:00+02:00");
const JULY_2028 = Date.parse("2028-07-01T12:00:00+02:00");
const peer = (over: Partial<PeerPosition> & { id: string }): PeerPosition => ({ relation: "same_area", mode: "trade", netKwh: 0, weOweKwh: 0, theyOweKwh: 0, ...over });

describe("which communities may share", () => {
  it("follows §42c: same grid area now, adjacent areas from June 2028, never further away", () => {
    expect(legality("same_substation", OCT_2026)).toEqual({ allowed: true });
    expect(legality("same_area", OCT_2026)).toEqual({ allowed: true });
    expect(legality("adjacent_area", OCT_2026)).toEqual({ allowed: false, reason: "from_2028" });
    expect(legality("adjacent_area", JULY_2028)).toEqual({ allowed: true });
    expect(legality("remote", JULY_2028)).toEqual({ allowed: false, reason: "not_sharing" });
  });
});

describe("matching with neighbouring communities", () => {
  it("prefers the nearest community that can help, even if a farther one has more", () => {
    const { flows } = matchFederation({ surplusKwh: 0, deficitKwh: 3 }, [
      peer({ id: "far", relation: "same_area", netKwh: 10 }),
      peer({ id: "near", relation: "same_substation", netKwh: 2 }),
    ], OCT_2026);
    expect(flows).toEqual([
      { peerId: "near", direction: "import", kind: "trade", kwh: 2, priceCt: FEDERATION_PRICE_CT },
      { peerId: "far", direction: "import", kind: "trade", kwh: 1, priceCt: FEDERATION_PRICE_CT },
    ]);
  });

  it("never trades with communities the law doesn't allow, and says why", () => {
    const { flows, excluded } = matchFederation({ surplusKwh: 0, deficitKwh: 5 }, [
      peer({ id: "hoehr", relation: "adjacent_area", netKwh: 50 }),
      peer({ id: "cochem", relation: "remote", netKwh: 50 }),
    ], OCT_2026);
    expect(flows).toEqual([]);
    expect(excluded.map((e) => [e.peerId, e.legality.reason])).toEqual([["hoehr", "from_2028"], ["cochem", "not_sharing"]]);
  });

  it("borrows from a credit partner up to the limit, then pays for the rest", () => {
    const { flows } = matchFederation({ surplusKwh: 0, deficitKwh: 20 }, [peer({ id: "m", mode: "credit", netKwh: 30, weOweKwh: CREDIT_LIMIT_KWH - 5 })], OCT_2026);
    expect(flows.map((f) => [f.kind, f.kwh])).toEqual([["credit", 5], ["trade", 15]]);
  });

  it("repays borrowed energy in kind first, then lends the rest to a credit partner and sells to others", () => {
    const { flows } = matchFederation({ surplusKwh: 10, deficitKwh: 0 }, [
      peer({ id: "m", relation: "same_substation", mode: "credit", netKwh: -4, weOweKwh: 3 }),
      peer({ id: "n", netKwh: -20 }),
    ], OCT_2026);
    expect(flows.map((f) => [f.peerId, f.kind, f.kwh])).toEqual([["m", "repay", 3], ["m", "credit", 1], ["n", "trade", 6]]);
  });

  it("repays the oldest credits first, and only money flows from paid trades", () => {
    expect(repayLots([{ id: 1, remainingKwh: 2 }, { id: 2, remainingKwh: 5 }], 4)).toEqual([{ id: 1, remainingKwh: 0 }, { id: 2, remainingKwh: 3 }]);
    const net = netMoneyByPeer([
      { peerId: "a", direction: "import", kind: "trade", kwh: 2, priceCt: 23 },
      { peerId: "a", direction: "export", kind: "trade", kwh: 1, priceCt: 23 },
      { peerId: "a", direction: "import", kind: "credit", kwh: 9, priceCt: 0 },
      { peerId: "b", direction: "export", kind: "credit_settled", kwh: 1, priceCt: 23 },
    ]);
    expect(net.get("a")).toBe(230_000);
    expect(net.get("b")).toBe(-230_000);
  });
});
