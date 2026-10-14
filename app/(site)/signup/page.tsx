import Link from "next/link";
import { redirect } from "next/navigation";
import { PrivyLogin } from "@/components/auth/PrivyLogin";
import { OnboardingGlow, Steps } from "@/components/shell/Steps";
import { authConfig } from "@/lib/auth/config";
import { getCurrentSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { isDemoMode } from "@/lib/mode";
import { demoSignup, passwordSignup } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const params = await searchParams;
  if (await getCurrentSession()) redirect("/workspaces/new");
  const { privyEnabled, demoLogin, passwordLogin } = authConfig();
  const { m } = await getI18n();
  const t = m.auth;
  const error =
    typeof params.error === "string"
      ? (t.errors[params.error] ?? t.errors.failed)
      : null;

  return (
    <main className="relative overflow-hidden px-6 pb-20 pt-6">
      <OnboardingGlow />
      <div className="relative mx-auto flex max-w-[680px] flex-col gap-6">
        <Steps labels={t.steps} current={1} />
        <div className="v-card-raised flex flex-col gap-5 p-7 md:p-9">
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-1.2px]">
            {t.join1} <span className="v-serif">{t.join2}</span>
          </h1>
          <p className="text-[15px] leading-relaxed text-[#5c5c57]">
            {passwordLogin && !privyEnabled
              ? t.passwordSignupIntro
              : t.signupIntro}{" "}
            <Link
              href="/login"
              className="font-medium text-[#111111] underline underline-offset-2"
            >
              {m.nav.logIn}
            </Link>
            .
          </p>

          {passwordLogin && (
            <form action={passwordSignup} className="flex flex-col gap-3">
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#fdecea] px-3.5 py-2.5 text-sm text-[#b42318]"
                >
                  {error}
                </p>
              )}
              <label className="block text-sm">
                <span className="text-[#5c5c57]">{t.email}</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  className="v-input w-full"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-[#5c5c57]">{t.password}</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={200}
                    required
                    className="v-input w-full"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-[#5c5c57]">{t.passwordRepeat}</span>
                  <input
                    type="password"
                    name="password2"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={200}
                    required
                    className="v-input w-full"
                  />
                </label>
              </div>
              <p className="text-xs text-[#7a7a75]">
                {t.passwordHint} {t.passwordWalletNote}
              </p>
              <button type="submit" className="v-btn w-fit">
                {t.signUpButton}
              </button>
            </form>
          )}

          {privyEnabled && (
            <section>
              <PrivyLogin next="/workspaces/new" label={t.signupButton} />
            </section>
          )}

          {demoLogin && (
            <section className="rounded-[18px] border border-[#f0f0ec] bg-[#fafaf8] p-4">
              <h2 className="text-sm font-semibold">{t.demoSignup}</h2>
              <p className="mt-1 text-xs text-[#7a7a75]">{t.demoSignupNote}</p>
              <form
                action={demoSignup}
                className="mt-3 flex flex-wrap items-end gap-3 text-sm"
              >
                <label className="block">
                  <span className="text-[13px] text-[#5c5c57]">
                    {t.yourName}
                  </span>
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={40}
                    className="v-input w-56"
                  />
                </label>
                <button type="submit" className="v-btn">
                  {t.createDemo}
                </button>
              </form>
            </section>
          )}

          {!privyEnabled && !demoLogin && !passwordLogin && (
            <p className="text-sm">
              {isDemoMode() ? t.notConfigured : t.prodClosed}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
