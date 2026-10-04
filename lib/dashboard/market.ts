import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db/client";

// How the community trades and pays right now (set on the Stadtwerk admin page).
export function marketSettings() {
  const c = db.select().from(schema.communities).get();
  return { priceMode: c?.priceMode ?? "fixed", settlementMode: c?.settlementMode ?? "supplier", communityPriceCt: c?.communityPriceCt ?? 0 };
}

// The auction's clearing prices for one day up to `asOf`, for the price chart.
export function marketDay(dayStart: number, asOf: number) {
  const points = db
    .select({ ts: schema.clearingPrices.ts, priceCt: schema.clearingPrices.priceCt, tradedKwh: schema.clearingPrices.tradedKwh })
    .from(schema.clearingPrices)
    .where(and(gte(schema.clearingPrices.ts, dayStart), lte(schema.clearingPrices.ts, asOf)))
    .orderBy(schema.clearingPrices.ts)
    .all();
  const traded = points.filter((p) => p.tradedKwh > 0);
  const kwh = traded.reduce((s, p) => s + p.tradedKwh, 0);
  return {
    points,
    nowCt: traded.at(-1)?.priceCt ?? null,
    averageCt: kwh > 0 ? traded.reduce((s, p) => s + p.priceCt * p.tradedKwh, 0) / kwh : null, // weighted by kWh traded
  };
}

export const latestClearingPrice = (asOf: number) =>
  db.select().from(schema.clearingPrices).where(lte(schema.clearingPrices.ts, asOf)).orderBy(schema.clearingPrices.ts).all().at(-1) ?? null;

export const isAuction = () => db.select().from(schema.communities).where(eq(schema.communities.priceMode, "auction")).get() !== undefined;
