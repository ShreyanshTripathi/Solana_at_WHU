// Who may see and change what. Pure functions, so every rule has a unit test.

import { UserError } from "@/lib/errors";

export type Role = "member" | "stadtwerk_admin";

export interface Actor {
  id: string;
  role: Role;
}

export class AuthError extends Error {
  constructor(
    public readonly code: "unauthenticated" | "forbidden",
    message: string,
  ) {
    super(message);
  }
}

export const isAdmin = (actor: Actor) => actor.role === "stadtwerk_admin";

// Pages: members always see their own data; Stadtwerk staff may open any member's view (support).
export const viewedMemberId = (actor: Actor, requested?: string) => (isAdmin(actor) && requested ? requested : actor.id);

// Server actions: a member id sent by the browser is checked, never trusted.
export function assertCanActFor(actor: Actor, memberId: string): string {
  if (memberId !== actor.id && !isAdmin(actor)) {
    throw new AuthError("forbidden", "You can only change your own account.");
  }
  return memberId;
}

export function assertAdmin(actor: Actor): void {
  if (!isAdmin(actor)) throw new AuthError("forbidden", "Only Stadtwerk staff can do this.");
}

// Only follow redirects back into our own site ("/seller"), never to another origin ("//evil.com").
export const safeNext = (next: unknown, fallback = "/") =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;

// Link a newly created embedded wallet as the payout address only if the member has none yet,
// or still has the server-held demo wallet. Changing an existing payout address needs support.
export function shouldLinkWallet(current: string | null, serverHeldDemoWallet: string | undefined, incoming: string | null): boolean {
  if (!incoming || incoming === current) return false;
  return current === null || current === serverHeldDemoWallet;
}

// --- Workspaces: one login, several households or businesses, each with its own wallet ---

export const WORKSPACE_KINDS = ["household", "sme"] as const;
export type WorkspaceKind = (typeof WORKSPACE_KINDS)[number];
export const MAX_WORKSPACES_PER_ACCOUNT = 5;

export function assertOwnsWorkspace(ownedWorkspaceIds: string[], workspaceId: string): void {
  if (!ownedWorkspaceIds.includes(workspaceId)) throw new AuthError("forbidden", "That workspace belongs to another login.");
}

// A new workspace gets a wallet that belongs to this login (it is in Privy's signed token)
// and that no other workspace uses, so balances never mix.
export function assertWalletForNewWorkspace(wallet: string, walletsOfLogin: string[], walletsInUse: string[]): void {
  if (!walletsOfLogin.includes(wallet)) throw new UserError("wallet_not_yours");
  if (walletsInUse.includes(wallet)) throw new UserError("wallet_in_use");
}

// --- Deleting an account ---

export const FRESH_LOGIN_SECONDS = 5 * 60;

export const isFreshLogin = (issuedAtSeconds: number, nowMs: number, maxAgeSeconds = FRESH_LOGIN_SECONDS) =>
  issuedAtSeconds > 0 && nowMs / 1000 - issuedAtSeconds <= maxAgeSeconds;

export interface DeletionFacts {
  pendingLedgerEntries: number; // energy not yet settled in an hourly payout
  activeHostedProjects: number; // roofs still funding or repaying investors
  openInvestments: number; // investments not yet paid back
  wouldRemoveLastAdmin: boolean;
}

export type DeletionBlocker = "pending" | "hosted_project" | "open_investments" | "last_admin";

// Reasons the account can't be deleted yet, as codes the page words. Empty means it can.
export function deletionBlockers(f: DeletionFacts): DeletionBlocker[] {
  const reasons: DeletionBlocker[] = [];
  if (f.pendingLedgerEntries > 0) reasons.push("pending");
  if (f.activeHostedProjects > 0) reasons.push("hosted_project");
  if (f.openInvestments > 0) reasons.push("open_investments");
  if (f.wouldRemoveLastAdmin) reasons.push("last_admin");
  return reasons;
}

// The typed confirmation for deleting an account, in either interface language.
export const isDeleteConfirmation = (typed: string) => ["DELETE", "LÖSCHEN"].includes(typed.trim());
