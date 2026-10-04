import { CLOUD_EVENT, INTERVAL_MINUTES } from "@/lib/config";
import type { LoadProfile } from "@/lib/demo/personas";
import { localTime } from "./clock";
import { evChargingKwh } from "./ev";
import { jitter, noise } from "./random";

const DEG = Math.PI / 180;
const HOURS_PER_INTERVAL = INTERVAL_MINUTES / 60;

// Sun elevation without the equation-of-time correction; good to a few degrees.
export function sunElevationDeg(ts: number, lat: number, lon: number): number {
  const d = new Date(ts);
  const dayOfYear = Math.floor((ts - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
  const hourUtc = d.getUTCHours() + d.getUTCMinutes() / 60;
  const declination = 23.44 * DEG * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
  const hourAngle = (hourUtc + lon / 15 - 12) * 15 * DEG;
  const sinElevation =
    Math.sin(lat * DEG) * Math.sin(declination) + Math.cos(lat * DEG) * Math.cos(declination) * Math.cos(hourAngle);
  return Math.asin(sinElevation) / DEG;
}

// Share of clear-sky output that gets through the clouds, 0..1.
export function clearness(ts: number): number {
  const { hour, dateKey } = localTime(ts);
  if (hour >= CLOUD_EVENT.fromHour && hour < CLOUD_EVENT.toHour) return CLOUD_EVENT.clearness;
  const daily = 0.6 + 0.4 * noise(`day:${dateKey}`);
  const passing = 0.85 + 0.15 * Math.sin(hour * 1.7 + noise(`phase:${dateKey}`) * 6);
  return Math.min(1, daily * passing);
}

// kWh per kWp under a clear sky in the interval starting at ts (sampled at the interval midpoint).
export function clearSkyKwhPerKwp(ts: number, lat: number, lon: number): number {
  const mid = ts + (INTERVAL_MINUTES / 2) * 60_000;
  const elevation = sunElevationDeg(mid, lat, lon);
  if (elevation <= 0) return 0;
  return 0.8 * Math.pow(Math.sin(elevation * DEG), 1.2) * HOURS_PER_INTERVAL;
}

// What the panels actually produce: clear sky times today's clouds.
export function pvKwhPerKwp(ts: number, lat: number, lon: number): number {
  return clearSkyKwhPerKwp(ts, lat, lon) * clearness(ts);
}

const bump = (h: number, centre: number, width: number) => Math.exp(-((h - centre) ** 2) / (2 * width ** 2));

// Relative load shape by local hour and weekday; scaled to annual kWh below.
function shape(profile: LoadProfile, hour: number, weekday: number): number {
  if (profile === "household") {
    return 0.18 + 0.5 * bump(hour, 7.5, 1) + 0.35 * bump(hour, 12.5, 1.5) + 0.9 * bump(hour, 19.5, 1.8);
  }
  if (profile === "business") {
    // Shop or office: open 08:00 to 18:00 on weekdays and 09:00 to 14:00 on Saturday.
    if (weekday >= 1 && weekday <= 5 && hour >= 8 && hour < 18) return 1;
    if (weekday === 6 && hour >= 9 && hour < 14) return 0.7;
    return 0.2;
  }
  // Bakery: ovens from 04:00, shop open until 18:00 on weekdays and until noon on Saturday.
  const open = weekday >= 1 && weekday <= 5 ? hour >= 4 && hour < 18 : weekday === 6 && hour >= 4 && hour < 12;
  if (!open) return 0.15;
  return hour < 14 ? 1 : 0.6;
}

// Mean of the shape over a week, so annualKwh maps to the right scale.
const weeklyMean = new Map<LoadProfile, number>();
function meanShape(profile: LoadProfile): number {
  let mean = weeklyMean.get(profile);
  if (mean === undefined) {
    let sum = 0;
    const steps = 24 / HOURS_PER_INTERVAL;
    for (let day = 0; day < 7; day++) for (let i = 0; i < steps; i++) sum += shape(profile, i * HOURS_PER_INTERVAL, day);
    mean = sum / (7 * steps);
    weeklyMean.set(profile, mean);
  }
  return mean;
}

// The usual load for this time of day and weekday, without day-to-day noise.
export function expectedLoadKwh(profile: LoadProfile, annualKwh: number, ts: number): number {
  const { hour, weekday } = localTime(ts);
  const averageKw = annualKwh / 8760;
  return ((averageKw * shape(profile, hour, weekday)) / meanShape(profile)) * HOURS_PER_INTERVAL;
}

export function loadKwh(siteId: string, profile: LoadProfile, annualKwh: number, ts: number): number {
  return expectedLoadKwh(profile, annualKwh, ts) * jitter(`load:${siteId}:${ts}`, 0.15);
}

export interface LoadSite {
  id: string;
  loadProfile: LoadProfile;
  annualKwh: number;
  evChargerKw: number;
}

// The usual demand of a site, EV charging included: what forecasts plan with.
export const expectedSiteLoadKwh = (site: LoadSite, ts: number) =>
  expectedLoadKwh(site.loadProfile, site.annualKwh, ts) + evChargingKwh(site.id, site.evChargerKw, ts);

// What the meter sees: the usual demand with day-to-day noise, plus EV charging.
export const siteLoadKwh = (site: LoadSite, ts: number) =>
  loadKwh(site.id, site.loadProfile, site.annualKwh, ts) + evChargingKwh(site.id, site.evChargerKw, ts);
