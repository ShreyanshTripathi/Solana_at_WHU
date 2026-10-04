"use server";

import { redirect } from "next/navigation";
import { createWorkspace } from "@/lib/auth/accounts";
import { authConfig } from "@/lib/auth/config";
import { assertOwnsWorkspace, safeNext, WORKSPACE_KINDS, type WorkspaceKind } from "@/lib/auth/policy";
import { errorCode } from "@/lib/errors";
import { verifyPrivyIdentityToken } from "@/lib/auth/privy";
import { createSession, requireAccount } from "@/lib/auth/session";

// `error` is a code from workspaces.errors in the message files.
export type CreateWorkspaceResult = { ok: true; next: string } | { ok: false; error: string; retry?: boolean };

// Creates a Household or Business workspace for the logged-in account and opens it.
// Privy logins must prove the new workspace's wallet is theirs with a fresh signed identity token.
export async function createWorkspaceAction(input: {
  kind: string;
  name: string;
  identityToken?: string;
  walletAddress?: string;
}): Promise<CreateWorkspaceResult> {
  const { account } = await requireAccount("/workspaces/new");
  if (!WORKSPACE_KINDS.includes(input.kind as WorkspaceKind)) return { ok: false, error: "choose_kind" };

  let wallet = null;
  if (account.privyUserId) {
    const { privyAppId, privyVerificationKey } = authConfig();
    if (!privyAppId || !privyVerificationKey) return { ok: false, error: "not_configured" };
    if (!input.identityToken || !input.walletAddress) return { ok: false, error: "wallet_needed" };
    let identity;
    try {
      identity = await verifyPrivyIdentityToken(input.identityToken, privyAppId, privyVerificationKey);
    } catch {
      return { ok: false, error: "login_expired" };
    }
    if (identity.privyUserId !== account.privyUserId) return { ok: false, error: "other_login" };
    // A just-created wallet can take a moment to appear in the token; the browser retries.
    if (!identity.solanaWallets.includes(input.walletAddress)) return { ok: false, error: "waiting_wallet", retry: true };
    wallet = { address: input.walletAddress, walletsOfLogin: identity.solanaWallets };
  }

  try {
    const member = createWorkspace(account, { kind: input.kind as WorkspaceKind, name: input.name, wallet });
    await createSession(account.id, member.id);
    return { ok: true, next: "/account" };
  } catch (e) {
    return { ok: false, error: errorCode(e) };
  }
}

// The workspace menu: open another workspace this login owns.
export async function switchWorkspace(formData: FormData) {
  const { account, workspaces } = await requireAccount();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  assertOwnsWorkspace(
    workspaces.map((w) => w.id),
    workspaceId,
  );
  await createSession(account.id, workspaceId);
  redirect(safeNext(formData.get("next")));
}
