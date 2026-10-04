import { accountForPrivyLogin } from "@/lib/auth/accounts";
import { authConfig } from "@/lib/auth/config";
import { safeNext } from "@/lib/auth/policy";
import { verifyPrivyIdentityToken } from "@/lib/auth/privy";
import { createSession, workspacesOf } from "@/lib/auth/session";
import { errorCode } from "@/lib/errors";

// The browser sends Privy's identity token after an email or passkey login (or signup: Privy
// handles both the same way). We verify Privy's signature, find or create the account, then set
// our own session cookie. A new account goes on to create its first workspace.
// Errors are codes (auth.errors in the message files); the login button words them.
export async function POST(request: Request) {
  const { privyAppId, privyVerificationKey } = authConfig();
  if (!privyAppId || !privyVerificationKey) return Response.json({ error: "not_configured" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { identityToken?: unknown; next?: unknown } | null;
  if (typeof body?.identityToken !== "string") return Response.json({ error: "missing_token" }, { status: 400 });

  let identity;
  try {
    identity = await verifyPrivyIdentityToken(body.identityToken, privyAppId, privyVerificationKey);
  } catch {
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }

  try {
    const account = accountForPrivyLogin(identity);
    const workspaces = workspacesOf(account.id);
    await createSession(account.id, workspaces[0]?.id ?? null);
    return Response.json({ next: workspaces.length > 0 ? safeNext(body.next) : "/workspaces/new" });
  } catch (e) {
    return Response.json({ error: errorCode(e) }, { status: 409 });
  }
}
