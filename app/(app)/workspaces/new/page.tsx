import { CreateWorkspaceForm } from "@/components/auth/CreateWorkspaceForm";
import { OnboardingGlow, Steps } from "@/components/shell/Steps";
import { usesServerWallet } from "@/lib/auth/accounts";
import { authConfig } from "@/lib/auth/config";
import { MAX_WORKSPACES_PER_ACCOUNT } from "@/lib/auth/policy";
import { requireAccount } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewWorkspacePage() {
  const { account, workspaces } = await requireAccount("/workspaces/new");
  const { m } = await getI18n();
  const t = m.workspaces;
  const mode =
    account.privyUserId && authConfig().privyEnabled
      ? "privy"
      : usesServerWallet(account)
        ? "demo"
        : null;
  const full = workspaces.length >= MAX_WORKSPACES_PER_ACCOUNT;

  return (
    <main className="relative overflow-hidden px-6 py-10">
      <OnboardingGlow />
      <div className="relative mx-auto flex max-w-[680px] flex-col gap-6">
        {workspaces.length === 0 && <Steps labels={m.auth.steps} current={2} />}
        <section className="v-card-raised flex flex-col gap-5 p-7 md:p-9">
          <div>
            <h1 className="text-[32px] font-semibold leading-tight tracking-[-1.2px]">
              {workspaces.length === 0 ? t.firstTitle : t.newTitle}
            </h1>
            <p className="mt-2 text-[15px] text-[#5c5c57]">{t.intro}</p>
          </div>
          {full ? (
            <p className="text-sm">{t.limit(MAX_WORKSPACES_PER_ACCOUNT)}</p>
          ) : mode ? (
            <CreateWorkspaceForm
              mode={mode}
              walletsInUse={workspaces.flatMap((w) =>
                w.walletPubkey ? [w.walletPubkey] : [],
              )}
            />
          ) : (
            <p className="text-sm">{t.loginAgain}</p>
          )}
        </section>
      </div>
    </main>
  );
}
