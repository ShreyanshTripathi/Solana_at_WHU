import Link from "next/link";
import { Volty } from "@/components/brand/Volty";
import { DayChart } from "@/components/home/DayChart";
import { StatTile } from "@/components/StatTile";
import { PRICES } from "@/lib/config";
import { getHome } from "@/lib/dashboard/home";
import { getI18n } from "@/lib/i18n/server";
import { authConfig } from "@/lib/auth/config";
import { DemoLength } from "@/components/demo/DemoLength";
import { DEMO_HOURS, demoWindow } from "@/lib/demo/run";
import { startDemoAction } from "./demo/actions";
import { explorerTxUrl } from "@/lib/solana/wallets";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

// The demo views, in the same order as home.views in the message files.
const VIEW_LINKS = [
  "/seller?as=weber",
  "/buyer?as=baeckerei",
  "/sme?as=baeckerei",
  "/projects",
  "/admin",
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const deleted = (await searchParams).deleted === "1";
  const { m, f } = await getI18n();
  const t = m.home;
  const pct = f.pct;
  const d = getHome();

  if (!d.community) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-12">
        <h1 className="flex items-center gap-3 text-4xl font-semibold">
          <Volty size={56} />
          Volty
        </h1>
        <p className="mt-3 text-sm">{t.noData}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16">
      {deleted && (
        <p
          role="status"
          className="mt-6 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15"
        >
          {t.deleted}
        </p>
      )}
      <section className="relative py-12">
        <Volty
          size={190}
          className="pointer-events-none absolute right-0 top-8 hidden md:block"
        />
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
          {t.eyebrow}
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight md:text-6xl">
          Volty
        </h1>
        <p className="mt-4 max-w-2xl text-xl leading-relaxed opacity-90">
          {t.tagline}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed opacity-70">
          {t.pitch(
            String(PRICES.feedInCt),
            String(PRICES.gridCt),
            String(d.community.communityPriceCt),
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/seller?as=weber"
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            {t.ctaSeller}
          </Link>
          <Link
            href="/admin"
            className="rounded-md border border-black/15 px-4 py-2 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            {t.ctaStadtwerk}
          </Link>
          <Link
            href="/verify"
            className="rounded-md border border-black/15 px-4 py-2 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            {t.ctaVerify}
          </Link>
        </div>
        <p className="mt-6 text-xs opacity-60">
          {t.community(
            d.community.name,
            d.counts.households,
            d.counts.businesses,
            d.counts.investors,
          )}
          {d.lastTs ? t.simulatedUpTo(f.day(d.lastTs), f.time(d.lastTs)) : ""}
        </p>
      </section>

      {authConfig().demoLogin && (
        <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border-2 border-blue-600/40 bg-blue-600/5 p-5">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold">{m.demo.homeTitle}</h2>
            <p className="mt-1 text-sm opacity-80">{m.demo.homeText}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <form
              action={startDemoAction}
              className="flex flex-wrap items-center gap-3"
            >
              <DemoLength
                startHour={demoWindow().startHour}
                min={DEMO_HOURS.min}
                max={DEMO_HOURS.max}
                initial={DEMO_HOURS.default}
              />
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
              >
                ▶ {m.demo.run}
              </button>
            </form>
            <Link
              href="/demo"
              className="rounded-md border border-black/15 px-4 py-2.5 font-medium hover:bg-black/5 dark:border-white/20"
            >
              {m.demo.guide}
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label={t.tiles.shared}
          value={f.kwh(d.totals.sharedKwh)}
          sub={t.tiles.sharedSub(d.simulatedDays)}
        />
        <StatTile
          label={t.tiles.paid}
          value={f.eur(d.totals.paidOutEur)}
          sub={t.tiles.paidSub(d.totals.confirmedBatches)}
        />
        <StatTile
          label={t.tiles.homes}
          value={t.tiles.homesValue(d.counts.sellers, d.counts.households)}
          sub={t.tiles.homesSub}
        />
        <StatTile
          label={t.tiles.co2}
          value={`${f.int(d.totals.co2Kg)} kg`}
          sub={t.tiles.co2Sub}
        />
      </section>

      {d.day && (
        <section className={`mt-6 ${card}`}>
          <h2 className="font-semibold">
            {t.dayTitle(f.day(d.day.dayStart), pct(d.day.sharedShare))}
          </h2>
          <p className="mt-1 text-xs opacity-70">
            {t.dayNote(f.kwh(d.day.generatedKwh), f.kwh(d.day.sharedKwh))}
          </p>
          <div className="mt-3">
            <DayChart hours={d.day.hours} />
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{t.howItWorks}</h2>
        <ol className="mt-3 grid gap-3 md:grid-cols-4">
          {t.steps.map((s, i) => (
            <li key={s.title} className={card}>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {i + 1}
              </p>
              <p className="mt-1 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed opacity-75">
                {s.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{t.explore}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {t.views.map((v, i) => (
            <Link
              key={VIEW_LINKS[i]}
              href={VIEW_LINKS[i]}
              className={`${card} block transition-colors hover:border-blue-600`}
            >
              <p className="font-semibold">{v.title} →</p>
              <p className="mt-0.5 text-xs opacity-60">{v.who}</p>
              <p className="mt-2 text-sm leading-relaxed opacity-80">
                {v.text}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className={`mt-10 ${card}`}>
        <h2 className="font-semibold">{t.latestPayouts}</h2>
        <p className="mt-1 text-xs opacity-70">{t.latestPayoutsNote}</p>
        {d.payouts.length === 0 ? (
          <p className="mt-3 text-sm opacity-70">{t.noPayouts}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="kw-table w-full text-sm">
              <thead className="text-left text-xs opacity-70">
                <tr>
                  <th className="py-1 font-normal">{t.table.hour}</th>
                  <th className="py-1 text-right font-normal">
                    {t.table.recipients}
                  </th>
                  <th className="py-1 text-right font-normal">
                    {t.table.paid}
                  </th>
                  <th className="py-1 pl-6 font-normal">
                    {t.table.transaction}
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {d.payouts.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-black/5 dark:border-white/10"
                  >
                    <td className="py-1.5">
                      {f.day(b.periodStart)}, {f.time(b.periodStart)}–
                      {f.time(b.periodEnd)}
                    </td>
                    <td className="py-1.5 text-right">{b.recipients}</td>
                    <td className="py-1.5 text-right">{f.eur(b.paidEur)}</td>
                    <td className="py-1.5 pl-6">
                      {b.txSignatures.map((sig) => (
                        <a
                          key={sig}
                          href={explorerTxUrl(sig)}
                          target="_blank"
                          rel="noreferrer"
                          className="mr-3 text-blue-700 underline dark:text-blue-400"
                        >
                          <span className="font-mono">{short(sig)}</span> ↗
                        </a>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-8 text-xs opacity-60">{t.footer}</p>
    </main>
  );
}
