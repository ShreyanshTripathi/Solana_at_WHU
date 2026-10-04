import { MICRO_PER_CT } from "@/lib/config";

export type LegKind = "energy" | "fee" | "reserve" | "investor" | "host";

export interface Leg {
  accountId: string;
  amountMicro: number; // + credit, - debit
  kind: LegKind;
}

export interface ProjectTerms {
  id: string;
  principalMicro: number;
  returnBps: number;
  repaidMicro: number;
  feeBps: number;
  reserveBps: number;
  reserveMicro: number;
  reserveTargetMicro: number;
  investorShareBps: number;
}

export interface InvestorPosition {
  investorMemberId: string;
  amountMicro: number;
}

export const PLATFORM_ACCOUNT = "kiezwatt";
export const reserveAccount = (projectId: string) => `reserve:${projectId}`;

// The "buyer" in a funded roof's feed-in transactions: `${ts}:${roofSiteId}:grid:${feedInCt}`.
export const GRID = "grid";

export const energyAmountMicro = (kwh: number, priceCt: number): number => Math.round(kwh * priceCt * MICRO_PER_CT);

const bps = (amount: number, basisPoints: number) => Math.floor((amount * basisPoints) / 10_000);

export function investorOutstandingMicro(p: ProjectTerms): number {
  return Math.max(0, p.principalMicro + bps(p.principalMicro, p.returnBps) - p.repaidMicro);
}

// Solar Now, Pay Never waterfall for one sale by a project roof:
// platform fee, then reserve until full, then investors until repaid, then the host.
// Legs always add up to the sale amount exactly; rounding leftovers go to the host.
export function splitProjectSale(
  amountMicro: number,
  hostMemberId: string,
  project: ProjectTerms,
  investors: InvestorPosition[],
): Leg[] {
  const fee = bps(amountMicro, project.feeBps);
  const reserve = Math.min(bps(amountMicro, project.reserveBps), Math.max(0, project.reserveTargetMicro - project.reserveMicro));
  const investorPool = Math.min(bps(amountMicro, project.investorShareBps), investorOutstandingMicro(project));

  const legs: Leg[] = [];
  if (fee > 0) legs.push({ accountId: PLATFORM_ACCOUNT, amountMicro: fee, kind: "fee" });
  if (reserve > 0) legs.push({ accountId: reserveAccount(project.id), amountMicro: reserve, kind: "reserve" });

  const totalInvested = investors.reduce((sum, i) => sum + i.amountMicro, 0);
  let paidToInvestors = 0;
  investors.forEach((inv, index) => {
    const share =
      index === investors.length - 1
        ? investorPool - paidToInvestors
        : Math.floor((investorPool * inv.amountMicro) / totalInvested);
    paidToInvestors += share;
    if (share > 0) legs.push({ accountId: inv.investorMemberId, amountMicro: share, kind: "investor" });
  });

  const host = amountMicro - fee - reserve - paidToInvestors;
  if (host > 0) legs.push({ accountId: hostMemberId, amountMicro: host, kind: "host" });
  return legs;
}

// One allocation as a balanced transaction: the buyer is debited, the seller side is credited
// (split by the waterfall when the seller's roof is a funded project).
export function legsForAllocation(
  amountMicro: number,
  buyerMemberId: string,
  sellerMemberId: string,
  project?: { terms: ProjectTerms; investors: InvestorPosition[] },
): Leg[] {
  const credits = project
    ? splitProjectSale(amountMicro, sellerMemberId, project.terms, project.investors)
    : [{ accountId: sellerMemberId, amountMicro, kind: "energy" as const }];
  return [{ accountId: buyerMemberId, amountMicro: -amountMicro, kind: "energy" }, ...credits];
}

export function netByAccount(entries: { accountId: string; amountMicro: number }[]): Map<string, number> {
  const net = new Map<string, number>();
  for (const e of entries) net.set(e.accountId, (net.get(e.accountId) ?? 0) + e.amountMicro);
  return net;
}

// Peer-to-peer settlement (1a): who pays whom. In each sale the buyer's debit pays every credit of the
// same transaction directly (the seller, or for a project roof the fee, reserve, investors and host).
// Unlike netByAccount, a member who both buys and sells in an hour pays and receives separately.
export function grossPayments(entries: { txnId: string; accountId: string; amountMicro: number }[]): Map<string, Map<string, number>> {
  const byTxn = new Map<string, { accountId: string; amountMicro: number }[]>();
  for (const e of entries) byTxn.set(e.txnId, [...(byTxn.get(e.txnId) ?? []), e]);
  const out = new Map<string, Map<string, number>>();
  for (const legs of byTxn.values()) {
    const payer = legs.find((l) => l.amountMicro < 0);
    if (!payer) continue;
    for (const l of legs) {
      if (l.amountMicro <= 0 || l.accountId === payer.accountId) continue;
      const row = out.get(payer.accountId) ?? new Map<string, number>();
      row.set(l.accountId, (row.get(l.accountId) ?? 0) + l.amountMicro);
      out.set(payer.accountId, row);
    }
  }
  return out;
}
