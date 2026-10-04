import { describe, expect, it } from "vitest";
import { buildRecord, MEMO_HASH, memoFor, publicCode, recordHash } from "@/lib/settlement/record";

const trades = [
  { ts: 2000, from: "S-b", to: "S-a", kwh: 0.123456, priceCt: 17 },
  { ts: 1000, from: "S-a", to: "grid", kwh: 0.5, priceCt: 8 },
  { ts: 1000, from: "S-a", to: "S-c", kwh: 0, priceCt: 17 },
];

describe("public hourly record", () => {
  it("has one canonical form, whatever order the trades come in", () => {
    const a = buildRecord("vallendar", 0, 3_600_000, trades);
    const b = buildRecord("vallendar", 0, 3_600_000, [...trades].reverse());
    expect(recordHash(a)).toBe(recordHash(b));
    expect(a.trades.map((t) => t.ts)).toEqual([1000, 2000]); // empty trades dropped
    expect(a.trades[1].kwh).toBe(0.1235);
  });

  it("changes its hash when any trade changes", () => {
    const a = buildRecord("vallendar", 0, 3_600_000, trades);
    const b = buildRecord("vallendar", 0, 3_600_000, [{ ...trades[0], priceCt: 18 }, trades[1]]);
    expect(recordHash(a)).not.toBe(recordHash(b));
  });

  it("gives each site a stable code that can't be guessed without the secret", () => {
    expect(publicCode("site-anna", "s1")).toBe(publicCode("site-anna", "s1"));
    expect(publicCode("site-anna", "s1")).not.toBe(publicCode("site-anna", "s2"));
    expect(publicCode("site-anna", "s1")).toMatch(/^S-[0-9a-f]{8}$/);
  });

  it("puts the full hash in the memo", () => {
    const hash = recordHash(buildRecord("vallendar", 0, 1, trades));
    expect(memoFor("b-1", hash).match(MEMO_HASH)?.[1]).toBe(hash);
  });
});
