// Runs the neighbourhood forward in 15-minute steps and settles each hour.
//   npm run sim -- --hours 24                 simulate a day, settlement recorded locally
//   npm run sim -- --hours 24 --settle        also pay out on devnet (needs setup:devnet)
//   npm run sim -- --date 2026-10-01 --delay 3000   start on a date, pause between intervals
import { parseArgs } from "node:util";
import { localMidnight, localTime } from "@/lib/sim/clock";
import { runSimulation } from "@/lib/sim/runner";
import { explorerTxUrl } from "@/lib/solana/wallets";

const { values } = parseArgs({
  options: {
    hours: { type: "string", default: "24" },
    date: { type: "string" },
    settle: { type: "boolean", default: false },
    delay: { type: "string", default: "0" },
  },
});

const hhmm = (ts: number) => {
  const { minuteOfDay, dateKey } = localTime(ts);
  return `${dateKey} ${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
};

runSimulation({
  hours: Number(values.hours),
  settle: values.settle,
  from: values.date ? localMidnight(Date.parse(`${values.date}T12:00:00Z`)) : undefined,
  delayMs: Number(values.delay),
  onHour: (h) => {
    const r = h.settlement;
    console.log(
      `${hhmm(h.hourStart)}  generated ${h.generationKwh.toFixed(2)} kWh  shared ${h.sharedKwh.toFixed(2)} kWh  ` +
        `to grid ${h.toGridKwh.toFixed(2)} kWh  paid €${h.paidEur.toFixed(2)}${r ? ` (${r.status})` : ""}`,
    );
    if (r?.error) console.log(`  settlement failed: ${r.error}`);
    for (const signature of r?.signatures ?? []) console.log(`  ${explorerTxUrl(signature)}`);
  },
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
