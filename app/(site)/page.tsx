import Link from "next/link";
import { Volty } from "@/components/brand/Volty";
import { DemoLength } from "@/components/demo/DemoLength";
import { FlatStreetMap } from "@/components/landing/FlatStreetMap";
import { StreetMap3D } from "@/components/landing/StreetMap3D";
import { Icon } from "@/components/shell/icons";
import { authConfig } from "@/lib/auth/config";
import { PRICES } from "@/lib/config";
import {
  busiestRecentReceipt,
  getHome,
  latestFlows,
  latestReceipt,
} from "@/lib/dashboard/home";
import { DEMO_HOURS, demoWindow } from "@/lib/demo/run";
import { getI18n } from "@/lib/i18n/server";
import { isDemoMode } from "@/lib/mode";
import { requestPilot } from "./actions";
import { startDemoAction } from "./demo/actions";

export const dynamic = "force-dynamic";

const serif = "v-serif";
// The audience cards link to the matching live views of the demo community.
const WHO_LINKS = [
  "/seller?as=weber",
  "/sme?as=baeckerei",
  "/projects",
  "#stadtwerke",
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const { m, f } = await getI18n();
  const t = m.landing;
  const d = getHome();
  const flows = latestFlows();
  const receipt = latestReceipt();
  const showcase = busiestRecentReceipt();

  if (!d.community) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Volty size={96} className="mx-auto" />
        <h1 className="v-h1 mt-6">Volty</h1>
        <p className="v-muted mt-3">{m.home.noData}</p>
      </main>
    );
  }

  const feedIn = PRICES.feedInCt;
  const grid = PRICES.gridCt;
  const feedPos = (feedIn / 40) * 100;
  const gridPos = (grid / 40) * 100;

  return (
    <main>
      {params.deleted === "1" && (
        <p role="status" className="v-card mx-auto mt-4 max-w-3xl p-4 text-sm">
          {m.home.deleted}
        </p>
      )}

      {/* Hero, with the product right under it. */}
      <section className="relative overflow-hidden px-6 pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[360px] h-[900px] w-[1400px] -translate-x-1/2 blur-[40px]"
          style={{
            background:
              "radial-gradient(closest-side at 30% 45%, rgba(255,178,122,0.55), rgba(255,178,122,0) 70%), radial-gradient(closest-side at 55% 40%, rgba(255,160,190,0.45), rgba(255,160,190,0) 70%), radial-gradient(closest-side at 75% 55%, rgba(150,190,255,0.45), rgba(150,190,255,0) 70%)",
          }}
        />
        <div className="relative z-[1] mx-auto flex max-w-[900px] flex-col items-center gap-6 text-center">
          <h1 className="text-[44px] font-semibold leading-[1.02] tracking-[-2px] md:text-[76px] md:tracking-[-3px]">
            {t.title1} <span className={serif}>{t.title2}</span>
          </h1>
          <p className="max-w-[640px] text-lg leading-relaxed text-[#5c5c57] md:text-xl">
            {t.sub}
          </p>
          <ul className="flex flex-wrap justify-center gap-2.5 text-sm font-medium">
            <li>
              <Link
                href="#euros"
                className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-white"
              >
                <span aria-hidden className="text-[#FFB27A]">
                  €
                </span>
                {t.chipSolana}
              </Link>
            </li>
            <li>
              <Link
                href="#agents"
                className="inline-flex items-center gap-2 rounded-full border border-[#ecece8] bg-white px-4 py-2 text-[#111111] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <span aria-hidden className="text-[#ff7a1a]">
                  ✦
                </span>
                {t.chipAgents}
              </Link>
            </li>
          </ul>
          <form
            action="/signup"
            method="get"
            className="flex w-full max-w-[580px] flex-wrap gap-2 rounded-[22px] border border-[#ecece8] bg-white p-2 shadow-[0_20px_50px_-20px_rgba(17,17,17,0.18)]"
          >
            <label className="flex min-w-[220px] flex-1 flex-col gap-0.5 px-3.5 py-1.5 text-left text-xs text-[#7a7a75]">
              {t.postcode}
              <input
                name="postcode"
                inputMode="numeric"
                placeholder={t.postcodePlaceholder}
                className="bg-transparent text-lg text-[#111111] outline-none placeholder:text-[#9a9a95]"
              />
            </label>
            <button
              type="submit"
              className="v-btn min-h-[54px] rounded-2xl px-6"
            >
              {t.check}
            </button>
          </form>
          <p className="text-sm text-[#7a7a75]">
            {t.stadtwerk}{" "}
            <Link href="#stadtwerke" className="underline underline-offset-2">
              {t.bookPilot}
            </Link>
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] text-[#9a9a95]">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[#ff7a1a]"
            />
            {t.pill}:
            <a
              href="https://www.gesetze-im-internet.de/enwg_2005/__42c.html"
              target="_blank"
              rel="noreferrer"
              className="text-[#5c5c57] underline underline-offset-2 hover:text-[#111111]"
            >
              {t.lawDe} ↗
            </a>
            ·
            <a
              href="https://eur-lex.europa.eu/eli/dir/2024/1711/oj"
              target="_blank"
              rel="noreferrer"
              className="text-[#5c5c57] underline underline-offset-2 hover:text-[#111111]"
            >
              {t.lawEu} ↗
            </a>
          </p>
        </div>

        <ProductPreview
          t={t}
          stats={[
            {
              label: t.statShared,
              value: f.kwh(d.day?.sharedKwh ?? d.totals.sharedKwh, 1),
            },
            { label: t.statPaid, value: f.eur(d.totals.paidOutEur) },
            {
              label: t.statHomes,
              value: `${d.counts.sellers} / ${d.counts.households + d.counts.businesses}`,
            },
          ]}
          flows={flows?.flows ?? []}
          kwh={(x) => f.kwh(x, 2)}
          paid={
            receipt
              ? {
                  amount: f.eur(receipt.paidEur),
                  when: `${f.time(receipt.periodStart)}–${f.time(receipt.periodEnd)}`,
                }
              : null
          }
          community={d.community.name}
        />
        <div className="h-24" />
      </section>

      {authConfig().demoLogin && (
        <section className="px-6">
          <div className="v-card-raised mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-5 p-6">
            <div className="flex max-w-xl items-center gap-4">
              <Volty size={56} />
              <div>
                <h2 className="v-h2">{t.demoTitle}</h2>
                <p className="mt-1 text-sm text-[#5c5c57]">{t.demoText}</p>
              </div>
            </div>
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
              <button type="submit" className="v-btn">
                ▶ {m.demo.run}
              </button>
              <Link href="/demo" className="v-btn-secondary">
                {m.demo.guide}
              </Link>
            </form>
          </div>
        </section>
      )}

      {/* AI agents: what runs the market for you. */}
      <section
        id="agents"
        aria-labelledby="agents-title"
        className="scroll-mt-6 px-6 py-24"
      >
        <div className="mx-auto max-w-[1180px]">
          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
            <p className="v-eyebrow">{t.agentsEyebrow}</p>
            <h2
              id="agents-title"
              className="text-[34px] font-semibold leading-[1.05] tracking-[-1.5px] md:text-[52px] md:tracking-[-2px]"
            >
              {t.agentsTitle1}{" "}
              <span className={`${serif} block`}>{t.agentsTitle2}</span>
            </h2>
            <p className="text-lg leading-relaxed text-[#5c5c57]">
              {t.agentsText}
            </p>
          </div>
          <ul className="mt-12 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {t.agents.map((a, i) => (
              <li key={a.name} className="v-card flex flex-col gap-3 p-6">
                <span
                  aria-hidden
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ background: AGENT_TINTS[i] }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#111111"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {AGENT_ICONS[i]}
                  </svg>
                </span>
                <div>
                  <p className="text-[13px] text-[#7a7a75]">{a.role}</p>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {a.name}
                  </h3>
                </div>
                <p className="text-[15px] leading-relaxed text-[#5c5c57]">
                  {a.text}
                </p>
              </li>
            ))}
          </ul>
          <SunDay title={t.dayTitle} note={t.dayNote} events={t.day} />
        </div>
      </section>

      {/* Settled on Solana, paid in euros: the last settled hour as proof. */}
      <section
        id="euros"
        aria-labelledby="euros-title"
        className="scroll-mt-6 px-6 pb-24"
      >
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 overflow-hidden rounded-[28px] bg-[#0b0b0a] p-8 text-white md:grid-cols-[1.15fr_1fr] md:p-14">
          <div>
            <p className="text-[13px] text-white/50">{t.euroEyebrow}</p>
            <h2
              id="euros-title"
              className="mt-4 text-[34px] font-semibold leading-[1.05] tracking-[-1.5px] md:text-[48px] md:tracking-[-2px]"
            >
              {t.euroTitle1}{" "}
              <span className={`${serif} text-[#FFB27A]`}>{t.euroTitle2}</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/65">
              {t.euroText}
            </p>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2">
              {t.euroPoints.map((x) => (
                <li key={x.title}>
                  <p className="font-semibold">{x.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">
                    {x.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[22px] bg-white p-6 text-[#111111] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{t.euroCardTitle}</p>
              {showcase && (
                <span className="font-mono text-[13px] text-[#5c5c57]">
                  {f.time(showcase.periodStart)}–{f.time(showcase.periodEnd)}
                </span>
              )}
            </div>
            {showcase && showcase.earners.length > 0 ? (
              <>
                <ul className="mt-4 divide-y divide-[#f0f0ec]">
                  {showcase.earners.map((e) => (
                    <li
                      key={e.name}
                      className="flex items-baseline justify-between gap-3 py-3"
                    >
                      <span>
                        <span className="block font-medium">{e.name}</span>
                        <span className="text-xs text-[#7a7a75]">
                          {f.kwh(e.kwh, 2)} {t.euroCardEarned}
                        </span>
                      </span>
                      <span className="font-mono text-[15px] font-semibold tabular-nums text-[#15803d]">
                        +{f.eur(e.eur)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-[#111111]/10 pt-4">
                  <span className="text-sm text-[#5c5c57]">
                    {t.euroCardTotal}
                  </span>
                  <span className="text-2xl font-semibold tracking-tight tabular-nums">
                    {f.eur(showcase.paidEur)}
                  </span>
                </div>
                <Link
                  href={`/verify/${showcase.batchId}`}
                  className="v-btn mt-5 w-full justify-center"
                >
                  {t.euroCardTx}
                </Link>
              </>
            ) : (
              <p className="mt-4 text-sm text-[#7a7a75]">{t.euroCardNone}</p>
            )}
            {isDemoMode() && (
              <p className="mt-3 text-center text-xs text-[#9a9a95]">
                {t.euroDevnet}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* What has happened so far, from the database (once there is something to show). */}
      {d.totals.sharedKwh > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-3.5 md:grid-cols-4">
            {[
              {
                label: t.statShared,
                value: f.kwh(d.totals.sharedKwh),
                sub: isDemoMode()
                  ? m.home.tiles.sharedSub(d.simulatedDays)
                  : "",
              },
              {
                label: t.statPaid,
                value: f.eur(d.totals.paidOutEur),
                sub: m.home.tiles.paidSub(d.totals.confirmedBatches),
              },
              {
                label: t.statHomes,
                value: m.home.tiles.homesValue(
                  d.counts.sellers,
                  d.counts.households,
                ),
                sub: m.home.tiles.homesSub,
              },
              {
                label: t.statCo2,
                value: `${f.int(d.totals.co2Kg)} kg`,
                sub: m.home.tiles.co2Sub,
              },
            ].map((s) => (
              <div key={s.label} className="v-card px-5 py-5">
                <p className="text-[13px] text-[#7a7a75]">{s.label}</p>
                <p className="mt-2 text-[28px] font-semibold tracking-[-1px] tabular-nums">
                  {s.value}
                </p>
                <p className="mt-1 text-[13px] text-[#7a7a75]">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The price gap. */}
      <section aria-labelledby="gap-title" className="px-6 pb-24">
        <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-10 text-center">
          <div className="flex flex-col items-center gap-4">
            <p className="v-eyebrow">{t.gapEyebrow}</p>
            <h2
              id="gap-title"
              className="max-w-[840px] text-[34px] font-semibold leading-[1.05] tracking-[-1.5px] md:text-[52px] md:tracking-[-2px]"
            >
              {t.gapTitle(f.int(feedIn))}{" "}
              <span className={serif}>{f.int(grid)}.</span>
            </h2>
          </div>
          <div className="w-full rounded-[22px] border border-[#f0f0ec] bg-[#fafaf8] px-6 pb-5 pt-9 md:px-9">
            <div className="relative h-[52px] rounded-full bg-[#efefeb]">
              <div
                className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#ffb27a] via-[#ff8fb0] to-[#96beff]"
                style={{ left: `${feedPos}%`, right: `${100 - gridPos}%` }}
              />
              <span
                className="absolute top-4 text-sm font-medium"
                style={{ left: `calc(${feedPos}% + 20px)` }}
              >
                {t.gapMarket}
              </span>
            </div>
            <div className="relative h-[70px] text-[13px] text-[#7a7a75]">
              <span className="absolute left-0 top-3.5">0 ct</span>
              <span
                className="absolute top-3.5 -translate-x-1/2 whitespace-nowrap text-center"
                style={{ left: `${feedPos}%` }}
              >
                <b className="block text-[22px] font-semibold text-[#111111]">
                  {f.int(feedIn)} ct
                </b>
                {t.feedIn}
              </span>
              <span
                className="absolute top-3.5 -translate-x-1/2 whitespace-nowrap text-center"
                style={{ left: `${gridPos}%` }}
              >
                <b className="block text-[22px] font-semibold text-[#111111]">
                  {f.int(grid)} ct
                </b>
                {t.grid}
              </span>
            </div>
          </div>
          <p className="max-w-[680px] text-lg leading-relaxed text-[#5c5c57]">
            {t.gapText}
          </p>
        </div>
      </section>

      {/* The animated street and the real flows of the latest quarter-hour. */}
      <section
        id="map"
        aria-labelledby="map-title"
        className="border-y border-[#f0f0ec] bg-[#fafaf8] px-6 py-24"
      >
        <div className="mx-auto flex max-w-[1180px] flex-col gap-11">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="v-eyebrow">{t.mapEyebrow}</p>
            <h2
              id="map-title"
              className="text-[34px] font-semibold leading-[1.05] tracking-[-1.5px] md:text-[52px] md:tracking-[-2px]"
            >
              {t.mapTitle1} <span className={serif}>{t.mapTitle2}</span>
            </h2>
            <p className="max-w-[620px] text-lg leading-relaxed text-[#5c5c57]">
              {t.mapText}
            </p>
          </div>
          <div className="flex flex-wrap overflow-hidden rounded-[26px] border border-[#ecece8] bg-gradient-to-b from-[#fff8f2] via-white to-[#f5f8ff] shadow-[0_40px_90px_-45px_rgba(17,17,17,0.3)]">
            <div className="min-w-0 flex-[3_1_600px] p-3">
              <StreetMap3D label={t.mapLabel} />
            </div>
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-0.5 border-l border-[#f0f0ec] bg-white/70 px-6 py-7 text-sm">
              {flows && flows.flows.length > 0 ? (
                <>
                  <p className="mb-3 flex items-center gap-2 font-medium">
                    <span
                      aria-hidden
                      className="h-[7px] w-[7px] rounded-full bg-[#ff7a1a]"
                    />
                    {t.flowsAt(
                      `${f.day(flows.ts)} ${f.time(flows.ts)}`,
                      flows.total,
                    )}
                  </p>
                  {flows.flows.map((fl) => (
                    <div
                      key={`${fl.from}-${fl.to}`}
                      className="flex justify-between gap-3 border-b border-[#f0f0ec] py-2.5 last:border-0"
                    >
                      <span className="min-w-0 truncate">
                        {fl.from} → {fl.to}
                      </span>
                      <span className="shrink-0 font-mono text-[#5c5c57]">
                        {f.kwh(fl.kwh, 2)}
                      </span>
                    </div>
                  ))}
                  <p className="mt-4 text-[#7a7a75]">{t.flowsPaid}</p>
                </>
              ) : (
                <p className="text-[#7a7a75]">
                  {isDemoMode() ? t.noFlows : t.noFlowsProd}
                </p>
              )}
              <div className="mt-auto flex flex-col gap-2 pt-5 text-[13px] text-[#5c5c57]">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-[3px] w-[18px] rounded bg-gradient-to-r from-[#ffd23f] to-[#ff7a1a]"
                  />
                  {t.legendSolar}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-[3px] w-[18px] rounded bg-[#2563eb]"
                  />
                  {t.legendPeer}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works. */}
      <section id="how" aria-labelledby="how-title" className="px-6 py-24">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-11">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="v-eyebrow">{t.howEyebrow}</p>
            <h2
              id="how-title"
              className="text-[34px] font-semibold tracking-[-1.5px] md:text-[52px] md:tracking-[-2px]"
            >
              {t.howTitle1} <span className={serif}>{t.howTitle2}</span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {t.how.map((s, i) => (
              <div
                key={s.title}
                className="flex flex-col gap-3.5 rounded-[22px] border border-[#f0f0ec] bg-[#fafaf8] p-7"
              >
                <span
                  className={`${serif} text-[44px] leading-none text-[#c2410c]`}
                >
                  {i + 1}
                </span>
                <h3 className="text-[21px] font-semibold tracking-[-0.4px]">
                  {s.title}
                </h3>
                <p className="leading-relaxed text-[#5c5c57]">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for. */}
      <section id="who" aria-labelledby="who-title" className="px-6 pb-24 pt-6">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-11">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="v-eyebrow">{t.whoEyebrow}</p>
            <h2
              id="who-title"
              className="text-[34px] font-semibold tracking-[-1.5px] md:text-[52px] md:tracking-[-2px]"
            >
              {t.whoTitle1} <span className={serif}>{t.whoTitle2}</span>
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.who.map((w, i) => {
              const dark = i === 3;
              return (
                <Link
                  key={w.title}
                  href={WHO_LINKS[i]}
                  className={`flex min-h-[230px] flex-col gap-3 rounded-[22px] p-7 ${dark ? "bg-[#111111] text-white" : "border border-[#ecece8] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#cfcfc8]"}`}
                >
                  <h3 className="text-[21px] font-semibold tracking-[-0.4px]">
                    {w.title}
                  </h3>
                  <p
                    className={`leading-relaxed ${dark ? "text-[#c9c9c4]" : "text-[#5c5c57]"}`}
                  >
                    {w.text}
                  </p>
                  <span
                    className={`mt-auto text-[15px] font-medium ${dark ? "text-[#ffb27a]" : ""}`}
                  >
                    {w.cta}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Proof: the latest settled hour, checked against Solana. */}
      <section
        id="proof"
        aria-labelledby="proof-title"
        className="border-y border-[#f0f0ec] bg-[#fafaf8] px-6 py-24"
      >
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-14">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
            <p className="v-eyebrow">{t.proofEyebrow}</p>
            <h2
              id="proof-title"
              className="text-[34px] font-semibold leading-[1.05] tracking-[-1.5px] md:text-[52px] md:tracking-[-2px]"
            >
              {t.proofTitle1} <span className={serif}>{t.proofTitle2}</span>
            </h2>
            <p className="text-[17px] leading-relaxed text-[#5c5c57]">
              {t.proofText}
            </p>
            <dl className="flex flex-col gap-4">
              {t.proofPoints.map((p) => (
                <div key={p.title}>
                  <dt className="text-[17px] font-semibold">{p.title}</dt>
                  <dd className="mt-1 text-[15px] leading-relaxed text-[#5c5c57]">
                    {p.text}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          {receipt && (
            <div className="v-card-raised min-w-0 flex-[1_1_360px] p-7 text-sm leading-[2.1]">
              <p className="mb-2 text-[13px] text-[#7a7a75]">{t.receipt}</p>
              {[
                [
                  t.receiptHour,
                  `${f.day(receipt.periodStart)} ${f.time(receipt.periodStart)}–${f.time(receipt.periodEnd)}`,
                ],
                [t.receiptCommunity, d.community.name],
                [t.receiptTrades, String(receipt.trades)],
                [t.receiptTotal, f.eur(receipt.paidEur)],
                [
                  t.receiptHash,
                  `${receipt.hash.slice(0, 6)}…${receipt.hash.slice(-4)}`,
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-4 border-b border-[#f0f0ec]"
                >
                  <span className="text-[#7a7a75]">{k}</span>
                  <span className="truncate font-mono">{v}</span>
                </div>
              ))}
              <p className="mt-4 flex items-center gap-2 font-medium text-[#15803d]">
                <span
                  aria-hidden
                  className="h-[7px] w-[7px] rounded-full bg-[#16a34a]"
                />
                {t.receiptOk}
              </p>
              <Link
                href={`/verify/${receipt.batchId}`}
                className="font-medium underline-offset-2 hover:underline"
              >
                {t.receiptCheck}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Pilot request for Stadtwerke. */}
      <section
        id="stadtwerke"
        aria-labelledby="pilot-title"
        className="relative overflow-hidden px-6 py-24"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[1100px] -translate-x-1/2 -translate-y-1/2 blur-[40px]"
          style={{
            background:
              "radial-gradient(closest-side at 35% 50%, rgba(255,178,122,0.4), rgba(255,178,122,0) 70%), radial-gradient(closest-side at 65% 50%, rgba(150,190,255,0.4), rgba(150,190,255,0) 70%)",
          }}
        />
        <div className="relative mx-auto flex max-w-[1000px] flex-wrap items-center gap-12 rounded-[28px] border border-[#ecece8] bg-white/80 p-8 shadow-[0_40px_90px_-40px_rgba(17,17,17,0.3)] backdrop-blur-[10px] md:p-14">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
            <p className="v-eyebrow">{t.pilotEyebrow}</p>
            <h2
              id="pilot-title"
              className="text-[32px] font-semibold leading-[1.06] tracking-[-1.4px] md:text-[44px]"
            >
              {t.pilotTitle1} <span className={serif}>{t.pilotTitle2}</span>
            </h2>
            <p className="text-[17px] leading-relaxed text-[#5c5c57]">
              {t.pilotText}
            </p>
          </div>
          {params.pilot === "1" ? (
            <p
              role="status"
              className="v-pill v-pill-ok flex-[1_1_340px] justify-center px-5 py-4 text-sm"
            >
              <Icon name="console" /> {t.pilotThanks}
            </p>
          ) : (
            <form
              action={requestPilot}
              className="flex min-w-0 flex-[1_1_340px] flex-col gap-3"
            >
              {[
                ["name", t.pilotName, "text"],
                ["organisation", t.pilotOrg, "text"],
                ["email", t.pilotEmail, "email"],
              ].map(([name, label, type]) => (
                <label key={name} className="text-[13px] text-[#5c5c57]">
                  {label}
                  <input
                    name={name}
                    type={type}
                    required
                    className="v-input w-full"
                  />
                </label>
              ))}
              <button type="submit" className="v-btn mt-1">
                {t.pilotSend}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

// A faithful miniature of the app's overview, under the hero: sidebar, header, key figures and the
// live street map with this quarter-hour's flows, plus two floating cards.
// The four agents' icons and tints, in the order of the messages.
const AGENT_TINTS = ["#fff1e4", "#fde8ef", "#fff6d6", "#e8edff"];
const AGENT_ICONS = [
  // forecast: sun behind a cloud
  <g key="f">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M9 2.5v1.2M3.5 8H2.3M4.8 3.8l.9.9M13.2 3.8l-.9.9" />
    <path d="M7.5 19.5h9a3.5 3.5 0 0 0 .3-7 4.5 4.5 0 0 0-8.6 1.2A2.9 2.9 0 0 0 7.5 19.5z" />
  </g>,
  // matching: two arrows trading places
  <g key="m">
    <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
  </g>,
  // sun agent: a battery with a bolt
  <g key="s">
    <rect x="3" y="7" width="16" height="10" rx="2" />
    <path d="M21 10.5v3M11.5 9l-2 3.2h3L10.5 15" />
  </g>,
  // payment: a euro sign in a coin
  <g key="p">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M15 8.6a4 4 0 1 0 0 6.8M7.5 11h5M7.5 13.2h5" />
  </g>,
];

// "A sunny day, handled": the sun's arc over the day and what the agents do along it.
function SunDay(props: {
  title: string;
  note: string;
  events: readonly { time: string; text: string }[];
}) {
  const START = 5;
  const END = 24;
  const RISE = 7;
  const SET = 20;
  const hours = (t: string) =>
    Number(t.slice(0, 2)) + Number(t.slice(3, 5)) / 60;
  const x = (h: number) => ((h - START) / (END - START)) * 1000;
  const y = (h: number) =>
    h <= RISE || h >= SET
      ? 150
      : 150 - Math.sin((Math.PI * (h - RISE)) / (SET - RISE)) * 120;
  const arc = Array.from({ length: 61 }, (_, i) => {
    const h = RISE + ((SET - RISE) * i) / 60;
    return `${i ? "L" : "M"}${x(h).toFixed(1)},${y(h).toFixed(1)}`;
  }).join(" ");
  return (
    <div className="mt-6 rounded-[22px] border border-[#f0f0ec] bg-[#fafaf8] p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold tracking-tight">{props.title}</h3>
        <p className="text-xs text-[#9a9a95]">{props.note}</p>
      </div>
      <svg
        viewBox="0 0 1000 170"
        className="mt-4 hidden w-full md:block"
        aria-hidden
      >
        <defs>
          <linearGradient id="sunday-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFB27A" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFB27A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="150" x2="1000" y2="150" stroke="#e3e3de" />
        <path
          d={`${arc} L${x(SET)},150 L${x(RISE)},150 Z`}
          fill="url(#sunday-fill)"
        />
        <path d={arc} fill="none" stroke="#ff9a4d" strokeWidth="2" />
        {props.events.map((e, i) => {
          const h = hours(e.time);
          return (
            <g key={e.time}>
              <line
                x1={x(h)}
                y1={y(h)}
                x2={x(h)}
                y2="150"
                stroke="#d6d5cf"
                strokeDasharray="3 3"
              />
              <circle
                cx={x(h)}
                cy={y(h)}
                r="11"
                fill="#111111"
                stroke="#fafaf8"
                strokeWidth="3"
              />
              <text
                x={x(h)}
                y={y(h) + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#ffffff"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-6 md:gap-3">
        {props.events.map((e, i) => (
          <li key={e.time} className="md:text-center">
            <p className="flex items-center gap-2 font-mono text-[13px] text-[#5c5c57] md:justify-center">
              <span
                aria-hidden
                className="grid h-5 w-5 place-items-center rounded-full bg-[#111111] font-sans text-[11px] font-semibold text-white"
              >
                {i + 1}
              </span>
              {e.time}
            </p>
            <p className="mt-1 text-sm leading-snug text-[#111111]">{e.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProductPreview(props: {
  t: Awaited<ReturnType<typeof getI18n>>["m"]["landing"];
  stats: { label: string; value: string }[];
  flows: { from: string; to: string; kwh: number }[];
  kwh: (x: number) => string;
  paid: { amount: string; when: string } | null;
  community: string;
}) {
  const { t } = props;
  return (
    <div className="relative z-[1] mx-auto mt-16 max-w-[1180px]">
      <div className="rounded-[22px] border border-white/90 bg-white/60 p-2.5 shadow-[0_50px_100px_-40px_rgba(60,40,30,0.35)] backdrop-blur-[8px]">
        <div className="overflow-hidden rounded-[14px] border border-[#ecece8] bg-[#fbfbf9]">
          <div className="flex items-center gap-3.5 border-b border-[#f0f0ec] bg-white px-3.5 py-2.5">
            <span aria-hidden className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e6e6e1]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e6e6e1]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e6e6e1]" />
            </span>
            <span className="flex-1 text-center font-mono text-xs text-[#9a9a95]">
              app.volty.energy
            </span>
          </div>
          <div className="flex text-left">
            <div
              aria-hidden
              className="hidden w-[190px] shrink-0 flex-col gap-1 border-r border-[#f0f0ec] bg-white p-3 text-xs text-[#5c5c57] md:flex"
            >
              <span className="rounded-[9px] bg-[#f4f4f1] px-2.5 py-2 font-semibold text-[#111111]">
                Selling
              </span>
              <span className="px-2.5 py-2">Buying</span>
              <span className="px-2.5 py-2">AI agent</span>
              <span className="px-2.5 py-2">Statements</span>
              <span className="mt-3 px-2.5 text-[9px] uppercase tracking-[0.6px] text-[#9a9a95]">
                Community
              </span>
              <span className="px-2.5 py-2">Solar Now, Pay Never</span>
              <span className="px-2.5 py-2">Live map</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3.5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <p className="text-xs text-[#7a7a75]">{props.community}</p>
                  <p className="mt-0.5 text-2xl font-semibold tracking-[-0.9px]">
                    {t.previewTitle}
                  </p>
                </div>
                <span className="flex items-center gap-2 rounded-full border border-[#ecece8] bg-white px-3 py-1.5 text-xs text-[#4a4a46]">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-[#ff7a1a]"
                  />
                  {t.previewLive}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {props.stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-[14px] border border-[#f0f0ec] bg-white px-3.5 py-3"
                  >
                    <p className="text-[11px] text-[#7a7a75]">{s.label}</p>
                    <p className="mt-1 text-xl font-semibold tracking-[-0.8px] tabular-nums">
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex min-w-0 flex-[2_1_0] flex-col gap-2.5 rounded-2xl border border-[#f0f0ec] bg-white p-3.5">
                  <span className="text-sm font-semibold">{t.previewMap}</span>
                  <div className="overflow-hidden rounded-xl border border-[#f0f0ec]">
                    <FlatStreetMap label={t.previewMapLabel} />
                  </div>
                </div>
                <div className="hidden min-w-0 flex-[1_1_0] flex-col gap-0.5 rounded-2xl border border-[#f0f0ec] bg-white p-3.5 text-xs md:flex">
                  <span className="mb-2 text-sm font-semibold">
                    {t.previewFlows}
                  </span>
                  {props.flows.slice(0, 6).map((fl, i) => (
                    <span
                      key={`${fl.from}-${fl.to}`}
                      className={`flex justify-between gap-2 rounded-lg px-2 py-1.5 ${i === 0 ? "bg-[#fff4ec] font-medium" : ""}`}
                    >
                      <span className="min-w-0 truncate">
                        {fl.from.split(" ")[0]} → {fl.to.split(" ")[0]}
                      </span>
                      <span
                        className={`shrink-0 font-mono ${i === 0 ? "text-[#c2410c]" : "text-[#7a7a75]"}`}
                      >
                        {props.kwh(fl.kwh)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {props.paid && (
        <div className="absolute -left-7 bottom-11 hidden w-[280px] rounded-2xl border border-[#ecece8] bg-white p-4 text-left shadow-[0_24px_50px_-20px_rgba(17,17,17,0.25)] lg:block">
          <p className="text-xs text-[#7a7a75]">
            {t.floatPaid} · {props.paid.when}
          </p>
          <p className="mb-1 mt-1.5 text-lg font-semibold tracking-[-0.3px]">
            +{props.paid.amount}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-[#15803d]">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[#16a34a]"
            />
            {t.floatPaidSub}
          </p>
        </div>
      )}
      <div className="absolute -right-7 top-32 hidden w-[260px] rounded-2xl bg-[#111111] p-4 text-left text-white shadow-[0_24px_50px_-20px_rgba(17,17,17,0.45)] lg:block">
        <p className="text-xs text-[#ffb27a]">{t.floatAgent}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[#e9e9e4]">
          {t.floatAgentText}
        </p>
      </div>
    </div>
  );
}
