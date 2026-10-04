import { INTERVAL_MINUTES } from "@/lib/config";
import { floorToInterval, localMidnight, localTime } from "./clock";
import { jitter, noise } from "./random";

const HOURS_PER_INTERVAL = INTERVAL_MINUTES / 60;
const HOUR_MS = 3_600_000;

// Home EV charging: one session a day at the charger's full power until the car has what it needs.
// Weekdays the car comes home between 17:30 and 19:30 and needs about 8 kWh (40 km);
// at weekends it's home around midday and needs less, which soaks up neighbourhood solar.
// Deterministic per site and day, so forecasts and re-runs see the same sessions.
function session(siteId: string, dateKey: string, weekday: number) {
  const weekend = weekday === 0 || weekday === 6;
  return {
    weekend,
    startHour: (weekend ? 11 : 17.5) + 2 * noise(`ev-start:${siteId}:${dateKey}`),
    needKwh: (weekend ? 5 : 8) * jitter(`ev-need:${siteId}:${dateKey}`, 0.4),
  };
}

export function evChargingKwh(siteId: string, chargerKw: number, ts: number): number {
  if (chargerKw <= 0) return 0;
  const { hour, weekday, dateKey } = localTime(ts);
  const { startHour, needKwh } = session(siteId, dateKey, weekday);
  const deliveredBy = (h: number) => Math.min(needKwh, Math.max(0, h - startHour) * chargerKw);
  return deliveredBy(hour + HOURS_PER_INTERVAL) - deliveredBy(hour);
}

export interface EvSession {
  key: string; // local date the car arrived
  arrivesAt: number;
  leavesAt: number; // charged by then: next morning on weekdays, eight hours later at weekends
  needKwh: number;
}

// The car session that arrives on the local day of `ts`, for a smart-charging plan.
export function evSessionOn(siteId: string, ts: number, readyByHour = 7): EvSession {
  const { weekday, dateKey } = localTime(ts);
  const { weekend, startHour, needKwh } = session(siteId, dateKey, weekday);
  const midnight = localMidnight(ts);
  const arrivesAt = Math.round(midnight + startHour * HOUR_MS);
  return { key: dateKey, arrivesAt, leavesAt: weekend ? floorToInterval(arrivesAt + 8 * HOUR_MS) : midnight + (24 + readyByHour) * HOUR_MS, needKwh };
}
