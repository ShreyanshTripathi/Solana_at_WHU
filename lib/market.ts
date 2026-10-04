import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { PRICES } from "@/lib/config";
import { buyerTranches, type Clearing, clearAuction, sellerTranches } from "@/lib/match/auction";
import { type Allocation, type Demand, matchInterval, type Supply } from "@/lib/match/engine";
import { localMidnight, localTime } from "@/lib/sim/clock";
import { smeStatus } from "@/lib/sme";

const { communities, sites, sellerRules, buyerRules, anchorAgreements, allocations, members, businessProfiles } = schema;

// Everything matching needs besides the meter values; load once, reuse across intervals.
export function loadMarketContext() {
  const community = db.select().from(communities).get();
  if (!community) throw new Error("No community found. Run `npm run seed` first.");
  return {
    community,
    siteById: new Map(db.select().from(sites).all().map((s) => [s.id, s])),
    sellerRuleByMember: new Map(db.select().from(sellerRules).all().map((r) => [r.memberId, r])),
    buyerRuleByMember: new Map(db.select().from(buyerRules).all().map((r) => [r.memberId, r])),
    anchors: db.select().from(anchorAgreements).all(),
    // Businesses and their SME check; households aren't in here and always take part.
    smeByMember: new Map(
      db
        .select({ id: members.id, verified: members.smeVerified, checkedAt: businessProfiles.checkedAt })
        .from(members)
        .leftJoin(businessProfiles, eq(businessProfiles.memberId, members.id))
        .where(eq(members.kind, "sme"))
        .all()
        .map((r) => [r.id, r]),
    ),
  };
}

export type MarketContext = ReturnType<typeof loadMarketContext>;

export interface MeterRow {
  siteId: string;
  exportKwh: number;
  importKwh: number;
}

// kWh an anchor buyer has already taken at its anchor price today, before `ts`.
export type AnchorUsage = (buyerSiteId: string, priceCt: number, dayStart: number, ts: number) => number;

export const anchorUsageFromDb: AnchorUsage = (buyerSiteId, priceCt, dayStart, ts) =>
  db
    .select({ kwh: sql<number>`coalesce(sum(${allocations.kwh}), 0)` })
    .from(allocations)
    .where(
      and(
        eq(allocations.buyerSiteId, buyerSiteId),
        eq(allocations.kind, "final"),
        eq(allocations.priceCt, priceCt),
        gte(allocations.ts, dayStart),
        lt(allocations.ts, ts),
      ),
    )
    .get()?.kwh ?? 0;

// Turn one interval's meter values into the supplies and demands the matching engine takes.
export function buildMarket(ctx: MarketContext, ts: number, rows: MeterRow[], anchorUsage: AnchorUsage) {
  const local = localTime(ts);
  const dayStart = localMidnight(ts);
  const activeAnchors = ctx.anchors.filter(
    (a) =>
      (!a.weekdaysOnly || (local.weekday >= 1 && local.weekday <= 5)) &&
      local.minuteOfDay >= a.fromMinute &&
      local.minuteOfDay < a.toMinute,
  );

  // A business only shares energy while its SME check is valid; until then the utility supplies it as usual.
  const takesPart = (siteId: string) => {
    const sme = ctx.smeByMember.get(ctx.siteById.get(siteId)!.memberId);
    return !sme || smeStatus(sme.verified, sme.checkedAt, ts) === "eligible";
  };

  const supplies: Supply[] = rows
    .filter((r) => r.exportKwh > 0 && takesPart(r.siteId))
    .map((r) => {
      const site = ctx.siteById.get(r.siteId)!;
      const rule = ctx.sellerRuleByMember.get(site.memberId);
      return {
        siteId: site.id,
        memberId: site.memberId,
        lat: site.lat,
        lon: site.lon,
        kwh: r.exportKwh,
        minPriceCt: rule?.minPriceCt ?? 0,
        priorityBuyers: rule?.priorityBuyers ?? [],
      };
    });

  const demands: Demand[] = rows
    .filter((r) => r.importKwh > 0 && takesPart(r.siteId))
    .map((r) => {
      const site = ctx.siteById.get(r.siteId)!;
      const rule = ctx.buyerRuleByMember.get(site.memberId);
      const agreement = activeAnchors.find((a) => a.memberId === site.memberId);
      const anchor = agreement
        ? {
            remainingKwh: Math.max(0, agreement.maxKwhPerDay - anchorUsage(site.id, agreement.priceCt, dayStart, ts)),
            priceCt: agreement.priceCt,
          }
        : undefined;
      return {
        siteId: site.id,
        memberId: site.memberId,
        lat: site.lat,
        lon: site.lon,
        kwh: r.importKwh,
        // Without a rule a buyer accepts the community price, or in an auction anything up to the grid price.
        maxPriceCt: rule?.maxPriceCt ?? (ctx.community.priceMode === "auction" ? PRICES.gridCt : ctx.community.communityPriceCt),
        maxDistanceM: rule?.maxDistanceM ?? 5_000,
        preferred: rule?.preferred ?? [],
        blocked: rule?.blocked ?? [],
        anchor,
      };
    });

  return { supplies, demands, priceCt: ctx.community.communityPriceCt };
}

export interface ClearedInterval {
  allocations: Allocation[];
  clearing: Clearing | null; // the auction's result; null in fixed-price mode
  // For the trading agents' price forecast: what one more kWh would sell for, and what one more would cost.
  marginal?: { sellCt: number; buyCt: number };
}

const PROBE_KWH = 0.25;
const PROBE = "__probe";

const MIN_KWH = 0.0001;
const totals = (rows: Allocation[], key: "sellerSiteId" | "buyerSiteId") => {
  const out = new Map<string, number>();
  for (const r of rows) out.set(r[key], (out.get(r[key]) ?? 0) + r.kwh);
  return out;
};

// Who supplies whom in one interval, and at what price.
// Fixed mode: everyone at the community price. Auction mode (1b): anchor agreements first at their
// fixed price, then a double auction sets one clearing price for the rest, and the matching engine
// decides who supplies whom within what cleared (nearest, preferred and priority buyers first).
export function clearMarket(ctx: MarketContext, market: ReturnType<typeof buildMarket>, opts: { marginal?: boolean } = {}): ClearedInterval {
  const floor = PRICES.feedInCt;
  const cap = PRICES.gridCt;
  if (ctx.community.priceMode !== "auction") {
    const allocations = matchInterval(market.supplies, market.demands, { priceCt: market.priceCt });
    if (!opts.marginal) return { allocations, clearing: null };
    // Fixed price: one more kWh sells at the community price if some demand is left, else it is fed in.
    const traded = allocations.reduce((s, a) => s + a.kwh, 0);
    const supply = market.supplies.reduce((s, x) => s + x.kwh, 0);
    const demand = market.demands.reduce((s, x) => s + x.kwh, 0);
    return {
      allocations,
      clearing: null,
      marginal: { sellCt: demand - traded > PROBE_KWH ? market.priceCt : floor, buyCt: supply - traded > PROBE_KWH ? market.priceCt : cap },
    };
  }

  // 1. Anchor agreements keep their fixed price and go first (an infinite price leaves out everything else).
  const anchorDemands = market.demands.filter((d) => d.anchor).map((d) => ({ ...d, kwh: Math.min(d.kwh, d.anchor!.remainingKwh) }));
  const anchored = matchInterval(market.supplies, anchorDemands, { priceCt: Infinity });
  const soldToAnchors = totals(anchored, "sellerSiteId");
  const boughtByAnchors = totals(anchored, "buyerSiteId");
  const supplies = market.supplies
    .map((s) => ({ ...s, kwh: s.kwh - (soldToAnchors.get(s.siteId) ?? 0) }))
    .filter((s) => s.kwh > MIN_KWH);
  const demands = market.demands
    .map((d) => ({ ...d, anchor: undefined, kwh: d.kwh - (boughtByAnchors.get(d.siteId) ?? 0) }))
    .filter((d) => d.kwh > MIN_KWH);

  // 2. The auction: agents bid each member's limits in tranches; one price clears the interval.
  const asks = supplies.flatMap((s) => sellerTranches({ siteId: s.siteId, kwh: s.kwh, limitCt: s.minPriceCt }, floor, cap));
  const bids = demands.flatMap((d) => buyerTranches({ siteId: d.siteId, kwh: d.kwh, limitCt: d.maxPriceCt }, floor, cap));
  const clearing = clearAuction(asks, bids, floor, cap);
  // One more kWh offered at the feed-in tariff, or asked for at the grid price: where would it clear?
  let marginal: ClearedInterval["marginal"];
  if (opts.marginal) {
    const sell = clearAuction([...asks, { siteId: PROBE, kwh: PROBE_KWH, priceCt: floor }], bids, floor, cap);
    const buy = clearAuction(asks, [...bids, { siteId: PROBE, kwh: PROBE_KWH, priceCt: cap }], floor, cap);
    marginal = {
      sellCt: (sell.sold.get(PROBE) ?? 0) > 1e-3 ? sell.priceCt : floor,
      buyCt: (buy.bought.get(PROBE) ?? 0) > 1e-3 ? buy.priceCt : cap,
    };
  }

  // 3. Who supplies whom at that price, within what each side cleared.
  const traded = matchInterval(
    supplies.map((s) => ({ ...s, kwh: clearing.sold.get(s.siteId) ?? 0 })).filter((s) => s.kwh > MIN_KWH),
    demands.map((d) => ({ ...d, kwh: clearing.bought.get(d.siteId) ?? 0 })).filter((d) => d.kwh > MIN_KWH),
    { priceCt: clearing.priceCt },
  );
  // Report what was actually delivered: distance and blocked-seller rules can leave a little unmatched.
  return { allocations: [...anchored, ...traded], clearing: { ...clearing, tradedKwh: traded.reduce((s, a) => s + a.kwh, 0) }, marginal };
}
