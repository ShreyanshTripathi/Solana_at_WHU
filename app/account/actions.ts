"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkVerificationCode, closeAccount, deletionFacts, isDemoAccount, issueVerificationCode } from "@/lib/auth/accounts";
import { authConfig } from "@/lib/auth/config";
import { deletionBlockers, isDeleteConfirmation, isFreshLogin } from "@/lib/auth/policy";
import { deletePrivyUser, verifyPrivyIdentityToken } from "@/lib/auth/privy";
import { deleteSession, requireAccount } from "@/lib/auth/session";
import { isVerified, signVerified, VERIFIED_COOKIE, VERIFIED_TTL_SECONDS } from "@/lib/auth/token";

async function markVerified(accountId: string) {
  (await cookies()).set(VERIFIED_COOKIE, await signVerified(accountId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/account",
    maxAge: VERIFIED_TTL_SECONDS,
  });
}

// Step 1 for Privy logins: log in again. Only a token Privy issued in the last few minutes, for this login, counts.
// `error` is a code from account.verifyErrors in the message files.
export async function verifyWithPrivy(identityToken: string): Promise<{ ok: boolean; error?: string }> {
  const { account } = await requireAccount("/account");
  const { privyAppId, privyVerificationKey } = authConfig();
  if (!account.privyUserId || !privyAppId || !privyVerificationKey) return { ok: false, error: "no_privy" };
  try {
    const identity = await verifyPrivyIdentityToken(identityToken, privyAppId, privyVerificationKey);
    if (identity.privyUserId !== account.privyUserId) return { ok: false, error: "other_user" };
    if (!isFreshLogin(identity.issuedAt, Date.now())) return { ok: false, error: "too_old" };
  } catch {
    return { ok: false, error: "invalid" };
  }
  await markVerified(account.id);
  return { ok: true };
}

// Step 1 for demo accounts: a 6-digit code. There's no mail server in the demo, so the
// "email" is printed in the terminal running `npm run dev`.
export async function sendDemoCode() {
  const { account } = await requireAccount("/account");
  if (!isDemoAccount(account)) throw new Error("Only demo accounts use codes; log in again instead.");
  const code = issueVerificationCode(account.id);
  console.log(`\n[dev mailer] To: ${account.email}\n[dev mailer] Your Volty code to delete your account: ${code} (valid 10 minutes)\n`);
  redirect("/account?code=sent#delete");
}

export async function verifyDemoCode(formData: FormData) {
  const { account } = await requireAccount("/account");
  if (!isDemoAccount(account) || !checkVerificationCode(account.id, String(formData.get("code") ?? ""))) {
    redirect("/account?code=wrong#delete");
  }
  await markVerified(account.id);
  redirect("/account#delete");
}

// Step 2: delete. Needs the fresh verification, the typed confirmation and nothing still open.
export async function deleteAccount(formData: FormData) {
  const { account } = await requireAccount("/account");
  if (!(await isVerified((await cookies()).get(VERIFIED_COOKIE)?.value, account.id))) redirect("/account?verify=expired#delete");
  if (!isDeleteConfirmation(String(formData.get("confirm") ?? ""))) redirect("/account?confirm=wrong#delete");
  const blockers = deletionBlockers(deletionFacts(account.id));
  if (blockers.length > 0) throw new Error(blockers.join(" "));

  // Remove the Privy login first: if that fails, nothing has been deleted and you can try again.
  if (account.privyUserId) {
    const { privyAppId, privyAppSecret } = authConfig();
    if (!privyAppId || !privyAppSecret) throw new Error("Set PRIVY_APP_SECRET so the Privy login can be deleted too.");
    await deletePrivyUser(account.privyUserId, privyAppId, privyAppSecret);
  }
  closeAccount(account.id);
  await deleteSession();
  redirect("/?deleted=1");
}
