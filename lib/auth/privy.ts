import { importSPKI, jwtVerify } from "jose";

// Privy signs identity tokens with ES256. We check them with the app's verification key
// (Privy dashboard -> App settings) instead of trusting anything the browser says about the user.

export interface PrivyIdentity {
  privyUserId: string; // did:privy:...
  email: string | null;
  // Every Solana embedded wallet the user has, oldest first. Privy never gives us the keys.
  solanaWallets: string[];
  issuedAt: number; // seconds; a recent value means the user just logged in
}

interface LinkedAccount {
  type?: string;
  address?: string;
  chain_type?: string;
  wallet_client_type?: string;
}

export function identityFromClaims(claims: Record<string, unknown>): PrivyIdentity {
  if (typeof claims.sub !== "string") throw new Error("Identity token has no subject");
  // Privy sends linked_accounts as a JSON string; accept an array too.
  const raw = claims.linked_accounts;
  const accounts: LinkedAccount[] = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  const email = accounts.find((a) => a.type === "email" && a.address)?.address ?? null;
  const solanaWallets = accounts
    .filter((a) => a.type === "wallet" && a.chain_type === "solana" && a.address && (a.wallet_client_type === "privy" || a.wallet_client_type === "privy-v2"))
    .map((a) => a.address!);
  return {
    privyUserId: claims.sub,
    email: email ? email.toLowerCase() : null,
    solanaWallets,
    issuedAt: typeof claims.iat === "number" ? claims.iat : 0,
  };
}

export async function verifyPrivyIdentityToken(token: string, appId: string, verificationKeyPem: string): Promise<PrivyIdentity> {
  const key = await importSPKI(verificationKeyPem, "ES256");
  const { payload } = await jwtVerify(token, key, { algorithms: ["ES256"], issuer: "privy.io", audience: appId });
  return identityFromClaims(payload);
}

// Removes the user (and their embedded wallets) from Privy. Needs PRIVY_APP_SECRET.
export async function deletePrivyUser(privyUserId: string, appId: string, appSecret: string): Promise<void> {
  const res = await fetch(`https://api.privy.io/v1/users/${encodeURIComponent(privyUserId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`,
      "privy-app-id": appId,
    },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Privy refused to delete the login (${res.status}).`);
}
