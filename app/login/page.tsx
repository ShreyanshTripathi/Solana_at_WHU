import { like } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PrivyLogin } from "@/components/auth/PrivyLogin";
import { db, schema } from "@/db/client";
import { authConfig } from "@/lib/auth/config";
import { safeNext } from "@/lib/auth/policy";
import { getCurrentSession, workspacesOf } from "@/lib/auth/session";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo/personas";
import { getI18n } from "@/lib/i18n/server";
import { demoLogin } from "./actions";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const { m } = await getI18n();
  const t = m.auth;
  const next = safeNext(params.next);
  if (await getCurrentSession()) redirect(next);

  const { privyEnabled, demoLogin: demoEnabled } = authConfig();
  const demoAccounts = demoEnabled
    ? db
        .select()
        .from(schema.accounts)
        .where(like(schema.accounts.email, `%${DEMO_EMAIL_DOMAIN}`))
        .all()
        .filter((a) => !a.privyUserId)
        .map((a) => ({ ...a, workspaces: workspacesOf(a.id) }))
    : [];

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t.loginTitle}</h1>
      <p className="mt-2 text-sm opacity-70">
        {t.loginIntro}{" "}
        <Link href="/signup" className="text-blue-700 underline dark:text-blue-400">
          {t.createAccount}
        </Link>
        .
      </p>

      {privyEnabled && (
        <section className={`mt-6 ${card}`}>
          <PrivyLogin next={next} label={t.loginButton} />
        </section>
      )}

      {demoEnabled && (
        <section className={`mt-6 ${card}`}>
          <h2 className="font-semibold">{t.demoAccounts}</h2>
          <p className="mt-1 text-xs opacity-70">{t.demoAccountsNote}</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {demoAccounts.map((a) => (
              <li key={a.id}>
                <form action={demoLogin}>
                  <input type="hidden" name="accountId" value={a.id} />
                  <input type="hidden" name="next" value={next} />
                  <button
                    type="submit"
                    className="w-full rounded-md border border-black/15 px-3 py-2 text-left text-sm hover:border-blue-600 dark:border-white/20"
                  >
                    <span className="font-medium">{a.workspaces[0]?.name ?? a.email}</span>
                    <span className="block text-xs opacity-60">
                      {a.workspaces.length === 0 ? t.noWorkspaceYet : a.workspaces.map((w) => m.common.kind[w.kind] ?? w.kind).join(" + ")}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!privyEnabled && !demoEnabled && (
        <p className={`mt-6 text-sm ${card}`}>{t.notConfigured}</p>
      )}
    </main>
  );
}
