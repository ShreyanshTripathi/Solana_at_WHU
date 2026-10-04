import { describe, expect, it } from "vitest";
import { MICRO_PER_EUR } from "@/lib/config";
import { grossPayments, legsForAllocation, netByAccount, splitProjectSale, type ProjectTerms } from "@/lib/ledger/ledger";

const eur = (x: number) => x * MICRO_PER_EUR;

const project: ProjectTerms = {
  id: "weber",
  principalMicro: eur(35_000),
  returnBps: 2_400,
  repaidMicro: 0,
  feeBps: 300,
  reserveBps: 500,
  reserveMicro: 0,
  reserveTargetMicro: eur(1_750),
  investorShareBps: 8_500,
};
const investors = [
  { investorMemberId: "lena", amountMicro: eur(20_000) },
  { investorMemberId: "tom", amountMicro: eur(15_000) },
];
const sum = (legs: { amountMicro: number }[]) => legs.reduce((s, l) => s + l.amountMicro, 0);

describe("splitProjectSale", () => {
  it("follows the waterfall and adds up to the sale exactly", () => {
    const legs = splitProjectSale(1_000_003, "weber", project, investors);
    expect(sum(legs)).toBe(1_000_003);
    expect(legs.find((l) => l.kind === "fee")?.amountMicro).toBe(30_000);
    expect(legs.find((l) => l.kind === "reserve")?.amountMicro).toBe(50_000);
    const toInvestors = legs.filter((l) => l.kind === "investor");
    expect(sum(toInvestors)).toBe(850_002);
    expect(toInvestors.find((l) => l.accountId === "lena")!.amountMicro).toBeGreaterThan(
      toInvestors.find((l) => l.accountId === "tom")!.amountMicro,
    );
  });

  it("stops the reserve once it is full and pays investors no more than they are owed", () => {
    // Owed in total: 35,000 principal + 24% return = 43,400.
    const almostDone = { ...project, reserveMicro: eur(1_750), repaidMicro: eur(43_400) - 100 };
    const legs = splitProjectSale(eur(1), "weber", almostDone, investors);
    expect(legs.some((l) => l.kind === "reserve")).toBe(false);
    expect(sum(legs.filter((l) => l.kind === "investor"))).toBe(100);
    expect(sum(legs)).toBe(eur(1));
  });
});

describe("legsForAllocation", () => {
  it("is a balanced transaction", () => {
    const plain = legsForAllocation(40_000, "ben", "anna");
    const withProject = legsForAllocation(40_000, "ben", "weber", { terms: project, investors });
    expect(sum(plain)).toBe(0);
    expect(sum(withProject)).toBe(0);
    expect(netByAccount(plain).get("ben")).toBe(-40_000);
  });
});

describe("peer-to-peer payments", () => {
  it("has each buyer pay every party of their purchases directly, gross", () => {
    const pay = grossPayments([
      { txnId: "t1", accountId: "ben", amountMicro: -100 },
      { txnId: "t1", accountId: "anna", amountMicro: 100 },
      { txnId: "t2", accountId: "anna", amountMicro: -50 }, // Anna also buys in the same hour
      { txnId: "t2", accountId: "kiezwatt", amountMicro: 2 },
      { txnId: "t2", accountId: "lena", amountMicro: 40 },
      { txnId: "t2", accountId: "weber", amountMicro: 8 },
      { txnId: "t3", accountId: "ben", amountMicro: -30 },
      { txnId: "t3", accountId: "anna", amountMicro: 30 },
    ]);
    expect([...pay.get("ben")!]).toEqual([["anna", 130]]);
    expect(Object.fromEntries(pay.get("anna")!)).toEqual({ kiezwatt: 2, lena: 40, weber: 8 });
    const paid = [...pay.values()].flatMap((m) => [...m.values()]).reduce((s, x) => s + x, 0);
    expect(paid).toBe(180); // everything bought is paid exactly once
  });
});
