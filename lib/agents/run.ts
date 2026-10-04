import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { INTERVAL_MS, PRICES } from "@/lib/config";
import { learnSiteModel } from "@/lib/forecast/learned";
import { planAhead } from "@/lib/forecast/plan";
import { loadMarketContext, type MarketContext } from "@/lib/market";
import { floorToInterval } from "@/lib/sim/clock";
import { evChargingKwh, evSessionOn } from "@/lib/sim/ev";
import { type BatteryDecision, decideBattery, planCharging, type PricePoint } from "./trading";

// Runs the trading agents inside the 15-minute pipeline: before the meters are simulated, each
// agent decides what its home does this interval (battery: store or sell; car: charge or wait).
//
// The price forecast is the market run a day ahead on every home's learned forecast, twice:
// first as if nobody had an agent, then with the battery agents acting on those prices, so each
// agent also expects what the others will do. It is refreshed every hour.

type Site = typeof schema.sites.$inferSelect;

export interface AgentControl {
  chargeLimitKwh?: number;
  sellFromBatteryKwh?: number;
  evKwh?: number;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const toPrices = (plan: ReturnType<typeof planAhead>): PricePoint[] =>
  plan.map((p) => ({ ts: p.ts, sellCt: p.marginal?.sellCt ?? PRICES.feedInCt, buyCt: p.marginal?.buyCt ?? PRICES.gridCt }));

// The agents' price forecast from `ts` for 24 hours (quarter-hours), given the batteries' state just before.
export function forecastPrices(ctx: MarketContext, ts: number, socNow: Map<string, number>, batterySites: Map<string, number>) {
  const from = ts - INTERVAL_MS;
  const first = toPrices(planAhead(ctx, from, socNow, 24, { marginal: true }));
  if (batterySites.size === 0) return first;
  const agents = new Map([...batterySites].map(([siteId, minReserveKwh]) => [siteId, { minReserveKwh, prices: first }]));
  return toPrices(planAhead(ctx, from, socNow, 24, { marginal: true, batteryAgents: agents }));
}

let cache: { hourTs: number; prices: PricePoint[] } | null = null;

const settingsOn = () =>
  db
    .select()
    .from(schema.agentSettings)
    .all()
    .filter((s) => s.smartBattery || s.smartEv);

function logDecision(memberId: string, ts: number, kind: (typeof schema.agentDecisions.$inferInsert)["kind"], params: Record<string, number | string>) {
  db.insert(schema.agentDecisions).values({ memberId, ts, kind, params }).run();
}

const BATTERY_KINDS = ["battery_hold", "battery_sell_now", "battery_keep", "battery_discharge"] as const;
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

// The battery agent logs only when its decision changes, so the log reads as a story of the day.
// Selling from the battery lowers the price a little, so in the evening it switches between selling
// and waiting every few minutes; a switch back within two hours isn't logged again.
function logBattery(memberId: string, ts: number, d: BatteryDecision) {
  const recent = db
    .select({ kind: schema.agentDecisions.kind, ts: schema.agentDecisions.ts })
    .from(schema.agentDecisions)
    .where(and(eq(schema.agentDecisions.memberId, memberId), inArray(schema.agentDecisions.kind, [...BATTERY_KINDS])))
    .orderBy(desc(schema.agentDecisions.ts), desc(schema.agentDecisions.id))
    .limit(3)
    .all();
  if (recent[0]?.kind === d.kind) return;
  if (recent.some((r) => r.kind === d.kind && ts - r.ts < 2 * HOUR_MS)) return;
  logDecision(memberId, ts, d.kind, Object.fromEntries(Object.entries(d.params).map(([k, v]) => [k, round(v)])));
}

// The car's charging this interval: from its smart-charging plan, made when the agent first sees the session.
function evKwhFor(site: Site, readyByHour: number, ts: number, prices: () => PricePoint[]): number {
  let kwh = 0;
  for (const session of [evSessionOn(site.id, ts - DAY_MS, readyByHour), evSessionOn(site.id, ts, readyByHour)]) {
    if (ts + INTERVAL_MS <= session.arrivesAt || ts >= session.leavesAt) continue;
    let plan = db
      .select()
      .from(schema.evPlans)
      .where(and(eq(schema.evPlans.siteId, site.id), eq(schema.evPlans.sessionKey, session.key)))
      .get();
    if (!plan) {
      // Plan from now: whatever the car already got before the agent took over counts.
      let delivered = 0;
      for (let t = floorToInterval(session.arrivesAt); t < ts; t += INTERVAL_MS) delivered += evChargingKwh(site.id, site.evChargerKw, t);
      const need = Math.max(0, session.needKwh - delivered);
      const priceAt = new Map(prices().map((p) => [p.ts, p]));
      const window: PricePoint[] = [];
      for (let t = Math.max(ts, floorToInterval(session.arrivesAt)); t + INTERVAL_MS <= session.leavesAt; t += INTERVAL_MS) {
        window.push(priceAt.get(t) ?? { ts: t, sellCt: PRICES.feedInCt, buyCt: PRICES.gridCt });
      }
      const charging = planCharging(need, site.evChargerKw, window);
      const slots = Object.fromEntries([...charging.slots].map(([t, k]) => [String(t), round(k, 4)]));
      db.insert(schema.evPlans).values({ siteId: site.id, sessionKey: session.key, slots, createdAt: ts }).onConflictDoNothing().run();
      plan = { siteId: site.id, sessionKey: session.key, slots, createdAt: ts };
      const times = [...charging.slots.keys()].sort((a, b) => a - b);
      logDecision(site.memberId, ts, "ev_plan", {
        needKwh: round(need),
        firstSlotTs: times[0] ?? ts,
        lastSlotTs: times.at(-1) ?? ts,
        leavesAt: session.leavesAt,
        plannedCostEur: round(charging.plannedCostCt / 100),
        asapCostEur: round(charging.asapCostCt / 100),
        avgPlannedCt: need > 0 ? round(charging.plannedCostCt / need, 1) : 0,
      });
    }
    kwh += plan.slots[String(ts)] ?? 0;
  }
  return kwh;
}

// What each agent-run home does in the interval starting at `ts`. Empty when no agent is on.
export function agentControls(ts: number, sites: Site[], socBefore: Map<string, number>): Map<string, AgentControl> {
  const out = new Map<string, AgentControl>();
  const on = settingsOn();
  if (on.length === 0) return out;
  const settingsByMember = new Map(on.map((s) => [s.memberId, s]));
  const ctx = loadMarketContext();

  const batterySites = new Map<string, number>();
  for (const site of sites) {
    if (site.batteryKwh > 0 && settingsByMember.get(site.memberId)?.smartBattery) {
      batterySites.set(site.id, ctx.sellerRuleByMember.get(site.memberId)?.batteryReserveKwh ?? 0);
    }
  }
  const prices = () => {
    const hourTs = Math.floor(ts / HOUR_MS) * HOUR_MS;
    if (cache?.hourTs !== hourTs || !cache.prices.some((p) => p.ts === ts)) {
      cache = { hourTs, prices: forecastPrices(ctx, ts, socBefore, batterySites) };
    }
    return cache.prices;
  };

  for (const site of sites) {
    const settings = settingsByMember.get(site.memberId);
    if (!settings) continue;
    const control: AgentControl = {};
    if (batterySites.has(site.id)) {
      const model = learnSiteModel(site, ts);
      const forecast = [];
      for (let t = ts; t < ts + DAY_MS; t += INTERVAL_MS) forecast.push({ ts: t, generationKwh: model.generation(t, "p50"), loadKwh: model.load(t) });
      const decision = decideBattery({
        socKwh: socBefore.get(site.id) ?? 0,
        capacityKwh: site.batteryKwh,
        minReserveKwh: batterySites.get(site.id)!,
        forecast,
        prices: prices(),
        feedInCt: PRICES.feedInCt,
      });
      control.chargeLimitKwh = decision.chargeLimitKwh;
      control.sellFromBatteryKwh = decision.sellFromBatteryKwh;
      logBattery(site.memberId, ts, decision);
    }
    if (settings.smartEv && site.evChargerKw > 0) control.evKwh = evKwhFor(site, settings.evReadyByHour, ts, prices);
    out.set(site.id, control);
  }
  return out;
}

export const agentSettingsOf = (memberId: string) =>
  db.select().from(schema.agentSettings).where(eq(schema.agentSettings.memberId, memberId)).get() ?? null;

export function saveAgentSettings(memberId: string, patch: Partial<Pick<typeof schema.agentSettings.$inferInsert, "smartBattery" | "smartEv" | "evReadyByHour">>, now = Date.now()) {
  const current = agentSettingsOf(memberId);
  const row = { smartBattery: false, smartEv: false, evReadyByHour: 7, ...current, ...patch, memberId, updatedAt: now };
  db.insert(schema.agentSettings).values(row).onConflictDoUpdate({ target: schema.agentSettings.memberId, set: row }).run();
  cache = null;
}

export const recentDecisions = (memberId: string, limit = 20) =>
  db
    .select()
    .from(schema.agentDecisions)
    .where(eq(schema.agentDecisions.memberId, memberId))
    .orderBy(desc(schema.agentDecisions.ts), desc(schema.agentDecisions.id))
    .limit(limit)
    .all();
