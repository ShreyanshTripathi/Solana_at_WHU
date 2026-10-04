import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { hourRecord } from "@/lib/settlement/publish";
import { recordHash, recordJson } from "@/lib/settlement/record";

export const dynamic = "force-dynamic";

// GET /api/public/hour/<batchId>: the exact bytes whose SHA-256 is in the hour's Solana memo.
// Public on purpose: `curl … | shasum -a 256` checks it without trusting Volty's page.
export async function GET(_: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const batch = db.select().from(schema.settlementBatches).where(eq(schema.settlementBatches.id, batchId)).get();
  if (!batch) return new Response("No such hour.", { status: 404 });
  const record = hourRecord(batch.periodStart, batch.periodEnd);
  return new Response(recordJson(record), {
    headers: { "Content-Type": "application/json", "X-Sha256": recordHash(record), "Cache-Control": "no-store" },
  });
}
