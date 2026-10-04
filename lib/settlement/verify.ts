import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { getConnection } from "@/lib/solana/wallets";
import { hourRecord } from "./publish";
import { MEMO_HASH, recordHash, recordJson } from "./record";

const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export const recentBatches = (limit = 48) =>
  db.select().from(schema.settlementBatches).orderBy(desc(schema.settlementBatches.periodStart)).limit(limit).all();

// The memo of one of the hour's transactions, read back from Solana.
async function memoOf(signature: string): Promise<string | null> {
  const tx = await getConnection().getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
  for (const ix of tx?.transaction.message.instructions ?? []) {
    if (ix.programId.toBase58() === MEMO_PROGRAM && "parsed" in ix) return String(ix.parsed);
  }
  return null;
}

export type HashCheck = "match" | "mismatch" | "legacy" | "unavailable" | "none";

// Recomputes an hour's record now and compares it with what was stored and with what is on-chain.
export async function verifyHour(batchId: string) {
  const batch = db.select().from(schema.settlementBatches).where(eq(schema.settlementBatches.id, batchId)).get();
  if (!batch) return null;
  const record = hourRecord(batch.periodStart, batch.periodEnd);
  const recomputed = recordHash(record);

  let chainHash: string | null = null;
  let chain: HashCheck = "none";
  const signature = batch.txSignatures[0];
  if (signature) {
    try {
      const memo = await memoOf(signature);
      chainHash = memo?.match(MEMO_HASH)?.[1] ?? null;
      chain = chainHash ? (chainHash === recomputed ? "match" : "mismatch") : memo ? "legacy" : "unavailable";
    } catch {
      chain = "unavailable";
    }
  }
  return {
    batch,
    record,
    bytes: recordJson(record).length,
    recomputed,
    stored: batch.allocationHash,
    storedMatches: batch.allocationHash === recomputed,
    chain,
    chainHash,
    signature,
  };
}
