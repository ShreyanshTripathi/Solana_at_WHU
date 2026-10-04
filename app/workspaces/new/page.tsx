import { CreateWorkspaceForm } from "@/components/auth/CreateWorkspaceForm";
import { isDemoAccount } from "@/lib/auth/accounts";
import { authConfig } from "@/lib/auth/config";
import { MAX_WORKSPACES_PER_ACCOUNT } from "@/lib/auth/policy";
import { requireAccount } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";

export default async function NewWorkspacePage() {
  const { account, workspaces } = await requireAccount("/workspaces/new");
  const { m } = await getI18n();
  const t = m.workspaces;
  const mode = account.privyUserId && authConfig().privyEnabled ? "privy" : isDemoAccount(account) ? "demo" : null;
  const full = workspaces.length >= MAX_WORKSPACES_PER_ACCOUNT;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{workspaces.length === 0 ? t.firstTitle : t.newTitle}</h1>
      <p className="mt-2 text-sm opacity-70">{t.intro}</p>
      <section className={`mt-6 ${card}`}>
        {full ? (
          <p className="text-sm">{t.limit(MAX_WORKSPACES_PER_ACCOUNT)}</p>
        ) : mode ? (
          <CreateWorkspaceForm mode={mode} walletsInUse={workspaces.flatMap((w) => (w.walletPubkey ? [w.walletPubkey] : []))} />
        ) : (
          <p className="text-sm">{t.loginAgain}</p>
        )}
      </section>
    </main>
  );
}
