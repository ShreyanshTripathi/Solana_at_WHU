// Forecasting is scheduled for Sat 3 Oct (design doc, section 12).
// Planned modules:
//   pv.ts       PV generation per site from Open-Meteo irradiance, P10/P50/P90
//   load.ts     household load as the average of the last 4 matching weekdays
//   battery.ts  end-of-day battery level by stepping lib/sim/battery through low/mid/high scenarios
//   supplier.ts reliability (delivered / planned over 30 days) and volatility per seller

export interface Quantiles {
  p10: number;
  p50: number;
  p90: number;
}
