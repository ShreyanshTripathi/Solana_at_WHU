import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { INTERVAL_MS, PRICES } from "@/lib/config";
import { planAhead } from "@/lib/forecast/plan";
import { loadMarketContext } from "@/lib/market";
import { matchFederation, FEDERATION_PRICE_CT } from "./match";
import { peerNetKwh, peerProfile } from "./peers";
import { creditBalances } from "./run";
import { legality, RELATIONS } from "./topology";

// Which community to exchange with over the next 24 hours: the federation matching run on the
// forecast. Our side is what the members are expected to have left after sharing (planAhead on the
// learned forecasts); the neighbours' side is their expected position (same weather, their mix).

const HOUR_MS = 3_600_000;

export function federationAdvice(asOf: number) {
  const ctx = loadMarketContext();
  const socNow = new Map(
    db
      .select({ siteId: schema.intervalReadings.siteId, soc: schema.intervalReadings.socKwh })
      .from(schema.intervalReadings)
      .where(eq(schema.intervalReadings.ts, asOf))
      .all()
      .map((r) => [r.siteId, r.soc]),
  );
  const plan = planAhead(ctx, asOf, socNow, 24);
  const peers = db.select().from(schema.federationPeers).where(eq(schema.federationPeers.active, true)).all();
  const balances = creditBalances();

  type Totals = { importKwh: number; exportKwh: number; hours: Set<number> };
  const byPeer = new Map<string, Totals>(peers.map((p) => [p.id, { importKwh: 0, exportKwh: 0, hours: new Set<number>() }]));
  const hours = new Map<number, { hourTs: number; deficitKwh: number; surplusKwh: number; best?: string; direction?: "import" | "export" }>();
  let ownDeficit = 0;
  let ownSurplus = 0;

  for (const p of plan) {
    const shared = p.allocations.reduce((s, a) => s + a.kwh, 0);
    const deficitKwh = Math.max(0, p.rows.reduce((s, r) => s + r.importKwh, 0) - shared);
    const surplusKwh = Math.max(0, p.rows.reduce((s, r) => s + r.exportKwh, 0) - shared);
    ownDeficit += deficitKwh;
    ownSurplus += surplusKwh;
    const positions = peers.flatMap((peer) => {
      const profile = peerProfile(peer.id);
      if (!profile) return [];
      return [{ id: peer.id, relation: peer.relation, mode: peer.mode, netKwh: peerNetKwh(profile, p.ts, true), ...(balances.get(peer.id) ?? { weOweKwh: 0, theyOweKwh: 0 }) }];
    });
    const { flows } = matchFederation({ surplusKwh, deficitKwh }, positions, p.ts);
    const hourTs = Math.floor(p.ts / HOUR_MS) * HOUR_MS;
    const hour = hours.get(hourTs) ?? { hourTs, deficitKwh: 0, surplusKwh: 0 };
    hour.deficitKwh += deficitKwh;
    hour.surplusKwh += surplusKwh;
    for (const f of flows) {
      const t = byPeer.get(f.peerId)!;
      if (f.direction === "import") t.importKwh += f.kwh;
      else t.exportKwh += f.kwh;
      t.hours.add(hourTs);
    }
    const top = [...flows].sort((a, b) => b.kwh - a.kwh)[0];
    if (top && !hour.best) {
      hour.best = top.peerId;
      hour.direction = top.direction;
    }
    hours.set(hourTs, hour);
  }

  const until = asOf + 24 * HOUR_MS;
  const ranking = peers
    .map((peer) => {
      const t = byPeer.get(peer.id)!;
      const now = legality(peer.relation, asOf + INTERVAL_MS);
      return {
        id: peer.id,
        name: peer.name,
        operator: peer.operator,
        relation: peer.relation,
        distanceKm: peer.distanceKm,
        mode: peer.mode,
        legality: now,
        allowedFrom: RELATIONS[peer.relation].allowedFrom,
        importKwh: t.importKwh,
        exportKwh: t.exportKwh,
        hours: t.hours.size,
        balance: balances.get(peer.id) ?? { weOweKwh: 0, theyOweKwh: 0 },
      };
    })
    .sort((a, b) => b.importKwh + b.exportKwh - (a.importKwh + a.exportKwh) || RELATIONS[a.relation].rank - RELATIONS[b.relation].rank);

  const matchedImport = ranking.reduce((s, r) => s + r.importKwh, 0);
  const matchedExport = ranking.reduce((s, r) => s + r.exportKwh, 0);
  return {
    asOf,
    until,
    ownDeficitKwh: ownDeficit,
    ownSurplusKwh: ownSurplus,
    matchedImportKwh: matchedImport,
    matchedExportKwh: matchedExport,
    // Bought from neighbours instead of the grid, sold to them instead of feeding in.
    savingEur: (matchedImport * (PRICES.gridCt - FEDERATION_PRICE_CT)) / 100,
    extraEur: (matchedExport * (FEDERATION_PRICE_CT - PRICES.feedInCt)) / 100,
    pick: ranking.find((r) => r.legality.allowed && r.importKwh + r.exportKwh > 0) ?? null,
    ranking,
    hours: [...hours.values()].filter((h) => h.deficitKwh + h.surplusKwh > 0.01),
  };
}
