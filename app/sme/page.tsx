import Link from "next/link";
import { ProfileChart } from "@/components/sme/ProfileChart";
import { StatTile } from "@/components/StatTile";
import { isAdmin, viewedMemberId } from "@/lib/auth/policy";
import { requireMember } from "@/lib/auth/session";
import { PRICES } from "@/lib/config";
import { getSmeDashboard, smePersonas } from "@/lib/dashboard/sme";
import { getI18n } from "@/lib/i18n/server";
import { SME_LIMITS, SME_RECHECK_MS } from "@/lib/sme";
import { createAnchor, saveAnchor, saveBusinessProfile } from "./actions";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-4 dark:border-white/15";
const input = "mt-1 block w-36 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20";

export default async function SmePage({ searchParams }: PageProps<"/sme">) {
  const me = await requireMember("/sme");
  const { m, f } = await getI18n();
  const t = m.sme;
  const pct = f.pct;
  const params = await searchParams;
  const personas = isAdmin(me) ? smePersonas() : [];
  const as = viewedMemberId(me, typeof params.as === "string" ? params.as : personas[0]?.id);
  const at = typeof params.at === "string" ? params.at : undefined;
  const d = me.kind === "sme" || isAdmin(me) ? getSmeDashboard(as, at) : null;

  if (!d) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="mt-2 text-sm">{t.notBusiness}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">{d.member.name}</h1>
        {d.asOf && (
          <p className="text-sm opacity-70">
            {m.common.asOf(f.day(d.asOf), f.time(d.asOf))} · {t.businessWorkspace}
          </p>
        )}
      </div>
      {personas.length > 1 && (
        <nav className="mt-3 flex flex-wrap gap-2 text-sm">
          {personas.map((p) => (
            <Link key={p.id} href={{ pathname: "/sme", query: { as: p.id } }} className="rounded-full border px-3 py-1">
              {p.name}
            </Link>
          ))}
        </nav>
      )}

      {(() => {
        // FR-SME-01: whether this business takes part right now, and until when the check holds.
        const status = d.smeStatus;
        const tone = status === "eligible" ? "border-green-600/40" : "border-amber-500/50";
        return (
          <p role="status" className={`mt-4 rounded-md border p-3 text-sm ${tone}`}>
            {status === "eligible" ? t.status.eligible(f.date(d.profile!.checkedAt + SME_RECHECK_MS)) : t.status[status]}
          </p>
        );
      })()}

      {!d.site && (
        <p className="mt-4 rounded-md border border-black/10 p-3 text-sm dark:border-white/15">
          {t.noMeter.before}{" "}
          <Link href="/site" className="text-blue-700 underline dark:text-blue-400">
            {t.noMeter.link}
          </Link>{" "}
          {t.noMeter.after}
        </p>
      )}

      {"today" in d && d.today && (
        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            label={t.tiles.anchorToday}
            value={f.kwh(d.today.anchorKwh)}
            sub={d.anchor ? t.tiles.capUsed(pct(d.today.capUsed), f.int(d.anchor.maxKwhPerDay)) : t.tiles.noAnchor}
          />
          <StatTile
            label={t.tiles.localShare(f.monthName(d.asOf!))}
            value={pct(d.month.localShare)}
            sub={t.tiles.fromNeighbours(f.kwh(d.month.sharedKwh))}
          />
          <StatTile label={t.tiles.saved(f.monthName(d.asOf!))} value={f.eur(d.month.savedEur)} sub={t.tiles.savedSub(String(PRICES.gridCt))} />
          <StatTile label={t.tiles.co2} value={`${f.int(d.month.co2Kg)} kg`} sub={t.tiles.co2Sub} />
        </section>
      )}

      {"profileByHour" in d && d.profileByHour && (
        <section className={`mt-6 ${card}`}>
          <h2 className="font-semibold">{t.profileTitle}</h2>
          <p className="mt-1 text-xs opacity-70">{t.profileNote}</p>
          <div className="mt-3">
            <ProfileChart points={d.profileByHour} businessName={d.member.name} />
          </div>
        </section>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className={card}>
          <h2 className="font-semibold">{t.eligibility}</h2>
          <p className="mt-1 text-xs opacity-70">{t.eligibilityNote(f.int(SME_LIMITS.staff))}</p>
          {d.check && (
            <p className={`mt-3 text-sm font-medium ${d.check.eligible ? "text-green-700 dark:text-green-500" : "text-red-700 dark:text-red-400"}`}>
              {d.check.eligible ? t.eligible : t.notEligible}
              {!d.check.eligible && (
                <span className="block font-normal">
                  {d.check.reasons
                    .map((r) => (r.code === "staff" ? t.reasons.staff(f.int(SME_LIMITS.staff), f.int(r.staff)) : t.reasons.financials))
                    .join(" ")}
                </span>
              )}
            </p>
          )}
          <form action={saveBusinessProfile} className="mt-3 space-y-2 text-sm">
            <input type="hidden" name="memberId" value={d.member.id} />
            <label className="block">
              <span className="text-xs opacity-70">{t.staff}</span>
              <input type="number" name="staff" min={0} defaultValue={d.profile?.staff ?? ""} className={input} />
            </label>
            <label className="block">
              <span className="text-xs opacity-70">{t.turnover}</span>
              <input type="number" name="turnoverEur" min={0} defaultValue={d.profile?.turnoverEur ?? ""} className={input} />
            </label>
            <label className="block">
              <span className="text-xs opacity-70">{t.balanceSheet}</span>
              <input type="number" name="balanceSheetEur" min={0} defaultValue={d.profile?.balanceSheetEur ?? ""} className={input} />
            </label>
            <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
              {t.checkAndSave}
            </button>
            <p className="text-xs opacity-70">{t.checkNote}</p>
          </form>
        </section>

        <section className={card}>
          <h2 className="font-semibold">{t.anchor}</h2>
          {d.anchor ? (
            <>
              <p className="mt-1 text-sm">
                {t.anchorSummary(
                  d.anchor.weekdaysOnly ? t.weekdays : t.everyDay,
                  d.anchor.from,
                  d.anchor.to,
                  f.int(d.anchor.maxKwhPerDay),
                  String(d.anchor.priceCt),
                )}
              </p>
              <form action={saveAnchor} className="mt-3 space-y-2 text-sm">
                <input type="hidden" name="anchorId" value={d.anchor.id} />
                <div className="flex flex-wrap gap-4">
                  <label className="block">
                    <span className="text-xs opacity-70">{t.from}</span>
                    <input type="time" name="from" step={900} defaultValue={d.anchor.from} className={input} />
                  </label>
                  <label className="block">
                    <span className="text-xs opacity-70">{t.to}</span>
                    <input type="time" name="to" step={900} defaultValue={d.anchor.to} className={input} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="block">
                    <span className="text-xs opacity-70">{t.dailyCap}</span>
                    <input type="number" name="maxKwhPerDay" min={1} step={1} defaultValue={d.anchor.maxKwhPerDay} className={input} />
                  </label>
                  <label className="block">
                    <span className="text-xs opacity-70">{t.price(String(PRICES.feedInCt), String(PRICES.gridCt))}</span>
                    <input
                      type="number"
                      name="priceCt"
                      min={PRICES.feedInCt}
                      max={PRICES.gridCt}
                      step={0.5}
                      defaultValue={d.anchor.priceCt}
                      className={input}
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="weekdaysOnly" defaultChecked={d.anchor.weekdaysOnly} />
                  {t.weekdaysOnly}
                </label>
                <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
                  {t.saveAgreement}
                </button>
                <p className="text-xs opacity-70">{m.common.rulesApplyFromNow}</p>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm opacity-70">{t.noAnchorYet}</p>
              <form action={createAnchor} className="mt-3 space-y-2 text-sm">
                <input type="hidden" name="memberId" value={d.member.id} />
                <div className="flex flex-wrap gap-4">
                  <label className="block">
                    <span className="text-xs opacity-70">{t.from}</span>
                    <input type="time" name="from" step={900} defaultValue="10:00" className={input} />
                  </label>
                  <label className="block">
                    <span className="text-xs opacity-70">{t.to}</span>
                    <input type="time" name="to" step={900} defaultValue="16:00" className={input} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="block">
                    <span className="text-xs opacity-70">{t.dailyCap}</span>
                    <input type="number" name="maxKwhPerDay" min={1} step={1} defaultValue={40} className={input} />
                  </label>
                  <label className="block">
                    <span className="text-xs opacity-70">{t.price(String(PRICES.feedInCt), String(PRICES.gridCt))}</span>
                    <input
                      type="number"
                      name="priceCt"
                      min={PRICES.feedInCt}
                      max={PRICES.gridCt}
                      step={0.5}
                      defaultValue={PRICES.communityCt - 3}
                      className={input}
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="weekdaysOnly" defaultChecked />
                  {t.weekdaysOnly}
                </label>
                <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
                  {t.createAgreement}
                </button>
                <p className="text-xs opacity-70">{t.anchorWhileEligible}</p>
              </form>
            </>
          )}
        </section>
      </div>

      {"history" in d && d.history && d.history.length > 0 && (
        <section className={`mt-4 ${card}`}>
          <h2 className="font-semibold">{t.history(f.monthName(d.asOf!))}</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="kw-table w-full text-sm">
              <thead className="text-left text-xs opacity-70">
                <tr>
                  <th className="py-1 font-normal">{t.historyTable.day}</th>
                  <th className="py-1 text-right font-normal">{t.historyTable.anchor}</th>
                  <th className="py-1 text-right font-normal">{t.historyTable.capUsed}</th>
                  <th className="py-1 text-right font-normal">{t.historyTable.other}</th>
                  <th className="py-1 text-right font-normal">{t.historyTable.total}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {d.history.map((h) => (
                  <tr key={h.dateKey} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-1">{f.day(h.dayStart)}</td>
                    <td className="py-1 text-right">{f.num(h.anchorKwh)}</td>
                    <td className="py-1 text-right">{d.anchor ? pct(h.anchorKwh / d.anchor.maxKwhPerDay) : "–"}</td>
                    <td className="py-1 text-right">{f.num(h.otherKwh)}</td>
                    <td className="py-1 text-right">{f.num(h.importKwh)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.ownSolar}</h2>
        <p className="mt-1 text-sm opacity-80">{t.ownSolarText}</p>
      </section>
    </main>
  );
}
