import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/db/client";
import { assertAdmin } from "./policy";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, VERIFIED_COOKIE, verifySession } from "./token";

export type Member = typeof schema.members.$inferSelect;
export type Account = typeof schema.accounts.$inferSelect;

export interface CurrentSession {
  account: Account;
  workspaces: Member[]; // every open workspace this login owns
  workspace: Member | null; // the one currently open
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true, // page scripts can't read it
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, // not sent on cross-site form posts
  path: "/",
  maxAge,
});

export async function createSession(accountId: string, workspaceId: string | null): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await signSession({ accountId, workspaceId }), cookieOptions(SESSION_TTL_SECONDS));
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(VERIFIED_COOKIE);
}

export function workspacesOf(accountId: string): Member[] {
  return db
    .select({ member: schema.members })
    .from(schema.accountWorkspaces)
    .innerJoin(schema.members, eq(schema.members.id, schema.accountWorkspaces.memberId))
    .where(and(eq(schema.accountWorkspaces.accountId, accountId), isNull(schema.members.closedAt)))
    .orderBy(asc(schema.accountWorkspaces.createdAt))
    .all()
    .map((r) => r.member);
}

// The login and its workspaces, read fresh from the database so changes apply at once.
// A workspace id in the cookie only counts if this login still owns it.
// cache() runs this once per request however many components ask.
export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  const claims = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const account = db.select().from(schema.accounts).where(eq(schema.accounts.id, claims.accountId)).get();
  if (!account) return null;
  const workspaces = workspacesOf(account.id);
  const workspace = workspaces.find((w) => w.id === claims.workspaceId) ?? workspaces[0] ?? null;
  return { account, workspaces, workspace };
});

// The open workspace: the member whose data pages show and actions change.
export const getCurrentMember = async (): Promise<Member | null> => (await getCurrentSession())?.workspace ?? null;

export async function requireAccount(next = "/"): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

// Pages and server actions: logged-out visitors go to the login page, logins without a workspace create one.
export async function requireMember(next = "/"): Promise<Member> {
  const session = await requireAccount(next);
  if (!session.workspace) redirect("/workspaces/new");
  return session.workspace;
}

export async function requireAdmin(next = "/admin"): Promise<Member> {
  const member = await requireMember(next);
  assertAdmin(member);
  return member;
}
