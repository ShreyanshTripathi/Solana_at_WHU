import "server-only";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { demoState } from "@/lib/demo/run";
import { simClock } from "@/lib/sim/runner";

// A small fingerprint of "what's new": the simulation clock, the latest settlement and the demo's
// state (so the Run/Stop/Reset buttons follow a stop or reset without a new hour). A page renders
// with it and polls /api/live, and redraws when the two differ.
export function liveKey(): { key: string; running: boolean } {
  const latest = db
    .select()
    .from(schema.settlementBatches)
    .orderBy(desc(schema.settlementBatches.periodStart))
    .get();
  const demo = demoState();
  const demoKey = `${demo.running}|${demo.startedAt ?? ""}|${demo.stopping ?? ""}`;
  return {
    key: `${simClock()}|${latest?.id ?? ""}|${latest?.status ?? ""}|${latest?.txSignatures.length ?? 0}|${demoKey}`,
    running: demo.running,
  };
}
