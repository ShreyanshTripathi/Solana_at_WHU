import { describe, expect, it } from "vitest";
import { COMMUNITY } from "@/lib/config";
import { DEMO_FREE_METERS, demoGridOperator } from "@/lib/grid/demoOperator";
import { isValidMaloId, maloCheckDigit } from "@/lib/grid/malo";
import { decideSite } from "@/lib/sites/decide";
import { evChargingKwh } from "@/lib/sim/ev";
import { expectedLoadKwh } from "@/lib/sim/profiles";

describe("market location ID (MaLo-ID)", () => {
  it("accepts an 11-digit ID with the right check digit, with or without spaces", () => {
    expect(maloCheckDigit("5017800111")).toBe(7);
    expect(isValidMaloId("50178001117")).toBe(true);
    expect(isValidMaloId("501 7800 1117")).toBe(true);
  });

  it("catches typos and wrong formats", () => {
    expect(isValidMaloId("50178001118")).toBe(false); // wrong check digit
    expect(isValidMaloId("50178001171")).toBe(false); // two digits swapped
    expect(isValidMaloId("5017800111")).toBe(false); // too short
    expect(isValidMaloId("05017800111")).toBe(false); // leading zero
    expect(isValidMaloId("DE0001234567890000000000000000000")).toBe(false); // a meter point ID, not a MaLo-ID
  });

  it("every demo meter has a valid ID", () => {
    for (const m of DEMO_FREE_METERS) expect(isValidMaloId(m.maloId)).toBe(true);
  });
});

describe("accepting a site", () => {
  const inVallendar = DEMO_FREE_METERS.find((m) => m.city === "Vallendar")!;
  const inKoblenz = DEMO_FREE_METERS.find((m) => m.city === "Koblenz")!;

  it("approves a meter in the community's grid area", () => {
    expect(decideSite({ postcode: "56179" }, inVallendar, COMMUNITY.gridAreaId)).toEqual({ approved: true, location: inVallendar });
  });

  it("rejects a meter outside the community's grid area, and says which areas", () => {
    expect(decideSite({ postcode: "56068" }, inKoblenz, COMMUNITY.gridAreaId)).toEqual({
      approved: false,
      reason: { code: "outside_grid_area", gridAreaId: "DE-DEMO-KOBLENZ", communityGridAreaId: COMMUNITY.gridAreaId },
    });
  });

  it("rejects a meter the grid operator doesn't know", () => {
    expect(decideSite({ postcode: "56179" }, null, COMMUNITY.gridAreaId).approved).toBe(false);
  });

  it("rejects a meter ID that belongs to a different address", () => {
    expect(decideSite({ postcode: "56068" }, inVallendar, COMMUNITY.gridAreaId)).toEqual({
      approved: false,
      reason: { code: "postcode_mismatch", postcode: "56179", city: "Vallendar" },
    });
  });

  it("the demo grid operator knows the demo homes and the free meters, nothing else", async () => {
    expect((await demoGridOperator.lookupMarketLocation("50178001018"))?.street).toBe("Höhrer Straße 12");
    expect((await demoGridOperator.lookupMarketLocation(inKoblenz.maloId))?.gridAreaId).not.toBe(COMMUNITY.gridAreaId);
    expect(await demoGridOperator.lookupMarketLocation("12345678903")).toBeNull();
  });
});

describe("EV charging in the simulator", () => {
  const day = (iso: string) => Date.parse(iso);
  const sumDay = (siteId: string, kw: number, startIso: string) => {
    let total = 0;
    let peak = 0;
    for (let ts = day(startIso); ts < day(startIso) + 86_400_000; ts += 15 * 60_000) {
      const kwh = evChargingKwh(siteId, kw, ts);
      total += kwh;
      peak = Math.max(peak, kwh);
    }
    return { total, peak };
  };

  it("adds nothing without a charger", () => {
    expect(sumDay("site-x", 0, "2026-10-01T22:00:00Z").total).toBe(0);
  });

  it("charges one session a day, never above the charger's power", () => {
    const { total, peak } = sumDay("site-x", 11, "2026-09-30T22:00:00Z"); // Thursday 1 Oct, local midnight
    expect(total).toBeGreaterThan(4.8 - 1e-9);
    expect(total).toBeLessThan(11.2 + 1e-9);
    expect(peak).toBeLessThanOrEqual(11 * 0.25 + 1e-9);
  });

  it("charges on weekday evenings, not at midday", () => {
    expect(evChargingKwh("site-x", 11, day("2026-10-01T10:00:00Z"))).toBe(0); // 12:00 local
  });
});

describe("business load profile", () => {
  it("uses most power during opening hours", () => {
    const noonWeekday = expectedLoadKwh("business", 20_000, Date.parse("2026-10-01T10:00:00Z"));
    const nightWeekday = expectedLoadKwh("business", 20_000, Date.parse("2026-10-01T01:00:00Z"));
    expect(noonWeekday).toBeGreaterThan(4 * nightWeekday);
  });
});
