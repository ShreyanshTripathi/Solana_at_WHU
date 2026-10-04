import { cookies } from "next/headers";
import Link from "next/link";
import { VerifyWithPrivy } from "@/components/auth/VerifyWithPrivy";
import { deletionFacts, isDemoAccount } from "@/lib/auth/accounts";
import { authConfig } from "@/lib/auth/config";
import { deletionBlockers } from "@/lib/auth/policy";
import { requireAccount } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { isVerified, VERIFIED_COOKIE } from "@/lib/auth/token";
import { explorerAddressUrl } from "@/lib/solana/wallets";
import { switchWorkspace } from "../workspaces/actions";
import { deleteAccount, sendDemoCode, verifyDemoCode } from "./actions";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";
const input = "mt-1 block w-40 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20";
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const params = await searchParams;
  const { account, workspaces, workspace } = await requireAccount("/account");
  const { m, f } = await getI18n();
  const t = m.account;
  const demo = isDemoAccount(account);
  const blockers = deletionBlockers(deletionFacts(account.id));
  const verified = await isVerified((await cookies()).get(VERIFIED_COOKIE)?.value, account.id);
  const privyReady = Boolean(account.privyUserId && authConfig().privyEnabled);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="mt-1 text-sm opacity-70">
        {account.email ?? t.passkeyLogin} · {demo ? t.demo : t.privy} · {t.since(f.date(account.createdAt))}
      </p>

      <section className={`mt-6 ${card}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{t.workspaces}</h2>
          <Link href="/workspaces/new" className="text-sm text-blue-700 underline dark:text-blue-400">
            {t.newWorkspace}
          </Link>
        </div>
        <p className="mt-1 text-xs opacity-70">{t.separate}</p>
        {workspaces.length === 0 ? (
          <p className="mt-3 text-sm">
            {t.noWorkspace}{" "}
            <Link href="/workspaces/new" className="text-blue-700 underline dark:text-blue-400">
              {t.createOne}
            </Link>
            .
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="kw-table w-full text-sm">
              <thead className="text-left text-xs opacity-70">
                <tr>
                  <th className="py-1 font-normal">{t.table.name}</th>
                  <th className="py-1 font-normal">{t.table.type}</th>
                  <th className="py-1 font-normal">{t.table.wallet}</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {workspaces.map((w) => (
                  <tr key={w.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2">{w.name}</td>
                    <td className="py-2">{m.common.kind[w.kind] ?? w.kind}</td>
                    <td className="py-2">
                      {w.walletPubkey ? (
                        <a href={explorerAddressUrl(w.walletPubkey)} target="_blank" rel="noreferrer" className="font-mono text-blue-700 underline dark:text-blue-400">
                          {short(w.walletPubkey)} ↗
                        </a>
                      ) : (
                        t.noWallet
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {w.id === workspace?.id ? (
                        <span className="text-xs opacity-70">{t.openNow}</span>
                      ) : (
                        <form action={switchWorkspace}>
                          <input type="hidden" name="workspaceId" value={w.id} />
                          <input type="hidden" name="next" value="/account" />
                          <button type="submit" className="text-blue-700 underline dark:text-blue-400">
                            {m.common.open}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs opacity-70">
          {t.siteNote.before}{" "}
          <Link href="/site" className="text-blue-700 underline dark:text-blue-400">
            {t.siteNote.link}
          </Link>{" "}
          {t.siteNote.after}
        </p>
      </section>

      <section id="delete" className={`mt-6 ${card} border-red-300 dark:border-red-900`}>
        <h2 className="font-semibold">{t.delete}</h2>
        <p className="mt-1 text-sm opacity-80">
          {t.deleteText(workspaces.length)}
          {account.privyUserId && t.deletePrivyWallets}
        </p>

        {blockers.length > 0 ? (
          <ul className="mt-3 list-disc pl-5 text-sm">
            {blockers.map((b) => (
              <li key={b}>{t.blockers[b]}</li>
            ))}
          </ul>
        ) : verified ? (
          <form action={deleteAccount} className="mt-4 flex flex-wrap items-end gap-3 text-sm">
            {params.confirm === "wrong" && (
              <p role="alert" className="w-full text-red-700 dark:text-red-400">
                {t.wrongConfirm}
              </p>
            )}
            <label className="block">
              <span className="text-xs opacity-70">{t.typeDelete}</span>
              <input name="confirm" required autoComplete="off" className={input} />
            </label>
            <button type="submit" className="rounded bg-red-700 px-4 py-2 font-medium text-white">
              {t.deleteButton}
            </button>
            <p className="w-full text-xs opacity-70">{t.verifiedNote}</p>
          </form>
        ) : (
          <div className="mt-4">
            <p className="mb-3 text-sm font-medium">{t.step1}</p>
            {params.verify === "expired" && (
              <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-400">
                {t.expired}
              </p>
            )}
            {privyReady ? (
              <VerifyWithPrivy />
            ) : demo ? (
              <div className="space-y-3 text-sm">
                <form action={sendDemoCode}>
                  <button type="submit" className="rounded border border-black/15 px-3 py-1 dark:border-white/20">
                    {params.code ? t.sendNewCode : t.sendCode}
                  </button>
                </form>
                {params.code === "sent" && <p className="text-xs opacity-70">{t.codeSent}</p>}
                {params.code === "wrong" && <p className="text-xs text-red-700 dark:text-red-400">{t.wrongCode}</p>}
                {params.code && (
                  <form action={verifyDemoCode} className="flex items-end gap-3">
                    <label className="block">
                      <span className="text-xs opacity-70">{t.code}</span>
                      <input name="code" inputMode="numeric" pattern="[0-9]{6}" required className={input} />
                    </label>
                    <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
                      {t.verify}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <p className="text-sm">{t.privyNotConfigured}</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
