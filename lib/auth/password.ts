import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Email + password logins (the product copy, where Privy may not be set up). Passwords are stored
// as scrypt hashes with a random salt per password: "scrypt$N$r$p$salt$hash", all base64url.
// Only the hash is kept; nobody, Volty included, can read a password back.

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: object,
) => Promise<Buffer>;
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string | null,
): Promise<boolean> {
  const parts = stored?.split("$") ?? [];
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    // Spend about as long as a real check, so a missing account can't be told apart by timing.
    await scrypt(password, randomBytes(16), KEY_LENGTH, { N, r: R, p: P });
    return false;
  }
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(
    password,
    Buffer.from(salt, "base64url"),
    expected.length,
    { N: Number(n), r: Number(r), p: Number(p) },
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// A small brake on guessing: after 5 wrong passwords for one email, wait 15 minutes. In memory, so
// it resets when the server restarts; enough for one server, not a replacement for a proper limiter.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; since: number }>();

export function isLockedOut(email: string, now = Date.now()): boolean {
  const f = failures.get(email);
  if (!f || now - f.since > WINDOW_MS) return false;
  return f.count >= MAX_FAILURES;
}

export function recordFailure(email: string, now = Date.now()) {
  const f = failures.get(email);
  if (!f || now - f.since > WINDOW_MS)
    failures.set(email, { count: 1, since: now });
  else f.count += 1;
}

export const clearFailures = (email: string) => failures.delete(email);
