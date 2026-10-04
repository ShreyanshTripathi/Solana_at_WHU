import Link from "next/link";
import { redirect } from "next/navigation";
import { PrivyLogin } from "@/components/auth/PrivyLogin";
import { authConfig } from "@/lib/auth/config";
import { getCurrentSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { demoSignup } from "../login/actions";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";

export default async function SignupPage() {
  if (await getCurrentSession()) redirect("/workspaces/new");
  const { privyEnabled, demoLogin } = authConfig();
  const { m } = await getI18n();
  const t = m.auth;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t.signupTitle}</h1>
      <p className="mt-2 text-sm opacity-70">
        {t.signupIntro}{" "}
        <Link href="/login" className="text-blue-700 underline dark:text-blue-400">
          {m.nav.logIn}
        </Link>
        .
      </p>

      {privyEnabled && (
        <section className={`mt-6 ${card}`}>
          <PrivyLogin next="/workspaces/new" label={t.signupButton} />
        </section>
      )}

      {demoLogin && (
        <section className={`mt-6 ${card}`}>
          <h2 className="font-semibold">{t.demoSignup}</h2>
          <p className="mt-1 text-xs opacity-70">{t.demoSignupNote}</p>
          <form action={demoSignup} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
            <label className="block">
              <span className="text-xs opacity-70">{t.yourName}</span>
              <input
                name="name"
                required
                minLength={2}
                maxLength={40}
                className="mt-1 block w-56 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
              {t.createDemo}
            </button>
          </form>
        </section>
      )}

      {!privyEnabled && !demoLogin && (
        <p className={`mt-6 text-sm ${card}`}>{t.notConfigured}</p>
      )}
    </main>
  );
}
