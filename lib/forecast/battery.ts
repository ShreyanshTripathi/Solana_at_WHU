import { INTERVAL_MS } from "@/lib/config";
import { stepBattery } from "@/lib/sim/battery";
import { clearSkyKwhPerKwp, expectedSiteLoadKwh } from "@/lib/sim/profiles";
import type { SimSite } from "@/lib/sim/simulator";
import type { SiteModel } from "./learned";
import type { Quantiles } from "./index";

// MVP method (design doc, section 12, M3): step the battery through the rest of the day
// under three sun scenarios, using the clear-sky PV model and the site's usual load.
// v1 replaces the fixed scenarios with Open-Meteo irradiance quantiles.
export const SCENARIOS = { p10: 0.35, p50: 0.7, p90: 1 } as const;

export interface BatteryPathPoint extends Quantiles {
  ts: number;
}

export interface EndOfDayForecast extends Quantiles {
  path: BatteryPathPoint[]; // from the interval after `fromTs` to the last interval of the day
  daylightHoursLeft: number;
  // The why behind the P50 number, for the one-line reason (FR-SEL-03).
  solarLeftKwh: number; // expected (P50) generation still to come today
  useLeftKwh: number; // usual use still to come today, EV charging included
}

export function forecastBatteryToEndOfDay(
  site: SimSite,
  fromTs: number,
  socNowKwh: number,
  dayEndTs: number,
  model?: SiteModel, // the learned forecast; without it, the fixed solar model and usual load
): EndOfDayForecast {
  const soc = { p10: socNowKwh, p50: socNowKwh, p90: socNowKwh };
  const path: BatteryPathPoint[] = [];
  let daylightIntervals = 0;
  let solarLeft = 0;
  let useLeft = 0;

  for (let ts = fromTs + INTERVAL_MS; ts < dayEndTs; ts += INTERVAL_MS) {
    const clearSky = site.pvKwp * clearSkyKwhPerKwp(ts, site.lat, site.lon);
    if (clearSky > 0) daylightIntervals++;
    const solar = (key: "p10" | "p50" | "p90") => (model ? model.generation(ts, key) : clearSky * SCENARIOS[key]);
    const load = model ? model.load(ts) : expectedSiteLoadKwh(site, ts);
    solarLeft += solar("p50");
    useLeft += load;
    for (const key of ["p10", "p50", "p90"] as const) {
      soc[key] = stepBattery(soc[key], site.batteryKwh, solar(key) - load, undefined, site.chargeLimitKwh).socKwh;
    }
    path.push({ ts, ...soc });
  }

  return { ...soc, path, daylightHoursLeft: (daylightIntervals * INTERVAL_MS) / 3_600_000, solarLeftKwh: solarLeft, useLeftKwh: useLeft };
}
