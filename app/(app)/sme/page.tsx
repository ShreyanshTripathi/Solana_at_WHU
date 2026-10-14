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

const card = "v-card p-5";
const tile = "rounded-xl border border-black/5 bg-[#fafaf8] p-3";

// "A, B and C".
const nameList = (names: string[], and: string) =>
  names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} ${and} ${names.at(-1)}`;

export default async function SmePage({ searchParams }: PageProps<"/sme">) {
  const me = await requireMember("/sme");
  const { m, f } = await getI18n();
  const t = m.sme;
  const pct = f.pct;
  const params = await searchParams;
  const personas = isAdmin(me) ? smePersonas() : [];
  const as = viewedMemberId(
    me,
    typeof params.as === "string" ? params.as : personas[0]?.id,
  );
  const at = typeof params.at === "string" ? params.at : undefined;
  const d = me.kind === "sme" || isAdmin(me) ? getSmeDashboard(as, at) : null;

  if (!d) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-8 md:px-8">
        <h1 className="v-h1">{t.title}</h1>
        <p className="mt-2 text-sm">{t.notBusiness}</p>
      </main>
    );
  }

  const info = "anchorInfo" in d ? d.anchorInfo : null;
  // The agreement's fields, for creating one and for changing it.
  const anchorFields = (a: {
    from: string;
    to: string;
    maxKwhPerDay: number;
    priceCt: number;
    weekdaysOnly: boolean;
  }) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-[#7a7a75]">{t.from}</span>
          <input
            type="time"
            name="from"
            step={900}
            defaultValue={a.from}
            className="v-input w-full"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a7a75]">{t.to}</span>
          <input
            type="time"
            name="to"
            step={900}
            defaultValue={a.to}
            className="v-input w-full"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a7a75]">{t.dailyCap}</span>
          <input
            type="number"
            name="maxKwhPerDay"
            min={1}
            step={1}
            defaultValue={a.maxKwhPerDay}
            className="v-input w-full"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a7a75]">
            {t.price(String(PRICES.feedInCt), String(PRICES.gridCt))}
          </span>
          <input
            type="number"
            name="priceCt"
            min={PRICES.feedInCt}
            max={PRICES.gridCt}
            step={0.5}
            defaultValue={a.priceCt}
            className="v-input w-full"
          />
        </label>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="weekdaysOnly"
          defaultChecked={a.weekdaysOnly}
        />
        {t.weekdaysOnly}
      </label>
    </>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="v-h1">{d.member.name}</h1>
        {d.asOf && (
          <p className="text-sm text-[#7a7a75]">
            {m.common.asOf(f.day(d.asOf), f.time(d.asOf))} ·{" "}
            {t.businessWorkspace}
          </p>
        )}
      </div>
      {personas.length > 1 && (
        <nav className="mt-3 flex flex-wrap gap-2 text-sm">
          {personas.map((p) => (
            <Link
              key={p.id}
              href={{ pathname: "/sme", query: { as: p.id } }}
              className="rounded-full border px-3 py-1"
            >
              {p.name}
            </Link>
          ))}
        </nav>
      )}

      {(() => {
        // FR-SME-01: whether this business takes part right now, and until when the check holds.
        const status = d.smeStatus;
        const tone =
          status === "eligible" ? "border-green-600/40" : "border-amber-500/50";
        return (
          <p
            role="status"
            className={`mt-4 rounded-md border p-3 text-sm ${tone}`}
          >
            {status === "eligible"
              ? t.status.eligible(f.date(d.profile!.checkedAt + SME_RECHECK_MS))
              : t.status[status]}
          </p>
        );
      })()}

      {!d.site && (
        <p className="mt-4 rounded-md border border-black/10 p-3 text-sm dark:border-white/15">
          {t.noMeter.before}{" "}
          <Link
            href="/site"
            className="text-blue-700 underline dark:text-blue-400"
          >
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
            sub={
              d.anchor
                ? t.tiles.capUsed(
                    pct(d.today.capUsed),
                    f.int(d.anchor.maxKwhPerDay),
                  )
                : t.tiles.noAnchor
            }
          />
          <StatTile
            label={t.tiles.localShare(f.monthName(d.asOf!))}
            value={pct(d.month.localShare)}
            sub={t.tiles.fromNeighbours(f.kwh(d.month.sharedKwh))}
          />
          <StatTile
            label={t.tiles.saved(f.monthName(d.asOf!))}
            value={f.eur(d.month.savedEur)}
            sub={t.tiles.savedSub(String(PRICES.gridCt))}
          />
          <StatTile
            label={t.tiles.co2}
            value={`${f.int(d.month.co2Kg)} kg`}
            sub={t.tiles.co2Sub}
          />
        </section>
      )}

      {"profileByHour" in d && d.profileByHour && (
        <section className={`mt-6 ${card}`}>
          <h2 className="font-semibold">{t.profileTitle}</h2>
          <p className="mt-1 text-xs opacity-70">{t.profileNote}</p>
          <div className="mt-3">
            <ProfileChart
              points={d.profileByHour}
              businessName={d.member.name}
            />
          </div>
        </section>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{t.anchor}</h2>
            {d.anchor && info && (
              <span className="v-pill v-pill-ok">
                {info.since
                  ? t.anchorActiveSince(f.dayMonth(info.since))
                  : t.anchorActive}
              </span>
            )}
          </div>
          {d.anchor ? (
            <>
              <p className="mt-2 text-sm text-[#5c5c57]">{t.anchorLead}</p>
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <div className={tile}>
                  <p className="text-xs text-[#7a7a75]">{t.anchorWindow}</p>
                  <p className="mt-1 text-[15px] font-semibold leading-snug">
                    {d.anchor.weekdaysOnly ? t.weekdays : t.everyDay}
                    <br />
                    {d.anchor.from}–{d.anchor.to}
                  </p>
                </div>
                <div className={tile}>
                  <p className="text-xs text-[#7a7a75]">{t.anchorUpTo}</p>
                  <p className="mt-1">
                    <span className="text-2xl font-semibold tracking-tight">
                      {f.int(d.anchor.maxKwhPerDay)}
                    </span>{" "}
                    <span className="text-xs text-[#7a7a75]">{t.perDay}</span>
                  </p>
                </div>
                <div className={tile}>
                  <p className="text-xs text-[#7a7a75]">{t.anchorPrice}</p>
                  <p className="mt-1">
                    <span className="text-2xl font-semibold tracking-tight">
                      {f.num(d.anchor.priceCt, d.anchor.priceCt % 1 ? 1 : 0)}
                    </span>{" "}
                    <span className="text-xs text-[#7a7a75]">ct/kWh</span>
                  </p>
                </div>
              </div>
              {info &&
                (info.suppliers.length > 0 || info.monthlySavedEur > 0) && (
                  <p className="mt-4 text-sm text-[#5c5c57]">
                    {info.suppliers.length > 0 &&
                      t.suppliedFirstBy(nameList(info.suppliers, t.and))}{" "}
                    {info.monthlySavedEur > 0 && (
                      <>
                        {t.savesAbout}{" "}
                        <strong className="font-semibold text-[#111111]">
                          {t.perMonth(
                            f.eur(Math.round(info.monthlySavedEur), 0),
                          )}
                        </strong>{" "}
                        {t.againstGrid}
                      </>
                    )}
                  </p>
                )}
              <details className="group mt-4">
                <summary className="v-btn-secondary inline-flex cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  {t.changeAgreement}
                </summary>
                <form action={saveAnchor} className="mt-4 space-y-3 text-sm">
                  <input type="hidden" name="anchorId" value={d.anchor.id} />
                  {anchorFields(d.anchor)}
                  <button type="submit" className="v-btn">
                    {t.saveAgreement}
                  </button>
                  <p className="text-xs text-[#7a7a75]">
                    {m.common.rulesApplyFromNow}
                  </p>
                </form>
              </details>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-[#5c5c57]">{t.noAnchorYet}</p>
              <form action={createAnchor} className="mt-4 space-y-3 text-sm">
                <input type="hidden" name="memberId" value={d.member.id} />
                {anchorFields({
                  from: "10:00",
                  to: "16:00",
                  maxKwhPerDay: 40,
                  priceCt: PRICES.communityCt - 3,
                  weekdaysOnly: true,
                })}
                <button type="submit" className="v-btn">
                  {t.createAgreement}
                </button>
                <p className="text-xs text-[#7a7a75]">
                  {t.anchorWhileEligible}
                </p>
              </form>
            </>
          )}
        </section>

        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {t.eligibility}
            </h2>
            {d.check && (
              <span
                className={
                  d.check.eligible
                    ? "v-pill v-pill-ok"
                    : "v-pill bg-[#fdecea] text-[#b42318]"
                }
              >
                {d.check.eligible ? t.eligible : t.notEligible}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-[#7a7a75]">
            {t.eligibilityNote(f.int(SME_LIMITS.staff))}
          </p>
          {d.check && !d.check.eligible && (
            <p className="mt-2 text-sm text-[#b42318]">
              {d.check.reasons
                .map((r) =>
                  r.code === "staff"
                    ? t.reasons.staff(f.int(SME_LIMITS.staff), f.int(r.staff))
                    : t.reasons.financials,
                )
                .join(" ")}
            </p>
          )}
          <form
            action={saveBusinessProfile}
            className="mt-4 space-y-2.5 text-sm"
          >
            <input type="hidden" name="memberId" value={d.member.id} />
            {(
              [
                ["staff", t.staff, d.profile?.staff],
                ["turnoverEur", t.turnover, d.profile?.turnoverEur],
                ["balanceSheetEur", t.balanceSheet, d.profile?.balanceSheetEur],
              ] as const
            ).map(([name, label, value]) => (
              <label
                key={name}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-[#3a3a37]">{label}</span>
                <input
                  type="number"
                  name={name}
                  min={0}
                  defaultValue={value ?? ""}
                  className="v-input mt-0 w-40 text-right tabular-nums"
                />
              </label>
            ))}
            <div className="pt-2">
              <button type="submit" className="v-btn">
                {t.checkAndSave}
              </button>
              <p className="mt-3 text-xs text-[#7a7a75]">{t.checkNote}</p>
            </div>
          </form>
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
                  <th className="py-1 text-right font-normal">
                    {t.historyTable.anchor}
                  </th>
                  <th className="py-1 text-right font-normal">
                    {t.historyTable.capUsed}
                  </th>
                  <th className="py-1 text-right font-normal">
                    {t.historyTable.other}
                  </th>
                  <th className="py-1 text-right font-normal">
                    {t.historyTable.total}
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {d.history.map((h) => (
                  <tr
                    key={h.dateKey}
                    className="border-t border-black/5 dark:border-white/10"
                  >
                    <td className="py-1">{f.day(h.dayStart)}</td>
                    <td className="py-1 text-right">{f.num(h.anchorKwh)}</td>
                    <td className="py-1 text-right">
                      {d.anchor
                        ? pct(h.anchorKwh / d.anchor.maxKwhPerDay)
                        : "–"}
                    </td>
                    <td className="py-1 text-right">{f.num(h.otherKwh)}</td>
                    <td className="py-1 text-right">{f.num(h.importKwh)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {d.site && d.site.pvKwp > 0 ? (
        <section className={`mt-4 ${card}`}>
          <h2 className="font-semibold">{t.ownSolar}</h2>
          <p className="mt-1 text-sm opacity-80">{t.ownSolarText}</p>
        </section>
      ) : (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-black/5 bg-gradient-to-r from-[#fff3ea] via-[#fdf1f3] to-[#eff1fd] p-7">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t.roofTitle}{" "}
              <span className="v-serif text-[1.15em] font-normal italic">
                {t.roofTitleSerif}
              </span>
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#3a3a37]">
              {t.roofText}
            </p>
            <p className="mt-2 text-xs text-[#7a7a75]">{t.ownSolarText}</p>
          </div>
          <Link href="/projects#start" className="v-btn">
            {t.roofCta}
          </Link>
        </section>
      )}
    </main>
  );
}
