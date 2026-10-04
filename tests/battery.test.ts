import { describe, expect, it } from "vitest";
import { chargeLimitFor, stepBattery } from "@/lib/sim/battery";

describe("battery evening reserve (FR-SEL-07)", () => {
  it("fills the battery before selling when there's no rule", () => {
    expect(chargeLimitFor(10, undefined)).toBe(10);
    const step = stepBattery(9, 10, 2, 1);
    expect(step.socKwh).toBe(10);
    expect(step.exportKwh).toBe(1);
  });

  it("charges only up to the reserve and sells the rest of the surplus", () => {
    const step = stepBattery(2, 10, 3, 1, chargeLimitFor(10, 3));
    expect(step.socKwh).toBe(3);
    expect(step.exportKwh).toBe(2);
  });

  it("doesn't charge above a reserve the battery is already over, but still serves the home from it", () => {
    expect(stepBattery(5, 10, 1, 1, 3)).toEqual({ socKwh: 5, importKwh: 0, exportKwh: 1 });
    expect(stepBattery(5, 10, -1, 1, 3).socKwh).toBe(4);
  });

  it("never sets a reserve above the battery or below zero", () => {
    expect(chargeLimitFor(10, 25)).toBe(10);
    expect(chargeLimitFor(10, -4)).toBe(0);
  });
});
