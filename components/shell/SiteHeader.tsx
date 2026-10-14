import Link from "next/link";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { getCurrentSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { appMode, isDemoMode, otherModeUrl } from "@/lib/mode";
import { ModeSwitch } from "./ModeSwitch";
import { Wordmark } from "./icons";

// The top bar of the public pages (home, login, sign-up, the public record).
export async function SiteHeader() {
  const { m } = await getI18n();
  const session = await getCurrentSession();
  return (
    <header className="relative z-10 px-6 py-[18px]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-5">
        <Link href="/">
          <Wordmark />
        </Link>
        <nav
          aria-label="Main"
          className="flex flex-wrap gap-7 text-[15px] text-[#4a4a46]"
        >
          <Link href="/#map" className="hover:text-[#111111]">
            {m.nav.liveMap}
          </Link>
          <Link href="/#how" className="hover:text-[#111111]">
            {m.nav.howItWorks}
          </Link>
          <Link href="/verify" className="hover:text-[#111111]">
            {m.nav.proof}
          </Link>
          <Link href="/#stadtwerke" className="hover:text-[#111111]">
            Stadtwerke
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {otherModeUrl() && (
            <ModeSwitch
              mode={appMode()}
              otherUrl={otherModeUrl()!}
              labels={{
                group: m.nav.modeGroup,
                prod: m.nav.modeProd,
                demo: m.nav.modeDemo,
              }}
            />
          )}
          <LanguageSwitch />
          {session ? (
            <Link href="/start" className="v-btn">
              {m.nav.openApp}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2.5 text-[15px] hover:bg-[#f4f4f1]"
              >
                {m.nav.logIn}
              </Link>
              <Link href="/signup" className="v-btn">
                {m.nav.getStarted}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const GITHUB = "https://github.com/ShreyanshTripathi/Solana_at_WHU";

// The footer of the public pages: black, the logo and language on the left, four columns of links.
// Only pages that exist are listed; outside links open in a new tab.
export async function SiteFooter() {
  const { m } = await getI18n();
  const l = m.nav.footerLinks;
  const demoHref = isDemoMode()
    ? "/demo"
    : otherModeUrl()
      ? `${otherModeUrl()}/demo`
      : null;
  const columns: {
    title: string;
    links: { label: string; href: string; external?: boolean }[];
  }[] = [
    {
      title: m.nav.footerCols.company,
      links: [
        { label: l.stadtwerke, href: "/#who" },
        { label: l.pilot, href: "/#stadtwerke" },
        { label: l.github, href: GITHUB, external: true },
      ],
    },
    {
      title: m.nav.footerCols.product,
      links: [
        { label: l.liveMap, href: "/#map" },
        { label: l.howItWorks, href: "/#how" },
        { label: l.whoFor, href: "/#who" },
        ...(demoHref ? [{ label: l.liveDemo, href: demoHref }] : []),
        { label: l.roofs, href: "/projects" },
        { label: l.signUp, href: "/signup" },
        { label: l.logIn, href: "/login" },
      ],
    },
    {
      title: m.nav.footerCols.resources,
      links: [
        { label: l.publicRecord, href: "/verify" },
        { label: l.onChain, href: "/#proof" },
        { label: l.sourceCode, href: GITHUB, external: true },
        {
          label: l.explorer,
          href: "https://explorer.solana.com/?cluster=devnet",
          external: true,
        },
      ],
    },
    {
      title: m.nav.footerCols.legal,
      links: [
        {
          label: l.law,
          href: "https://www.gesetze-im-internet.de/enwg_2005/__42c.html",
          external: true,
        },
        {
          label: l.smeRules,
          href: "https://single-market-economy.ec.europa.eu/smes/sme-fundamentals/sme-definition_en",
          external: true,
        },
        { label: l.deleteAccount, href: "/account" },
      ],
    },
  ];
  return (
    <footer className="bg-[#0b0b0a] px-6 pb-12 pt-20 text-white">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-10 gap-y-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="col-span-2 flex flex-col justify-between gap-8 md:col-span-1">
          <div className="space-y-4">
            <Link href="/" aria-label="Volty">
              <Wordmark size={28} dark />
            </Link>
            <p className="max-w-[16rem] text-sm leading-relaxed text-white/55">
              {m.nav.footer}
            </p>
          </div>
          <div>
            <LanguageSwitch dark />
          </div>
        </div>
        <nav aria-label={m.nav.footerNav} className="contents">
          {columns.map((c) => (
            <div key={c.title}>
              <h2 className="text-[15px] font-semibold text-white">
                {c.title}
              </h2>
              <ul className="mt-6 space-y-4 text-[15px] text-white/55">
                {c.links.map((x) => (
                  <li key={x.label}>
                    {x.external ? (
                      <a
                        href={x.href}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-white"
                      >
                        {x.label}
                      </a>
                    ) : (
                      <Link href={x.href} className="hover:text-white">
                        {x.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mx-auto mt-16 flex max-w-[1200px] flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
        <span>© {new Date().getFullYear()} Volty</span>
        <span className="max-w-xl">{m.nav.footerNote}</span>
      </div>
    </footer>
  );
}
