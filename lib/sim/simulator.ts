import type { LoadProfile } from "@/lib/demo/personas";
import { stepBattery } from "./battery";
import { loadKwh, pvKwhPerKwp, siteLoadKwh } from "./profiles";

export interface SimSite {
  id: string;
  lat: number;
  lon: number;
  pvKwp: number;
  batteryKwh: number;
  evChargerKw: number;
  chargeLimitKwh?: number; // the seller's evening reserve; full capacity if unset
  sellFromBatteryKwh?: number; // the trading agent's evening sale from the battery
  evKwh?: number; // the smart-charging plan for this interval; the car's usual session if unset
  loadProfile: LoadProfile;
  annualKwh: number;
}

export interface SimReading {
  siteId: string;
  ts: number;
  generationKwh: number;
  loadKwh: number;
  importKwh: number;
  exportKwh: number;
  socKwh: number;
}

const round4 = (x: number) => Math.round(x * 10_000) / 10_000;

// One site, one interval: what the smart meter would report.
export function simulateInterval(site: SimSite, ts: number, previousSocKwh: number): SimReading {
  const generation = site.pvKwp * pvKwhPerKwp(ts, site.lat, site.lon);
  const load = site.evKwh === undefined ? siteLoadKwh(site, ts) : loadKwh(site.id, site.loadProfile, site.annualKwh, ts) + site.evKwh;
  const battery = stepBattery(previousSocKwh, site.batteryKwh, generation - load, undefined, site.chargeLimitKwh, site.sellFromBatteryKwh);
  return {
    siteId: site.id,
    ts,
    generationKwh: round4(generation),
    loadKwh: round4(load),
    importKwh: round4(battery.importKwh),
    exportKwh: round4(battery.exportKwh),
    socKwh: round4(battery.socKwh),
  };
}
