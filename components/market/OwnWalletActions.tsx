"use client";

import { useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { prepareWalletTx, submitWalletTxAction } from "@/app/buyer/actions";
import { useI18n } from "@/lib/i18n/client";

const toBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));

// Approve or revoke the spending limit with the member's own Privy wallet: the transaction is signed
// here in the browser; Volty never holds this key.
export function OwnWalletActions({ wallet, approved, suggestedEur }: { wallet: string; approved: boolean; suggestedEur: number | null }) {
  const { m } = useI18n();
  const t = m.wallet;
  const router = useRouter();
  const { ready, wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const [limit, setLimit] = useState(suggestedEur ?? 30);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const own = wallets.find((w) => w.address === wallet);

  function run(kind: "approve" | "revoke") {
    setMessage(null);
    startTransition(async () => {
      if (!own) return setMessage({ ok: false, text: t.ownWallet.notConnected });
      const prepared = await prepareWalletTx(kind, limit);
      if (!prepared.ok) return setMessage({ ok: false, text: prepared.error });
      try {
        const { signedTransaction } = await signTransaction({ transaction: toBytes(prepared.value), wallet: own, chain: "solana:devnet" });
        const sent = await submitWalletTxAction(kind, limit, toBase64(signedTransaction));
        if (!sent.ok) return setMessage({ ok: false, text: sent.error });
        setMessage({ ok: true, text: kind === "approve" ? t.ownWallet.approved : t.ownWallet.revoked });
        router.refresh();
      } catch (e) {
        setMessage({ ok: false, text: e instanceof Error ? e.message : String(e) });
      }
    });
  }

  if (!ready) return <p className="mt-3 text-xs opacity-70">{m.common.loading}</p>;
  return (
    <div className="mt-3 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="text-xs opacity-70">{t.limit}</span>
          <input
            type="number"
            min={1}
            max={500}
            step={1}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="mt-1 block w-28 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
          />
        </label>
        <button type="button" disabled={pending} onClick={() => run("approve")} className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50">
          {pending ? t.ownWallet.signing : t.ownWallet.approve}
        </button>
        {approved && (
          <button type="button" disabled={pending} onClick={() => run("revoke")} className="rounded border border-black/15 px-3 py-1 disabled:opacity-50 dark:border-white/20">
            {t.ownWallet.revoke}
          </button>
        )}
      </div>
      {message && <p className={`mt-2 text-xs ${message.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>{message.text}</p>}
      <p className="mt-2 text-xs opacity-60">{own ? t.ownWallet.note : t.ownWallet.notConnected}</p>
    </div>
  );
}
