import { and, eq, gt, isNull, lte, ne } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { agentControls } from "@/lib/agents/run";
import { runFederationInterval } from "@/lib/federation/run";
import { INTERVAL_MS, PRICES } from "@/lib/config";
import { anchorUsageFromDb, buildMarket, clearMarket, loadMarketContext } from "@/lib/market";
import type { Allocation } from "@/lib/match/engine";
import { energyAmountMicro, GRID, legsForAllocation, type ProjectTerms } from "@/lib/ledger/ledger";
import { chargeLimitFor } from "@/lib/sim/battery";
import { simulateInterval } from "@/lib/sim/simulator";

const { sites, intervalReadings, allocations, ledgerEntries, projects, investments, communities, settlementBatches } = schema;

export interface IntervalSummary {
  ts: number;
  generationKwh: number;
  sharedKwh: number;
  exportedToGridKwh: number;
  allocationCount: number;
}

// Simulate the meters, match surplus to demand, and post the ledger for one interval.
// Re-running an interval is safe: readings and allocations are replaced, ledger posting is skipped.
export function processInterval(ts: number): IntervalSummary {
  const community = db.select().from(communities).get();
  if (!community) throw new Error("No community found. Run `npm run seed` first.");
  const siteRows = db.select().from(sites).where(isNull(sites.closedAt)).all(); // closed workspaces stop trading
  const reserveByMember = new Map(db.select().from(schema.sellerRules).all().map((r) => [r.memberId, r.batteryReserveKwh]));

  const socBefore = new Map(
    siteRows.map((site) => {
      const previous = db
        .select({ socKwh: intervalReadings.socKwh })
        .from(intervalReadings)
        .where(and(eq(intervalReadings.siteId, site.id), eq(intervalReadings.ts, ts - INTERVAL_MS)))
        .get();
      return [site.id, previous?.socKwh ?? site.batteryKwh * 0.2];
    }),
  );
  // Homes with a trading agent: it decides the battery and the car's charging for this interval.
  const controls = agentControls(ts, siteRows, socBefore);
  const readings = siteRows.map((site) => {
    const chargeLimitKwh = chargeLimitFor(site.batteryKwh, reserveByMember.get(site.memberId));
    return simulateInterval({ ...site, chargeLimitKwh, ...controls.get(site.id) }, ts, socBefore.get(site.id)!);
  });

  for (const r of readings) {
    db.insert(intervalReadings)
      .values({ ...r, quality: "measured" })
      .onConflictDoUpdate({ target: [intervalReadings.siteId, intervalReadings.ts], set: { ...r } })
      .run();
  }

  const siteById = new Map(siteRows.map((s) => [s.id, s]));
  const ctx = loadMarketContext();
  const { allocations: matched, clearing } = clearMarket(ctx, buildMarket(ctx, ts, readings, anchorUsageFromDb));
  // Auction mode: keep each interval's clearing price for the price charts and the public record.
  if (clearing) {
    const row = { priceCt: clearing.priceCt, supplyKwh: clearing.supplyKwh, demandKwh: clearing.demandKwh, tradedKwh: clearing.tradedKwh };
    db.insert(schema.clearingPrices)
      .values({ communityId: community.id, ts, ...row })
      .onConflictDoUpdate({ target: [schema.clearingPrices.communityId, schema.clearingPrices.ts], set: row })
      .run();
  } else {
    db.delete(schema.clearingPrices).where(and(eq(schema.clearingPrices.communityId, community.id), eq(schema.clearingPrices.ts, ts))).run();
  }

  // A re-run of an interval that was already settled keeps its link to that batch.
  const settledIn = db
    .select({ id: settlementBatches.id })
    .from(settlementBatches)
    .where(and(lte(settlementBatches.periodStart, ts), gt(settlementBatches.periodEnd, ts), ne(settlementBatches.status, "failed")))
    .get();
  db.delete(allocations).where(and(eq(allocations.ts, ts), eq(allocations.kind, "final"))).run();
  if (matched.length > 0) {
    db.insert(allocations)
      .values(matched.map((a) => ({ ...a, communityId: community.id, ts, kind: "final" as const, batchId: settledIn?.id ?? null })))
      .run();
  }

  const alreadyPosted = db.select({ id: ledgerEntries.id }).from(ledgerEntries).where(eq(ledgerEntries.intervalTs, ts)).get();
  if (!alreadyPosted) postLedger(ts, matched, siteById, readings, community.supplierMemberId);

  const sharedKwh = matched.reduce((sum, a) => sum + a.kwh, 0);
  const exported = readings.reduce((sum, r) => sum + r.exportKwh, 0);
  // What the members couldn't share among themselves goes to the federation of nearby communities.
  const imported = readings.reduce((sum, r) => sum + r.importKwh, 0);
  runFederationInterval(ts, { surplusKwh: Math.max(0, exported - sharedKwh), deficitKwh: Math.max(0, imported - sharedKwh) });
  return {
    ts,
    generationKwh: readings.reduce((sum, r) => sum + r.generationKwh, 0),
    sharedKwh,
    exportedToGridKwh: Math.max(0, exported - sharedKwh),
    allocationCount: matched.length,
  };
}

// The grid's side of a funded roof: its power that no neighbour bought is fed into the grid and
// earns the feed-in tariff. The grid operator pays that to the roof's operator; here the Stadtwerk
// pays it (and claims it from the grid operator), and it is split like any sale of that roof.
function postLedger(
  ts: number,
  matched: Allocation[],
  siteById: Map<string, typeof sites.$inferSelect>,
  readings: { siteId: string; exportKwh: number }[],
  supplierMemberId: string,
): void {
  db.transaction((tx) => {
    const repayingRoof = (siteId: string) =>
      tx
        .select()
        .from(projects)
        .where(and(eq(projects.hostSiteId, siteId), eq(projects.state, "repaying")))
        .get();
    const post = (txnId: string, amount: number, buyerMemberId: string, sellerSiteId: string) => {
      const seller = siteById.get(sellerSiteId)!;
      const project = repayingRoof(seller.id);
      const positions = project ? tx.select().from(investments).where(eq(investments.projectId, project.id)).all() : [];
      const legs = legsForAllocation(
        amount,
        buyerMemberId,
        seller.memberId,
        project ? { terms: project as ProjectTerms, investors: positions } : undefined,
      );
      tx.insert(ledgerEntries)
        .values(legs.map((l) => ({ ...l, txnId, intervalTs: ts })))
        .run();
      if (project) applyProjectRepayment(tx, project, positions, legs);
    };

    for (const a of matched) {
      const amount = energyAmountMicro(a.kwh, a.priceCt);
      if (amount === 0) continue;
      post(`${ts}:${a.sellerSiteId}:${a.buyerSiteId}:${a.priceCt}`, amount, siteById.get(a.buyerSiteId)!.memberId, a.sellerSiteId);
    }

    for (const r of readings) {
      if (r.exportKwh <= 0 || !repayingRoof(r.siteId)) continue;
      const sold = matched.filter((a) => a.sellerSiteId === r.siteId).reduce((sum, a) => sum + a.kwh, 0);
      const amount = energyAmountMicro(Math.max(0, r.exportKwh - sold), PRICES.feedInCt);
      if (amount === 0) continue;
      post(`${ts}:${r.siteId}:${GRID}:${PRICES.feedInCt}`, amount, supplierMemberId, r.siteId);
    }
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function applyProjectRepayment(
  tx: Tx,
  project: typeof projects.$inferSelect,
  positions: (typeof investments.$inferSelect)[],
  legs: ReturnType<typeof legsForAllocation>,
): void {
  const toInvestors = legs.filter((l) => l.kind === "investor");
  const reserve = legs.filter((l) => l.kind === "reserve").reduce((sum, l) => sum + l.amountMicro, 0);
  const repaid = project.repaidMicro + toInvestors.reduce((sum, l) => sum + l.amountMicro, 0);
  const owedTotal = project.principalMicro + Math.floor((project.principalMicro * project.returnBps) / 10_000);

  tx.update(projects)
    .set({ repaidMicro: repaid, reserveMicro: project.reserveMicro + reserve, state: repaid >= owedTotal ? "paid_off" : project.state })
    .where(eq(projects.id, project.id))
    .run();
  for (const leg of toInvestors) {
    const position = positions.find((p) => p.investorMemberId === leg.accountId)!;
    tx.update(investments)
      .set({ repaidMicro: position.repaidMicro + leg.amountMicro })
      .where(eq(investments.id, position.id))
      .run();
  }
}
