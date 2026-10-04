import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { db, schema } from "@/db/client";
import { MICRO_PER_EUR, TOKEN } from "@/lib/config";
import { PLATFORM_ACCOUNT } from "@/lib/ledger/ledger";
import { localTime } from "@/lib/sim/clock";
import { getConnection, readDevnetConfig, toPublicKey } from "@/lib/solana/wallets";

const { communities, members, sites, anchorAgreements, allocations, ledgerEntries, settlementBatches } = schema;
const eur = (micro: number) => micro / MICRO_PER_EUR;

export function getAdminOverview() {
  const community = db.select().from(communities).get() ?? null;
  const siteByMember = new Map(db.select().from(sites).all().map((s) => [s.memberId, s]));
  const memberRows = db
    .select()
    .from(members)
    .all()
    .map((m) => ({ ...m, site: siteByMember.get(m.id) ?? null }));
  const names = new Map(memberRows.map((m) => [m.id, m.name]));

  const anchors = db
    .select()
    .from(anchorAgreements)
    .all()
    .map((a) => ({ ...a, name: names.get(a.memberId) ?? a.memberId }));

  // Per batch: what the treasury paid out (positive net positions), and to how many wallets.
  const payoutsByBatch = new Map<string, { micro: number; recipients: number }>();
  const nets = db
    .select({ batchId: ledgerEntries.batchId, accountId: ledgerEntries.accountId, micro: sql<number>`sum(${ledgerEntries.amountMicro})` })
    .from(ledgerEntries)
    .where(isNotNull(ledgerEntries.batchId))
    .groupBy(ledgerEntries.batchId, ledgerEntries.accountId)
    .all();
  for (const n of nets) {
    if (n.micro <= 0 || !n.batchId) continue;
    const row = payoutsByBatch.get(n.batchId) ?? { micro: 0, recipients: 0 };
    row.micro += n.micro;
    row.recipients += 1;
    payoutsByBatch.set(n.batchId, row);
  }
  const batches = db
    .select()
    .from(settlementBatches)
    .orderBy(desc(settlementBatches.periodStart))
    .limit(48)
    .all()
    .map((b) => ({ ...b, paidEur: eur(payoutsByBatch.get(b.id)?.micro ?? 0), recipients: payoutsByBatch.get(b.id)?.recipients ?? 0 }));

  const sharedKwh =
    db
      .select({ kwh: sql<number>`coalesce(sum(${allocations.kwh}), 0)` })
      .from(allocations)
      .where(eq(allocations.kind, "final"))
      .get()?.kwh ?? 0;
  const confirmedIds = new Set(
    db.select({ id: settlementBatches.id }).from(settlementBatches).where(eq(settlementBatches.status, "confirmed")).all().map((b) => b.id),
  );
  const paidOutEur = [...payoutsByBatch].filter(([id]) => confirmedIds.has(id)).reduce((sum, [, b]) => sum + eur(b.micro), 0);
  const feesEur = eur(
    db
      .select({ micro: sql<number>`coalesce(sum(${ledgerEntries.amountMicro}), 0)` })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.accountId, PLATFORM_ACCOUNT))
      .get()?.micro ?? 0,
  );

  // The days with settled hours, each with what its CSV holds.
  const exportDays = [...new Set(batches.map((b) => localTime(b.periodStart).dateKey))];
  const perDay = new Map<string, { count: number; kwh: number }>();
  for (const a of db.select({ ts: allocations.ts, kwh: allocations.kwh }).from(allocations).where(eq(allocations.kind, "final")).all()) {
    const day = localTime(a.ts).dateKey;
    if (!exportDays.includes(day)) continue;
    const x = perDay.get(day) ?? { count: 0, kwh: 0 };
    x.count += 1;
    x.kwh += a.kwh;
    perDay.set(day, x);
  }
  const exportDayStats = exportDays.map((day) => ({ day, ...(perDay.get(day) ?? { count: 0, kwh: 0 }) }));

  return {
    community,
    exportDays,
    exportDayStats,
    members: memberRows,
    anchors,
    batches,
    totals: { sharedKwh, paidOutEur, feesEur, confirmedBatches: confirmedIds.size },
    devnet: readDevnetConfig(),
  };
}

// On-chain tEURC balance of the Stadtwerk treasury, or null if devnet is not set up or unreachable.
export async function treasuryBalance(): Promise<number | null> {
  const config = readDevnetConfig();
  if (!config) return null;
  try {
    const account = getAssociatedTokenAddressSync(toPublicKey(config.mint), toPublicKey(config.treasury));
    const balance = await Promise.race([
      getConnection().getTokenAccountBalance(account),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4_000)),
    ]);
    return Number(balance.value.amount) / 10 ** TOKEN.decimals;
  } catch {
    return null;
  }
}
