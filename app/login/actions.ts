"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { createDemoAccount, isDemoAccount } from "@/lib/auth/accounts";
import { authConfig } from "@/lib/auth/config";
import { safeNext } from "@/lib/auth/policy";
import { createSession, deleteSession, workspacesOf } from "@/lib/auth/session";

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
  if (!account || !isDemoAccount(account)) throw new Error("Not a demo account.");
  const workspaces = workspacesOf(account.id);
  await createSession(account.id, workspaces[0]?.id ?? null);
  redirect(workspaces.length > 0 ? safeNext(formData.get("next")) : "/workspaces/new");
}

// DEMO_LOGIN only: a new local account with a made-up @kiezwatt.example address.
export async function demoSignup(formData: FormData) {
  assertDemoLogin();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) throw new Error("Enter a name of at least 2 characters.");
  const account = createDemoAccount(name);
  await createSession(account.id, null);
  redirect("/workspaces/new");
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
