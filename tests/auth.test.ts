import { exportSPKI, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  assertCanActFor,
  assertOwnsWorkspace,
  assertWalletForNewWorkspace,
  AuthError,
  deletionBlockers,
  isDeleteConfirmation,
  isFreshLogin,
  safeNext,
  shouldLinkWallet,
  viewedMemberId,
  type Actor,
} from "@/lib/auth/policy";
import { identityFromClaims, verifyPrivyIdentityToken } from "@/lib/auth/privy";
import { isVerified, signSession, signVerified, verifySession } from "@/lib/auth/token";

const SECRET = "test-secret-that-is-at-least-32-characters-long";
const anna: Actor = { id: "anna", role: "member" };
const staff: Actor = { id: "stadtwerk", role: "stadtwerk_admin" };

const annaSession = { accountId: "acc-anna", workspaceId: "anna" };

describe("session token", () => {
  it("round-trips the account and open workspace", async () => {
    expect(await verifySession(await signSession(annaSession, SECRET), SECRET)).toEqual(annaSession);
    expect(await verifySession(await signSession({ accountId: "acc-new", workspaceId: null }, SECRET), SECRET)).toEqual({
      accountId: "acc-new",
      workspaceId: null,
    });
  });

  it("rejects a token signed with another secret", async () => {
    const forged = await signSession(annaSession, "another-secret-that-is-at-least-32-chars");
    expect(await verifySession(forged, SECRET)).toBeNull();
  });

  it("rejects an edited token", async () => {
    const [header, , signature] = (await signSession(annaSession, SECRET)).split(".");
    const payload = Buffer.from(JSON.stringify({ sub: "acc-stadtwerk", ws: "stadtwerk", iss: "kiezwatt", aud: "kiezwatt-web" })).toString(
      "base64url",
    );
    expect(await verifySession(`${header}.${payload}.${signature}`, SECRET)).toBeNull();
  });

  it("rejects an expired token", async () => {
    expect(await verifySession(await signSession(annaSession, SECRET, -10), SECRET)).toBeNull();
  });

  it("treats a missing cookie as logged out", async () => {
    expect(await verifySession(undefined, SECRET)).toBeNull();
  });
});

describe("proof of re-verification before deleting an account", () => {
  it("counts only for the account it was issued to", async () => {
    const proof = await signVerified("acc-anna", SECRET);
    expect(await isVerified(proof, "acc-anna", SECRET)).toBe(true);
    expect(await isVerified(proof, "acc-weber", SECRET)).toBe(false);
  });

  it("expires, and a normal session cookie can't stand in for it", async () => {
    expect(await isVerified(await signVerified("acc-anna", SECRET, -10), "acc-anna", SECRET)).toBe(false);
    expect(await isVerified(await signSession({ accountId: "acc-anna", workspaceId: null }, SECRET), "acc-anna", SECRET)).toBe(false);
    expect(await isVerified(undefined, "acc-anna", SECRET)).toBe(false);
  });

  it("needs a Privy login from the last few minutes", () => {
    const now = Date.parse("2026-10-03T12:00:00Z");
    expect(isFreshLogin(now / 1000 - 60, now)).toBe(true);
    expect(isFreshLogin(now / 1000 - 60 * 60, now)).toBe(false);
    expect(isFreshLogin(0, now)).toBe(false);
  });
});

describe("deleting an account", () => {
  const clear = { pendingLedgerEntries: 0, activeHostedProjects: 0, openInvestments: 0, wouldRemoveLastAdmin: false };

  it("is allowed when nothing is still open", () => {
    expect(deletionBlockers(clear)).toEqual([]);
  });

  it("waits for unsettled energy, open projects and investments, and keeps one admin", () => {
    expect(deletionBlockers({ ...clear, pendingLedgerEntries: 3 })).toEqual(["pending"]);
    expect(deletionBlockers({ ...clear, activeHostedProjects: 1 })).toEqual(["hosted_project"]);
    expect(deletionBlockers({ ...clear, openInvestments: 2 })).toEqual(["open_investments"]);
    expect(deletionBlockers({ ...clear, wouldRemoveLastAdmin: true })).toEqual(["last_admin"]);
  });

  it("accepts the confirmation word in either language", () => {
    expect(isDeleteConfirmation("DELETE")).toBe(true);
    expect(isDeleteConfirmation(" LÖSCHEN ")).toBe(true);
    expect(isDeleteConfirmation("delete")).toBe(false);
  });
});

describe("workspaces", () => {
  it("only opens workspaces the login owns", () => {
    expect(() => assertOwnsWorkspace(["anna", "ws-1"], "ws-1")).not.toThrow();
    expect(() => assertOwnsWorkspace(["anna"], "weber")).toThrow(AuthError);
  });

  it("gives each workspace its own wallet from this login", () => {
    expect(() => assertWalletForNewWorkspace("W2", ["W1", "W2"], ["W1"])).not.toThrow();
    expect(() => assertWalletForNewWorkspace("W1", ["W1", "W2"], ["W1"])).toThrow("wallet_in_use");
    expect(() => assertWalletForNewWorkspace("Stolen", ["W1"], [])).toThrow("wallet_not_yours");
  });
});

describe("who may see and change what", () => {
  it("shows members their own data whatever ?as= says", () => {
    expect(viewedMemberId(anna, "weber")).toBe("anna");
    expect(viewedMemberId(anna)).toBe("anna");
  });

  it("lets Stadtwerk staff open any member's view", () => {
    expect(viewedMemberId(staff, "weber")).toBe("weber");
  });

  it("rejects a server action with a forged member id", () => {
    expect(() => assertCanActFor(anna, "weber")).toThrow(AuthError);
    expect(assertCanActFor(anna, "anna")).toBe("anna");
    expect(assertCanActFor(staff, "weber")).toBe("weber");
  });

  it("only redirects within the site after login", () => {
    expect(safeNext("/seller?at=16:00")).toBe("/seller?at=16:00");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });
});

describe("linking the embedded wallet", () => {
  it("links it when the member has no wallet or only the demo wallet", () => {
    expect(shouldLinkWallet(null, undefined, "New111")).toBe(true);
    expect(shouldLinkWallet("Demo111", "Demo111", "New111")).toBe(true);
  });

  it("never silently replaces a payout address the member already chose", () => {
    expect(shouldLinkWallet("Own111", "Demo111", "New111")).toBe(false);
    expect(shouldLinkWallet("Own111", undefined, null)).toBe(false);
  });
});

describe("Privy identity token", () => {
  const linkedAccounts = JSON.stringify([
    { type: "email", address: "Anna@Example.com" },
    { type: "wallet", address: "EthAddr", chain_type: "ethereum", wallet_client_type: "privy" },
    { type: "wallet", address: "SoLAddr111", chain_type: "solana", wallet_client_type: "privy" },
  ]);

  it("reads the email and every Solana embedded wallet, not other chains", () => {
    const twoWallets = JSON.stringify([
      ...JSON.parse(linkedAccounts),
      { type: "wallet", address: "SoLAddr222", chain_type: "solana", wallet_client_type: "privy" },
      { type: "wallet", address: "Phantom333", chain_type: "solana", wallet_client_type: "phantom" },
    ]);
    expect(identityFromClaims({ sub: "did:privy:abc", iat: 1_790_000_000, linked_accounts: twoWallets })).toEqual({
      privyUserId: "did:privy:abc",
      email: "anna@example.com",
      solanaWallets: ["SoLAddr111", "SoLAddr222"],
      issuedAt: 1_790_000_000,
    });
  });

  it("accepts only tokens signed by the app's Privy key, for this app", async () => {
    const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
    const pem = await exportSPKI(publicKey);
    const sign = (audience: string, key = privateKey) =>
      new SignJWT({ linked_accounts: linkedAccounts })
        .setProtectedHeader({ alg: "ES256" })
        .setSubject("did:privy:abc")
        .setIssuer("privy.io")
        .setAudience(audience)
        .setExpirationTime("1h")
        .sign(key);

    expect((await verifyPrivyIdentityToken(await sign("app-1"), "app-1", pem)).email).toBe("anna@example.com");
    await expect(verifyPrivyIdentityToken(await sign("other-app"), "app-1", pem)).rejects.toThrow();
    const other = await generateKeyPair("ES256");
    await expect(verifyPrivyIdentityToken(await sign("app-1", other.privateKey), "app-1", pem)).rejects.toThrow();
  });
});
