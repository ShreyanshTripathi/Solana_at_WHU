import { z } from "zod";
import { PRICES } from "@/lib/config";

// Turning the language model's answer into rule changes (pure, so every limit has a test).
// The model only proposes: every value is checked and clamped here, names must be real neighbours,
// and nothing changes until the member presses Apply (which checks everything again).

export interface RuleContext {
  canSell: boolean; // has solar
  batteryKwh: number;
  evChargerKw: number;
  seller: { minPriceCt: number; batteryReserveKwh: number; priorityBuyers: string[] };
  buyer: { maxPriceCt: number; maxDistanceM: number; preferred: string[]; blocked: string[] };
  agent: { smartBattery: boolean; smartEv: boolean; evReadyByHour: number };
  neighbours: { id: string; name: string }[]; // other members, by workspace id
}

export const LIMITS = {
  minPriceCt: [0, PRICES.gridCt],
  maxPriceCt: [PRICES.feedInCt, PRICES.gridCt],
  maxDistanceM: [100, 5_000],
  evReadyByHour: [4, 10],
} as const;

const num = z.number().finite().nullable().optional();
const names = z.array(z.string().max(80)).max(10).nullable().optional();
const bool = z.boolean().nullable().optional();

// What the model fills in, in the units people say out loud (euros, kilometres); null or missing
// means "no change". Small models write 1800 for "18 cents" when a field is in cents, but get euros right.
export const proposalInput = z.object({
  summary: z.string().max(400).optional(),
  minSellPriceEur: num,
  priorityBuyers: names,
  batteryReserveKwh: num,
  smartBattery: bool,
  smartEv: bool,
  evReadyByHour: num,
  maxBuyPriceEur: num,
  maxDistanceKm: num,
  preferredSellers: names,
  blockedSellers: names,
  unsupported: z.array(z.string().max(200)).max(5).optional(),
});
export type ProposalInput = z.infer<typeof proposalInput>;

// The JSON schema Ollama constrains the answer to: only the settings this member can use, so the
// model can't wander into them, and every field optional so the answer stays short.
export function proposalJsonSchema(ctx: RuleContext) {
  const n = { type: ["number", "null"] };
  const b = { type: ["boolean", "null"] };
  const list = { type: ["array", "null"], items: { type: "string" } };
  return {
    type: "object",
    properties: {
      summary: { type: "string" },
      ...(ctx.canSell ? { minSellPriceEur: n, priorityBuyers: list } : {}),
      ...(ctx.batteryKwh > 0 ? { batteryReserveKwh: n, smartBattery: b } : {}),
      ...(ctx.evChargerKw > 0 ? { smartEv: b, evReadyByHour: { type: ["integer", "null"] } } : {}),
      maxBuyPriceEur: n,
      maxDistanceKm: n,
      preferredSellers: list,
      blockedSellers: list,
      unsupported: { type: "array", items: { type: "string" } },
    },
    required: ["summary"],
  };
}

export type ChangeField =
  | "sellerMinPriceCt"
  | "batteryReserveKwh"
  | "priorityBuyers"
  | "buyerMaxPriceCt"
  | "maxDistanceM"
  | "preferredSellers"
  | "blockedSellers"
  | "smartBattery"
  | "smartEv"
  | "evReadyByHour";

export type Value = number | boolean | string[];
export interface Change {
  field: ChangeField;
  from: Value;
  to: Value;
  clamped?: boolean; // the request was outside the allowed range
}

export type Problem =
  | { code: "unknown_neighbour"; name: string }
  | { code: "no_solar" }
  | { code: "no_battery" }
  | { code: "no_ev" }
  | { code: "unsupported"; text: string };

export interface Proposal {
  changes: Change[];
  problems: Problem[];
  summary: string;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .trim();

// "anna", "Anna Schmitt", "the Webers", "Bäckerei" -> a neighbour's id, or null.
export function resolveNeighbour(name: string, neighbours: RuleContext["neighbours"]): string | null {
  const q = fold(name).replace(/^(the|die|der|das|familie|family)\s+/, "").replace(/s$/, "");
  if (q.length < 2) return null;
  const hits = neighbours.filter((n) => {
    const full = fold(n.name);
    const words = full.split(/[^a-z0-9]+/).filter(Boolean);
    return fold(n.id) === q || full === q || words.includes(q) || words.some((w) => w.replace(/s$/, "") === q) || (q.length >= 4 && full.includes(q));
  });
  return hits.length === 1 ? hits[0].id : null;
}

const clamp = (x: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, x));
const sameList = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

// Settings in the app's own units (cents, metres); every field optional.
export interface Wish {
  sellerMinPriceCt?: number | null;
  priorityBuyers?: string[] | null;
  batteryReserveKwh?: number | null;
  smartBattery?: boolean | null;
  smartEv?: boolean | null;
  evReadyByHour?: number | null;
  buyerMaxPriceCt?: number | null;
  maxDistanceM?: number | null;
  preferredSellers?: string[] | null;
  blockedSellers?: string[] | null;
}

const times = (x: number | null | undefined, k: number) => (x === null || x === undefined ? x : x * k);

// The model's answer -> a checked proposal against the member's current settings.
export function toProposal(input: unknown, ctx: RuleContext): Proposal {
  const raw = proposalInput.parse(input);
  const wish: Wish = {
    sellerMinPriceCt: times(raw.minSellPriceEur, 100),
    priorityBuyers: raw.priorityBuyers,
    batteryReserveKwh: raw.batteryReserveKwh,
    smartBattery: raw.smartBattery,
    smartEv: raw.smartEv,
    evReadyByHour: raw.evReadyByHour,
    buyerMaxPriceCt: times(raw.maxBuyPriceEur, 100),
    maxDistanceM: times(raw.maxDistanceKm, 1000),
    preferredSellers: raw.preferredSellers,
    blockedSellers: raw.blockedSellers,
  };
  const unsupported: Problem[] = (raw.unsupported ?? []).filter((t) => t.trim()).map((text) => ({ code: "unsupported", text }));
  const checked = checkWish(wish, ctx);
  return { ...checked, problems: [...checked.problems, ...unsupported], summary: (raw.summary ?? "").trim() };
}

// Checks and clamps every value, resolves names to members, and keeps only real changes.
export function checkWish(wish: Wish, ctx: RuleContext): Proposal {
  const changes: Change[] = [];
  const problems: Problem[] = [];

  const number = (field: ChangeField, value: number | null | undefined, from: number, range: readonly [number, number], round = 1) => {
    if (value === null || value === undefined) return;
    const to = Math.round(clamp(value, range) * round) / round;
    if (to !== from) changes.push({ field, from, to, ...(clamp(value, range) !== value ? { clamped: true } : {}) });
  };
  const flag = (field: ChangeField, value: boolean | null | undefined, from: boolean) => {
    if (value === null || value === undefined || value === from) return;
    changes.push({ field, from, to: value });
  };
  const list = (field: ChangeField, value: string[] | null | undefined, from: string[]) => {
    if (value === null || value === undefined) return;
    const ids: string[] = [];
    for (const name of value) {
      const id = resolveNeighbour(name, ctx.neighbours);
      if (id) ids.push(id);
      else problems.push({ code: "unknown_neighbour", name });
    }
    const to = [...new Set(ids)];
    if (!sameList(to, from) && (to.length > 0 || value.length === 0)) changes.push({ field, from, to });
  };
  const asked = (...xs: unknown[]) => xs.some((x) => x !== null && x !== undefined && x !== false && !(Array.isArray(x) && x.length === 0));

  if (ctx.canSell) {
    number("sellerMinPriceCt", wish.sellerMinPriceCt, ctx.seller.minPriceCt, LIMITS.minPriceCt, 10);
    list("priorityBuyers", wish.priorityBuyers, ctx.seller.priorityBuyers);
  } else if (asked(wish.sellerMinPriceCt, wish.priorityBuyers)) problems.push({ code: "no_solar" });

  if (ctx.batteryKwh > 0) {
    number("batteryReserveKwh", wish.batteryReserveKwh, ctx.seller.batteryReserveKwh, [0, ctx.batteryKwh], 10);
    flag("smartBattery", wish.smartBattery, ctx.agent.smartBattery);
  } else if (asked(wish.batteryReserveKwh, wish.smartBattery)) problems.push({ code: "no_battery" });

  if (ctx.evChargerKw > 0) {
    flag("smartEv", wish.smartEv, ctx.agent.smartEv);
    number("evReadyByHour", wish.evReadyByHour, ctx.agent.evReadyByHour, LIMITS.evReadyByHour);
  } else if (asked(wish.smartEv, wish.evReadyByHour)) problems.push({ code: "no_ev" });

  number("buyerMaxPriceCt", wish.buyerMaxPriceCt, ctx.buyer.maxPriceCt, LIMITS.maxPriceCt, 10);
  number("maxDistanceM", wish.maxDistanceM, ctx.buyer.maxDistanceM, LIMITS.maxDistanceM);
  list("preferredSellers", wish.preferredSellers, ctx.buyer.preferred);
  list("blockedSellers", wish.blockedSellers, ctx.buyer.blocked);

  return { changes, problems, summary: "" };
}

const wishSchema = z
  .object({
    sellerMinPriceCt: num,
    priorityBuyers: names,
    batteryReserveKwh: num,
    smartBattery: bool,
    smartEv: bool,
    evReadyByHour: num,
    buyerMaxPriceCt: num,
    maxDistanceM: num,
    preferredSellers: names,
    blockedSellers: names,
  })
  .strict();

// The Apply button sends the changes back; they are checked against the current settings again.
export function changesToWish(changes: { field: string; to: unknown }[]): Wish {
  return wishSchema.parse(Object.fromEntries(changes.map((c) => [c.field, c.to])));
}
