import "server-only";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { and, count, eq, inArray, isNotNull, isNull, notInArray } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { UserError } from "@/lib/errors";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo/personas";
import { loadOrCreateKeypair, readDevnetConfig } from "@/lib/solana/wallets";
import type { PrivyIdentity } from "./privy";
import {
  assertWalletForNewWorkspace,
  type DeletionFacts,
  MAX_WORKSPACES_PER_ACCOUNT,
  shouldLinkWallet,
  type WorkspaceKind,
} from "./policy";
import { type Account, type Member, workspacesOf } from "./session";

const { accounts, accountWorkspaces, members } = schema;
const newId = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

export const isDemoAccount = (account: Account) => !account.privyUserId && Boolean(account.email?.endsWith(DEMO_EMAIL_DOMAIN));

const walletsInUse = (): string[] =>
  db
    .select({ wallet: members.walletPubkey })
    .from(members)
    .where(isNotNull(members.walletPubkey))
    .all()
    .map((r) => r.wallet!);

// Find the account for a verified Privy login: by Privy user id, then by email (a demo persona
// you put your real email on). Anyone else gets a new account with no workspace yet.
export function accountForPrivyLogin(identity: PrivyIdentity): Account {
  return db.transaction((tx) => {
    let account =
      tx.select().from(accounts).where(eq(accounts.privyUserId, identity.privyUserId)).get() ??
      (identity.email ? tx.select().from(accounts).where(eq(accounts.email, identity.email)).get() : undefined);

    if (account?.privyUserId && account.privyUserId !== identity.privyUserId) {
      throw new UserError("email_taken");
    }
    if (!account) {
      account = { id: newId("acc"), email: identity.email, privyUserId: identity.privyUserId, createdAt: Date.now() };
      tx.insert(accounts).values(account).run();
    } else if (!account.privyUserId) {
      tx.update(accounts).set({ privyUserId: identity.privyUserId }).where(eq(accounts.id, account.id)).run();
      account = { ...account, privyUserId: identity.privyUserId };
    }

    // Workspaces still paid at a demo wallet (or none) move to this login's own wallets, one each.
    const config = readDevnetConfig();
    const taken = new Set(walletsInUse());
    const free = identity.solanaWallets.filter((w) => !taken.has(w));
    for (const ws of workspacesOf(account.id)) {
      const next = free[0];
      if (next && shouldLinkWallet(ws.walletPubkey, config?.wallets[ws.id], next)) {
        tx.update(members).set({ walletPubkey: next }).where(eq(members.id, ws.id)).run();
        free.shift();
      }
    }
    return account;
  });
}

// DEMO_LOGIN only: an account without Privy, for trying signup, workspaces and deletion locally.
export function createDemoAccount(name: string): Account {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "member";
  const account = { id: newId("acc"), email: `${slug}-${randomInt(1000, 9999)}${DEMO_EMAIL_DOMAIN}`, privyUserId: null, createdAt: Date.now() };
  db.insert(accounts).values(account).run();
  return account;
}

export interface NewWorkspace {
  kind: WorkspaceKind;
  name: string;
  // Privy logins: an embedded wallet from the verified token. Demo accounts: null (a server-held devnet wallet is made).
  wallet: { address: string; walletsOfLogin: string[] } | null;
}

export function createWorkspace(account: Account, input: NewWorkspace): Member {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) throw new UserError("name_length");
  if (workspacesOf(account.id).length >= MAX_WORKSPACES_PER_ACCOUNT) throw new UserError("too_many");

  const id = newId("ws");
  let walletPubkey: string;
  if (input.wallet) {
    assertWalletForNewWorkspace(input.wallet.address, input.wallet.walletsOfLogin, walletsInUse());
    walletPubkey = input.wallet.address;
  } else {
    if (!isDemoAccount(account)) throw new UserError("wallet_needed");
    walletPubkey = loadOrCreateKeypair(id).publicKey.toBase58(); // custodial, devnet demo only
  }

  const member: Member = { id, name, kind: input.kind, walletPubkey, smeVerified: false, role: "member", closedAt: null };
  db.transaction((tx) => {
    tx.insert(members).values(member).run();
    tx.insert(accountWorkspaces).values({ accountId: account.id, memberId: id, createdAt: Date.now() }).run();
  });
  return member;
}

export function deletionFacts(accountId: string): DeletionFacts {
  const ids = workspacesOf(accountId).map((w) => w.id);
  if (ids.length === 0) return { pendingLedgerEntries: 0, activeHostedProjects: 0, openInvestments: 0, wouldRemoveLastAdmin: false };
  const one = <T extends { n: number }>(row: T | undefined) => row?.n ?? 0;

  const pendingLedgerEntries = one(
    db
      .select({ n: count() })
      .from(schema.ledgerEntries)
      .where(and(inArray(schema.ledgerEntries.accountId, ids), eq(schema.ledgerEntries.status, "pending")))
      .get(),
  );
  const activeHostedProjects = one(
    db
      .select({ n: count() })
      .from(schema.projects)
      .innerJoin(schema.sites, eq(schema.sites.id, schema.projects.hostSiteId))
      .where(and(inArray(schema.sites.memberId, ids), notInArray(schema.projects.state, ["paid_off", "refunded", "draft"])))
      .get(),
  );
  const openInvestments = one(
    db
      .select({ n: count() })
      .from(schema.investments)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.investments.projectId))
      .where(and(inArray(schema.investments.investorMemberId, ids), notInArray(schema.projects.state, ["paid_off", "refunded"])))
      .get(),
  );

  const ownsAdmin = workspacesOf(accountId).some((w) => w.role === "stadtwerk_admin");
  const otherAdminLogins = one(
    db
      .select({ n: count() })
      .from(accountWorkspaces)
      .innerJoin(members, eq(members.id, accountWorkspaces.memberId))
      .where(and(eq(members.role, "stadtwerk_admin"), isNull(members.closedAt), notInArray(accountWorkspaces.accountId, [accountId])))
      .get(),
  );
  return { pendingLedgerEntries, activeHostedProjects, openInvestments, wouldRemoveLastAdmin: ownsAdmin && otherAdminLogins === 0 };
}

// Deletes the login and its personal data. Settled payments, meter readings and allocations
// stay (German law keeps billing records for up to 10 years), under an anonymous "Closed workspace".
export function closeAccount(accountId: string): void {
  const ids = workspacesOf(accountId).map((w) => w.id);
  const now = Date.now();
  db.transaction((tx) => {
    if (ids.length > 0) {
      tx.update(members).set({ name: "Closed workspace", closedAt: now }).where(inArray(members.id, ids)).run();
      tx.update(schema.sites).set({ closedAt: now }).where(inArray(schema.sites.memberId, ids)).run();
      tx.delete(schema.sellerRules).where(inArray(schema.sellerRules.memberId, ids)).run();
      tx.delete(schema.buyerRules).where(inArray(schema.buyerRules.memberId, ids)).run();
      tx.delete(schema.businessProfiles).where(inArray(schema.businessProfiles.memberId, ids)).run();
      tx.delete(schema.anchorAgreements).where(inArray(schema.anchorAgreements.memberId, ids)).run();
    }
    tx.delete(schema.verificationCodes).where(eq(schema.verificationCodes.accountId, accountId)).run();
    tx.delete(accountWorkspaces).where(eq(accountWorkspaces.accountId, accountId)).run();
    tx.delete(accounts).where(eq(accounts.id, accountId)).run();
  });
}

// --- One-time codes for demo accounts (Privy logins re-verify by logging in again) ---

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const hashCode = (accountId: string, code: string) => createHash("sha256").update(`${accountId}:${code}`).digest("hex");

export function issueVerificationCode(accountId: string): string {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const row = { codeHash: hashCode(accountId, code), expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 };
  db.insert(schema.verificationCodes)
    .values({ accountId, ...row })
    .onConflictDoUpdate({ target: schema.verificationCodes.accountId, set: row })
    .run();
  return code;
}

export function checkVerificationCode(accountId: string, code: string): boolean {
  const row = db.select().from(schema.verificationCodes).where(eq(schema.verificationCodes.accountId, accountId)).get();
  if (!row || row.expiresAt < Date.now() || row.attempts >= MAX_CODE_ATTEMPTS) return false;
  if (row.codeHash !== hashCode(accountId, code.trim())) {
    db.update(schema.verificationCodes).set({ attempts: row.attempts + 1 }).where(eq(schema.verificationCodes.accountId, accountId)).run();
    return false;
  }
  db.delete(schema.verificationCodes).where(eq(schema.verificationCodes.accountId, accountId)).run();
  return true;
}
