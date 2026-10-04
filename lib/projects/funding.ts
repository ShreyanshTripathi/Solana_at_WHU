import { and, eq, isNotNull, lt } from "drizzle-orm";
import { db, schema } from "@/db/client";

const { projects, investments } = schema;
const DAY_MS = 24 * 60 * 60 * 1000;
export const FUNDING_DAYS = { min: 7, max: 90, default: 30 };

export const fundingDeadlineFrom = (now: number, days: number) => now + days * DAY_MS;

// A round that hasn't reached its target by the deadline is called off and every investor refunded.
// In the demo the funds were only recorded, so the refund is recorded too; in production the
// cooperative's escrow sends the money back. Runs before anyone looks at or invests in projects.
export function expireFundingRounds(now = Date.now()): string[] {
  const missed = db
    .select()
    .from(projects)
    .where(and(eq(projects.state, "funding"), isNotNull(projects.fundingDeadline), lt(projects.fundingDeadline, now)))
    .all();
  if (missed.length === 0) return [];
  db.transaction((tx) => {
    for (const p of missed) {
      tx.update(projects).set({ state: "refunded" }).where(eq(projects.id, p.id)).run();
      tx.update(investments).set({ refundedAt: now }).where(eq(investments.projectId, p.id)).run();
    }
  });
  return missed.map((p) => p.id);
}
