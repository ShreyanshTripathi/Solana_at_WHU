import { describe, expect, it } from "vitest";
import { computeStatement, includedVat, type LedgerRow } from "@/lib/statements/compute";

// One hour (batch b1) of a small neighbourhood, in micro-euros:
//  - Anna (site-anna) sells 2 kWh at 20 ct to Ben: 400,000
//  - Anna buys 0.5 kWh at 20 ct from Weber's project roof: 100,000, split into fee, reserve, investors, host
//  - in hour b2 Anna only buys 1 kWh at 17 ct from Weber: 170,000
const rows: LedgerRow[] = [
  { txnId: "1000:site-anna:site-ben:20", accountId: "ben", kind: "energy", amountMicro: -400_000, status: "settled", batchId: "b1" },
  { txnId: "1000:site-anna:site-ben:20", accountId: "anna", kind: "energy", amountMicro: 400_000, status: "settled", batchId: "b1" },
  { txnId: "1000:site-weber:site-anna:20", accountId: "anna", kind: "energy", amountMicro: -100_000, status: "settled", batchId: "b1" },
  { txnId: "1000:site-weber:site-anna:20", accountId: "kiezwatt", kind: "fee", amountMicro: 3_000, status: "settled", batchId: "b1" },
  { txnId: "1000:site-weber:site-anna:20", accountId: "reserve:weber", kind: "reserve", amountMicro: 5_000, status: "settled", batchId: "b1" },
  { txnId: "1000:site-weber:site-anna:20", accountId: "lena", kind: "investor", amountMicro: 85_000, status: "settled", batchId: "b1" },
  { txnId: "1000:site-weber:site-anna:20", accountId: "weber", kind: "host", amountMicro: 7_000, status: "settled", batchId: "b1" },
  { txnId: "5000:site-weber:site-anna:17", accountId: "anna", kind: "energy", amountMicro: -170_000, status: "settled", batchId: "b2" },
  { txnId: "5000:site-weber:site-anna:17", accountId: "weber", kind: "host", amountMicro: 170_000, status: "settled", batchId: "b2" },
  { txnId: "9000:site-weber:site-anna:20", accountId: "anna", kind: "energy", amountMicro: -20_000, status: "pending", batchId: null },
  { txnId: "9000:site-weber:site-anna:20", accountId: "weber", kind: "host", amountMicro: 20_000, status: "pending", batchId: null },
];
const kwhByTxn = new Map([
  ["1000:site-anna:site-ben:20", 2],
  ["1000:site-weber:site-anna:20", 0.5],
  ["5000:site-weber:site-anna:17", 1],
  ["9000:site-weber:site-anna:20", 0.1],
]);
const batches = new Map([
  ["b1", { id: "b1", periodStart: 1000, status: "confirmed" as const, txSignatures: ["sig1"] }],
  ["b2", { id: "b2", periodStart: 5000, status: "simulated" as const, txSignatures: [] }],
]);
const base = { kwhByTxn, batches, meter: null };

describe("VAT", () => {
  it("is the part a gross amount includes, not added on top", () => {
    expect(includedVat(1_190_000)).toBe(190_000);
    expect(includedVat(100)).toBe(16);
  });
});

describe("monthly statement", () => {
  const anna = computeStatement({ memberId: "anna", isBusiness: false, siteId: "site-anna", rows, ...base });

  it("lists energy bought and sold by price", () => {
    expect(anna.bought.lines).toEqual([
      { priceCt: 17, kwh: 1, grossMicro: 170_000 },
      { priceCt: 20, kwh: 0.6, grossMicro: 120_000 },
    ]);
    expect(anna.bought.vatMicro).toBe(includedVat(290_000));
    expect(anna.sold.lines).toEqual([{ priceCt: 20, kwh: 2, grossMicro: 400_000 }]);
  });

  it("charges no VAT on a household's sales and 19% on a business's", () => {
    expect(anna.sold.vatMicro).toBe(0);
    const shop = computeStatement({ memberId: "anna", isBusiness: true, siteId: "site-anna", rows, ...base });
    expect(shop.sold.vatMicro).toBe(includedVat(400_000));
  });

  it("nets each hour: a payout where sales win, a bill where purchases win, the rest unsettled", () => {
    expect(anna.totals.paidOutMicro).toBe(300_000); // b1: +400,000 - 100,000
    expect(anna.totals.billedMicro).toBe(170_000); // b2: only a purchase
    expect(anna.totals.unsettledMicro).toBe(-20_000);
    expect(anna.payments).toEqual([{ batchId: "b1", periodStart: 1000, amountMicro: 300_000, status: "confirmed", signatures: ["sig1"] }]);
  });

  it("always balances: credits minus charges equals payouts minus bills plus what's unsettled", () => {
    const t = anna.totals;
    expect(t.creditedMicro - t.chargedMicro).toBe(t.paidOutMicro + t.simulatedMicro - t.billedMicro - t.paidFromWalletMicro + t.unsettledMicro);
  });

  it("in peer-to-peer mode, shows what the member received and paid from their own wallet, gross", () => {
    const p2pBatches = new Map([
      ["b1", { id: "b1", periodStart: 1000, status: "confirmed" as const, txSignatures: ["p2p1"], mode: "p2p" as const, directPayers: ["anna", "ben"] }],
      ["b2", { id: "b2", periodStart: 5000, status: "confirmed" as const, txSignatures: ["p2p2"], mode: "p2p" as const, directPayers: [] }],
    ]);
    const s = computeStatement({ memberId: "anna", isBusiness: false, siteId: "site-anna", rows, kwhByTxn, batches: p2pBatches, meter: null });
    expect(s.totals.paidOutMicro).toBe(400_000); // received from Ben in b1
    expect(s.totals.paidFromWalletMicro).toBe(100_000); // paid Weber's roof herself in b1
    expect(s.totals.billedMicro).toBe(170_000); // b2: not approved, the Stadtwerk covered it
    expect(s.payments.map((p) => p.amountMicro)).toEqual([400_000, -100_000]);
    const t = s.totals;
    expect(t.creditedMicro - t.chargedMicro).toBe(t.paidOutMicro + t.simulatedMicro - t.billedMicro - t.paidFromWalletMicro + t.unsettledMicro);
  });

  it("shows a project roof's deductions and what reached the host", () => {
    const weber = computeStatement({ memberId: "weber", isBusiness: false, siteId: "site-weber", rows, ...base });
    expect(weber.sold.grossMicro).toBe(290_000);
    expect(weber.sold.deductions).toEqual({ feeMicro: 3_000, feeVatMicro: includedVat(3_000), reserveMicro: 5_000, investorMicro: 85_000 });
    expect(weber.sold.creditedMicro).toBe(197_000);
    expect(weber.totals.simulatedMicro).toBe(170_000); // b2 was settled in a simulated batch, no transfer
  });

  it("gives investors their repayments per roof", () => {
    const lena = computeStatement({ memberId: "lena", isBusiness: false, siteId: null, rows, ...base });
    expect(lena.repayments).toEqual({ lines: [{ siteId: "site-weber", grossMicro: 85_000 }], totalMicro: 85_000 });
    expect(lena.totals.paidOutMicro).toBe(85_000);
  });
});

describe("a funded roof's feed-in", () => {
  // Weber's roof sells 1 kWh to Anna at 8 ct and feeds 2 kWh into the grid at the 8 ct tariff.
  const feedIn: LedgerRow[] = [
    { txnId: "1000:site-weber:site-anna:8", accountId: "anna", kind: "energy", amountMicro: -80_000, status: "settled", batchId: "b1" },
    { txnId: "1000:site-weber:site-anna:8", accountId: "lena", kind: "investor", amountMicro: 80_000, status: "settled", batchId: "b1" },
    { txnId: "1000:site-weber:grid:8", accountId: "stadtwerk", kind: "energy", amountMicro: -160_000, status: "settled", batchId: "b1" },
    { txnId: "1000:site-weber:grid:8", accountId: "lena", kind: "investor", amountMicro: 160_000, status: "settled", batchId: "b1" },
  ];
  const kwh = new Map([
    ["1000:site-weber:site-anna:8", 1],
    ["1000:site-weber:grid:8", 2],
  ]);

  it("is its own line after the neighbour sales, even at the same price", () => {
    const weber = computeStatement({ memberId: "weber", isBusiness: false, siteId: "site-weber", rows: feedIn, kwhByTxn: kwh, batches, meter: null });
    expect(weber.sold.lines).toEqual([
      { priceCt: 8, kwh: 1, grossMicro: 80_000 },
      { priceCt: 8, kwh: 2, grossMicro: 160_000, grid: true },
    ]);
    expect(weber.sold.deductions?.investorMicro).toBe(240_000);
  });
});
