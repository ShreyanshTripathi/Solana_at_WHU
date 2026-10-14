import { like } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PrivyLogin } from "@/components/auth/PrivyLogin";
import { Volty } from "@/components/brand/Volty";
import { db, schema } from "@/db/client";
import { authConfig } from "@/lib/auth/config";
import { safeNext } from "@/lib/auth/policy";
import { getCurrentSession, workspacesOf } from "@/lib/auth/session";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo/personas";
import { getI18n } from "@/lib/i18n/server";
import { latestReceipt } from "@/lib/dashboard/home";
import { isDemoMode } from "@/lib/mode";
import { demoLogin, passwordLogin } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const { m, f } = await getI18n();
  const t = m.auth;
  const receipt = latestReceipt();
  const next = safeNext(params.next);
  if (await getCurrentSession()) redirect(next);

  const {
    privyEnabled,
    demoLogin: demoEnabled,
    passwordLogin: passwordEnabled,
  } = authConfig();
  const error =
    typeof params.error === "string"
      ? (t.errors[params.error] ?? t.errors.failed)
      : null;
  const demoAccounts = demoEnabled
    ? db
        .select()
        .from(schema.accounts)
        .where(like(schema.accounts.email, `%${DEMO_EMAIL_DOMAIN}`))
        .all()
        .filter((a) => !a.privyUserId)
        .map((a) => ({ ...a, workspaces: workspacesOf(a.id) }))
    : [];

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter((w) => /^\p{L}/u.test(w))
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-wrap gap-6 px-6 pb-16 pt-6">
      <div className="flex min-w-0 flex-[1_1_440px] justify-center py-10">
        <div className="flex w-full max-w-[420px] flex-col gap-6">
          <div>
            <h1 className="text-[38px] font-semibold tracking-[-1.5px]">
              {t.welcome1} <span className="v-serif">{t.welcome2}</span>
            </h1>
            <p className="mt-2 text-base text-[#5c5c57]">{t.welcomeSub}</p>
          </div>

          {passwordEnabled && (
            <form action={passwordLogin} className="flex flex-col gap-3">
              <input type="hidden" name="next" value={next} />
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#fdecea] px-3.5 py-2.5 text-sm text-[#b42318]"
                >
                  {error}
                </p>
              )}
              <label className="block text-sm">
                <span className="text-[#5c5c57]">{t.emailOrUser}</span>
                <input
                  type="text"
                  name="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  className="v-input w-full"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[#5c5c57]">{t.password}</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  className="v-input w-full"
                />
              </label>
              <button
                type="submit"
                className="v-btn mt-1 w-full justify-center"
              >
                {t.logInButton}
              </button>
            </form>
          )}

          {privyEnabled && (
            <section className="flex flex-col gap-3">
              <PrivyLogin next={next} label={t.loginButton} />
            </section>
          )}

          <p className="text-center text-sm text-[#5c5c57]">
            {passwordEnabled && !privyEnabled
              ? t.passwordLoginIntro
              : t.loginIntro}{" "}
            <Link
              href="/signup"
              className="font-medium text-[#111111] underline underline-offset-2"
            >
              {t.createAccount}
            </Link>
          </p>

          {demoEnabled && (
            <section className="rounded-[18px] border border-[#f0f0ec] bg-[#fafaf8] p-4">
              <h2 className="text-sm font-semibold">{t.demoAccounts}</h2>
              <p className="mt-1 text-xs text-[#7a7a75]">
                {t.demoAccountsNote}
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {demoAccounts.map((a) => {
                  const name = a.workspaces[0]?.name ?? a.email ?? "?";
                  return (
                    <li key={a.id}>
                      <form action={demoLogin}>
                        <input type="hidden" name="accountId" value={a.id} />
                        <input type="hidden" name="next" value={next} />
                        <button
                          type="submit"
                          className="flex w-full items-center gap-2.5 rounded-xl border border-[#ecece8] bg-white px-2.5 py-2 text-left text-sm hover:border-[#111111]"
                        >
                          <span
                            aria-hidden
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ffe2cc] to-[#ffc6d9] text-[11px] font-semibold"
                          >
                            {initials(name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {name}
                            </span>
                            <span className="block truncate text-xs text-[#7a7a75]">
                              {a.workspaces.length === 0
                                ? t.noWorkspaceYet
                                : a.workspaces
                                    .map((w) => m.common.kind[w.kind] ?? w.kind)
                                    .join(" + ")}
                            </span>
                          </span>
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {!privyEnabled && !demoEnabled && !passwordEnabled && (
            <p className="v-card p-5 text-sm">
              {isDemoMode() ? t.notConfigured : t.prodClosed}
            </p>
          )}
          <p className="text-xs text-[#9a9a95]">
            {privyEnabled
              ? t.noPhrase
              : passwordEnabled
                ? t.passwordWalletNote
                : t.noPhrase}
          </p>
        </div>
      </div>

      <div className="relative hidden min-h-[560px] flex-[1_1_440px] items-center justify-center overflow-hidden rounded-[28px] bg-[#fff6ee] p-12 lg:flex">
        <div
          aria-hidden
          className="absolute inset-[-20%] blur-[30px]"
          style={{
            background:
              "radial-gradient(closest-side at 30% 35%, rgba(255,178,122,0.75), rgba(255,178,122,0) 70%), radial-gradient(closest-side at 70% 45%, rgba(255,160,190,0.6), rgba(255,160,190,0) 70%), radial-gradient(closest-side at 50% 80%, rgba(150,190,255,0.6), rgba(150,190,255,0) 70%)",
          }}
        />
        <div className="relative flex w-full max-w-[400px] flex-col gap-3.5">
          <Volty size={120} className="self-center" />
          <div className="rounded-[18px] border border-white bg-white/90 p-[18px] shadow-[0_24px_50px_-24px_rgba(60,40,30,0.35)]">
            <p className="text-xs text-[#7a7a75]">
              {m.landing.floatPaid}
              {receipt
                ? ` · ${f.time(receipt.periodStart)}–${f.time(receipt.periodEnd)}`
                : ""}
            </p>
            <p className="mt-1.5 text-xl font-semibold tracking-[-0.4px]">
              {receipt ? `+${f.eur(receipt.paidEur)}` : "—"}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[#15803d]">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-[#16a34a]"
              />
              {m.landing.floatPaidSub}
            </p>
          </div>
          <div className="ml-10 rounded-[18px] bg-[#111111] p-[18px] text-white shadow-[0_24px_50px_-24px_rgba(17,17,17,0.5)]">
            <p className="text-xs text-[#ffb27a]">{m.landing.floatAgent}</p>
            <p className="v-serif mt-1.5 text-xl leading-snug">
              {t.panelQuote}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
