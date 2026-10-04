import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { INTERVAL_MS } from "@/lib/config";
import { localMidnight } from "@/lib/sim/clock";

// The dashboards show "now" as the latest simulated interval for a site.
// `at` ("HH:MM") replays that day as it looked at an earlier time.
export function resolveAsOf(siteId: string, at?: string): number | null {
  const latest = db
    .select({ ts: sql<number | null>`max(${schema.intervalReadings.ts})` })
    .from(schema.intervalReadings)
    .where(eq(schema.intervalReadings.siteId, siteId))
    .get()?.ts;
  if (latest == null) return null;
  const match = at?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return latest;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  const requested = localMidnight(latest) + Math.floor((minutes * 60_000) / INTERVAL_MS) * INTERVAL_MS;
  return Math.min(requested, latest);
}
