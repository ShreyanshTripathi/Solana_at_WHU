// A workspace's monthly statement, computed from ledger rows. Pure: the database part is in
// load.ts, so every number here has a unit test.
//
// Money is in integer micro-euros. Amounts in the ledger are gross: VAT is shown as the part
// they include, never added on top.

import { GRID } from "@/lib/ledger/ledger";

export const VAT_RATE = 0.19;
// VAT included in a gross amount, rounded to the micro-euro.
export const includedVat = (grossMicro: number, rate = VAT_RATE) => Math.round((grossMicro * rate) / (1 + rate));

export interface LedgerRow {
  txnId: string; // `${ts}:${sellerSiteId}:${buyerSiteId}:${priceCt}`
  accountId: string;
  kind: "energy" | "fee" | "reserve" | "investor" | "host";
  amountMicro: number;
  status: "pending" | "settled" | "failed";
  batchId: string | null;
}

export interface BatchRow {
  id: string;
  periodStart: number;
  status: "open" | "submitted" | "confirmed" | "simulated" | "failed";
  txSignatures: string[]; // for a p2p batch: only the transactions this member took part in
  mode?: "supplier" | "p2p";
  directPayers?: string[]; // p2p: buyers who paid from their own wallet (the rest the Stadtwerk covered)
}

export interface MeterTotals {
  loadKwh: number;
  importKwh: number;
  exportKwh: number;
  generationKwh: number;
}

export interface PriceLine {
  priceCt: number;
  kwh: number;
  grossMicro: number;
  grid?: boolean; // a funded roof's power fed into the grid, at the feed-in tariff
}

export interface StatementData {
  bought: { lines: PriceLine[]; kwh: number; grossMicro: number; vatMicro: number };
  sold: {
    lines: PriceLine[];
    kwh: number;
    grossMicro: number;
    vatRate: number; // 0 for households (small-business rule), VAT_RATE for businesses
    vatMicro: number;
    deductions: { feeMicro: number; feeVatMicro: number; reserveMicro: number; investorMicro: number } | null;
    creditedMicro: number; // what the member actually got for these sales
  };
  repayments: { lines: { siteId: string; grossMicro: number }[]; totalMicro: number };
  // amountMicro > 0: paid to the member; < 0: the member paid neighbours from their wallet (p2p).
  payments: { batchId: string; periodStart: number; amountMicro: number; status: BatchRow["status"]; signatures: string[] }[];
  totals: {
    creditedMicro: number; // sales credited + repayments
    chargedMicro: number; // purchases
    paidOutMicro: number; // transferred on Solana (confirmed batches)
    simulatedMicro: number; // settled in simulated batches (no transfer in the demo)
    billedMicro: number; // purchases charged with the electricity bill (supplier mode, or not covered in p2p)
    paidFromWalletMicro: number; // p2p: purchases the member paid neighbours directly from their wallet
    unsettledMicro: number; // not in a batch yet (net)
  };
  meter: (MeterTotals & { fromNeighboursKwh: number }) | null;
}

export const parseTxn = (txnId: string) => {
  const [ts, sellerSiteId, buyerSiteId, price] = txnId.split(":");
  return { ts: Number(ts), sellerSiteId, buyerSiteId, priceCt: Number(price) };
};

function addToLine(lines: Map<string, PriceLine>, priceCt: number, kwh: number, grossMicro: number, grid = false) {
  const key = `${grid ? "grid" : "neighbours"}:${priceCt}`;
  const line = lines.get(key) ?? { priceCt, kwh: 0, grossMicro: 0, ...(grid ? { grid: true } : {}) };
  line.kwh += kwh;
  line.grossMicro += grossMicro;
  lines.set(key, line);
}
// Neighbour sales by price, then the feed-in line.
const sorted = (lines: Map<string, PriceLine>) => [...lines.values()].sort((a, b) => Number(a.grid ?? false) - Number(b.grid ?? false) || a.priceCt - b.priceCt);

export interface StatementInput {
  memberId: string;
  isBusiness: boolean;
  siteId: string | null;
  rows: LedgerRow[]; // every leg of every transaction this member or their site took part in, this month
  kwhByTxn: Map<string, number>;
  batches: Map<string, BatchRow>;
  meter: MeterTotals | null;
}

export function computeStatement(input: StatementInput): StatementData {
  const { memberId, siteId, rows } = input;
  const mine = rows.filter((r) => r.accountId === memberId);
  const byTxn = new Map<string, LedgerRow[]>();
  for (const r of rows) byTxn.set(r.txnId, [...(byTxn.get(r.txnId) ?? []), r]);

  // Bought: the member's own debits.
  const boughtLines = new Map<string, PriceLine>();
  for (const r of mine.filter((x) => x.kind === "energy" && x.amountMicro < 0)) {
    addToLine(boughtLines, parseTxn(r.txnId).priceCt, input.kwhByTxn.get(r.txnId) ?? 0, -r.amountMicro);
  }

  // Sold: every transaction where the member's site is the seller. The sale value is what the buyer
  // paid; if the roof is a Solar Now, Pay Never project, part of it went to fee, reserve and investors.
  const soldLines = new Map<string, PriceLine>();
  let fee = 0;
  let reserve = 0;
  let investor = 0;
  let credited = 0;
  let isProject = false;
  for (const [txnId, legs] of byTxn) {
    const t = parseTxn(txnId);
    if (!siteId || t.sellerSiteId !== siteId) continue;
    const buyerLeg = legs.find((l) => l.kind === "energy" && l.amountMicro < 0);
    addToLine(soldLines, t.priceCt, input.kwhByTxn.get(txnId) ?? 0, buyerLeg ? -buyerLeg.amountMicro : 0, t.buyerSiteId === GRID);
    for (const l of legs) {
      if (l.kind === "fee") fee += l.amountMicro;
      if (l.kind === "reserve") reserve += l.amountMicro;
      if (l.kind === "investor") investor += l.amountMicro;
      if (l.kind === "fee" || l.kind === "reserve" || l.kind === "investor" || l.kind === "host") isProject = true;
      if (l.accountId === memberId && l.amountMicro > 0 && (l.kind === "energy" || l.kind === "host")) credited += l.amountMicro;
    }
  }
  const soldGross = sorted(soldLines).reduce((s, l) => s + l.grossMicro, 0);
  const soldVatRate = input.isBusiness ? VAT_RATE : 0;

  // Repayments to an investor, per roof.
  const repaid = new Map<string, number>();
  for (const r of mine.filter((x) => x.kind === "investor")) {
    const roof = parseTxn(r.txnId).sellerSiteId;
    repaid.set(roof, (repaid.get(roof) ?? 0) + r.amountMicro);
  }
  const repaymentsTotal = [...repaid.values()].reduce((s, x) => s + x, 0);

  // Payments. Supplier mode nets each hour per account, so a batch either pays the member or bills them.
  // Peer-to-peer mode is gross: the member receives from buyers and pays sellers from their own wallet.
  const perBatch = new Map<string, { credit: number; debit: number }>();
  let unsettled = 0;
  for (const r of mine) {
    if (!r.batchId || r.status !== "settled") {
      unsettled += r.amountMicro;
      continue;
    }
    const b = perBatch.get(r.batchId) ?? { credit: 0, debit: 0 };
    if (r.amountMicro > 0) b.credit += r.amountMicro;
    else b.debit -= r.amountMicro;
    perBatch.set(r.batchId, b);
  }
  const payments: StatementData["payments"] = [];
  let paidOut = 0;
  let simulated = 0;
  let billed = 0;
  let paidFromWallet = 0;
  for (const [batchId, { credit, debit }] of perBatch) {
    const batch = input.batches.get(batchId);
    if (!batch) continue;
    const entry = (amountMicro: number) => ({ batchId, periodStart: batch.periodStart, amountMicro, status: batch.status, signatures: batch.txSignatures });
    if (batch.mode === "p2p" && batch.status === "confirmed") {
      paidOut += credit;
      if (credit > 0) payments.push(entry(credit));
      if (batch.directPayers?.includes(memberId)) {
        paidFromWallet += debit;
        if (debit > 0) payments.push(entry(-debit));
      } else {
        billed += debit;
      }
      continue;
    }
    const net = credit - debit;
    if (net < 0) billed += -net;
    if (net <= 0) continue;
    if (batch.status === "confirmed") paidOut += net;
    else simulated += net;
    payments.push(entry(net));
  }
  payments.sort((a, b) => a.periodStart - b.periodStart);

  const bought = sorted(boughtLines);
  const boughtGross = bought.reduce((s, l) => s + l.grossMicro, 0);
  const boughtKwh = bought.reduce((s, l) => s + l.kwh, 0);
  return {
    bought: { lines: bought, kwh: boughtKwh, grossMicro: boughtGross, vatMicro: includedVat(boughtGross) },
    sold: {
      lines: sorted(soldLines),
      kwh: sorted(soldLines).reduce((s, l) => s + l.kwh, 0),
      grossMicro: soldGross,
      vatRate: soldVatRate,
      vatMicro: soldVatRate > 0 ? includedVat(soldGross, soldVatRate) : 0,
      deductions: isProject ? { feeMicro: fee, feeVatMicro: includedVat(fee), reserveMicro: reserve, investorMicro: investor } : null,
      creditedMicro: credited,
    },
    repayments: { lines: [...repaid].map(([siteId, grossMicro]) => ({ siteId, grossMicro })), totalMicro: repaymentsTotal },
    payments,
    totals: {
      creditedMicro: credited + repaymentsTotal,
      chargedMicro: boughtGross,
      paidOutMicro: paidOut,
      simulatedMicro: simulated,
      billedMicro: billed,
      paidFromWalletMicro: paidFromWallet,
      unsettledMicro: unsettled,
    },
    meter: input.meter ? { ...input.meter, fromNeighboursKwh: boughtKwh } : null,
  };
}
