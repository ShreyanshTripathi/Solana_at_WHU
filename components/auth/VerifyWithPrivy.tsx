"use client";

import { getIdentityToken, useLogin, usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { verifyWithPrivy } from "@/app/account/actions";
import { useI18n } from "@/lib/i18n/client";

// Re-verification before deleting the account: log out of Privy and log in again, so the
// server gets an identity token issued just now for this login.
export function VerifyWithPrivy() {
  const { logout } = usePrivy();
  const router = useRouter();
  const { m } = useI18n();
  const t = m.account;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const { login } = useLogin({
    onComplete: async ({ wasAlreadyAuthenticated }) => {
      if (!started.current || wasAlreadyAuthenticated) return;
      started.current = false;
      const token = await getIdentityToken();
      const res = token ? await verifyWithPrivy(token) : { ok: false, error: "no_token" };
      if (res.ok) router.refresh();
      else setError(t.verifyErrors[res.error ?? "invalid"] ?? t.verifyErrors.invalid);
      setBusy(false);
    },
    onError: () => {
      started.current = false;
      setBusy(false);
    },
  });

  return (
    <div className="text-sm">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          await logout().catch(() => undefined);
          started.current = true;
          login();
        }}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {busy ? t.waitingLogin : t.verifyPrivy}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
