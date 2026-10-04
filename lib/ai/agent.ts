import "server-only";
import { and, eq, isNull, ne } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { agentSettingsOf, recentDecisions, saveAgentSettings } from "@/lib/agents/run";
import { PRICES } from "@/lib/config";
import type { Locale } from "@/lib/i18n/config";
import { createFormat } from "@/lib/i18n/format";
import { MESSAGES } from "@/lib/i18n/messages";
import { decisionText } from "@/lib/i18n/text";
import { type ChatMessage, chat, ModelUnavailable } from "./ollama";
import { changesToWish, checkWish, type Proposal, proposalJsonSchema, type RuleContext, toProposal } from "./rules";

// The language layer around the trading agents: plain-language preferences in, checked rule changes
// out; and the agent's decisions explained in plain words. The decisions themselves are made by the
// forecasting agents, never by the language model.

const LANGUAGE: Record<Locale, string> = { de: "German", en: "English" };

export function ruleContext(memberId: string): RuleContext {
  const site = db.select().from(schema.sites).where(and(eq(schema.sites.memberId, memberId), isNull(schema.sites.closedAt))).get();
  const sellerRule = db.select().from(schema.sellerRules).where(eq(schema.sellerRules.memberId, memberId)).get();
  const buyerRule = db.select().from(schema.buyerRules).where(eq(schema.buyerRules.memberId, memberId)).get();
  const community = db.select().from(schema.communities).get();
  const settings = agentSettingsOf(memberId);
  const batteryKwh = site?.batteryKwh ?? 0;
  return {
    canSell: (site?.pvKwp ?? 0) > 0,
    batteryKwh,
    evChargerKw: site?.evChargerKw ?? 0,
    seller: {
      minPriceCt: sellerRule?.minPriceCt ?? 0,
      batteryReserveKwh: sellerRule?.batteryReserveKwh ?? batteryKwh,
      priorityBuyers: sellerRule?.priorityBuyers ?? [],
    },
    buyer: {
      maxPriceCt: buyerRule?.maxPriceCt ?? (community?.priceMode === "auction" ? PRICES.gridCt : (community?.communityPriceCt ?? PRICES.gridCt)),
      maxDistanceM: buyerRule?.maxDistanceM ?? 5_000,
      preferred: buyerRule?.preferred ?? [],
      blocked: buyerRule?.blocked ?? [],
    },
    agent: { smartBattery: settings?.smartBattery ?? false, smartEv: settings?.smartEv ?? false, evReadyByHour: settings?.evReadyByHour ?? 7 },
    neighbours: db
      .select({ id: schema.members.id, name: schema.members.name })
      .from(schema.members)
      .innerJoin(schema.sites, eq(schema.sites.memberId, schema.members.id))
      .where(and(ne(schema.members.id, memberId), isNull(schema.sites.closedAt), isNull(schema.members.closedAt)))
      .all(),
  };
}

function systemPrompt(ctx: RuleContext, locale: Locale): string {
  const names = (ids: string[]) => ids.map((id) => ctx.neighbours.find((n) => n.id === id)?.name ?? id).join(", ") || "nobody";
  const eur = (ct: number) => (ct / 100).toFixed(2);
  return [
    "You set up a member's energy-trading agent from what they say. Answer with JSON only.",
    "Include only the settings the member asks to change. Never add settings they didn't mention.",
    `First write "summary": one short sentence in ${LANGUAGE[locale]} saying what will change${locale === "de" ? " (address the member as 'Sie')" : ""}.`,
    "Settings (current value in brackets):",
    ...(ctx.canSell
      ? [
          `- minSellPriceEur: lowest price per kWh they sell their solar for, in euros: 18 cents = 0.18 [${eur(ctx.seller.minPriceCt)}]`,
          `- priorityBuyers: neighbours who get their solar first [${names(ctx.seller.priorityBuyers)}]`,
        ]
      : []),
    ...(ctx.batteryKwh > 0
      ? [
          `- batteryReserveKwh: kWh always kept in their ${ctx.batteryKwh} kWh battery for their own evening [${ctx.seller.batteryReserveKwh}]`,
          `- smartBattery: true lets the agent store solar for the evening and sell from the battery when prices are higher [${ctx.agent.smartBattery}]`,
        ]
      : []),
    ...(ctx.evChargerKw > 0
      ? [
          `- smartEv: true charges the car in the cheapest hours instead of straight away [${ctx.agent.smartEv}]`,
          `- evReadyByHour: morning hour the car must be charged by, 4 to 10 [${ctx.agent.evReadyByHour}]`,
        ]
      : []),
    `- maxBuyPriceEur: most they pay neighbours per kWh, in euros [${eur(ctx.buyer.maxPriceCt)}]`,
    `- maxDistanceKm: buy only from neighbours within this many km [${ctx.buyer.maxDistanceM / 1000}]`,
    `- preferredSellers: neighbours to buy from first, the full new list [${names(ctx.buyer.preferred)}]`,
    `- blockedSellers: neighbours never to buy from, the full new list [${names(ctx.buyer.blocked)}]`,
    "- unsupported: wishes none of these settings can do, quoted briefly.",
    `Neighbours: ${ctx.neighbours.map((n) => n.name).join(", ")}.`,
  ].join("\n");
}

// Worked examples as earlier turns: small models follow examples better than rules.
function examples(ctx: RuleContext, locale: Locale): ChatMessage[] {
  const de = locale === "de";
  const shots: [string, object][] = [];
  if (ctx.canSell) {
    shots.push([
      "Don't sell for less than 15 cents. My neighbour Max should get my power first.",
      { summary: de ? "Sie verkaufen nicht unter 15 Cent, und Max bekommt Ihren Strom zuerst." : "You won't sell below 15 cents, and Max gets your power first.", minSellPriceEur: 0.15, priorityBuyers: ["Max"] },
    ]);
  }
  if (ctx.batteryKwh > 0) {
    shots.push([
      "Keep 5 kWh in the battery for me and sell the rest from the battery when it pays more.",
      { summary: de ? "5 kWh bleiben für Sie im Speicher; den Rest verkauft der Agent, wenn es sich lohnt." : "5 kWh stay in the battery for you; the agent sells the rest when it pays more.", batteryReserveKwh: 5, smartBattery: true },
    ]);
  }
  if (ctx.evChargerKw > 0) {
    shots.push([
      "Charge my car as cheaply as you can, it has to be full by 6.",
      { summary: de ? "Das Auto lädt in den günstigsten Stunden und ist um 6 Uhr voll." : "The car charges in the cheapest hours and is full by 6.", smartEv: true, evReadyByHour: 6 },
    ]);
  }
  shots.push([
    "Pay neighbours at most 20 cents, only within 800 m, never from Max. And buy me some Tesla shares.",
    {
      summary: de ? "Sie zahlen höchstens 20 Cent, nur im Umkreis von 800 m, und nie an Max." : "You pay at most 20 cents, only within 800 m, and never to Max.",
      maxBuyPriceEur: 0.2,
      maxDistanceKm: 0.8,
      blockedSellers: ["Max"],
      unsupported: ["buy Tesla shares"],
    },
  ]);
  return shots.flatMap(([user, answer]) => [
    { role: "user" as const, content: user },
    { role: "assistant" as const, content: JSON.stringify(answer) },
  ]);
}

export async function proposeRules(memberId: string, text: string, locale: Locale): Promise<Proposal> {
  const ctx = ruleContext(memberId);
  // The examples use a made-up neighbour, Max; the real ones are listed in the system prompt.
  const answer = await chat(
    [{ role: "system", content: systemPrompt(ctx, locale) }, ...examples(ctx, locale), { role: "user", content: text.slice(0, 1_000) }],
    { schema: proposalJsonSchema(ctx) },
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer);
  } catch {
    throw new ModelUnavailable("The model's answer wasn't valid JSON.");
  }
  return toProposal(parsed, ctx);
}

// Applies changes the member confirmed, after checking them against the current rules again.
export function applyRules(memberId: string, changes: { field: string; to: unknown }[], now = Date.now()): Proposal {
  const ctx = ruleContext(memberId);
  const checked = checkWish(changesToWish(changes), ctx);
  const to = Object.fromEntries(checked.changes.map((c) => [c.field, c.to])) as Record<string, unknown>;

  if (["sellerMinPriceCt", "batteryReserveKwh", "priorityBuyers"].some((f) => f in to)) {
    const values = {
      minPriceCt: (to.sellerMinPriceCt as number | undefined) ?? ctx.seller.minPriceCt,
      batteryReserveKwh: (to.batteryReserveKwh as number | undefined) ?? ctx.seller.batteryReserveKwh,
      priorityBuyers: (to.priorityBuyers as string[] | undefined) ?? ctx.seller.priorityBuyers,
    };
    db.insert(schema.sellerRules).values({ memberId, ...values }).onConflictDoUpdate({ target: schema.sellerRules.memberId, set: values }).run();
  }
  if (["buyerMaxPriceCt", "maxDistanceM", "preferredSellers", "blockedSellers"].some((f) => f in to)) {
    const values = {
      maxPriceCt: (to.buyerMaxPriceCt as number | undefined) ?? ctx.buyer.maxPriceCt,
      maxDistanceM: (to.maxDistanceM as number | undefined) ?? ctx.buyer.maxDistanceM,
      preferred: (to.preferredSellers as string[] | undefined) ?? ctx.buyer.preferred,
      blocked: (to.blockedSellers as string[] | undefined) ?? ctx.buyer.blocked,
    };
    db.insert(schema.buyerRules).values({ memberId, ...values }).onConflictDoUpdate({ target: schema.buyerRules.memberId, set: values }).run();
  }
  if (["smartBattery", "smartEv", "evReadyByHour"].some((f) => f in to)) {
    saveAgentSettings(
      memberId,
      {
        ...("smartBattery" in to ? { smartBattery: to.smartBattery as boolean } : {}),
        ...("smartEv" in to ? { smartEv: to.smartEv as boolean } : {}),
        ...("evReadyByHour" in to ? { evReadyByHour: to.evReadyByHour as number } : {}),
      },
      now,
    );
  }
  if (checked.changes.length > 0) {
    db.insert(schema.agentDecisions)
      .values({ memberId, ts: now, kind: "rules", params: { fields: checked.changes.map((c) => c.field).join(",") } })
      .run();
  }
  return checked;
}

// The agent's recent decisions as plain facts, in the member's language (also the fallback explanation).
export function decisionFacts(memberId: string, locale: Locale, limit = 8): string[] {
  const f = createFormat(locale);
  const m = MESSAGES[locale];
  return recentDecisions(memberId, limit)
    .reverse()
    .map((d) => `${f.day(d.ts)} ${f.time(d.ts)}: ${decisionText(d, m, f)}`);
}

export async function explainDecisions(memberId: string, locale: Locale): Promise<{ text: string; byModel: boolean }> {
  const facts = decisionFacts(memberId, locale);
  if (facts.length === 0) return { text: MESSAGES[locale].agent.nothingYet, byModel: false };
  try {
    const text = await chat([
      {
        role: "system",
        content: `You are a household's energy-trading agent. In ${LANGUAGE[locale]}, explain to the member in at most four short sentences what you did and why, in the first person and in plain words${locale === "de" ? " (address them as 'Sie')" : ""}. Use only the facts given; keep the numbers as they are; no lists, no headings.`,
      },
      { role: "user", content: facts.join("\n") },
    ]);
    return text.trim() ? { text: text.trim(), byModel: true } : { text: facts.join(" "), byModel: false };
  } catch (e) {
    if (e instanceof ModelUnavailable) return { text: facts.join(" "), byModel: false };
    throw e;
  }
}
