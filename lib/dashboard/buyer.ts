import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { INTERVAL_MS, MICRO_PER_EUR, PRICES } from "@/lib/config";
import { planAhead } from "@/lib/forecast/plan";
import { hourlyReliability, reliabilityAt, supplierStats } from "@/lib/forecast/supplier";
import { distanceM } from "@/lib/geo";
import { energyAmountMicro } from "@/lib/ledger/ledger";
import { loadMarketContext } from "@/lib/market";
import { localMidnight, localTime } from "@/lib/sim/clock";
import { resolveAsOf } from "./time";

const { members, sites, intervalReadings, allocations, settlementBatches, buyerRules } = schema;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MIN_SHIFT_KWH = 0.05; // smaller moves are noise, not switches
const eur = (micro: number) => micro / MICRO_PER_EUR;
const hourOf = (ts: number) => Math.floor(ts / HOUR_MS) * HOUR_MS;

export type RankBy = "score" | "price" | "distance" | "reliability";

export function buyerPersonas() {
  return db
    .select({ id: members.id, name: members.name })
    .from(members)
    .innerJoin(sites, eq(sites.memberId, members.id))
    .where(eq(sites.pvKwp, 0))
    .all();
}

function monthStart(ts: number): number {
  const [year, month] = localTime(ts).dateKey.split("-");
  return localMidnight(Date.parse(`${year}-${month}-01T12:00:00Z`));
}

export type BuyerDashboard = NonNullable<ReturnType<typeof getBuyerDashboard>>;

export function getBuyerDashboard(memberId: string, at?: string, rankBy: RankBy = "score") {
  const member = db.select().from(members).where(eq(members.id, memberId)).get();
  const site = db.select().from(sites).where(eq(sites.memberId, memberId)).get();
  if (!member || !site) return null;
  const asOf = resolveAsOf(site.id, at);
  if (asOf == null) return null;

  const dayStart = localMidnight(asOf);
  const fromMonth = monthStart(asOf);
  const settledBy = asOf + INTERVAL_MS;
  const ctx = loadMarketContext();
  const priceCt = ctx.community.communityPriceCt;
  const names = new Map(db.select().from(members).all().map((m) => [m.id, m.name]));
  const nameOfSite = (siteId: string) => names.get(ctx.siteById.get(siteId)?.memberId ?? "") ?? siteId;

  // Sellers keep a fixed order, so each one keeps its colour on every chart.
  const sellers = [...ctx.siteById.values()].filter((s) => s.pvKwp > 0).sort((a, b) => a.id.localeCompare(b.id));
  const sellerSlot = new Map(sellers.map((s, i) => [s.id, i + 1]));

  const paidBatches = new Map(
    db
      .select()
      .from(settlementBatches)
      .where(and(gte(settlementBatches.periodStart, fromMonth), lte(settlementBatches.periodEnd, settledBy)))
      .all()
      .map((b) => [b.id, b]),
  );

  const received = db
    .select()
    .from(allocations)
    .where(and(eq(allocations.buyerSiteId, site.id), eq(allocations.kind, "final"), gte(allocations.ts, fromMonth), lte(allocations.ts, asOf)))
    .orderBy(allocations.ts)
    .all();
  const receivedToday = received.filter((a) => a.ts >= dayStart);

  const importSince = (from: number) =>
    db
      .select({ kwh: sql<number>`coalesce(sum(${intervalReadings.importKwh}), 0)` })
      .from(intervalReadings)
      .where(and(eq(intervalReadings.siteId, site.id), gte(intervalReadings.ts, from), lte(intervalReadings.ts, asOf)))
      .get()?.kwh ?? 0;
  const importMonth = importSince(fromMonth);
  const importToday = importSince(dayStart);

  // FR-REC-01/02/04: suppliers this month, what each supplied, and whether they have been paid.
  type SupplierRow = {
    siteId: string;
    name: string;
    slot: number;
    kwh: number;
    micro: number;
    todayKwh: number;
    todayMicro: number;
    paidMicro: number;
    signatures: Set<string>;
  };
  const bySeller = new Map<string, SupplierRow>();
  for (const a of received) {
    const row =
      bySeller.get(a.sellerSiteId) ??
      ({
        siteId: a.sellerSiteId,
        name: nameOfSite(a.sellerSiteId),
        slot: sellerSlot.get(a.sellerSiteId) ?? 0,
        kwh: 0,
        micro: 0,
        todayKwh: 0,
        todayMicro: 0,
        paidMicro: 0,
        signatures: new Set<string>(),
      } satisfies SupplierRow);
    const micro = energyAmountMicro(a.kwh, a.priceCt);
    row.kwh += a.kwh;
    row.micro += micro;
    if (a.ts >= dayStart) {
      row.todayKwh += a.kwh;
      row.todayMicro += micro;
    }
    const batch = a.batchId ? paidBatches.get(a.batchId) : undefined;
    if (batch) {
      row.paidMicro += micro;
      if (a.ts >= dayStart) batch.txSignatures.forEach((sig) => row.signatures.add(sig));
    }
    bySeller.set(a.sellerSiteId, row);
  }
  const suppliers = [...bySeller.values()]
    .sort((a, b) => b.kwh - a.kwh)
    .map((s) => ({
      ...s,
      eur: eur(s.micro),
      todayEur: eur(s.todayMicro),
      paidEur: eur(s.paidMicro),
      pendingEur: eur(s.micro - s.paidMicro),
      shareOfDemand: importMonth > 0 ? s.kwh / importMonth : 0,
      signatures: [...s.signatures],
    }));

  const sharedMonth = received.reduce((sum, a) => sum + a.kwh, 0);
  const sharedToday = receivedToday.reduce((sum, a) => sum + a.kwh, 0);
  const billMicro = received.reduce((sum, a) => sum + energyAmountMicro(a.kwh, a.priceCt), 0);
  const savedMicro = received.reduce((sum, a) => sum + energyAmountMicro(a.kwh, PRICES.gridCt - a.priceCt), 0);

  // Chart: where each 15 minutes of today's power came from.
  const readingsToday = db
    .select()
    .from(intervalReadings)
    .where(and(eq(intervalReadings.siteId, site.id), gte(intervalReadings.ts, dayStart), lte(intervalReadings.ts, asOf)))
    .all();
  const chart = Array.from({ length: Math.round(DAY_MS / INTERVAL_MS) }, (_, i) => {
    const ts = dayStart + i * INTERVAL_MS;
    const reading = readingsToday.find((r) => r.ts === ts);
    const here = receivedToday.filter((a) => a.ts === ts);
    const point: Record<string, number | null> = { ts };
    for (const s of sellers) point[s.id] = reading ? here.filter((a) => a.sellerSiteId === s.id).reduce((sum, a) => sum + a.kwh, 0) : null;
    point.grid = reading ? Math.max(0, reading.importKwh - here.reduce((sum, a) => sum + a.kwh, 0)) : null;
    return point;
  });

  // FR-REC-08, looking back: when a supplier's delivery fell and another's rose, supply shifted.
  const sellerExport = new Map<string, number>();
  for (const r of db
    .select({ siteId: intervalReadings.siteId, ts: intervalReadings.ts, exportKwh: intervalReadings.exportKwh })
    .from(intervalReadings)
    .where(and(gte(intervalReadings.ts, dayStart - INTERVAL_MS), lte(intervalReadings.ts, asOf)))
    .all()) {
    sellerExport.set(`${r.siteId}:${r.ts}`, r.exportKwh);
  }
  const shifts: { ts: number; from: string; to: string; kwh: number; reason: "fell" | "rebalanced" }[] = [];
  const shiftedHours = new Set<number>();
  for (let ts = dayStart + INTERVAL_MS; ts <= asOf; ts += INTERVAL_MS) {
    if (shiftedHours.has(hourOf(ts))) continue;
    const now = new Map(receivedToday.filter((a) => a.ts === ts).map((a) => [a.sellerSiteId, a.kwh]));
    const before = new Map(receivedToday.filter((a) => a.ts === ts - INTERVAL_MS).map((a) => [a.sellerSiteId, a.kwh]));
    for (const s of sellers) {
      const drop = (before.get(s.id) ?? 0) - (now.get(s.id) ?? 0);
      if (drop < MIN_SHIFT_KWH) continue;
      const to = sellers.find((t) => t.id !== s.id && (now.get(t.id) ?? 0) - (before.get(t.id) ?? 0) >= MIN_SHIFT_KWH);
      if (!to) continue;
      const rise = (now.get(to.id) ?? 0) - (before.get(to.id) ?? 0);
      const fell = (sellerExport.get(`${s.id}:${ts}`) ?? 0) < (sellerExport.get(`${s.id}:${ts - INTERVAL_MS}`) ?? 0);
      shifts.push({
        ts,
        from: nameOfSite(s.id),
        to: nameOfSite(to.id),
        kwh: Math.min(drop, rise),
        reason: fell ? "fell" : "rebalanced",
      });
      shiftedHours.add(hourOf(ts));
      break;
    }
  }

  // FR-REC-03/07/08, looking ahead: planned supply for the next 24 hours, and a backup per hour.
  const socNow = new Map(
    db
      .select({ siteId: intervalReadings.siteId, soc: intervalReadings.socKwh })
      .from(intervalReadings)
      .where(eq(intervalReadings.ts, asOf))
      .all()
      .map((r) => [r.siteId, r.soc]),
  );
  const plan = planAhead(ctx, asOf, socNow, 24);
  const rule = db.select().from(buyerRules).where(eq(buyerRules.memberId, memberId)).get() ?? null;
  const canBuyFrom = (sellerSiteId: string) => {
    const seller = ctx.siteById.get(sellerSiteId)!;
    const sellerRule = ctx.sellerRuleByMember.get(seller.memberId);
    return (
      seller.id !== site.id &&
      !(rule?.blocked ?? []).includes(seller.memberId) &&
      distanceM(seller, site) <= (rule?.maxDistanceM ?? 5_000) &&
      (sellerRule?.minPriceCt ?? 0) <= priceCt &&
      priceCt <= (rule?.maxPriceCt ?? priceCt)
    );
  };

  const learned = hourlyReliability(asOf);
  type HourRow = { hourTs: number; bySeller: Map<string, number>; utilityKwh: number; main?: string; backup?: string; backupPct?: number };
  const hours = new Map<number, HourRow>();
  for (const p of plan) {
    const hourTs = hourOf(p.ts);
    const row: HourRow = hours.get(hourTs) ?? { hourTs, bySeller: new Map(), utilityKwh: 0 };
    const mine = p.allocations.filter((a) => a.buyerSiteId === site.id);
    for (const a of mine) row.bySeller.set(a.sellerSiteId, (row.bySeller.get(a.sellerSiteId) ?? 0) + a.kwh);
    const expectedImport = p.rows.find((r) => r.siteId === site.id)?.importKwh ?? 0;
    row.utilityKwh += Math.max(0, expectedImport - mine.reduce((sum, a) => sum + a.kwh, 0));

    // Backup: the seller other than the main supplier with the most spare surplus it is likely to
    // deliver, weighed by how often it actually had surplus at this hour (learned, last 14 days).
    if (mine.length > 0 && !row.backup) {
      const main = [...mine].sort((a, b) => b.kwh - a.kwh)[0].sellerSiteId;
      const plannedFrom = (id: string) => p.allocations.filter((a) => a.sellerSiteId === id).reduce((sum, a) => sum + a.kwh, 0);
      const backup = sellers
        .filter((s) => s.id !== main && canBuyFrom(s.id))
        .map((s) => {
          const reliability = reliabilityAt(learned.get(s.id), p.ts);
          const spare = (p.rows.find((r) => r.siteId === s.id)?.exportKwh ?? 0) - plannedFrom(s.id);
          return { id: s.id, spare, reliability, likely: spare * reliability };
        })
        .filter((c) => c.spare > MIN_SHIFT_KWH)
        .sort((a, b) => b.likely - a.likely)[0];
      row.main = nameOfSite(main);
      row.backup = backup ? nameOfSite(backup.id) : undefined;
      row.backupPct = backup?.reliability;
    }
    hours.set(hourTs, row);
  }
  const schedule = [...hours.values()]
    .filter((h) => h.bySeller.size > 0)
    .map((h) => ({
      hourTs: h.hourTs,
      bySeller: Object.fromEntries(h.bySeller),
      neighboursKwh: [...h.bySeller.values()].reduce((sum, k) => sum + k, 0),
      utilityKwh: h.utilityKwh,
      main: h.main,
      backup: h.backup,
      backupPct: h.backupPct,
    }));

  // FR-REC-06/07: every seller, ranked.
  const stats = supplierStats(asOf);
  const maxDistance = rule?.maxDistanceM ?? 5_000;
  const potential = sellers
    .filter((s) => s.id !== site.id)
    .map((s) => {
      const st = stats.get(s.id) ?? { availability: 0, steadiness: 0, daylightIntervals: 0 };
      const distance = distanceM(s, site);
      const sellerMin = ctx.sellerRuleByMember.get(s.memberId)?.minPriceCt ?? 0;
      const forecastKwh = plan.reduce((sum, p) => sum + (p.rows.find((r) => r.siteId === s.id)?.exportKwh ?? 0), 0);
      // What the seller is likely to deliver: each hour's forecast weighed by its learned reliability then.
      const likelyKwh = plan.reduce((sum, p) => sum + (p.rows.find((r) => r.siteId === s.id)?.exportKwh ?? 0) * reliabilityAt(learned.get(s.id), p.ts), 0);
      const reliability = (st.availability + st.steadiness) / 2;
      return {
        siteId: s.id,
        memberId: s.memberId,
        name: nameOfSite(s.id),
        slot: sellerSlot.get(s.id) ?? 0,
        distanceM: distance,
        priceCt: Math.max(priceCt, sellerMin),
        available: canBuyFrom(s.id),
        preferred: (rule?.preferred ?? []).includes(s.memberId),
        blocked: (rule?.blocked ?? []).includes(s.memberId),
        availability: st.availability,
        steadiness: st.steadiness,
        reliability,
        forecastKwh,
        likelyKwh,
        score: 0.5 * reliability + 0.3 * (1 - Math.min(1, distance / maxDistance)) + 0.2 * Math.min(1, likelyKwh / 50),
      };
    })
    .sort((a, b) => {
      if (rankBy === "price") return a.priceCt - b.priceCt || a.distanceM - b.distanceM;
      if (rankBy === "distance") return a.distanceM - b.distanceM;
      if (rankBy === "reliability") return b.reliability - a.reliability;
      return b.score - a.score;
    });


  // The agent's pick: the best-scoring seller this buyer can actually buy from.
  const pick = [...potential].filter((p) => p.available && !p.blocked && p.likelyKwh > MIN_SHIFT_KWH).sort((a, b) => b.score - a.score)[0] ?? null;

  const choices = [...ctx.siteById.values()]
    .filter((s) => s.pvKwp > 0 && s.memberId !== memberId)
    .map((s) => ({ memberId: s.memberId, name: nameOfSite(s.id) }));

  return {
    member,
    site,
    asOf,
    priceCt,
    sellers: sellers.map((s) => ({ siteId: s.id, name: nameOfSite(s.id), slot: sellerSlot.get(s.id)! })),
    suppliers,
    month: {
      sharedKwh: sharedMonth,
      importKwh: importMonth,
      localShare: importMonth > 0 ? sharedMonth / importMonth : 0,
      billEur: eur(billMicro),
      savedEur: eur(savedMicro),
    },
    today: { sharedKwh: sharedToday, importKwh: importToday, utilityKwh: Math.max(0, importToday - sharedToday) },
    chart,
    shifts,
    schedule,
    potential,
    pick,
    rankBy,
    rule,
    choices,
  };
}
