import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { MICRO_PER_EUR, PRICES } from "@/lib/config";
import { energyAmountMicro } from "@/lib/ledger/ledger";
import { localMidnight, localTime } from "@/lib/sim/clock";
import { checkSme, smeStatus } from "@/lib/sme";
import { resolveAsOf } from "./time";

const { members, sites, businessProfiles, anchorAgreements, allocations, intervalReadings } = schema;

const HOUR_MS = 60 * 60 * 1000;
const GRID_CO2_KG_PER_KWH = 0.36; // approximate German grid average

export function smePersonas() {
  return db.select({ id: members.id, name: members.name }).from(members).where(eq(members.kind, "sme")).all();
}

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export type SmeDashboard = NonNullable<ReturnType<typeof getSmeDashboard>>;

export function getSmeDashboard(memberId: string, at?: string) {
  const member = db.select().from(members).where(eq(members.id, memberId)).get();
  const site = db.select().from(sites).where(eq(sites.memberId, memberId)).get();
  if (!member) return null;

  const profile = db.select().from(businessProfiles).where(eq(businessProfiles.memberId, memberId)).get() ?? null;
  const check = profile ? checkSme(profile.staff, profile.turnoverEur, profile.balanceSheetEur) : null;
  // Whether this business takes part in sharing right now (the same rule matching uses).
  const status = smeStatus(member.smeVerified, profile?.checkedAt, Date.now());
  const anchorRow = db.select().from(anchorAgreements).where(eq(anchorAgreements.memberId, memberId)).get();
  const anchor = anchorRow ? { ...anchorRow, from: hhmm(anchorRow.fromMinute), to: hhmm(anchorRow.toMinute) } : null;
  // A new business workspace has no meter yet, but can already pass the SME check.
  if (!site) return { member, site: null, profile, check, anchor, smeStatus: status, asOf: null };

  const asOf = resolveAsOf(site.id, at);
  if (asOf == null) return { member, site, profile, check, anchor, smeStatus: status, asOf: null };

  const dayStart = localMidnight(asOf);
  const [year, month] = localTime(asOf).dateKey.split("-");
  const monthStart = localMidnight(Date.parse(`${year}-${month}-01T12:00:00Z`));

  const received = db
    .select()
    .from(allocations)
    .where(and(eq(allocations.buyerSiteId, site.id), eq(allocations.kind, "final"), gte(allocations.ts, monthStart), lte(allocations.ts, asOf)))
    .all();
  const isAnchor = (priceCt: number) => anchor !== null && priceCt === anchor.priceCt;

  const readings = db
    .select()
    .from(intervalReadings)
    .where(and(eq(intervalReadings.siteId, site.id), gte(intervalReadings.ts, monthStart), lte(intervalReadings.ts, asOf)))
    .all();

  // Daily history for this month: anchor kWh against the cap, other neighbour kWh, and the utility.
  const days = new Map<string, { dateKey: string; dayStart: number; anchorKwh: number; otherKwh: number; importKwh: number }>();
  const dayOf = (ts: number) => {
    const key = localTime(ts).dateKey;
    const row = days.get(key) ?? { dateKey: key, dayStart: localMidnight(ts), anchorKwh: 0, otherKwh: 0, importKwh: 0 };
    days.set(key, row);
    return row;
  };
  for (const r of readings) dayOf(r.ts).importKwh += r.importKwh;
  for (const a of received) {
    const row = dayOf(a.ts);
    if (isAnchor(a.priceCt)) row.anchorKwh += a.kwh;
    else row.otherKwh += a.kwh;
  }
  const history = [...days.values()].sort((a, b) => b.dayStart - a.dayStart);
  const today = history.find((d) => d.dayStart === dayStart) ?? { anchorKwh: 0, otherKwh: 0, importKwh: 0 };

  const sharedMonth = received.reduce((sum, a) => sum + a.kwh, 0);
  const importMonth = readings.reduce((sum, r) => sum + r.importKwh, 0);
  const savedMicro = received.reduce((sum, a) => sum + energyAmountMicro(a.kwh, PRICES.gridCt - a.priceCt), 0);

  // Hourly profile for today: the bakery's use against the whole neighbourhood's surplus.
  const allToday = db
    .select({ siteId: intervalReadings.siteId, ts: intervalReadings.ts, loadKwh: intervalReadings.loadKwh, exportKwh: intervalReadings.exportKwh })
    .from(intervalReadings)
    .where(and(gte(intervalReadings.ts, dayStart), lte(intervalReadings.ts, asOf)))
    .all();
  const profileByHour = Array.from({ length: 24 }, (_, h) => {
    const from = dayStart + h * HOUR_MS;
    const inHour = allToday.filter((r) => r.ts >= from && r.ts < from + HOUR_MS);
    const measured = inHour.length > 0;
    return {
      hourTs: from,
      usage: measured ? inHour.filter((r) => r.siteId === site.id).reduce((sum, r) => sum + r.loadKwh, 0) : null,
      surplus: measured ? inHour.reduce((sum, r) => sum + r.exportKwh, 0) : null,
    };
  });

  return {
    member,
    site,
    profile,
    check,
    smeStatus: status,
    anchor,
    asOf,
    today: {
      anchorKwh: today.anchorKwh,
      otherKwh: today.otherKwh,
      importKwh: today.importKwh,
      capUsed: anchor ? today.anchorKwh / anchor.maxKwhPerDay : 0,
    },
    month: {
      sharedKwh: sharedMonth,
      localShare: importMonth > 0 ? sharedMonth / importMonth : 0,
      savedEur: savedMicro / MICRO_PER_EUR,
      co2Kg: sharedMonth * GRID_CO2_KG_PER_KWH,
    },
    history,
    profileByHour,
  };
}
