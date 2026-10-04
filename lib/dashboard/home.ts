import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { localMidnight, localTime } from "@/lib/sim/clock";
import { getAdminOverview } from "./admin";

const { intervalReadings, allocations } = schema;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const GRID_CO2_KG_PER_KWH = 0.36; // approximate German grid average

export function getHome() {
  const admin = getAdminOverview();
  const lastTs = db.select({ ts: sql<number | null>`max(${intervalReadings.ts})` }).from(intervalReadings).get()?.ts ?? null;
  const simulatedDays = new Set(
    db
      .selectDistinct({ ts: intervalReadings.ts })
      .from(intervalReadings)
      .all()
      .map((r) => localTime(r.ts).dateKey),
  ).size;

  const counts = {
    households: admin.members.filter((m) => m.kind === "household").length,
    businesses: admin.members.filter((m) => m.kind === "sme").length,
    investors: admin.members.filter((m) => m.kind === "investor").length,
    sellers: admin.members.filter((m) => (m.site?.pvKwp ?? 0) > 0).length,
  };

  // The latest simulated day, hour by hour: all solar generated, and how much of it neighbours used.
  let day = null;
  if (lastTs !== null) {
    const dayStart = localMidnight(lastTs);
    const readings = db
      .select({ ts: intervalReadings.ts, generation: intervalReadings.generationKwh })
      .from(intervalReadings)
      .where(and(gte(intervalReadings.ts, dayStart), lt(intervalReadings.ts, dayStart + DAY_MS)))
      .all();
    const shared = db
      .select({ ts: allocations.ts, kwh: allocations.kwh })
      .from(allocations)
      .where(and(eq(allocations.kind, "final"), gte(allocations.ts, dayStart), lt(allocations.ts, dayStart + DAY_MS)))
      .all();
    const hours = Array.from({ length: 24 }, (_, h) => {
      const from = dayStart + h * HOUR_MS;
      const inHour = (ts: number) => ts >= from && ts < from + HOUR_MS;
      const measured = readings.some((r) => inHour(r.ts));
      return {
        hourTs: from,
        generated: measured ? readings.filter((r) => inHour(r.ts)).reduce((sum, r) => sum + r.generation, 0) : null,
        shared: measured ? shared.filter((a) => inHour(a.ts)).reduce((sum, a) => sum + a.kwh, 0) : null,
      };
    });
    const generatedKwh = hours.reduce((sum, h) => sum + (h.generated ?? 0), 0);
    const sharedKwh = hours.reduce((sum, h) => sum + (h.shared ?? 0), 0);
    day = { dayStart, hours, generatedKwh, sharedKwh, sharedShare: generatedKwh > 0 ? sharedKwh / generatedKwh : 0 };
  }

  return {
    community: admin.community,
    lastTs,
    simulatedDays,
    counts,
    totals: { ...admin.totals, co2Kg: admin.totals.sharedKwh * GRID_CO2_KG_PER_KWH },
    day,
    payouts: admin.batches.filter((b) => b.status === "confirmed").slice(0, 6),
  };
}
