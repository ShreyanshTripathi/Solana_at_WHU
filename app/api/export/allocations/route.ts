import { and, eq, gte, lt } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { isAdmin } from "@/lib/auth/policy";
import { getCurrentMember } from "@/lib/auth/session";
import { INTERVAL_MINUTES } from "@/lib/config";
import { localMidnight } from "@/lib/sim/clock";

export const dynamic = "force-dynamic";

// One local day of final allocations as CSV: what the supplier and grid operator need to book shared power.
// Stadtwerk staff only: it lists every member's trades.
export async function GET(request: Request) {
  const me = await getCurrentMember();
  if (!me) return new Response("Log in first.", { status: 401 });
  if (!isAdmin(me)) return new Response("Only Stadtwerk staff can export allocations.", { status: 403 });
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response("Pass ?date=YYYY-MM-DD", { status: 400 });
  }
  const from = localMidnight(Date.parse(`${date}T12:00:00Z`));
  const rows = db
    .select()
    .from(schema.allocations)
    .where(and(eq(schema.allocations.kind, "final"), gte(schema.allocations.ts, from), lt(schema.allocations.ts, from + 86_400_000)))
    .orderBy(schema.allocations.ts)
    .all();

  const lines = [
    "interval_start_utc,interval_minutes,seller_site,buyer_site,kwh,price_ct_per_kwh,settlement_batch",
    ...rows.map((r) =>
      [new Date(r.ts).toISOString(), INTERVAL_MINUTES, r.sellerSiteId, r.buyerSiteId, r.kwh.toFixed(4), r.priceCt, r.batchId ?? ""].join(","),
    ),
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kiezwatt-allocations-${date}.csv"`,
    },
  });
}
