import "server-only";
import { and, eq, gte, lt } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { saveAgentSettings } from "@/lib/agents/run";
import { ensurePeers, flowsIn } from "@/lib/federation/run";
import {
  type RegionCommunity,
  type RegionHour,
  regionCommunities,
  regionHour,
} from "@/lib/dashboard/regionMap";
import { suggestSpendingLimit } from "@/lib/agents/spending";
import { modelStatus, warmUp } from "@/lib/ai/ollama";
import { localTime } from "@/lib/sim/clock";
import { runSimulation, simClock } from "@/lib/sim/runner";
import {
  approveDemoSpending,
  revokeDemoSpending,
  topUpDemoWallet,
  walletStatusOf,
} from "@/lib/solana/demoWallet";
import { loadKeypair, readDevnetConfig } from "@/lib/solana/wallets";
import { warmVoice } from "@/lib/voice/models";

// The one-click live demo: switches on energy trading, peer-to-peer payments and the AI trading
// agents, prepares the demo buyers' wallets (the payment agent sets their limits; Dana stays
// unapproved so the Stadtwerk has to step in), wakes the local language and voice models, then
// simulates and settles a sunny day on Solana devnet, hour by hour.
// It runs in the background inside the app; the demo page polls its progress.

export type StepId = "settings" | "agents" | "wallets" | "ai" | "simulate";
export type StepStatus = "waiting" | "running" | "done" | "skipped" | "failed";

export interface DemoHour {
  hourStart: number;
  sharedKwh: number;
  priceCt: number | null; // the hour's average clearing price
  paidEur: number;
  status: string | null;
  mode: string | null;
  signatures: string[];
  neighboursInKwh: number; // from neighbouring communities (federation)
  neighboursOutKwh: number;
  region: RegionHour | null; // every community's position and the exchanges, for the live view
}

export interface DemoState {
  running: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  onChain: boolean;
  steps: Record<StepId, { status: StepStatus; detail?: string }>;
  hours: DemoHour[];
  totalHours: number;
  communities: RegionCommunity[] | null; // the federation, for the live view
  stopping: "stop" | "reset" | null; // asked to stop after the current hour (and then to clear the run)
  stopped: boolean; // ended early by a stop
  error?: string;
}

const fresh = (): DemoState => ({
  running: false,
  startedAt: null,
  finishedAt: null,
  onChain: false,
  steps: {
    settings: { status: "waiting" },
    agents: { status: "waiting" },
    wallets: { status: "waiting" },
    ai: { status: "waiting" },
    simulate: { status: "waiting" },
  },
  hours: [],
  totalHours: 0,
  communities: null,
  stopping: null,
  stopped: false,
});

// Kept on globalThis so the dev server's hot reloads don't lose a running demo.
const store = globalThis as unknown as { kiezwattDemo?: DemoState };
export const demoState = (): DemoState => (store.kiezwattDemo ??= fresh());

const member = (id: string) =>
  db.select().from(schema.members).where(eq(schema.members.id, id)).get();
const EUR = 1_000_000;

async function prepareWallets(): Promise<string> {
  const notes: string[] = [];
  for (const [id, topUpTo] of [
    ["ben", 25],
    ["baeckerei", 40],
  ] as const) {
    const m = member(id);
    if (!m) continue;
    const before = await walletStatusOf(m);
    if (before && before.balanceMicro < (topUpTo / 2) * EUR)
      await topUpDemoWallet(m, topUpTo);
    const limit = suggestSpendingLimit(id, simClock())?.limitEur ?? 30;
    await approveDemoSpending(m, limit);
    notes.push(`${m.name}: €${limit}`);
  }
  const dana = member("dana");
  if (dana && ((await walletStatusOf(dana))?.approvedMicro ?? 0) > 0)
    await revokeDemoSpending(dana);
  return notes.join(" · ");
}

const EV_CHARGER_KW = 11;

// Anna's battery and Ben's car get trading agents. Ben's site gets a wallbox if it has none.
function switchOnAgents(): string {
  if (member("anna")) saveAgentSettings("anna", { smartBattery: true });
  const ben = db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.memberId, "ben"))
    .get();
  if (ben) {
    if (ben.evChargerKw <= 0)
      db.update(schema.sites)
        .set({ evChargerKw: EV_CHARGER_KW })
        .where(eq(schema.sites.id, ben.id))
        .run();
    saveAgentSettings("ben", { smartEv: true });
  }
  return "Anna: smart battery · Ben: smart EV charging";
}

// Starts loading the language model and the voice models; they finish loading in the background
// while the day is simulated, so the demo doesn't wait (and a stop isn't held up) for them.
async function wakeModels(): Promise<{ ok: boolean; model: string }> {
  const status = await modelStatus();
  warmVoice();
  if (status.ok) void warmUp();
  return status;
}

// The hour's exchanges with neighbouring communities.
const neighbours = (from: number) => {
  const flows = flowsIn(from, from + 3_600_000);
  const sum = (d: string) =>
    flows.filter((f) => f.direction === d).reduce((s, f) => s + f.kwh, 0);
  return { neighboursInKwh: sum("import"), neighboursOutKwh: sum("export") };
};

const hourPrice = (from: number) => {
  const rows = db
    .select()
    .from(schema.clearingPrices)
    .where(
      and(
        gte(schema.clearingPrices.ts, from),
        lt(schema.clearingPrices.ts, from + 3_600_000),
      ),
    )
    .all()
    .filter((r) => r.tradedKwh > 0);
  const kwh = rows.reduce((s, r) => s + r.tradedKwh, 0);
  return kwh > 0
    ? rows.reduce((s, r) => s + r.priceCt * r.tradedKwh, 0) / kwh
    : null;
};

async function run(state: DemoState) {
  const step = (id: StepId, status: StepStatus, detail?: string) =>
    (state.steps[id] = { status, detail });
  try {
    step("settings", "running");
    ensurePeers();
    db.update(schema.communities)
      .set({
        priceMode: "auction",
        settlementMode: "p2p",
        federationEnabled: true,
      })
      .run();
    step("settings", "done");

    step("agents", "running");
    step("agents", "done", switchOnAgents());

    step("wallets", "running");
    if (state.onChain) step("wallets", "done", await prepareWallets());
    else step("wallets", "skipped");

    step("ai", "running");
    const models = await wakeModels();
    step(
      "ai",
      models.ok ? "done" : "skipped",
      models.ok ? `${models.model} · Whisper base · Piper` : "ollama",
    );

    // The chosen number of sunny hours. An evening or night on the clock is run through quickly
    // first (still settled), so the shown hours start with the morning sun.
    step("simulate", "running");
    const { fastForwardHours } = demoWindow();
    if (fastForwardHours > 0 && !state.stopping) {
      step(
        "simulate",
        "running",
        `fast-forward ${Math.round(fastForwardHours)} h to 0${MORNING}:00`,
      );
      await runSimulation({
        hours: fastForwardHours,
        settle: state.onChain,
        delayMs: state.onChain ? 0 : 20, // short breaks, so pages opened meanwhile still load
        shouldStop: () => state.stopping !== null,
      });
      step("simulate", "running");
    }
    state.communities = regionCommunities(simClock());
    if (!state.stopping)
      await runSimulation({
        hours: state.totalHours,
        settle: state.onChain,
        // On devnet each hour's payments set the pace; without it, slow down so the day can be followed.
        delayMs: state.onChain ? 0 : 150,
        shouldStop: () => state.stopping !== null,
        onHour: (h) => {
          state.hours.push({
            hourStart: h.hourStart,
            sharedKwh: h.sharedKwh,
            priceCt: hourPrice(h.hourStart),
            paidEur: h.paidEur,
            status: h.settlement?.status ?? null,
            mode: h.settlement ? (state.onChain ? "p2p" : null) : null,
            signatures: h.settlement?.signatures ?? [],
            ...neighbours(h.hourStart),
            region: state.communities ? regionHour(h.hourStart) : null,
          });
        },
      });
    step(
      "simulate",
      "done",
      state.stopping
        ? `stopped after ${state.hours.length} of ${state.totalHours} h`
        : undefined,
    );
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e);
    for (const id of Object.keys(state.steps) as StepId[])
      if (state.steps[id].status === "running") step(id, "failed", state.error);
  } finally {
    state.running = false;
    state.finishedAt = Date.now();
    state.stopped = state.stopping !== null;
    if (state.stopping === "reset" && store.kiezwattDemo === state)
      store.kiezwattDemo = fresh();
  }
}

// Stops a running demo once the current hour is settled. A reset also clears the run (progress and
// live view), now or when the stop takes effect. Simulated hours and their payments stay: Solana
// payments can't be undone, so the next run continues from the simulation clock.
export function stopDemo(reset: boolean) {
  const state = demoState();
  if (state.running)
    state.stopping = reset ? "reset" : (state.stopping ?? "stop");
  else if (reset) store.kiezwattDemo = fresh();
}

// How many sunny hours the demo shows, chosen with the slider.
export const DEMO_HOURS = { min: 1, max: 12, default: 6 };
const MORNING = 8;

// Where the shown hours start: at the simulation clock if it is daytime with sun ahead (07:00–13:59),
// otherwise at 08:00 the next morning, after fast-forwarding the evening and night.
export function demoWindow(from = simClock()): {
  fastForwardHours: number;
  startHour: number;
} {
  const { minuteOfDay } = localTime(from);
  if (minuteOfDay >= 7 * 60 && minuteOfDay < 14 * 60)
    return { fastForwardHours: 0, startHour: minuteOfDay / 60 };
  const minutes = (MORNING * 60 - minuteOfDay + 24 * 60) % (24 * 60);
  return { fastForwardHours: minutes / 60, startHour: MORNING }; // in 15-minute steps, so exactly to 08:00
}

export const clampDemoHours = (hours: number) =>
  Number.isFinite(hours)
    ? Math.min(DEMO_HOURS.max, Math.max(DEMO_HOURS.min, Math.round(hours)))
    : DEMO_HOURS.default;

// Starts the demo unless one is already running. Payments go on-chain when devnet is set up.
export function startDemo(hours: number = DEMO_HOURS.default): boolean {
  if (demoState().running) return false;
  const state = fresh();
  state.running = true;
  state.startedAt = Date.now();
  state.onChain = Boolean(readDevnetConfig() && loadKeypair("stadtwerk"));
  state.totalHours = clampDemoHours(hours);
  store.kiezwattDemo = state;
  // A moment's head start for the page that started it, which renders on the same server.
  setTimeout(() => void run(state), 750);
  return true;
}
