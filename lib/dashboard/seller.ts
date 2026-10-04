import { and, eq, gt, gte, like, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { INTERVAL_MS, MICRO_PER_CT, MICRO_PER_EUR, PRICES } from "@/lib/config";
import { forecastBatteryToEndOfDay } from "@/lib/forecast/battery";
import { learnSiteModel } from "@/lib/forecast/learned";
import { energyAmountMicro } from "@/lib/ledger/ledger";
import { chargeLimitFor } from "@/lib/sim/battery";
import { localMidnight } from "@/lib/sim/clock";
import { resolveAsOf } from "./time";

const { members, sites, intervalReadings, allocations, ledgerEntries, settlementBatches, sellerRules, projects } = schema;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const GRID_CO2_KG_PER_KWH = 0.36; // approximate German grid average
const eur = (micro: number) => micro / MICRO_PER_EUR;

export function sellerPersonas() {
  return db
    .select({ id: members.id, name: members.name })
    .from(members)
    .innerJoin(sites, eq(sites.memberId, members.id))
    .where(gt(sites.pvKwp, 0))
    .all();
}

export type SellerDashboard = NonNullable<ReturnType<typeof getSellerDashboard>>;

export function getSellerDashboard(memberId: string, at?: string) {
  const member = db.select().from(members).where(eq(members.id, memberId)).get();
  const site = db.select().from(sites).where(eq(sites.memberId, memberId)).get();
  if (!member || !site) return null;
  const asOf = resolveAsOf(site.id, at);
  if (asOf == null) return null;

  const dayStart = localMidnight(asOf);
  const dayEnd = dayStart + DAY_MS;
  // A batch counts as paid at `asOf` only if its hour had closed by then.
  const settledBy = asOf + INTERVAL_MS;

  const readings = db
    .select()
    .from(intervalReadings)
    .where(and(eq(intervalReadings.siteId, site.id), gte(intervalReadings.ts, dayStart), lte(intervalReadings.ts, asOf)))
    .orderBy(intervalReadings.ts)
    .all();
  const now = readings.at(-1)!;

  const reserveKwh = db.select().from(sellerRules).where(eq(sellerRules.memberId, memberId)).get()?.batteryReserveKwh;
  // The forecast learned from this home's own meter history (falls back to the fixed model when short).
  const model = learnSiteModel(site, asOf);
  const forecast = forecastBatteryToEndOfDay(
    { ...site, chargeLimitKwh: chargeLimitFor(site.batteryKwh, reserveKwh) },
    asOf,
    now.socKwh,
    dayEnd,
    model,
  );

  const batches = new Map(
    db
      .select()
      .from(settlementBatches)
      .where(and(gte(settlementBatches.periodStart, dayStart), lte(settlementBatches.periodEnd, settledBy)))
      .all()
      .map((b) => [b.id, b]),
  );
  const isPaid = (batchId: string | null) => batchId !== null && batches.has(batchId);

  // Orders: what this roof delivered to each buyer today.
  const sold = db
    .select()
    .from(allocations)
    .where(
      and(
        eq(allocations.sellerSiteId, site.id),
        eq(allocations.kind, "final"),
        gte(allocations.ts, dayStart),
        lte(allocations.ts, asOf),
      ),
    )
    .all();

  const siteRows = db.select().from(sites).all();
  const memberNames = new Map(db.select().from(members).all().map((m) => [m.id, m.name]));
  const siteById = new Map(siteRows.map((s) => [s.id, s]));

  const byBuyer = new Map<string, { buyerSiteId: string; buyerName: string; kwh: number; micro: number; paidMicro: number }>();
  for (const a of sold) {
    const buyer = siteById.get(a.buyerSiteId)!;
    const row = byBuyer.get(a.buyerSiteId) ?? {
      buyerSiteId: a.buyerSiteId,
      buyerName: memberNames.get(buyer.memberId) ?? buyer.label,
      kwh: 0,
      micro: 0,
      paidMicro: 0,
    };
    const micro = energyAmountMicro(a.kwh, a.priceCt);
    row.kwh += a.kwh;
    row.micro += micro;
    if (isPaid(a.batchId)) row.paidMicro += micro;
    byBuyer.set(a.buyerSiteId, row);
  }
  const orders = [...byBuyer.values()]
    .sort((a, b) => b.kwh - a.kwh)
    .map((o) => ({
      avgPriceCt: o.kwh > 0 ? o.micro / o.kwh / MICRO_PER_CT : 0,
      ...o,
      eur: eur(o.micro),
      paidEur: eur(o.paidMicro),
      status: o.paidMicro === o.micro ? ("settled" as const) : o.paidMicro > 0 ? ("partly" as const) : ("delivered" as const),
    }));

  const soldKwh = sold.reduce((sum, a) => sum + a.kwh, 0);
  const salesMicro = orders.reduce((sum, o) => sum + o.micro, 0);
  const feedInMicro = energyAmountMicro(soldKwh, PRICES.feedInCt);

  // Money from this member's own ledger account (the host share, for a funded roof).
  const entries = db
    .select()
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.accountId, memberId), gte(ledgerEntries.intervalTs, dayStart), lte(ledgerEntries.intervalTs, asOf)))
    .all();
  const credits = entries.filter((e) => e.amountMicro > 0);
  const earnedMicro = credits.reduce((sum, e) => sum + e.amountMicro, 0);
  const paidMicro = credits.filter((e) => isPaid(e.batchId)).reduce((sum, e) => sum + e.amountMicro, 0);
  const boughtMicro = -entries.filter((e) => e.amountMicro < 0).reduce((sum, e) => sum + e.amountMicro, 0);

  const payouts = [...batches.values()]
    .map((b) => ({
      batchId: b.id,
      periodStart: b.periodStart,
      status: b.status,
      signatures: b.txSignatures,
      micro: credits.filter((e) => e.batchId === b.id).reduce((sum, e) => sum + e.amountMicro, 0),
    }))
    .filter((p) => p.micro > 0)
    .sort((a, b) => b.periodStart - a.periodStart);

  // A funded roof: show how today's sales were split by the waterfall.
  const project = db.select().from(projects).where(eq(projects.hostSiteId, site.id)).get();
  let waterfall: { kind: string; eur: number }[] | null = null;
  if (project) {
    const legs = db
      .select({ kind: ledgerEntries.kind, micro: sql<number>`sum(${ledgerEntries.amountMicro})` })
      .from(ledgerEntries)
      .where(
        and(
          like(ledgerEntries.txnId, `%:${site.id}:%`),
          gt(ledgerEntries.amountMicro, 0),
          gte(ledgerEntries.intervalTs, dayStart),
          lte(ledgerEntries.intervalTs, asOf),
        ),
      )
      .groupBy(ledgerEntries.kind)
      .all();
    const order = ["fee", "reserve", "investor", "host"];
    waterfall = legs
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
      .map((l) => ({ kind: l.kind, eur: eur(l.micro) }));
  }


  const rules = db.select().from(sellerRules).where(eq(sellerRules.memberId, memberId)).get() ?? null;
  const buyerChoices = siteRows
    .filter((s) => s.memberId !== memberId)
    .map((s) => ({ memberId: s.memberId, name: memberNames.get(s.memberId) ?? s.label }));

  const chart = Array.from({ length: Math.round(DAY_MS / INTERVAL_MS) }, (_, i) => {
    const ts = dayStart + i * INTERVAL_MS;
    const reading = readings.find((r) => r.ts === ts);
    const future = forecast.path.find((p) => p.ts === ts);
    return {
      ts,
      generation: reading?.generationKwh ?? null,
      soc: reading?.socKwh ?? null,
      // The forecast line starts at the latest reading so the two lines join.
      p50: ts === asOf ? now.socKwh : (future?.p50 ?? null),
      band: (ts === asOf ? [now.socKwh, now.socKwh] : future ? [future.p10, future.p90] : null) as [number, number] | null,
    };
  });

  return {
    member,
    site,
    asOf,
    now: {
      generatingKw: now.generationKwh * (HOUR_MS / INTERVAL_MS),
      socKwh: now.socKwh,
    },
    today: {
      generationKwh: readings.reduce((sum, r) => sum + r.generationKwh, 0),
      soldKwh,
      salesEur: eur(salesMicro),
      extraVsFeedInEur: eur(salesMicro - feedInMicro),
      earnedEur: eur(earnedMicro),
      paidEur: eur(paidMicro),
      toSettleEur: eur(earnedMicro - paidMicro),
      boughtEur: eur(boughtMicro),
      co2Kg: soldKwh * GRID_CO2_KG_PER_KWH,
      householdsSupplied: orders.length,
    },
    forecast: {
      p10: forecast.p10,
      p50: forecast.p50,
      p90: forecast.p90,
      daylightHoursLeft: forecast.daylightHoursLeft,
      solarLeftKwh: forecast.solarLeftKwh,
      useLeftKwh: forecast.useLeftKwh,
      learned: model.learned,
      daysUsed: model.daysUsed,
      accuracy: model.accuracy,
    },
    nextSettlement: Math.ceil(settledBy / HOUR_MS) * HOUR_MS,
    orders,
    payouts,
    waterfall,
    project: project ? { name: project.name, state: project.state } : null,
    rules,
    buyerChoices,
    chart,
  };
}

