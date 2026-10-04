import { distanceM, type Point } from "@/lib/geo";

// Greedy matching for one community and one interval (design doc, section 11).
// Anchor agreements are served first; the rest goes to the cheapest allowed pairs,
// where cost = distance, minus a bonus when the buyer prefers the seller
// or the seller gives the buyer priority.

export interface Supply extends Point {
  siteId: string;
  memberId: string;
  kwh: number;
  minPriceCt: number;
  priorityBuyers?: string[]; // buyer member ids this seller serves first
}

export interface Demand extends Point {
  siteId: string;
  memberId: string;
  kwh: number;
  maxPriceCt: number;
  maxDistanceM: number;
  preferred: string[]; // seller member ids
  blocked: string[]; // seller member ids
  anchor?: { remainingKwh: number; priceCt: number };
}

export interface Allocation {
  sellerSiteId: string;
  buyerSiteId: string;
  kwh: number;
  priceCt: number;
}

export interface MatchOptions {
  priceCt: number;
  costPerKm?: number;
  preferredBonus?: number; // in km-equivalents
}

const MIN_KWH = 0.0001;
const round4 = (x: number) => Math.floor(x * 10_000) / 10_000;

export function matchInterval(supplies: Supply[], demands: Demand[], options: MatchOptions): Allocation[] {
  const { priceCt, costPerKm = 1, preferredBonus = 2 } = options;
  const left = new Map(supplies.map((s) => [s.siteId, s.kwh]));
  const need = new Map(demands.map((d) => [d.siteId, d.kwh]));
  const out: Allocation[] = [];

  const take = (s: Supply, d: Demand, cap: number, price: number): number => {
    const kwh = round4(Math.min(left.get(s.siteId)!, need.get(d.siteId)!, cap));
    if (kwh < MIN_KWH) return 0;
    left.set(s.siteId, left.get(s.siteId)! - kwh);
    need.set(d.siteId, need.get(d.siteId)! - kwh);
    out.push({ sellerSiteId: s.siteId, buyerSiteId: d.siteId, kwh, priceCt: price });
    return kwh;
  };

  const allowed = (s: Supply, d: Demand, price: number) =>
    s.siteId !== d.siteId &&
    price >= s.minPriceCt &&
    !d.blocked.includes(s.memberId) &&
    distanceM(s, d) <= d.maxDistanceM;

  // 1. Anchor agreements, nearest sellers first, up to the remaining daily cap.
  for (const d of demands) {
    if (!d.anchor) continue;
    let cap = d.anchor.remainingKwh;
    const nearest = [...supplies].sort((a, b) => distanceM(a, d) - distanceM(b, d));
    for (const s of nearest) {
      if (cap < MIN_KWH) break;
      if (allowed(s, d, d.anchor.priceCt)) cap -= take(s, d, cap, d.anchor.priceCt);
    }
  }

  // 2. Everyone else at the community price, cheapest pairs first.
  const pairs: { s: Supply; d: Demand; cost: number }[] = [];
  for (const s of supplies) {
    for (const d of demands) {
      if (!allowed(s, d, priceCt) || priceCt > d.maxPriceCt) continue;
      const cost =
        (distanceM(s, d) / 1000) * costPerKm -
        (d.preferred.includes(s.memberId) ? preferredBonus : 0) -
        (s.priorityBuyers?.includes(d.memberId) ? preferredBonus : 0);
      pairs.push({ s, d, cost });
    }
  }
  pairs.sort((a, b) => a.cost - b.cost);
  for (const { s, d } of pairs) take(s, d, Infinity, priceCt);

  return mergeAllocations(out);
}

// An anchor buyer may get energy from one seller at two prices; keep one row per pair and price.
function mergeAllocations(rows: Allocation[]): Allocation[] {
  const merged = new Map<string, Allocation>();
  for (const r of rows) {
    const key = `${r.sellerSiteId}|${r.buyerSiteId}|${r.priceCt}`;
    const existing = merged.get(key);
    if (existing) existing.kwh = round4(existing.kwh + r.kwh);
    else merged.set(key, { ...r });
  }
  return [...merged.values()];
}
