import "server-only";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { localMidnight, localTime } from "@/lib/sim/clock";

// The payment agent: suggests the monthly spending limit a buyer approves for peer-to-peer payments.
// It learns from the buyer's last 14 days how much they buy from neighbours each day and at what
// price, projects that to the end of the month, and adds a 20% buffer. Too low a limit means the
// Stadtwerk has to cover the buyer; too high gives the settlement key more room than it needs.

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 14;
const BUFFER = 1.2;

export interface LimitSuggestion {
  limitEur: number;
  dailyKwh: number;
  priceCt: number;
  daysLeft: number;
  needEur: number;
}

export function suggestSpendingLimit(memberId: string, asOf: number): LimitSuggestion | null {
  const site = db.select().from(schema.sites).where(and(eq(schema.sites.memberId, memberId), isNull(schema.sites.closedAt))).get();
  if (!site) return null;
  const from = localMidnight(asOf) - HISTORY_DAYS * DAY_MS;
  const bought = db
    .select({ ts: schema.allocations.ts, kwh: schema.allocations.kwh, priceCt: schema.allocations.priceCt })
    .from(schema.allocations)
    .where(and(eq(schema.allocations.buyerSiteId, site.id), eq(schema.allocations.kind, "final"), gte(schema.allocations.ts, from), lte(schema.allocations.ts, asOf)))
    .all();
  const firstReading = db
    .select({ ts: schema.intervalReadings.ts })
    .from(schema.intervalReadings)
    .where(and(eq(schema.intervalReadings.siteId, site.id), gte(schema.intervalReadings.ts, from)))
    .orderBy(schema.intervalReadings.ts)
    .get();
  if (!firstReading) return null;

  const days = Math.max(1, (asOf - firstReading.ts) / DAY_MS);
  const kwh = bought.reduce((s, a) => s + a.kwh, 0);
  const cost = bought.reduce((s, a) => s + a.kwh * a.priceCt, 0); // ct
  const dailyKwh = kwh / days;
  const priceCt = kwh > 0 ? cost / kwh : 20;

  const { dateKey } = localTime(asOf);
  const [y, m] = dateKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const daysLeft = Math.max(1, daysInMonth - Number(dateKey.slice(8, 10)) + 1);
  const needEur = (dailyKwh * priceCt * daysLeft) / 100;
  const limitEur = Math.min(500, Math.max(5, Math.ceil((needEur * BUFFER) / 5) * 5));
  return { limitEur, dailyKwh, priceCt, daysLeft, needEur };
}
