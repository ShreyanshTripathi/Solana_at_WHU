import { jwtVerify, SignJWT } from "jose";

// Volty's own tokens: signed JWTs in HttpOnly cookies, whichever way the member logged in.
// Kept free of Next.js and database imports so proxy.ts and the tests can use them.

export const SESSION_COOKIE = "kw_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
// Proof that the account owner just re-verified (fresh login or one-time code). Needed to delete the account.
export const VERIFIED_COOKIE = "kw_verified";
export const VERIFIED_TTL_SECONDS = 5 * 60;

const ISSUER = "kiezwatt";
const SESSION_AUDIENCE = "kiezwatt-web";
const VERIFIED_AUDIENCE = "kiezwatt-delete-account";

export interface SessionClaims {
  accountId: string;
  workspaceId: string | null; // the member (household or business) currently open
}

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Set SESSION_SECRET (32+ characters) in .env.local. Generate one with: openssl rand -base64 32");
  }
  return secret;
}

const keyFrom = (secret: string) => new TextEncoder().encode(secret);

const sign = (subject: string, audience: string, claims: Record<string, unknown>, secret: string, ttlSeconds: number) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(keyFrom(secret));

async function verify(token: string | undefined, audience: string, secret: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, keyFrom(secret), { algorithms: ["HS256"], issuer: ISSUER, audience });
    return typeof payload.sub === "string" ? payload : null;
  } catch {
    return null; // missing, tampered, expired or signed for another purpose
  }
}

export function signSession(claims: SessionClaims, secret = sessionSecret(), ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  return sign(claims.accountId, SESSION_AUDIENCE, { ws: claims.workspaceId }, secret, ttlSeconds);
}

export async function verifySession(token: string | undefined, secret = sessionSecret()): Promise<SessionClaims | null> {
  const payload = await verify(token, SESSION_AUDIENCE, secret);
  if (!payload) return null;
  return { accountId: payload.sub!, workspaceId: typeof payload.ws === "string" ? payload.ws : null };
}

export function signVerified(accountId: string, secret = sessionSecret(), ttlSeconds = VERIFIED_TTL_SECONDS): Promise<string> {
  return sign(accountId, VERIFIED_AUDIENCE, {}, secret, ttlSeconds);
}

// True only for a proof issued to this account in the last few minutes.
export async function isVerified(token: string | undefined, accountId: string, secret = sessionSecret()): Promise<boolean> {
  return (await verify(token, VERIFIED_AUDIENCE, secret))?.sub === accountId;
}
