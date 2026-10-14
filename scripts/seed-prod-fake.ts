// Fills a FRESH product database (after `npm run prod:init`) with made-up members, so the deployed
// product copy has something to show. Never point it at a database with real people in it:
//   PROD_DATABASE_PATH=<path> npm run prod:init
//   DATABASE_PATH=<path> npx tsx scripts/seed-prod-fake.ts
// Adds an "admin" login (password "admin") for the Stadtwerk console, six made-up households and
// businesses with email + password logins (password: volty-demo), their sites in Vallendar, and a
// week of simulated meter readings and trades (recorded only; nothing is paid on Solana).
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import { COMMUNITY } from "@/lib/config";
import { maloCheckDigit } from "@/lib/grid/malo";
import { localMidnight } from "@/lib/sim/clock";
import { runSimulation } from "@/lib/sim/runner";
import { loadOrCreateKeypair } from "@/lib/solana/wallets";

const PASSWORD = "volty-demo";
const DAYS = 7;

const people = [
  {
    email: "mia.hoffmann@example.com",
    name: "Mia Hoffmann",
    kind: "household",
    street: "Lindenweg 4",
    pv: 9.5,
    battery: 10,
    ev: 0,
    use: 3800,
    dLat: 0.0012,
    dLon: -0.0021,
  },
  {
    email: "jonas.richter@example.com",
    name: "Jonas Richter",
    kind: "household",
    street: "Am Wiesenhang 11",
    pv: 7.2,
    battery: 0,
    ev: 11,
    use: 4200,
    dLat: -0.0016,
    dLon: 0.0018,
  },
  {
    email: "lea.wagner@example.com",
    name: "Lea Wagner",
    kind: "household",
    street: "Birkenstraße 7",
    pv: 6,
    battery: 0,
    ev: 0,
    use: 3100,
    dLat: 0.0021,
    dLon: 0.0009,
  },
  {
    email: "paul.schneider@example.com",
    name: "Paul Schneider",
    kind: "household",
    street: "Hohlweg 23",
    pv: 0,
    battery: 0,
    ev: 11,
    use: 3600,
    dLat: -0.0008,
    dLon: -0.0012,
  },
  {
    email: "sophie.krause@example.com",
    name: "Sophie Krause",
    kind: "household",
    street: "Talblick 2",
    pv: 0,
    battery: 0,
    ev: 0,
    use: 2600,
    dLat: 0.0005,
    dLon: 0.0026,
  },
  {
    email: "cafe.morgenrot@example.com",
    name: "Café Morgenrot",
    kind: "sme",
    street: "Marktplatz 5",
    pv: 0,
    battery: 0,
    ev: 0,
    use: 22000,
    dLat: -0.0002,
    dLon: 0.0004,
  },
] as const;

// A valid market location id (11 digits, BDEW check digit) from a 10-digit base.
const malo = (base: number) => `${base}${maloCheckDigit(String(base))}`;

async function main() {
  const community = db.select().from(schema.communities).get();
  if (!community)
    throw new Error("Run `npm run prod:init` on this database first.");
  if (
    db.select().from(schema.sites).all().length > 0 ||
    db.select().from(schema.accounts).all().length > 0
  ) {
    throw new Error(
      "This database already has accounts or sites; the script only fills a fresh one.",
    );
  }
  const stadtwerk = db
    .select()
    .from(schema.members)
    .where(eq(schema.members.role, "stadtwerk_admin"))
    .get();
  if (!stadtwerk) throw new Error("No Stadtwerk member found.");

  // The console login. "admin" is not an email, so it is written directly (sign-up would refuse it).
  db.insert(schema.accounts)
    .values({
      id: "acc-admin",
      email: "admin",
      privyUserId: null,
      passwordHash: await hashPassword("admin"),
      createdAt: Date.now(),
    })
    .run();
  db.insert(schema.accountWorkspaces)
    .values({
      accountId: "acc-admin",
      memberId: stadtwerk.id,
      createdAt: Date.now(),
    })
    .run();
  console.log("admin / admin  ->  Stadtwerk console");

  let i = 0;
  for (const p of people) {
    // As sign-up and "create workspace" do it (lib/auth/accounts.ts, which needs Next to load): a
    // password login, then a workspace with a server-held devnet wallet.
    const accountId = `acc-${randomUUID().slice(0, 8)}`;
    db.insert(schema.accounts)
      .values({
        id: accountId,
        email: p.email,
        privyUserId: null,
        passwordHash: await hashPassword(PASSWORD),
        createdAt: Date.now(),
      })
      .run();
    const member = {
      id: `ws-${randomUUID().slice(0, 8)}`,
      name: p.name,
      kind: p.kind,
      smeVerified: false,
      role: "member" as const,
      closedAt: null,
    };
    db.insert(schema.members)
      .values({
        ...member,
        walletPubkey: loadOrCreateKeypair(member.id).publicKey.toBase58(),
      })
      .run();
    db.insert(schema.accountWorkspaces)
      .values({ accountId, memberId: member.id, createdAt: Date.now() })
      .run();
    if (p.kind === "sme") {
      db.update(schema.members)
        .set({ smeVerified: true })
        .where(eq(schema.members.id, member.id))
        .run();
      db.insert(schema.businessProfiles)
        .values({
          memberId: member.id,
          staff: 6,
          turnoverEur: 420_000,
          balanceSheetEur: 180_000,
          checkedAt: Date.now(),
        })
        .run();
    }
    db.insert(schema.sites)
      .values({
        id: `site-${member.id}`,
        memberId: member.id,
        communityId: community.id,
        label: p.street,
        address: `${p.street}, 56179 Vallendar`,
        meterId: malo(5017900100 + i * 7),
        gridAreaId: community.gridAreaId,
        lat: COMMUNITY.lat + p.dLat,
        lon: COMMUNITY.lon + p.dLon,
        pvKwp: p.pv,
        batteryKwh: p.battery,
        evChargerKw: p.ev,
        loadProfile: p.kind === "sme" ? "bakery" : "household",
        annualKwh: p.use,
      })
      .run();
    if (p.battery > 0 || p.ev > 0) {
      db.insert(schema.agentSettings)
        .values({
          memberId: member.id,
          smartBattery: p.battery > 0,
          smartEv: p.ev > 0,
          evReadyByHour: 7,
          updatedAt: Date.now(),
        })
        .run();
    }
    console.log(`${p.email} / ${PASSWORD}  ->  ${p.name}`);
    i++;
  }

  // A week of history up to now, recorded only (no Solana payments).
  const from = localMidnight(Date.now()) - DAYS * 24 * 3_600_000;
  const hours = Math.floor((Date.now() - from) / 3_600_000);
  console.log(`Simulating ${hours} hours…`);
  await runSimulation({ hours, settle: false, from });
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
