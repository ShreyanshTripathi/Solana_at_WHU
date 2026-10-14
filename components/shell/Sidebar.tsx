import Link from "next/link";
import { switchWorkspace } from "@/app/(app)/workspaces/actions";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { authConfig } from "@/lib/auth/config";
import { appMode, isDemoMode, otherModeUrl } from "@/lib/mode";
import { ModeSwitch } from "./ModeSwitch";
import { isAdmin } from "@/lib/auth/policy";
import { getCurrentSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { Wordmark } from "./icons";
import { type NavItem, SidebarNav } from "./SidebarNav";

const homeFor = (kind: string) => (kind === "sme" ? "/sme" : kind === "supplier" ? "/admin" : kind === "investor" ? "/projects" : "/seller");
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

// The app's left-hand navigation: the open workspace (with a switcher), the pages that fit its kind,
// and the community pages. Stadtwerk staff also get the console.
export async function Sidebar() {
  const { m } = await getI18n();
  const session = await getCurrentSession();
  const workspace = session?.workspace ?? null;
  const kind = workspace?.kind ?? "household";
  const staff = workspace ? isAdmin(workspace) : false;
  const demoAllowed = isDemoMode() && (authConfig().demoLogin || staff);

  const mine: NavItem[] = [
    ...(kind === "household" || staff ? [{ href: "/seller", label: m.nav.selling, icon: "sell" as const }] : []),
    ...(kind !== "investor" ? [{ href: "/buyer", label: m.nav.buying, icon: "buy" as const }] : []),
    ...(kind === "sme" || staff ? [{ href: "/sme", label: m.nav.business, icon: "business" as const }] : []),
    ...(session ? [{ href: "/agent", label: m.nav.agent, icon: "agent" as const }] : []),
    ...(session ? [{ href: "/statements", label: m.nav.statements, icon: "statements" as const }] : []),
  ];
  const community: NavItem[] = [
    { href: "/projects", label: m.nav.projects, icon: "projects" },
    ...(session ? [{ href: "/federation", label: m.nav.neighbours, icon: "federation" as const }] : []),
    ...(session ? [{ href: "/map", label: m.nav.liveMap, icon: "map" as const }] : []),
  ];
  const footer: NavItem[] = [
    ...(session && (kind === "household" || kind === "sme") ? [{ href: "/site", label: m.nav.yourHome, icon: "home" as const }] : []),
    ...(session ? [{ href: "/account", label: m.nav.settings, icon: "settings" as const }] : []),
    ...(demoAllowed ? [{ href: "/demo", label: m.nav.liveDemo, icon: "demo" as const }] : []),
    ...(staff ? [{ href: "/admin", label: m.nav.console, icon: "console" as const }] : []),
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 border-b border-[#f0f0ec] bg-white px-3.5 py-5 md:sticky md:top-0 md:h-screen md:w-[248px] md:overflow-y-auto md:border-b-0 md:border-r">
      <div className="flex flex-wrap items-center justify-between gap-2 px-2">
        <Link href="/">
          <Wordmark />
        </Link>
        {otherModeUrl() && <ModeSwitch mode={appMode()} otherUrl={otherModeUrl()!} labels={{ group: m.nav.modeGroup, prod: m.nav.modeProd, demo: m.nav.modeDemo }} />}
      </div>

      {session ? (
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-[14px] border border-[#f0f0ec] p-2.5 hover:bg-[#fbfbf9]">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ffb27a] to-[#ff8fb0] text-xs font-semibold">
              {initials(workspace?.name ?? session.account.email ?? "?")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{workspace?.name ?? m.nav.noWorkspace}</span>
              <span className="block truncate text-xs text-[#7a7a75]">{workspace ? (m.common.kind[workspace.kind] ?? workspace.kind) : m.nav.switchWorkspace}</span>
            </span>
            <span aria-hidden className="text-sm text-[#9a9a95]">⇅</span>
          </summary>
          <div className="absolute left-0 right-0 z-[1000] mt-1.5 rounded-[14px] border border-[#ecece8] bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(17,17,17,0.35)]">
            {session.workspaces.map((w) => (
              <form key={w.id} action={switchWorkspace}>
                <input type="hidden" name="workspaceId" value={w.id} />
                <input type="hidden" name="next" value={homeFor(w.kind)} />
                <button
                  type="submit"
                  aria-current={w.id === workspace?.id ? "true" : undefined}
                  className="w-full rounded-[10px] px-2.5 py-2 text-left text-sm hover:bg-[#f4f4f1] aria-[current]:font-semibold"
                >
                  {w.name}
                  <span className="block text-xs text-[#7a7a75]">{m.common.kind[w.kind] ?? w.kind}</span>
                </button>
              </form>
            ))}
            <div className="my-1 border-t border-[#f0f0ec]" />
            <Link href="/workspaces/new" className="block rounded-[10px] px-2.5 py-2 text-sm hover:bg-[#f4f4f1]">
              {m.nav.newWorkspace}
            </Link>
          </div>
        </details>
      ) : (
        <div className="flex gap-2">
          <Link href="/login" className="v-btn-secondary flex-1">
            {m.nav.logIn}
          </Link>
          <Link href="/signup" className="v-btn flex-1">
            {m.nav.signUp}
          </Link>
        </div>
      )}

      <SidebarNav
        groups={[{ items: mine }, { title: m.nav.community, items: community }]}
        footer={footer}
      />

      <div className="flex items-center justify-between gap-2 border-t border-[#f0f0ec] px-2 pt-3 text-[13px] text-[#5c5c57]">
        <LanguageSwitch />
        {session && <LogoutButton privyEnabled={authConfig().privyEnabled} />}
      </div>
    </aside>
  );
}
