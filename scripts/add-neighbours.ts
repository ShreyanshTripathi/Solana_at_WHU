// Adds demo personas that are missing from an existing database (members, logins, sites, buying
// rules, SME check data), without touching anything that is already there. Run `npm run setup:devnet`
// first so the new members get devnet wallets; run this again afterwards to link them.
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { COMMUNITY } from "@/lib/config";
import { DEMO_BUSINESS_PROFILES, demoAccounts, demoRoleFor, demoSiteDetails, PERSONAS, siteIdFor } from "@/lib/demo/personas";
import { readDevnetConfig } from "@/lib/solana/wallets";

const s = schema;
const wallets = readDevnetConfig()?.wallets ?? {};
const now = Date.now();
const added: string[] = [];
let linked = 0;

db.transaction((tx) => {
  for (const p of PERSONAS) {
    const existing = tx.select().from(s.members).where(eq(s.members.id, p.id)).get();
    if (existing) {
      if (!existing.walletPubkey && wallets[p.id]) {
        tx.update(s.members).set({ walletPubkey: wallets[p.id] }).where(eq(s.members.id, p.id)).run();
        linked++;
      }
      continue;
    }
    tx.insert(s.members)
      .values({ id: p.id, name: p.name, kind: p.kind, walletPubkey: wallets[p.id] ?? null, smeVerified: p.kind === "sme", role: demoRoleFor(p) })
      .run();
    const login = demoAccounts(now).find((l) => l.link.memberId === p.id);
    if (login && !tx.select().from(s.accounts).where(eq(s.accounts.id, login.account.id)).get()) {
      tx.insert(s.accounts).values(login.account).run();
      tx.insert(s.accountWorkspaces).values(login.link).run();
    }
    if (p.site) {
      tx.insert(s.sites).values({ id: siteIdFor(p.id), memberId: p.id, communityId: COMMUNITY.id, ...demoSiteDetails(p) }).run();
      tx.insert(s.buyerRules).values({ memberId: p.id, maxPriceCt: 25, maxDistanceM: 3_000, preferred: [], blocked: [] }).run();
    }
    const profile = DEMO_BUSINESS_PROFILES[p.id];
    if (profile) tx.insert(s.businessProfiles).values({ memberId: p.id, ...profile, checkedAt: now }).run();
    added.push(p.id);
  }
});

console.log(added.length ? `Added ${added.length} members: ${added.join(", ")}.` : "No members missing.");
if (linked) console.log(`Linked ${linked} devnet wallets.`);
const unlinked = PERSONAS.filter((p) => p.kind !== "platform" && !wallets[p.id]).map((p) => p.id);
if (unlinked.length) console.log(`No devnet wallet yet for: ${unlinked.join(", ")}. Run npm run setup:devnet, then this again.`);
