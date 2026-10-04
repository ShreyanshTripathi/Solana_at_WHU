"use client";

import { PrivyProvider } from "@privy-io/react-auth";

// Email magic link (one-time code) or passkey. A Solana wallet is created for every member on
// first login; Privy keeps the key split so neither Privy nor Volty can use it alone.
export function Providers({ privyAppId, children }: { privyAppId: string | null; children: React.ReactNode }) {
  if (!privyAppId) return children;
  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["email", "passkey"],
        appearance: { walletChainType: "solana-only", showWalletLoginFirst: false },
        embeddedWallets: { solana: { createOnLogin: "users-without-wallets" }, showWalletUIs: false },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
