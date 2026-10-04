import { and, desc, eq, gt, isNotNull, like, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { MICRO_PER_EUR, PRICES } from "@/lib/config";
import { investorOutstandingMicro, type ProjectTerms } from "@/lib/ledger/ledger";

const { projects, investments, members, sites, intervalReadings, ledgerEntries, settlementBatches, allocations } = schema;

const YIELD_KWH_PER_KWP = 930; // typical yearly yield in this part of Germany (approximate)
const eur = (micro: number) => micro / MICRO_PER_EUR;

export const LIFECYCLE = ["funding", "funded", "installed", "repaying", "paid_off"] as const;

// Payoff estimate: a year of output, sold to neighbours and fed into the grid in the shares this
// roof has actually achieved so far, at its average neighbour price and the feed-in tariff.
function payoffEstimate(project: typeof projects.$inferSelect, site: typeof sites.$inferSelect, remainingMicro: number) {
  const meter = db
    .select({
      generated: sql<number>`coalesce(sum(${intervalReadings.generationKwh}), 0)`,
      exported: sql<number>`coalesce(sum(${intervalReadings.exportKwh}), 0)`,
    })
    .from(intervalReadings)
    .where(eq(intervalReadings.siteId, site.id))
    .get();
  const sold = db
    .select({ kwh: sql<number>`coalesce(sum(${allocations.kwh}), 0)`, ctKwh: sql<number>`coalesce(sum(${allocations.kwh} * ${allocations.priceCt}), 0)` })
    .from(allocations)
    .where(and(eq(allocations.sellerSiteId, site.id), eq(allocations.kind, "final")))
    .get();
  if (!meter || !sold || meter.generated <= 0 || sold.kwh <= 0 || site.pvKwp <= 0) return null;

  const soldShare = sold.kwh / meter.generated;
  const gridShare = Math.max(0, meter.exported - sold.kwh) / meter.generated;
  const avgPriceCt = sold.ctKwh / sold.kwh;
  const yearlyKwh = site.pvKwp * YIELD_KWH_PER_KWP;
  const yearlyIncomeEur = (yearlyKwh * (soldShare * avgPriceCt + gridShare * PRICES.feedInCt)) / 100;
  const yearlyToInvestorsEur = yearlyIncomeEur * (project.investorShareBps / 10_000);
  return {
    soldShare,
    gridShare,
    avgPriceCt,
    yearlyToInvestorsEur,
    years: eur(remainingMicro) / yearlyToInvestorsEur,
  };
}

export function getProjects() {
  const names = new Map(db.select().from(members).all().map((m) => [m.id, m.name]));
  return db
    .select()
    .from(projects)
    .all()
    .map((p) => {
      const site = db.select().from(sites).where(eq(sites.id, p.hostSiteId)).get()!;
      const owedMicro = investorOutstandingMicro(p as ProjectTerms) + p.repaidMicro;
      const positions = db
        .select()
        .from(investments)
        .where(eq(investments.projectId, p.id))
        .all()
        .map((i) => ({
          ...i,
          name: names.get(i.investorMemberId) ?? i.investorMemberId,
          investedEur: eur(i.amountMicro),
          refunded: i.refundedAt !== null,
          repaidEur: eur(i.repaidMicro),
          owedEur: p.raisedMicro > 0 ? eur((owedMicro * i.amountMicro) / p.raisedMicro) : 0,
        }));

      // The latest hourly repayments, each with its Solana transaction.
      const repayments = db
        .select({
          batchId: ledgerEntries.batchId,
          micro: sql<number>`sum(${ledgerEntries.amountMicro})`,
          periodStart: settlementBatches.periodStart,
          signatures: settlementBatches.txSignatures,
        })
        .from(ledgerEntries)
        .innerJoin(settlementBatches, eq(settlementBatches.id, ledgerEntries.batchId))
        .where(
          and(
            eq(ledgerEntries.kind, "investor"),
            like(ledgerEntries.txnId, `%:${site.id}:%`),
            isNotNull(ledgerEntries.batchId),
            gt(ledgerEntries.amountMicro, 0),
          ),
        )
        .groupBy(ledgerEntries.batchId)
        .orderBy(desc(settlementBatches.periodStart))
        .limit(6)
        .all()
        .map((r) => ({ ...r, eur: eur(r.micro) }));

      const remainingMicro = Math.max(0, owedMicro - p.repaidMicro);
      return {
        ...p,
        hostName: names.get(site.memberId) ?? site.label,
        site,
        positions,
        repayments,
        owedEur: eur(owedMicro),
        repaidEur: eur(p.repaidMicro),
        reserveEur: eur(p.reserveMicro),
        reserveTargetEur: eur(p.reserveTargetMicro),
        principalEur: eur(p.principalMicro),
        raisedEur: eur(p.raisedMicro),
        progress: owedMicro > 0 ? p.repaidMicro / owedMicro : 0,
        fundingProgress: p.principalMicro > 0 ? p.raisedMicro / p.principalMicro : 0,
        fundingDaysLeft: p.fundingDeadline ? Math.max(0, Math.ceil((p.fundingDeadline - Date.now()) / 86_400_000)) : null,
        payoff: p.state === "repaying" ? payoffEstimate(p, site, remainingMicro) : null,
      };
    });
}

export function projectFormChoices() {
  const all = db.select().from(members).all();
  return {
    hosts: db
      .select({ id: members.id, name: members.name })
      .from(members)
      .innerJoin(sites, eq(sites.memberId, members.id))
      .where(eq(members.kind, "household"))
      .all(),
    investors: all.filter((m) => m.kind === "investor").map((m) => ({ id: m.id, name: m.name })),
  };
}
