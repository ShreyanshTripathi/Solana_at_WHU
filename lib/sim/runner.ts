import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { INTERVAL_MS, MICRO_PER_EUR } from "@/lib/config";
import { processInterval } from "@/lib/pipeline/interval";
import { settlePeriod, type SettlementResult } from "@/lib/settlement/settle";
import { localMidnight, localTime } from "./clock";

// Runs the neighbourhood forward in 15-minute steps and settles each hour. Used by `npm run sim`
// and by the live demo. The simulation clock is saved, so each run continues where the last stopped.

const HOUR_MS = 60 * 60 * 1000;
const CLOCK_KEY = "clock";

export interface HourResult {
  hourStart: number;
  generationKwh: number;
  sharedKwh: number;
  toGridKwh: number;
  paidEur: number;
  settlement: SettlementResult | null;
}

export function simClock(): number {
  const saved = db
    .select()
    .from(schema.simState)
    .where(eq(schema.simState.key, CLOCK_KEY))
    .get();
  return saved ? Number(saved.value) : localMidnight(Date.now());
}

const saveClock = (ts: number) =>
  db
    .insert(schema.simState)
    .values({ key: CLOCK_KEY, value: String(ts) })
    .onConflictDoUpdate({
      target: schema.simState.key,
      set: { value: String(ts) },
    })
    .run();

// Hours from the clock until `localHour` o'clock, on the next day that has room to show a full morning.
export function hoursUntil(localHour: number, from = simClock()): number {
  const { minuteOfDay } = localTime(from);
  const today = localHour * 60 - minuteOfDay;
  return Math.ceil((today > 6 * 60 ? today : today + 24 * 60) / 60);
}

export async function runSimulation(opts: {
  hours: number;
  settle: boolean; // pay on Solana devnet, or only record the settlement
  from?: number;
  delayMs?: number;
  onHour?: (result: HourResult) => void;
  shouldStop?: () => boolean; // checked after each settled hour, so a stop never leaves an hour half paid
}): Promise<void> {
  let ts = opts.from ?? simClock();
  let hour = { generation: 0, shared: 0, toGrid: 0 };
  for (let i = 0; i < opts.hours * 4; i++) {
    const summary = processInterval(ts);
    hour.generation += summary.generationKwh;
    hour.shared += summary.sharedKwh;
    hour.toGrid += summary.exportedToGridKwh;
    ts += INTERVAL_MS;
    saveClock(ts);

    if (localTime(ts).minuteOfDay % 60 === 0) {
      const settlement = await settlePeriod(ts - HOUR_MS, ts, opts.settle);
      const paid = settlement
        ? settlement.payouts.reduce((sum, p) => sum + p.amountMicro, 0) /
          MICRO_PER_EUR
        : 0;
      opts.onHour?.({
        hourStart: ts - HOUR_MS,
        generationKwh: hour.generation,
        sharedKwh: hour.shared,
        toGridKwh: hour.toGrid,
        paidEur: paid,
        settlement,
      });
      hour = { generation: 0, shared: 0, toGrid: 0 };
      if (opts.shouldStop?.()) return;
    }
    // Pause between steps, or at least let the server answer requests (the demo runs inside the app).
    await new Promise((resolve) =>
      opts.delayMs ? setTimeout(resolve, opts.delayMs) : setImmediate(resolve),
    );
  }
}
