import { describe, expect, it } from "vitest";
import { checkSme } from "@/lib/sme";

describe("checkSme", () => {
  it("accepts a small bakery", () => {
    expect(checkSme(18, 1_400_000, 600_000).eligible).toBe(true);
  });

  it("rejects 250 or more staff", () => {
    expect(checkSme(250, 1_000_000, 1_000_000).eligible).toBe(false);
  });

  it("needs only one of the two financial limits", () => {
    expect(checkSme(100, 80_000_000, 40_000_000).eligible).toBe(true);
    expect(checkSme(100, 45_000_000, 60_000_000).eligible).toBe(true);
    expect(checkSme(100, 80_000_000, 60_000_000).eligible).toBe(false);
  });
});
