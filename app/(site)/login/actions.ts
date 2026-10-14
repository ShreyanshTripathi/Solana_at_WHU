"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import {
  accountForPassword,
  createDemoAccount,
  createPasswordAccount,
  isDemoAccount,
  normaliseEmail,
} from "@/lib/auth/accounts";
import { authConfig } from "@/lib/auth/config";
import { clearFailures, isLockedOut, recordFailure } from "@/lib/auth/password";
import { safeNext } from "@/lib/auth/policy";
import { errorCode } from "@/lib/errors";
import {
  createSession,
  deleteSession,
  toAccount,
  workspacesOf,
} from "@/lib/auth/session";

const assertDemoLogin = () => {
  if (!authConfig().demoLogin) throw new Error("Demo login is switched off.");
};

// One-click login to a demo account. Only when DEMO_LOGIN=true, and only for accounts that still
// have a demo address and no Privy login, so an account you moved to your real email can't be borrowed.
export async function demoLogin(formData: FormData) {
  assertDemoLogin();
  const account = db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.id, String(formData.get("accountId") ?? "")))
    .get();
  if (!account || !isDemoAccount(toAccount(account)))
    throw new Error("Not a demo account.");
  const workspaces = workspacesOf(account.id);
  await createSession(account.id, workspaces[0]?.id ?? null);
  redirect(
    workspaces.length > 0 ? safeNext(formData.get("next")) : "/workspaces/new",
  );
}

// DEMO_LOGIN only: a new local account with a made-up @kiezwatt.example address.
export async function demoSignup(formData: FormData) {
  assertDemoLogin();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2)
    throw new Error("Enter a name of at least 2 characters.");
  const account = createDemoAccount(name);
  await createSession(account.id, null);
  redirect("/workspaces/new");
}

const assertPasswordLogin = () => {
  if (!authConfig().passwordLogin)
    throw new Error("Email and password login is switched off.");
};
// Back to the form with an error code (auth.errors in the message files) and, for login, the page to open after.
const backTo = (page: "/login" | "/signup", error: string, next?: string) =>
  redirect(
    `${page}?${new URLSearchParams({ error, ...(next ? { next } : {}) })}`,
  );

// Email + password login (the product copy). Five wrong tries for one email pause it for 15 minutes.
export async function passwordLogin(formData: FormData) {
  assertPasswordLogin();
  const email = normaliseEmail(String(formData.get("email") ?? ""));
  const next = safeNext(formData.get("next"));
  if (isLockedOut(email)) backTo("/login", "locked", next);
  const account = await accountForPassword(
    email,
    String(formData.get("password") ?? ""),
  );
  if (!account) {
    recordFailure(email);
    backTo("/login", "wrong_password", next);
  }
  clearFailures(email);
  const workspaces = workspacesOf(account!.id);
  await createSession(account!.id, workspaces[0]?.id ?? null);
  redirect(workspaces.length > 0 ? next : "/workspaces/new");
}

// Email + password registration, then straight on to the first workspace.
export async function passwordSignup(formData: FormData) {
  assertPasswordLogin();
  const password = String(formData.get("password") ?? "");
  if (password !== String(formData.get("password2") ?? ""))
    backTo("/signup", "password_mismatch");
  let accountId: string;
  try {
    accountId = (
      await createPasswordAccount(String(formData.get("email") ?? ""), password)
    ).id;
  } catch (e) {
    backTo("/signup", errorCode(e));
    return;
  }
  await createSession(accountId, null);
  redirect("/workspaces/new");
}

// After logging out, back to the login page (to log in again or switch account).
export async function logout() {
  await deleteSession();
  redirect("/login");
}
