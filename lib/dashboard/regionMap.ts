import "server-only";
import { and, eq, gte, lt } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { COMMUNITY } from "@/lib/config";
import { FEDERATION_PEERS, peerNetKwh } from "@/lib/federation/peers";
import { legality, type Relation } from "@/lib/federation/topology";

// The region around the community for one simulated day: the neighbouring energy communities, where
// they sit in the grid, what each had left (surplus or shortfall) every hour, and the energy
// exchanged with them. Same day and hours as the neighbourhood map.

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_MS = 15 * 60 * 1000;

export interface RegionCommunity {
  id: string; // "us" for this community
  name: string;
  operator: string;
  relation: Relation | "us";
  lat: number;
  lon: number;
  distanceKm: number;
  allowed: boolean;
  blockedReason: "from_2028" | "not_sharing" | null;
  mode: "trade" | "credit" | null;
  active: boolean;
}

export interface RegionHour {
  net: Record<string, number>; // community -> + surplus / - shortfall left after its own sharing, kWh
  flows: { peerId: string; direction: "import" | "export"; kind: string; kwh: number }[];
}

const HOUR_MS = 60 * 60 * 1000;

// One hour [from, to): what each community had left (+ surplus / - shortfall) and the exchanges with ours.
export function regionHour(from: number, to = from + HOUR_MS): RegionHour {
  const out: RegionHour = { net: {}, flows: [] };
  const add = (id: string, kwh: number) => (out.net[id] = (out.net[id] ?? 0) + kwh);

  // Our community: what was left after the members shared (unshared export minus unmet import).
  const shared = new Map<number, number>();
  for (const a of db
    .select()
    .from(schema.allocations)
    .where(and(eq(schema.allocations.kind, "final"), gte(schema.allocations.ts, from), lt(schema.allocations.ts, to)))
    .all()) {
    shared.set(a.ts, (shared.get(a.ts) ?? 0) + a.kwh);
  }
  const perInterval = new Map<number, { exp: number; imp: number }>();
  for (const r of db
    .select()
    .from(schema.intervalReadings)
    .where(and(gte(schema.intervalReadings.ts, from), lt(schema.intervalReadings.ts, to)))
    .all()) {
    const x = perInterval.get(r.ts) ?? { exp: 0, imp: 0 };
    x.exp += r.exportKwh;
    x.imp += r.importKwh;
    perInterval.set(r.ts, x);
  }
  for (const [ts, x] of perInterval) {
    const s = shared.get(ts) ?? 0;
    add("us", Math.max(0, x.exp - s) - Math.max(0, x.imp - s));
  }

  // The neighbours: their position from the same simulation that matched them.
  for (const p of FEDERATION_PEERS) {
    for (let ts = from; ts < to; ts += INTERVAL_MS) if (perInterval.has(ts)) add(p.id, peerNetKwh(p, ts));
  }

  for (const f of db
    .select()
    .from(schema.federationFlows)
    .where(and(gte(schema.federationFlows.ts, from), lt(schema.federationFlows.ts, to)))
    .all()) {
    const same = out.flows.find((x) => x.peerId === f.peerId && x.direction === f.direction && x.kind === f.kind);
    if (same) same.kwh += f.kwh;
    else out.flows.push({ peerId: f.peerId, direction: f.direction, kind: f.kind, kwh: f.kwh });
  }
  return out;
}

// The communities on the map: ours and the neighbours, with their grid level and whether they may share at `ts`.
export function regionCommunities(ts: number): RegionCommunity[] {
  const community = db.select().from(schema.communities).get();
  const peers = db.select().from(schema.federationPeers).all();
  return [
    {
      id: "us",
      name: community?.name ?? "Volty",
      operator: "Stadtwerk Vallendar",
      relation: "us",
      lat: COMMUNITY.lat,
      lon: COMMUNITY.lon,
      distanceKm: 0,
      allowed: true,
      blockedReason: null,
      mode: null,
      active: true,
    },
    ...peers.flatMap((row) => {
      const p = FEDERATION_PEERS.find((x) => x.id === row.id);
      if (!p) return [];
      const l = legality(row.relation, ts);
      return [
        {
          id: row.id,
          name: row.name,
          operator: row.operator,
          relation: row.relation,
          lat: p.lat,
          lon: p.lon,
          distanceKm: row.distanceKm,
          allowed: l.allowed,
          blockedReason: l.allowed ? null : l.reason,
          mode: row.mode,
          active: row.active,
        },
      ];
    }),
  ];
}

export function getRegionMap(dayStart: number, lastTs: number) {
  if (db.select().from(schema.federationPeers).all().length === 0) return null;
  const community = db.select().from(schema.communities).get();
  const end = Math.min(dayStart + DAY_MS, lastTs + INTERVAL_MS);
  const hours: RegionHour[] = Array.from({ length: 24 }, (_, h) => {
    const from = dayStart + h * HOUR_MS;
    // Hour h in local time: the day starts at local midnight, so hours line up with the clock.
    return from < end ? regionHour(from, Math.min(from + HOUR_MS, end)) : { net: {}, flows: [] };
  });
  return { communities: regionCommunities(lastTs), hours, enabled: Boolean(community?.federationEnabled) };
}

export type RegionMapData = NonNullable<ReturnType<typeof getRegionMap>>;
