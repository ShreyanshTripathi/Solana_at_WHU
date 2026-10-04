import { and, eq, gt, gte, isNull, lte } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { localTime } from "@/lib/sim/clock";
import { clearSkyKwhPerKwp } from "@/lib/sim/profiles";

const { intervalReadings, sites } = schema;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_SURPLUS_KWH = 0.01;

export interface SupplierStats {
  availability: number; // share of daylight intervals with surplus to share, 0..1
  steadiness: number; // 1 = perfectly even output, 0 = swings as large as the output itself
  daylightIntervals: number;
}

// MVP stand-in for "delivered / planned" (design doc, section 12, M4): measured over the last 30 days.
export function supplierStats(asOf: number): Map<string, SupplierStats> {
  const sellers = db.select().from(sites).where(and(gt(sites.pvKwp, 0), isNull(sites.closedAt))).all();
  const stats = new Map<string, SupplierStats>();
  for (const site of sellers) {
    const readings = db
      .select({ ts: intervalReadings.ts, exportKwh: intervalReadings.exportKwh })
      .from(intervalReadings)
      .where(and(eq(intervalReadings.siteId, site.id), gte(intervalReadings.ts, asOf - WINDOW_MS), lte(intervalReadings.ts, asOf)))
      .orderBy(intervalReadings.ts)
      .all()
      .filter((r) => clearSkyKwhPerKwp(r.ts, site.lat, site.lon) > 0);

    const withSurplus = readings.filter((r) => r.exportKwh >= MIN_SURPLUS_KWH).length;
    let swing = 0;
    for (let i = 1; i < readings.length; i++) swing += Math.abs(readings[i].exportKwh - readings[i - 1].exportKwh);
    const meanExport = readings.reduce((sum, r) => sum + r.exportKwh, 0) / Math.max(1, readings.length);
    const meanSwing = swing / Math.max(1, readings.length - 1);

    stats.set(site.id, {
      availability: readings.length ? withSurplus / readings.length : 0,
      steadiness: meanExport > 0 ? Math.max(0, 1 - meanSwing / meanExport) : 0,
      daylightIntervals: readings.length,
    });
  }
  return stats;
}

// Learned per seller and hour of day: how often, over the last 14 days, the seller actually had
// surplus to share in that hour (at least 0.2 kWh). The buyer's agent weighs each seller's
// forecast by it: a forecast surplus from a seller who usually delivers at that hour counts more.
const RELIABILITY_DAYS = 14;
const MIN_HOURLY_KWH = 0.2;

export interface HourlyReliability {
  byHour: (number | null)[]; // 0..1 per local hour; null where the seller never has sun at that hour
  days: number;
}

export function hourlyReliability(asOf: number): Map<string, HourlyReliability> {
  const sellers = db.select().from(sites).where(and(gt(sites.pvKwp, 0), isNull(sites.closedAt))).all();
  const out = new Map<string, HourlyReliability>();
  for (const site of sellers) {
    const hours = new Map<string, number>(); // "date:hour" -> export kWh
    for (const r of db
      .select({ ts: intervalReadings.ts, exportKwh: intervalReadings.exportKwh })
      .from(intervalReadings)
      .where(and(eq(intervalReadings.siteId, site.id), gte(intervalReadings.ts, asOf - RELIABILITY_DAYS * 864e5), lte(intervalReadings.ts, asOf)))
      .all()) {
      if (clearSkyKwhPerKwp(r.ts, site.lat, site.lon) <= 0) continue;
      const { dateKey, hour } = localTime(r.ts);
      const key = `${dateKey}:${Math.floor(hour)}`;
      hours.set(key, (hours.get(key) ?? 0) + r.exportKwh);
    }
    const hit = new Array(24).fill(0);
    const seen = new Array(24).fill(0);
    for (const [key, kwh] of hours) {
      const h = Number(key.split(":")[1]);
      seen[h] += 1;
      if (kwh >= MIN_HOURLY_KWH) hit[h] += 1;
    }
    out.set(site.id, {
      byHour: seen.map((n, h) => (n > 0 ? hit[h] / n : null)),
      days: new Set([...hours.keys()].map((k) => k.split(":")[0])).size,
    });
  }
  return out;
}

// The share of a forecast that the seller is likely to deliver at that time (no history: trust it half).
export const reliabilityAt = (r: HourlyReliability | undefined, ts: number) => r?.byHour[Math.floor(localTime(ts).hour)] ?? 0.5;
