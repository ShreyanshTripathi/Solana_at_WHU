export interface BatteryStep {
  socKwh: number;
  importKwh: number;
  exportKwh: number;
}

// The battery serves the home first: surplus charges it before anything is exported,
// and a deficit drains it before anything is imported.
// chargeLimitKwh is the seller's evening reserve (FR-SEL-07): surplus charges the battery only up to
// that level and the rest is sold to neighbours. Without a rule it's the full capacity.
// sellKwh is what the trading agent decided to sell from the battery this interval, after the home is served.
export function stepBattery(
  socKwh: number,
  capacityKwh: number,
  netKwh: number,
  efficiency = 0.95,
  chargeLimitKwh = capacityKwh,
  sellKwh = 0,
): BatteryStep {
  if (capacityKwh <= 0) {
    return { socKwh: 0, importKwh: Math.max(0, -netKwh), exportKwh: Math.max(0, netKwh) };
  }
  if (netKwh >= 0) {
    const room = Math.max(0, Math.min(capacityKwh, chargeLimitKwh) - socKwh);
    const charge = Math.min(netKwh, room / efficiency);
    return { socKwh: socKwh + charge * efficiency, importKwh: 0, exportKwh: netKwh - charge };
  }
  const need = -netKwh;
  const discharge = Math.min(need, socKwh * efficiency);
  const left = socKwh - discharge / efficiency;
  const sold = Math.max(0, Math.min(sellKwh, left * efficiency));
  return { socKwh: left - sold / efficiency, importKwh: need - discharge, exportKwh: sold };
}

// The level surplus charges the battery to: the seller's evening reserve, or full without a rule.
export const chargeLimitFor = (batteryKwh: number, reserveKwh: number | undefined) =>
  reserveKwh === undefined ? batteryKwh : Math.max(0, Math.min(batteryKwh, reserveKwh));
