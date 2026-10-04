import "server-only";
import { and, eq, gte, isNull, lt, max } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { COMMUNITY } from "@/lib/config";
import { localMidnight, localTime } from "@/lib/sim/clock";

const { sites, members, intervalReadings, allocations } = schema;
const DAY_MS = 24 * 60 * 60 * 1000;
const BLUR_DEG = 0.002; // street level, as on the 2D maps
const blur = (x: number) => Math.round(x / BLUR_DEG) * BLUR_DEG;
// Blurred homes can land on the same spot; nudge them apart a little, the same way every time.
const nudge = (id: string, axis: number) => {
  let h = axis;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ((h % 1000) / 1000 - 0.5) * 0.0006;
};

export interface Map3dSite {
  id: string;
  name: string;
  lon: number;
  lat: number;
  exact: boolean; // false = shown at street level
  self: boolean;
  pvKwp: number;
  batteryKwh: number;
  kind: string;
}

export interface Map3dHour {
  generation: Record<string, number>; // site -> kWh in this hour
  use: Record<string, number>;
  flows: { from: string; to: string; kwh: number }[];
}

// One simulated day, hour by hour, for the 3D neighbourhood map. Members see their own home and
// homes that opted in exactly, others at street level; Stadtwerk staff see everything exactly.
// `asOf` picks the day and stops there (the dashboards' "today" or a ?at= replay); default: the latest day.
export function getMap3d(viewer: { id: string; role: string }, asOf?: number) {
  const latest = db.select({ ts: max(intervalReadings.ts) }).from(intervalReadings).get()?.ts;
  if (!latest) return null;
  const lastTs = asOf ?? latest;
  const dayStart = localMidnight(lastTs);
  const staff = viewer.role === "stadtwerk_admin";

  const names = new Map(db.select().from(members).all().map((m) => [m.id, m]));
  const siteRows = db.select().from(sites).where(isNull(sites.closedAt)).all();
  const mapSites: Map3dSite[] = siteRows.map((s) => {
    const self = s.memberId === viewer.id;
    const exact = self || staff || s.showExactLocation;
    return {
      id: s.id,
      name: names.get(s.memberId)?.name ?? s.label,
      lon: exact ? s.lon : blur(s.lon) + nudge(s.id, 1),
      lat: exact ? s.lat : blur(s.lat) + nudge(s.id, 2),
      exact,
      self,
      pvKwp: s.pvKwp,
      batteryKwh: s.batteryKwh,
      kind: names.get(s.memberId)?.kind ?? "household",
    };
  });

  const hours: Map3dHour[] = Array.from({ length: 24 }, () => ({ generation: {}, use: {}, flows: [] }));
  const hourOf = (ts: number) => Math.min(23, Math.floor(localTime(ts).hour));
  for (const r of db
    .select()
    .from(intervalReadings)
    .where(and(gte(intervalReadings.ts, dayStart), lt(intervalReadings.ts, Math.min(dayStart + DAY_MS, lastTs + 1))))
    .all()) {
    const h = hours[hourOf(r.ts)];
    h.generation[r.siteId] = (h.generation[r.siteId] ?? 0) + r.generationKwh;
    h.use[r.siteId] = (h.use[r.siteId] ?? 0) + r.loadKwh;
  }
  const flowByHour = new Map<string, number>();
  for (const a of db
    .select()
    .from(allocations)
    .where(and(eq(allocations.kind, "final"), gte(allocations.ts, dayStart), lt(allocations.ts, Math.min(dayStart + DAY_MS, lastTs + 1))))
    .all()) {
    const key = `${hourOf(a.ts)}|${a.sellerSiteId}|${a.buyerSiteId}`;
    flowByHour.set(key, (flowByHour.get(key) ?? 0) + a.kwh);
  }
  for (const [key, kwh] of flowByHour) {
    const [h, from, to] = key.split("|");
    hours[Number(h)].flows.push({ from, to, kwh });
  }

  // Start on the hour with the most sharing, the most interesting one to look at.
  const busiest = hours.reduce((best, h, i) => (h.flows.reduce((s, f) => s + f.kwh, 0) > hours[best].flows.reduce((s, f) => s + f.kwh, 0) ? i : best), 12);
  const lastHour = lastTs >= dayStart + DAY_MS - 15 * 60 * 1000 ? 23 : hourOf(lastTs);

  // Illustrative grid-area outline: a box around the community's homes. The grid operator's real
  // boundary would replace it.
  const lons = siteRows.map((s) => s.lon);
  const lats = siteRows.map((s) => s.lat);
  const pad = 0.004;
  const [w, e, s, n] = [Math.min(...lons) - pad * 1.4, Math.max(...lons) + pad * 1.4, Math.min(...lats) - pad, Math.max(...lats) + pad];

  return {
    dayStart,
    gridArea: [
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s],
    ],
    lastHour,
    startHour: Math.min(busiest, lastHour),
    sites: mapSites,
    hours,
    center: { lon: COMMUNITY.lon, lat: COMMUNITY.lat },
    gridAreaId: COMMUNITY.gridAreaId,
  };
}

export type Map3dData = NonNullable<ReturnType<typeof getMap3d>>;
