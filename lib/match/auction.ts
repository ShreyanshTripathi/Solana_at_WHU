// The 15-minute double auction (price mode "auction", option 1b). Pure, so every rule has a test.
//
// 1. Trading agents turn each member's limits into price tranches: a seller offers half its surplus
//    at its minimum price and the rest a little higher; a buyer bids half its demand at its maximum
//    price and the rest a little lower. That makes real supply and demand curves.
// 2. The clearing price is the lowest price at which offered supply covers demand. Plenty of midday
//    sun pushes it down towards the feed-in tariff; a cloudy evening pushes it up to the highest bids.
// 3. Everyone who trades pays or gets that one price. The longer side is cut back pro rata.
// The price never leaves [floor, cap]: below the feed-in tariff sellers would rather feed in, above
// the grid price buyers would rather buy from the grid.

export interface Order {
  siteId: string;
  kwh: number;
  limitCt: number; // seller: minimum price; buyer: maximum price
}

export interface Tranche {
  siteId: string;
  kwh: number;
  priceCt: number;
}

export interface Clearing {
  priceCt: number;
  supplyKwh: number; // offered in total
  demandKwh: number; // bid for in total
  tradedKwh: number;
  sold: Map<string, number>; // site -> kWh that cleared
  bought: Map<string, number>;
}

const SHARES = [0.5, 0.3, 0.2];
const STEPS = [0, 0.3, 0.6]; // how far each tranche moves from the limit towards the other end

export function sellerTranches(o: Order, floor: number, cap: number): Tranche[] {
  const min = Math.min(cap, Math.max(floor, o.limitCt));
  return SHARES.map((share, i) => ({ siteId: o.siteId, kwh: o.kwh * share, priceCt: min + STEPS[i] * (cap - min) }));
}

export function buyerTranches(o: Order, floor: number, cap: number): Tranche[] {
  const max = Math.max(floor, Math.min(cap, o.limitCt));
  return SHARES.map((share, i) => ({ siteId: o.siteId, kwh: o.kwh * share, priceCt: max - STEPS[i] * (max - floor) }));
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const sum = (xs: Tranche[]) => xs.reduce((s, x) => s + x.kwh, 0);

export function clearAuction(asks: Tranche[], bids: Tranche[], floor: number, cap: number): Clearing {
  const supplyKwh = sum(asks);
  const demandKwh = sum(bids);
  const empty = { supplyKwh, demandKwh, tradedKwh: 0, sold: new Map<string, number>(), bought: new Map<string, number>() };
  if (supplyKwh <= 0 || demandKwh <= 0) return { priceCt: floor, ...empty };

  const offered = (p: number) => sum(asks.filter((a) => a.priceCt <= p + 1e-9));
  const wanted = (p: number) => sum(bids.filter((b) => b.priceCt >= p - 1e-9));
  const candidates = [...new Set([floor, cap, ...asks.map((a) => a.priceCt), ...bids.map((b) => b.priceCt)])]
    .filter((p) => p >= floor && p <= cap)
    .sort((a, b) => a - b);
  // Lowest price where supply covers demand. If no price does, supply is short: it all sells at the
  // highest price anyone still bids.
  const price = candidates.find((p) => offered(p) >= wanted(p) && wanted(p) > 0) ?? candidates.filter((p) => wanted(p) > 0).at(-1) ?? cap;

  const s = offered(price);
  const d = wanted(price);
  const traded = Math.min(s, d);
  const sold = new Map<string, number>();
  const bought = new Map<string, number>();
  for (const a of asks.filter((x) => x.priceCt <= price + 1e-9)) sold.set(a.siteId, (sold.get(a.siteId) ?? 0) + (a.kwh * traded) / s);
  for (const b of bids.filter((x) => x.priceCt >= price - 1e-9)) bought.set(b.siteId, (bought.get(b.siteId) ?? 0) + (b.kwh * traded) / d);

  return { priceCt: round2(price), supplyKwh, demandKwh, tradedKwh: traded, sold, bought };
}
