"use client";

import { useIdentityToken, usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const WALLET_WAIT_MS = 8_000;

// Opens Privy's email / passkey window. Privy treats signup and login the same way: a new email
// becomes a new user. Once the Solana wallet exists, the signed identity token goes to our
// server, which sets the Volty session and says where to go next.
export function PrivyLogin({ next, label }: { next: string; label: string }) {
  const { ready, authenticated, login, user } = usePrivy();
  const { identityToken } = useIdentityToken();
  const router = useRouter();
  const { m } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [waitedForWallet, setWaitedForWallet] = useState(false);
  const sent = useRef<string | null>(null);

  const hasWallet = Boolean(
    user?.linkedAccounts.some((a) => a.type === "wallet" && a.chainType === "solana" && a.walletClientType?.startsWith("privy")),
  );

  // The wallet is created just after login; give it a moment so the token includes its address.
  useEffect(() => {
    if (!authenticated || hasWallet) return;
    const timer = setTimeout(() => setWaitedForWallet(true), WALLET_WAIT_MS);
    return () => clearTimeout(timer);
  }, [authenticated, hasWallet]);

  useEffect(() => {
    if (!authenticated || !identityToken || (!hasWallet && !waitedForWallet) || sent.current === identityToken) return;
    sent.current = identityToken;
    fetch("/api/auth/privy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityToken, next }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { error?: string; next?: string };
        if (!res.ok) throw new Error(m.auth.errors[data.error ?? "failed"] ?? m.auth.errors.failed);
        router.replace(data.next ?? next);
        router.refresh();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : m.auth.errors.failed));
  }, [authenticated, identityToken, hasWallet, waitedForWallet, next, router, m]);

  const busy = !ready || (authenticated && !error);
  return (
    <div>
      <button
        type="button"
        onClick={() => login()}
        disabled={busy}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {!ready ? m.common.loading : authenticated && !error ? m.auth.settingUp : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
