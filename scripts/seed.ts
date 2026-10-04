// Resets the database to the demo neighbourhood. Run `npm run db:push` first.
import { db, schema } from "@/db/client";
import { COMMUNITY, MICRO_PER_EUR, PRICES } from "@/lib/config";
import { DEMO_BUSINESS_PROFILES, DEMO_BUYERS, demoAccounts, demoRoleFor, demoSiteDetails, PERSONAS, siteIdFor } from "@/lib/demo/personas";
import { readDevnetConfig } from "@/lib/solana/wallets";

const s = schema;
const eur = (amount: number) => amount * MICRO_PER_EUR;

const wallets = readDevnetConfig()?.wallets ?? {};

db.transaction((tx) => {
  for (const table of [
    s.ledgerEntries,
    s.settlementBatches,
    s.allocations,
    s.switchEvents,
    s.forecasts,
    s.intervalReadings,
    s.investments,
    s.projects,
    s.anchorAgreements,
    s.buyerRules,
    s.sellerRules,
    s.businessProfiles,
    s.sites,
    s.communities,
    s.accountWorkspaces,
    s.verificationCodes,
    s.accounts,
    s.members,
    s.simState,
  ]) {
    tx.delete(table).run();
  }

  tx.insert(s.members)
    .values(
      PERSONAS.map((p) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        walletPubkey: wallets[p.id] ?? null,
        smeVerified: p.kind === "sme",
        role: demoRoleFor(p),
      })),
    )
    .run();

  const logins = demoAccounts(Date.now());
  tx.insert(s.accounts).values(logins.map((l) => l.account)).run();
  tx.insert(s.accountWorkspaces).values(logins.map((l) => l.link)).run();

  tx.insert(s.communities)
    .values({
      id: COMMUNITY.id,
      name: COMMUNITY.name,
      gridAreaId: COMMUNITY.gridAreaId,
      priceMode: "fixed",
      communityPriceCt: PRICES.communityCt,
      supplierMemberId: "stadtwerk",
    })
    .run();

  tx.insert(s.sites)
    .values(
      PERSONAS.filter((p) => p.site).map((p) => ({ id: siteIdFor(p.id), memberId: p.id, communityId: COMMUNITY.id, ...demoSiteDetails(p) })),
    )
    .run();

  tx.insert(s.sellerRules)
    .values([
      { memberId: "anna", minPriceCt: 15, batteryReserveKwh: 3, priorityBuyers: ["ben"] },
      { memberId: "carla", minPriceCt: 12, batteryReserveKwh: 0, priorityBuyers: [] },
      { memberId: "weber", minPriceCt: 0, batteryReserveKwh: 0, priorityBuyers: [] },
    ])
    .run();

  tx.insert(s.buyerRules)
    .values(
      DEMO_BUYERS().map((memberId) => ({
        memberId,
        maxPriceCt: 25,
        maxDistanceM: 3_000,
        preferred: memberId === "ben" ? ["anna"] : [],
        blocked: [],
      })),
    )
    .run();

  tx.insert(s.businessProfiles)
    .values(Object.entries(DEMO_BUSINESS_PROFILES).map(([memberId, profile]) => ({ memberId, ...profile, checkedAt: Date.now() })))
    .run();

  // Bäckerei Müller buys the weekday midday surplus at a fixed anchor price.
  tx.insert(s.anchorAgreements)
    .values({
      id: "anchor-baeckerei",
      memberId: "baeckerei",
      communityId: COMMUNITY.id,
      weekdaysOnly: true,
      fromMinute: 10 * 60,
      toMinute: 16 * 60,
      maxKwhPerDay: 60,
      priceCt: 17,
    })
    .run();

  // Solar Now, Pay Never: the Weber barn roof, funded by two investors and repaying.
  tx.insert(s.projects)
    .values({
      id: "weber",
      hostSiteId: siteIdFor("weber"),
      name: "Weber barn roof, 30 kWp",
      principalMicro: eur(35_000),
      returnBps: 1_500, // 15% in total: about 1.5% a year over a ~10-year payoff
      raisedMicro: eur(35_000),
      repaidMicro: 0,
      feeBps: 300,
      reserveBps: 500,
      reserveMicro: 0,
      reserveTargetMicro: eur(1_750),
      investorShareBps: 8_500,
      state: "repaying",
    })
    .run();

  tx.insert(s.investments)
    .values([
      { id: "inv-lena-weber", projectId: "weber", investorMemberId: "lena", amountMicro: eur(20_000) },
      { id: "inv-tom-weber", projectId: "weber", investorMemberId: "tom", amountMicro: eur(15_000) },
    ])
    .run();
});

const withWallets = Object.keys(wallets).length;
console.log(`Seeded ${PERSONAS.length} members and the ${COMMUNITY.name} community.`);
console.log(withWallets ? `Linked ${withWallets} devnet wallets.` : "No devnet wallets yet; run `npm run setup:devnet`, then seed again.");
