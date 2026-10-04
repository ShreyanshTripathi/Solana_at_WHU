import { PRICES } from "@/lib/config";
import { legality, type Legality, RELATIONS, type Relation } from "./topology";

// Matching between communities (pure). Each interval, after its members have shared among
// themselves, a community has either surplus left or demand left. The federation matches that with
// other communities, nearest first, within what the law allows:
//  1. Credits are repaid in kind first: a community that borrowed energy gives it back as soon as it
//     has surplus while its lender is short.
//  2. New exchanges go to the nearest allowed community that can help (same substation before the
//     same grid area before an adjacent area); among equals, the one that can help most.
//  3. With a credit partner, energy is borrowed or lent (repaid in kind later) up to a limit per
//     partner; beyond it, or with a trade partner, it is paid at the federation price every hour.

// Halfway between the feed-in tariff and the grid price: both sides are better off than with the grid.
export const FEDERATION_PRICE_CT = (PRICES.feedInCt + PRICES.gridCt) / 2;
export const CREDIT_LIMIT_KWH = 150;
const MIN_KWH = 0.001;

export interface PeerPosition {
  id: string;
  relation: Relation;
  mode: "trade" | "credit";
  netKwh: number; // + surplus left, - demand left, this interval
  weOweKwh: number; // energy we borrowed from them and haven't repaid
  theyOweKwh: number; // energy we lent them
}

export interface Flow {
  peerId: string;
  direction: "import" | "export";
  kind: "trade" | "credit" | "repay";
  kwh: number;
  priceCt: number;
}

export interface Excluded {
  peerId: string;
  legality: Exclude<Legality, { allowed: true }>;
}

const byProximity = (a: PeerPosition, b: PeerPosition) => RELATIONS[a.relation].rank - RELATIONS[b.relation].rank;

export function matchFederation(ours: { surplusKwh: number; deficitKwh: number }, peers: PeerPosition[], ts: number) {
  const flows: Flow[] = [];
  const excluded: Excluded[] = [];
  const allowed: PeerPosition[] = [];
  for (const p of peers) {
    const l = legality(p.relation, ts);
    if (l.allowed) allowed.push({ ...p });
    else excluded.push({ peerId: p.id, legality: l });
  }
  let surplus = ours.surplusKwh;
  let deficit = ours.deficitKwh;
  const add = (peer: PeerPosition, direction: Flow["direction"], kind: Flow["kind"], kwh: number) => {
    if (kwh < MIN_KWH) return;
    flows.push({ peerId: peer.id, direction, kind, kwh, priceCt: kind === "trade" ? FEDERATION_PRICE_CT : 0 });
    peer.netKwh += direction === "import" ? -kwh : kwh;
    if (direction === "import") deficit -= kwh;
    else surplus -= kwh;
    if (kind === "repay" && direction === "export") peer.weOweKwh -= kwh;
    if (kind === "repay" && direction === "import") peer.theyOweKwh -= kwh;
    if (kind === "credit" && direction === "import") peer.weOweKwh += kwh;
    if (kind === "credit" && direction === "export") peer.theyOweKwh += kwh;
  };

  // 1. Repay credits in kind.
  for (const p of [...allowed].sort(byProximity)) {
    if (surplus > 0 && p.netKwh < 0 && p.weOweKwh > 0) add(p, "export", "repay", Math.min(surplus, -p.netKwh, p.weOweKwh));
    if (deficit > 0 && p.netKwh > 0 && p.theyOweKwh > 0) add(p, "import", "repay", Math.min(deficit, p.netKwh, p.theyOweKwh));
  }

  // 2 and 3. New exchanges, nearest first, then the one that can help most.
  if (deficit > MIN_KWH) {
    const helpers = allowed.filter((p) => p.netKwh > MIN_KWH).sort((a, b) => byProximity(a, b) || b.netKwh - a.netKwh);
    for (const p of helpers) {
      if (deficit <= MIN_KWH) break;
      let kwh = Math.min(deficit, p.netKwh);
      if (p.mode === "credit") {
        const borrow = Math.min(kwh, Math.max(0, CREDIT_LIMIT_KWH - p.weOweKwh));
        add(p, "import", "credit", borrow);
        kwh -= borrow;
      }
      add(p, "import", "trade", kwh);
    }
  }
  if (surplus > MIN_KWH) {
    const takers = allowed.filter((p) => p.netKwh < -MIN_KWH).sort((a, b) => byProximity(a, b) || a.netKwh - b.netKwh);
    for (const p of takers) {
      if (surplus <= MIN_KWH) break;
      let kwh = Math.min(surplus, -p.netKwh);
      if (p.mode === "credit") {
        const lend = Math.min(kwh, Math.max(0, CREDIT_LIMIT_KWH - p.theyOweKwh));
        add(p, "export", "credit", lend);
        kwh -= lend;
      }
      add(p, "export", "trade", kwh);
    }
  }
  return { flows, excluded };
}

// Credits are repaid oldest first. Returns how much of each lot is still open after `repaidKwh`.
export function repayLots(lots: { id: number; remainingKwh: number }[], repaidKwh: number): { id: number; remainingKwh: number }[] {
  let left = repaidKwh;
  return lots.map((lot) => {
    const take = Math.min(lot.remainingKwh, Math.max(0, left));
    left -= take;
    return { id: lot.id, remainingKwh: lot.remainingKwh - take };
  });
}

export const CREDIT_DAYS = 30;

// What one hour's exchanges cost (+ we pay) or earn (- we receive) per community, in micro-euros.
export function netMoneyByPeer(flows: { peerId: string; direction: string; kind: string; kwh: number; priceCt: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const f of flows) {
    if (f.kind !== "trade" && f.kind !== "credit_settled") continue;
    const micro = Math.round(f.kwh * f.priceCt * 10_000);
    out.set(f.peerId, (out.get(f.peerId) ?? 0) + (f.direction === "import" ? micro : -micro));
  }
  return out;
}
