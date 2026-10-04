import { COMMUNITY, INTERVAL_MS } from "@/lib/config";

export const floorToInterval = (ts: number): number =>
  Math.floor(ts / INTERVAL_MS) * INTERVAL_MS;

const localParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: COMMUNITY.timeZone,
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hourCycle: "h23",
});

export interface LocalTime {
  hour: number; // fractional, e.g. 14.25
  minuteOfDay: number;
  weekday: number; // 0 = Sunday
  dateKey: string; // YYYY-MM-DD in local time
}

// The community's offset from UTC at ts. Time zones only change their offset on a whole hour, so
// it is looked up once per UTC hour; the slow Intl formatting then runs rarely, which matters
// because the forecasts call localTime hundreds of thousands of times per simulated hour.
const HOUR_MS = 3_600_000;
const offsets = new Map<number, number>();
function offsetAt(ts: number): number {
  const hour = Math.floor(ts / HOUR_MS);
  let offset = offsets.get(hour);
  if (offset === undefined) {
    const parts = Object.fromEntries(
      localParts
        .formatToParts(new Date(hour * HOUR_MS))
        .map((p) => [p.type, p.value]),
    );
    offset =
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
      ) -
      hour * HOUR_MS;
    offsets.set(hour, offset);
  }
  return offset;
}

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

export function localTime(ts: number): LocalTime {
  const local = new Date(ts + offsetAt(ts));
  const hour = local.getUTCHours();
  const minute = local.getUTCMinutes();
  return {
    hour: hour + minute / 60,
    minuteOfDay: hour * 60 + minute,
    weekday: local.getUTCDay(),
    dateKey: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
  };
}

// Start of the local day containing ts, as a UTC timestamp aligned to an interval.
export function localMidnight(ts: number): number {
  const { minuteOfDay } = localTime(ts);
  return floorToInterval(ts - minuteOfDay * 60_000);
}
