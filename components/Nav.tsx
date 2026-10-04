import Link from "next/link";
import { Volty } from "@/components/brand/Volty";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { NavLinks } from "@/components/NavLinks";
import { switchWorkspace } from "@/app/workspaces/actions";
import { authConfig } from "@/lib/auth/config";
import { isAdmin } from "@/lib/auth/policy";
import { getCurrentSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

const homeFor = (kind: string) => (kind === "sme" ? "/sme" : kind === "supplier" ? "/admin" : kind === "investor" ? "/projects" : "/buyer");
const menuItem = "block rounded px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10";

export async function Nav() {
  const { m } = await getI18n();
  const session = await getCurrentSession();
  const workspace = session?.workspace ?? null;
  const links = [
    { href: "/seller", label: m.nav.seller },
    { href: "/buyer", label: m.nav.receiver },
    { href: "/sme", label: m.nav.sme },
    { href: "/projects", label: m.nav.projects },
    ...(session ? [{ href: "/agent", label: m.nav.agent }] : []),
    ...(session ? [{ href: "/federation", label: m.nav.federation }] : []),
    ...(session ? [{ href: "/statements", label: m.nav.statements }] : []),
    ...(workspace && isAdmin(workspace) ? [{ href: "/admin", label: m.nav.admin }] : []),
  ];

  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold">
          <Volty size={28} mark />
          Volty
        </Link>
        <NavLinks links={links} />
        <span className="ml-auto flex items-center gap-3">
          <LanguageSwitch />
          {session ? (
            <>
              {/* Workspace menu: each workspace is a separate household or business with its own wallet. */}
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-md border border-black/15 px-3 py-1 dark:border-white/20">
                  {workspace ? `${workspace.name} · ${m.common.kind[workspace.kind] ?? workspace.kind}` : m.nav.noWorkspace} ▾
                </summary>
                <div className="absolute right-0 z-[1000] mt-1 w-64 rounded-md border border-black/15 bg-white p-1 shadow-lg dark:border-white/20 dark:bg-neutral-900">
                  {session.workspaces.map((w) => (
                    <form key={w.id} action={switchWorkspace}>
                      <input type="hidden" name="workspaceId" value={w.id} />
                      <input type="hidden" name="next" value={homeFor(w.kind)} />
                      <button
                        type="submit"
                        aria-current={w.id === workspace?.id ? "true" : undefined}
                        className={`${menuItem} w-full text-left aria-[current]:font-medium`}
                      >
                        {w.name}
                        <span className="block text-xs opacity-60">{m.common.kind[w.kind] ?? w.kind}</span>
                      </button>
                    </form>
                  ))}
                  <div className="my-1 border-t border-black/10 dark:border-white/15" />
                  <Link href="/site" className={menuItem}>
                    {m.nav.mySite}
                  </Link>
                  <Link href="/statements" className={menuItem}>
                    {m.nav.statements}
                  </Link>
                  <Link href="/workspaces/new" className={menuItem}>
                    {m.nav.newWorkspace}
                  </Link>
                  <Link href="/account" className={menuItem}>
                    {m.nav.accountSettings}
                  </Link>
                </div>
              </details>
              <LogoutButton privyEnabled={authConfig().privyEnabled} />
            </>
          ) : (
            <>
              <Link href="/login" className="opacity-80 hover:opacity-100">
                {m.nav.logIn}
              </Link>
              <Link href="/signup" className="rounded-md bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700">
                {m.nav.signUp}
              </Link>
            </>
          )}
        </span>
      </nav>
    </header>
  );
}
