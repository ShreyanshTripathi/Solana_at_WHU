import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { Volty } from "@/components/brand/Volty";
import { AgentChat, ExplainPanel } from "@/components/agent/AgentChat";
import {
  AccuracyChart,
  PriceForecastChart,
} from "@/components/agent/AgentCharts";
import { SolarPredictor } from "@/components/agent/SolarPredictor";
import { getAgentInsights } from "@/lib/dashboard/agentInsights";
import { getAgentDay } from "@/lib/dashboard/agentDay";
import { agentSettingsOf, recentDecisions } from "@/lib/agents/run";
import { ruleContext } from "@/lib/ai/agent";
import { modelStatus } from "@/lib/ai/ollama";
import { requireMember } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { decisionText } from "@/lib/i18n/text";
import { saveAgentSwitches } from "./actions";

export const dynamic = "force-dynamic";

const card = "v-card p-6";

const TINTS = ["#fff1e4", "#fde8ef", "#fff6d6", "#e8edff"];

export default async function AgentPage() {
  const member = await requireMember("/agent");
  const { m, f } = await getI18n();
  const t = m.agent;
  const site = db
    .select()
    .from(schema.sites)
    .where(
      and(eq(schema.sites.memberId, member.id), isNull(schema.sites.closedAt)),
    )
    .get();

  if (!site) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-8 md:px-8">
        <h1 className="v-h1">{t.title}</h1>
        <p className={`mt-4 text-sm ${card}`}>{t.noSite}</p>
      </main>
    );
  }

  const settings = agentSettingsOf(member.id);
  const decisions = recentDecisions(member.id, 25);
  const status = await modelStatus();
  const day = getAgentDay(member.id, site);
  const insights = day ? getAgentInsights(member.id, site, day.asOf) : null;
  const kwh = (x: number) => f.kwh(x, x < 10 ? 1 : 0);
  // What each agent looked at, decided and achieved today, as card rows.
  const agentCards = (d: NonNullable<typeof day>) => {
    const fc = d.forecast;
    const sol = fc.today.kwh;
    const dd = t.day;
    const mt = d.matching;
    const sun = d.sun;
    const pay = d.payments;
    return [
      {
        name: dd.forecast.name,
        role: dd.forecast.role,
        rows: [
          {
            label: dd.saw,
            lines: [
              fc.learned
                ? dd.forecast.sawLearned(fc.daysUsed)
                : dd.forecast.sawFixed(fc.daysUsed),
              ...(d.hasSolar ? [] : [dd.forecast.roofs(fc.roofCount)]),
            ],
          },
          {
            label: dd.decided,
            lines: [
              (d.hasSolar
                ? dd.forecast.decidedSolar
                : dd.forecast.decidedStreet)(
                kwh(sol.p50),
                kwh(sol.p10),
                kwh(sol.p90),
              ),
              dd.forecast.decidedUse(kwh(fc.expectedUseKwh)),
            ],
          },
          {
            label: dd.result,
            lines: [
              fc.accuracy
                ? dd.forecast.accuracy(
                    f.pct(fc.accuracy.learnedPct),
                    f.pct(fc.accuracy.baselinePct),
                  )
                : dd.forecast.noAccuracy,
            ],
          },
        ],
      },
      {
        name: dd.matching.name,
        role: dd.matching.role,
        rows:
          mt.intervals === 0
            ? [{ label: dd.result, lines: [dd.matching.nothing] }]
            : [
                { label: dd.saw, lines: [dd.matching.saw(mt.intervals)] },
                {
                  label: dd.decided,
                  lines: [
                    ...(mt.boughtKwh > 0
                      ? [dd.matching.bought(kwh(mt.boughtKwh), mt.sellers)]
                      : []),
                    ...(mt.topSeller && mt.sellers > 1
                      ? [dd.matching.top(mt.topSeller)]
                      : []),
                    ...(mt.soldKwh > 0
                      ? [dd.matching.sold(kwh(mt.soldKwh), mt.buyers)]
                      : []),
                  ],
                },
                ...(mt.boughtKwh > 0
                  ? [
                      {
                        label: dd.result,
                        lines: [dd.matching.share(f.pct(mt.localShare))],
                      },
                    ]
                  : []),
              ],
      },
      {
        name: dd.sun.name,
        role: dd.sun.role,
        rows:
          !sun.hasBattery && !sun.hasEv
            ? [{ label: dd.result, lines: [dd.sun.noDevices] }]
            : sun.decisions === 0 && !sun.ev
              ? [{ label: dd.result, lines: [dd.sun.idle] }]
              : [
                  ...(sun.decisions > 0
                    ? [
                        {
                          label: dd.saw,
                          lines: [dd.sun.battery(sun.decisions)],
                        },
                        {
                          label: dd.decided,
                          lines: [
                            dd.sun.keptSold(sun.kept, sun.sold),
                            ...(sun.latestBattery
                              ? [decisionText(sun.latestBattery, m, f)]
                              : []),
                          ],
                        },
                      ]
                    : []),
                  ...(sun.ev
                    ? [
                        {
                          label: sun.decisions > 0 ? dd.result : dd.decided,
                          lines: [
                            decisionText(sun.ev, m, f),
                            ...(Number(sun.ev.params.asapCostEur) >
                            Number(sun.ev.params.plannedCostEur)
                              ? [
                                  dd.sun.evSaved(
                                    f.eur(
                                      Number(sun.ev.params.asapCostEur) -
                                        Number(sun.ev.params.plannedCostEur),
                                    ),
                                  ),
                                ]
                              : []),
                          ],
                        },
                      ]
                    : []),
                ],
      },
      {
        name: dd.pay.name,
        role: dd.pay.role,
        rows:
          pay.paidEur === 0 && pay.earnedEur === 0
            ? [{ label: dd.result, lines: [dd.pay.nothing] }]
            : [
                {
                  label: dd.decided,
                  lines: [
                    ...(pay.paidEur > 0
                      ? [dd.pay.paid(f.eur(pay.paidEur), pay.paidHours)]
                      : []),
                    ...(pay.earnedEur > 0
                      ? [dd.pay.earned(f.eur(pay.earnedEur), pay.earnedHours)]
                      : []),
                  ],
                },
                {
                  label: dd.result,
                  lines: [
                    ...(pay.pendingEur > 0
                      ? [dd.pay.pending(f.eur(pay.pendingEur))]
                      : []),
                    ...(pay.suggestion
                      ? [dd.pay.limit(f.eur(pay.suggestion.limitEur, 0))]
                      : []),
                  ],
                },
              ].filter((r) => r.lines.length > 0),
      },
    ];
  };
  const neighbours = Object.fromEntries(
    ruleContext(member.id).neighbours.map((n) => [n.id, n.name]),
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 md:px-8">
      <h1 className="v-h1 flex items-center gap-3">
        <Volty size={44} />
        {t.title}
      </h1>
      <p className="mt-1 text-sm opacity-70">
        {member.name} · {t.intro}
      </p>

      {day && (
        <>
          <section className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                {t.day.title}
              </h2>
              <p className="text-xs text-[#7a7a75]">
                {t.day.note(`${f.day(day.asOf)} ${f.time(day.asOf)}`)}
              </p>
            </div>
            <ol className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {agentCards(day).map((a, i) => (
                <li key={a.name} className="v-card flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-semibold"
                      style={{ background: TINTS[i] }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-[#7a7a75]">{a.role}</p>
                      <h3 className="font-semibold leading-tight">{a.name}</h3>
                    </div>
                  </div>
                  <dl className="space-y-2.5 text-sm">
                    {a.rows.map((r) => (
                      <div key={r.label}>
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-[#9a9a95]">
                          {r.label}
                        </dt>
                        {r.lines.map((line) => (
                          <dd
                            key={line}
                            className="leading-snug text-[#3a3a37]"
                          >
                            {line}
                          </dd>
                        ))}
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ol>
          </section>

          <section className={`mt-4 ${card}`}>
            <h2 className="text-lg font-semibold tracking-tight">
              {t.sun.title}
            </h2>
            <p className="mt-1 mb-4 text-sm text-[#7a7a75]">
              {day.hasSolar
                ? t.sun.noteOwn
                : t.sun.noteStreet(day.forecast.roofCount)}
            </p>
            <SolarPredictor
              today={day.forecast.today}
              tomorrow={day.forecast.tomorrow}
              asOf={day.asOf}
            />
          </section>

          {insights && (
            <>
              <section className={`mt-4 ${card}`}>
                <h2 className="text-lg font-semibold tracking-tight">
                  {t.timeline.title}
                </h2>
                <p className="mt-1 text-sm text-[#7a7a75]">{t.timeline.note}</p>
                <Timeline
                  insights={insights}
                  dayStart={day.forecast.today.points[0].ts}
                />
              </section>

              <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
                <section className={card}>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {t.prices.title}
                  </h2>
                  <p className="mt-1 mb-4 text-sm text-[#7a7a75]">
                    {t.prices.note}
                  </p>
                  {insights.prices.auction ? (
                    <PriceForecastChart
                      past={insights.prices.past}
                      forecast={insights.prices.forecast}
                      asOf={day.asOf}
                    />
                  ) : (
                    <p className="text-sm">
                      {t.prices.fixed(f.ct(insights.prices.fixedCt))}
                    </p>
                  )}
                </section>

                <section className={card}>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {t.suppliers.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#7a7a75]">
                    {t.suppliers.note}
                  </p>
                  {!insights.suppliers ||
                  insights.suppliers.ranked.length === 0 ? (
                    <p className="mt-4 text-sm">{t.suppliers.empty}</p>
                  ) : (
                    <>
                      {insights.suppliers.pick && (
                        <p className="mt-4 inline-flex rounded-full bg-[#111111] px-3.5 py-1.5 text-sm font-medium text-white">
                          {t.suppliers.pick(insights.suppliers.pick.name)}
                        </p>
                      )}
                      <ol className="mt-4 space-y-3">
                        {insights.suppliers.ranked.map((r, i) => (
                          <li
                            key={r.name}
                            className="rounded-xl border border-black/5 bg-[#fafaf8] p-3.5"
                          >
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="font-medium">
                                {i + 1}. {r.name}
                                {r.preferred && (
                                  <span className="ml-2 text-xs text-[#15803d]">
                                    {t.suppliers.preferred}
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-[13px] text-[#5c5c57]">
                                {f.ct(r.priceCt)}
                              </span>
                            </div>
                            <div
                              className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ecebe6]"
                              aria-hidden
                            >
                              <div
                                className="h-full rounded-full bg-[#ff7a1a]"
                                style={{
                                  width: `${Math.round(Math.min(1, r.score) * 100)}%`,
                                }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-[#5c5c57]">
                              {t.suppliers.likely(kwh(r.likelyKwh))} ·{" "}
                              {t.suppliers.reliable(f.pct(r.reliability))} ·{" "}
                              {t.suppliers.distance(
                                r.distanceM >= 1000
                                  ? `${f.num(r.distanceM / 1000, 1)} km`
                                  : `${f.int(r.distanceM)} m`,
                              )}
                            </p>
                          </li>
                        ))}
                      </ol>
                      {insights.suppliers.next?.main &&
                        insights.suppliers.next.backup && (
                          <p className="mt-3 text-sm text-[#3a3a37]">
                            {t.suppliers.next(
                              f.time(insights.suppliers.next.hourTs),
                              insights.suppliers.next.main,
                              insights.suppliers.next.backup,
                              f.pct(insights.suppliers.next.backupPct ?? 0),
                            )}
                          </p>
                        )}
                    </>
                  )}
                </section>
              </div>

              <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
                <section className={card}>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {t.earned.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#7a7a75]">{t.earned.note}</p>
                  {!site.batteryKwh && !site.evChargerKw ? (
                    <p className="mt-4 text-sm">{t.earned.none}</p>
                  ) : (
                    <>
                      <p className="mt-4 text-[34px] font-semibold tracking-tight">
                        {f.eur(
                          insights.month.evSavedEur +
                            (insights.month.battery?.gainEur ?? 0),
                        )}
                        <span className="ml-2 text-sm font-normal text-[#7a7a75]">
                          {t.earned.total}
                        </span>
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-[#3a3a37]">
                        {site.batteryKwh > 0 && (
                          <li>
                            {insights.month.battery
                              ? t.earned.battery(
                                  f.eur(insights.month.battery.gainEur),
                                  kwh(insights.month.battery.eveningKwh),
                                  f.ct(
                                    Math.round(
                                      insights.month.battery.eveningCt * 10,
                                    ) / 10,
                                  ),
                                  f.ct(
                                    Math.round(
                                      insights.month.battery.middayCt * 10,
                                    ) / 10,
                                  ),
                                )
                              : t.earned.batteryNone}
                          </li>
                        )}
                        {site.evChargerKw > 0 && insights.month.evPlans > 0 && (
                          <li>
                            {insights.month.evSavedEur > 0
                              ? t.earned.ev(
                                  f.eur(insights.month.evSavedEur),
                                  insights.month.evPlans,
                                )
                              : t.earned.evNone(insights.month.evPlans)}
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </section>

                <section className={card}>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {t.accuracy.title}
                  </h2>
                  <p className="mt-1 mb-4 text-sm text-[#7a7a75]">
                    {t.accuracy.note}
                  </p>
                  {insights.accuracy.length < 2 ? (
                    <p className="text-sm">{t.accuracy.empty}</p>
                  ) : (
                    <>
                      <p className="mb-3 text-sm font-medium">
                        {t.accuracy.average(
                          insights.accuracy.length,
                          f.pct(
                            insights.accuracy.reduce(
                              (s, d) => s + d.learnedPct,
                              0,
                            ) / insights.accuracy.length,
                          ),
                          f.pct(
                            insights.accuracy.reduce(
                              (s, d) => s + d.baselinePct,
                              0,
                            ) / insights.accuracy.length,
                          ),
                        )}
                      </p>
                      <AccuracyChart days={insights.accuracy} />
                    </>
                  )}
                </section>
              </div>
            </>
          )}
        </>
      )}

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className={card}>
            <h2 className="font-semibold">{t.tell}</h2>
            <p className="mt-1 mb-3 text-sm opacity-70">{t.tellNote}</p>
            <AgentChat neighbours={neighbours} />
          </section>
          <section className={card}>
            <h2 className="font-semibold">{t.log}</h2>
            <p className="mt-1 text-sm opacity-70">{t.logNote}</p>
            {decisions.length === 0 ? (
              <p className="mt-3 text-sm">{t.nothingYet}</p>
            ) : (
              <>
                <div className="mt-3">
                  <ExplainPanel />
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {decisions.map((d) => (
                    <li
                      key={d.id}
                      className="flex gap-3 border-t border-black/5 pt-2 dark:border-white/10"
                    >
                      <span className="w-28 shrink-0 tabular-nums opacity-60">
                        {f.day(d.ts)} {f.time(d.ts)}
                      </span>
                      <span>{decisionText(d, m, f)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
          <section className={card}>
            <h2 className="font-semibold">{t.switches}</h2>
            <form action={saveAgentSwitches} className="mt-3 space-y-4 text-sm">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="smartBattery"
                  defaultChecked={settings?.smartBattery ?? false}
                  disabled={site.batteryKwh <= 0}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{t.smartBattery}</span>
                  <span className="block opacity-70">
                    {site.batteryKwh > 0 ? t.smartBatteryNote : t.noBattery}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="smartEv"
                  defaultChecked={settings?.smartEv ?? false}
                  disabled={site.evChargerKw <= 0}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{t.smartEv}</span>
                  <span className="block opacity-70">
                    {site.evChargerKw > 0 ? t.smartEvNote : t.noEv}
                  </span>
                </span>
              </label>
              {site.evChargerKw > 0 && (
                <label className="ml-7 flex items-center gap-2">
                  {t.readyBy}
                  <select
                    name="evReadyByHour"
                    defaultValue={settings?.evReadyByHour ?? 7}
                    className="rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
                  >
                    {[4, 5, 6, 7, 8, 9, 10].map((h) => (
                      <option key={h} value={h}>
                        {t.oclock(h)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="opacity-70">
                <span className="font-medium opacity-100">
                  {t.supplierPick}:{" "}
                </span>
                {t.supplierPickNote}
              </p>
              <button type="submit" className="v-btn">
                {m.common.save}
              </button>
            </form>
          </section>
          <section className="rounded-[18px] border border-dashed border-[#e3e3de] p-4 text-xs text-[#5c5c57]">
            <h2 className="font-semibold">{t.models.title}</h2>
            <ul className="mt-2 space-y-1">
              <li>
                {t.models.llm(status.model)}:{" "}
                {status.ok ? (
                  <span className="text-green-700 dark:text-green-400">
                    {t.models.ready}
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400">
                    {status.reason === "not_pulled"
                      ? t.models.notPulled(status.model)
                      : t.models.notRunning}
                  </span>
                )}
              </li>
              <li>{t.models.stt}</li>
              <li>{t.models.tts}</li>
            </ul>
            <p className="mt-2">{t.models.voiceNote}</p>
          </section>
        </div>
      </div>
    </main>
  );
}

const KIND_COLOR: Record<string, string> = {
  battery: "#ff7a1a",
  ev_plan: "#4f6bed",
  rules: "#7a7a75",
};
const kindOf = (kind: string) =>
  kind.startsWith("battery_") ? "battery" : kind;

// Today's decisions as dots on a 24-hour track, the car's charging as blue bars, then the list.
async function Timeline({
  insights,
  dayStart,
}: {
  insights: NonNullable<ReturnType<typeof getAgentInsights>>;
  dayStart: number;
}) {
  const { m, f } = await getI18n();
  const t = m.agent.timeline;
  const at = (ts: number) =>
    `${Math.min(100, Math.max(0, ((ts - dayStart) / 86_400_000) * 100))}%`;
  const { decisions, charging } = insights.timeline;
  const chargeKwh = charging.reduce((s, c) => s + c.kwh, 0);
  if (decisions.length === 0 && charging.length === 0)
    return <p className="mt-4 text-sm">{t.empty}</p>;
  const label = (kind: string) =>
    kind === "battery" ? t.battery : kind === "ev_plan" ? t.car : t.rules;
  return (
    <div className="mt-5">
      <div className="relative h-12 rounded-xl border border-black/5 bg-[#fafaf8]">
        {[3, 6, 9, 12, 15, 18, 21].map((h) => (
          <span
            key={h}
            aria-hidden
            className="absolute top-0 h-full border-l border-dashed border-[#e3e3de]"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}
        {charging.map((c) => (
          <span
            key={c.ts}
            aria-hidden
            className="absolute bottom-1.5 h-2 rounded-sm bg-[#4f6bed]/70"
            style={{ left: at(c.ts), width: `${(15 / 1440) * 100}%` }}
          />
        ))}
        {decisions.map((d) => (
          <span
            key={d.id}
            title={`${f.time(d.ts)} · ${decisionText(d, m, f)}`}
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
            style={{ left: at(d.ts), background: KIND_COLOR[kindOf(d.kind)] }}
          />
        ))}
      </div>
      <div
        className="mt-1 flex justify-between font-mono text-[11px] text-[#9a9a95]"
        aria-hidden
      >
        {["00:00", "06:00", "12:00", "18:00", "24:00"].map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>
      <ol className="mt-4 space-y-2 text-sm">
        {charging.length > 0 &&
          !decisions.some((d) => d.kind === "ev_plan") && (
            <li className="flex gap-3">
              <span className="w-14 shrink-0 font-mono text-[13px] text-[#5c5c57]">
                {f.time(charging[0].ts)}
              </span>
              <span className="flex items-baseline gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: KIND_COLOR.ev_plan }}
                  aria-hidden
                />
                {t.charging(
                  f.time(charging[0].ts),
                  f.time(charging[charging.length - 1].ts + 15 * 60_000),
                  f.kwh(chargeKwh, 1),
                )}
              </span>
            </li>
          )}
        {decisions.map((d) => (
          <li key={d.id} className="flex gap-3">
            <span className="w-14 shrink-0 font-mono text-[13px] text-[#5c5c57]">
              {f.time(d.ts)}
            </span>
            <span className="flex items-baseline gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: KIND_COLOR[kindOf(d.kind)] }}
                aria-hidden
              />
              <span>
                <span className="font-medium">{label(kindOf(d.kind))}:</span>{" "}
                {decisionText(d, m, f)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
