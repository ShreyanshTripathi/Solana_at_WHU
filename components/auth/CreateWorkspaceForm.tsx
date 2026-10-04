"use client";

import { getIdentityToken, usePrivy } from "@privy-io/react-auth";
import { useCreateWallet } from "@privy-io/react-auth/solana";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createWorkspaceAction, type CreateWorkspaceResult } from "@/app/workspaces/actions";
import { useI18n } from "@/lib/i18n/client";

const RETRIES = 6;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Fields({ busy, error, onSubmit }: { busy: boolean; error: string | null; onSubmit: (kind: string, name: string) => void }) {
  const { m } = useI18n();
  const t = m.workspaces;
  return (
    <form
      className="space-y-4 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        onSubmit(String(data.get("kind")), String(data.get("name")));
      }}
    >
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-xs opacity-70">{t.type}</legend>
        {t.kinds.map((k, i) => (
          <label key={k.id} className="flex cursor-pointer gap-2 rounded-md border border-black/15 p-3 has-[:checked]:border-blue-600 dark:border-white/20">
            <input type="radio" name="kind" value={k.id} defaultChecked={i === 0} className="mt-1" />
            <span>
              <span className="font-medium">{k.title}</span>
              <span className="block text-xs opacity-70">{k.text}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="block">
        <span className="text-xs opacity-70">{t.name}</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={60}
          placeholder={t.namePlaceholder}
          className="mt-1 block w-full rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
        />
      </label>
      <button type="submit" disabled={busy} className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60">
        {busy ? t.creating : t.create}
      </button>
      {error && (
        <p role="alert" className="text-red-700 dark:text-red-400">
          {t.errors[error] ?? t.errors.failed}
        </p>
      )}
    </form>
  );
}

function useFinish() {
  const router = useRouter();
  return (res: CreateWorkspaceResult) => {
    if (res.ok) {
      router.replace(res.next);
      router.refresh();
    }
    return res;
  };
}

// Demo accounts: the server makes a devnet wallet for the workspace.
function DemoForm() {
  const finish = useFinish();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Fields
      busy={busy}
      error={error}
      onSubmit={async (kind, name) => {
        setBusy(true);
        const res = finish(await createWorkspaceAction({ kind, name }));
        if (!res.ok) {
          setError(res.error);
          setBusy(false);
        }
      }}
    />
  );
}

// Privy logins: each workspace gets its own embedded Solana wallet. The first workspace uses the
// wallet made at signup; every further one gets an additional wallet, so balances never mix.
function PrivyForm({ walletsInUse }: { walletsInUse: string[] }) {
  const { authenticated, login, user } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { m } = useI18n();
  const finish = useFinish();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authenticated) {
    return (
      <div className="text-sm">
        <p>{m.workspaces.confirm}</p>
        <button type="button" onClick={() => login()} className="mt-2 rounded bg-blue-600 px-4 py-2 font-medium text-white">
          {m.workspaces.confirmButton}
        </button>
      </div>
    );
  }

  const own = (user?.linkedAccounts ?? []).flatMap((a) =>
    a.type === "wallet" && a.chainType === "solana" && a.walletClientType?.startsWith("privy") ? [a.address] : [],
  );

  return (
    <Fields
      busy={busy}
      error={error}
      onSubmit={async (kind, name) => {
        setBusy(true);
        setError(null);
        try {
          let address = own.find((w) => !walletsInUse.includes(w));
          if (!address) address = (await createWallet({ createAdditional: own.length > 0 })).wallet.address;
          for (let attempt = 0; attempt < RETRIES; attempt++) {
            const identityToken = (await getIdentityToken()) ?? undefined;
            const res = finish(await createWorkspaceAction({ kind, name, identityToken, walletAddress: address }));
            if (res.ok) return;
            if (!res.retry) throw new Error(res.error);
            await sleep(1500);
          }
          throw new Error("wallet_timeout");
        } catch (e) {
          setError(e instanceof Error ? e.message : "failed");
          setBusy(false);
        }
      }}
    />
  );
}

export function CreateWorkspaceForm({ mode, walletsInUse }: { mode: "privy" | "demo"; walletsInUse: string[] }) {
  return mode === "privy" ? <PrivyForm walletsInUse={walletsInUse} /> : <DemoForm />;
}
