import { describe, expect, it } from "vitest";
import { type ProjectTerms, splitProjectSale } from "@/lib/ledger/ledger";

// The same cases as the Rust tests in programs/roof-split/src/lib.rs: the ledger and the on-chain
// program must split every payment identically, to the micro-euro.
const weber: ProjectTerms = {
  id: "weber",
  principalMicro: 35_000_000_000,
  returnBps: 1_500,
  repaidMicro: 0,
  feeBps: 300,
  reserveBps: 500,
  reserveMicro: 0,
  reserveTargetMicro: 1_750_000_000,
  investorShareBps: 8_500,
};
const investors = [
  { investorMemberId: "lena", amountMicro: 20_000 },
  { investorMemberId: "tom", amountMicro: 15_000 },
];
const amount = (legs: ReturnType<typeof splitProjectSale>, kind: string, who?: string) =>
  legs.filter((l) => l.kind === kind && (!who || l.accountId === who)).reduce((s, l) => s + l.amountMicro, 0);

describe("ledger and roof-split program agree", () => {
  it("splits one euro like the program", () => {
    const legs = splitProjectSale(1_000_000, "weber", weber, investors);
    expect([amount(legs, "fee"), amount(legs, "reserve"), amount(legs, "investor", "lena"), amount(legs, "investor", "tom"), amount(legs, "host")]).toEqual([
      30_000, 50_000, 485_714, 364_286, 70_000,
    ]);
  });

  it("stops the reserve when full and investors when repaid, like the program", () => {
    // owed = 35,000 € + 15% = 40,250 €; the program test uses the same caps.
    let terms: ProjectTerms = { ...weber, reserveMicro: 1_749_990_000, repaidMicro: 40_249_900_000 };
    const one = [{ investorMemberId: "lena", amountMicro: 1 }];
    let reserve = 0;
    let repaid = 0;
    for (const sale of [1_000_000, 1_000_000]) {
      const legs = splitProjectSale(sale, "weber", terms, one);
      reserve += amount(legs, "reserve");
      repaid += amount(legs, "investor");
      terms = { ...terms, reserveMicro: terms.reserveMicro + amount(legs, "reserve"), repaidMicro: terms.repaidMicro + amount(legs, "investor") };
    }
    expect(reserve).toBe(10_000);
    expect(repaid).toBe(100_000);
  });
});
