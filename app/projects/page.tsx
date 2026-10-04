import Link from "next/link";
import { RoofOnChain } from "@/components/projects/RoofOnChain";
import { StatTile } from "@/components/StatTile";
import { BarList, TxLink } from "@/components/ui/kit";
import { isAdmin } from "@/lib/auth/policy";
import { getCurrentMember } from "@/lib/auth/session";
import { PRICES } from "@/lib/config";
import { getProjects, LIFECYCLE, projectFormChoices } from "@/lib/dashboard/projects";
import { expireFundingRounds, FUNDING_DAYS } from "@/lib/projects/funding";
import { getI18n } from "@/lib/i18n/server";
import { explorerTxUrl } from "@/lib/solana/wallets";
import { createProject, invest, markInstalled } from "./actions";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-4 dark:border-white/15";
const input = "mt-1 block w-36 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20";

function Progress({ value }: { value: number }) {
  return (
    <div className="mt-2 h-2 w-full rounded bg-black/10 dark:bg-white/15" role="progressbar" aria-valuenow={Math.round(value * 100)}>
      <div className="h-2 rounded bg-blue-600" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

// Anyone can browse projects; investing, starting a project and installing need the right login.
export default async function ProjectsPage() {
  const me = await getCurrentMember();
  const { m, f } = await getI18n();
  const t = m.projects;
  const pct = f.pct;
  const admin = me !== null && isAdmin(me);
  expireFundingRounds(); // rounds past their deadline are refunded before anyone sees them
  const projects = getProjects();
  const { hosts, investors } = projectFormChoices();
  const takenHosts = new Set(projects.map((p) => p.site.memberId));
  // Staff pick any roof; a household can only offer its own.
  const hostChoices = hosts.filter((h) => !takenHosts.has(h.id) && (admin || h.id === me?.id));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="mt-1 text-sm opacity-70">{t.intro}</p>

      {projects.map((p) => (
        <section key={p.id} className={`mt-6 ${card}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="text-sm opacity-70">{t.host(p.hostName)}</p>
          </div>

          {p.state === "refunded" ? (
            <p className="mt-3 rounded-md border border-amber-500/50 p-3 text-sm">
              <span className="font-medium">{t.states.refunded}.</span> {t.refundedNote}
            </p>
          ) : (
            <ol className="mt-3 flex flex-wrap gap-1 text-xs" aria-label={t.stage}>
              {LIFECYCLE.map((stage) => {
                const reached = LIFECYCLE.indexOf(stage) <= LIFECYCLE.indexOf(p.state as (typeof LIFECYCLE)[number]);
                return (
                  <li
                    key={stage}
                    className={`rounded-full border px-2 py-0.5 ${stage === p.state ? "border-blue-600 font-medium" : reached ? "border-black/20 dark:border-white/25" : "border-black/10 opacity-50 dark:border-white/10"}`}
                    aria-current={stage === p.state ? "step" : undefined}
                  >
                    {t.states[stage]}
                  </li>
                );
              })}
            </ol>

          )}

          {p.state === "funding" || p.state === "funded" ? (
            <>
              <p className="mt-4 text-sm">
                {t.raised(f.eur(p.raisedEur, 0), f.eur(p.principalEur, 0), pct(p.fundingProgress))}
              </p>
              <Progress value={p.fundingProgress} />
              {p.state === "funding" && p.fundingDeadline && p.fundingDaysLeft !== null && (
                <p className="mt-2 text-xs opacity-80">{t.deadline(f.date(p.fundingDeadline), p.fundingDaysLeft)}</p>
              )}
              {p.state === "funding" && !me ? (
                <p className="mt-3 text-sm">
                  <Link href="/login?next=/projects" className="text-blue-700 underline dark:text-blue-400">
                    {t.logInToInvest}
                  </Link>
                </p>
              ) : p.state === "funding" && me ? (
                <form action={invest} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
                  <input type="hidden" name="projectId" value={p.id} />
                  {admin ? (
                    <label className="block">
                      <span className="text-xs opacity-70">{t.investor}</span>
                      <select name="investorMemberId" className={input}>
                        {investors.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <input type="hidden" name="investorMemberId" value={me.id} />
                  )}
                  <label className="block">
                    <span className="text-xs opacity-70">{t.amount}</span>
                    <input type="number" name="amountEur" min={100} step={100} defaultValue={5000} className={input} />
                  </label>
                  <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
                    {t.invest}
                  </button>
                </form>
              ) : p.state === "funded" && admin ? (
                <form action={markInstalled} className="mt-3 text-sm">
                  <input type="hidden" name="projectId" value={p.id} />
                  <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
                    {t.markInstalled}
                  </button>
                  <p className="mt-1 text-xs opacity-70">{t.markInstalledNote}</p>
                </form>
              ) : p.state === "funded" ? (
                <p className="mt-3 text-sm opacity-70">{t.fullyFunded}</p>
              ) : null}
              <p className="mt-2 text-xs opacity-70">{t.escrowNote}</p>
            </>
          ) : (
            <>
              <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile label={t.tiles.repaid} value={f.eur(p.repaidEur)} sub={t.tiles.repaidSub(f.eur(p.owedEur, 0), pct(p.progress))} />
                <StatTile label={t.tiles.reserve} value={f.eur(p.reserveEur)} sub={t.tiles.reserveSub(f.eur(p.reserveTargetEur, 0))} />
                <StatTile
                  label={t.tiles.payoff}
                  value={p.payoff ? t.tiles.payoffValue(f.num(p.payoff.years)) : t.tiles.payoffNone}
                  sub={p.payoff ? t.tiles.payoffSub(f.eur(p.payoff.yearlyToInvestorsEur, 0)) : undefined}
                />
                <StatTile label={t.tiles.system} value={`${f.num(p.site.pvKwp)} kWp`} sub={t.tiles.systemSub(f.eur(p.principalEur, 0))} />
              </section>
              <Progress value={p.progress} />
              <RoofOnChain projectId={p.id} />
              {p.payoff && (
                <p className="mt-2 text-xs opacity-70">{t.payoffNote(pct(p.payoff.soldShare), f.num(p.payoff.avgPriceCt), pct(p.payoff.gridShare), f.num(PRICES.feedInCt, 0))}</p>
              )}
            </>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">{t.investors}</h3>
              {p.positions.length === 0 ? (
                <p className="mt-1 text-sm opacity-70">{t.noInvestors}</p>
              ) : (
                <div className="mt-1 overflow-x-auto">
                  <table className="kw-table w-full text-sm">
                    <thead className="text-left text-xs opacity-70">
                      <tr>
                        <th className="py-1 font-normal">{t.investorTable.investor}</th>
                        <th className="py-1 text-right font-normal">{t.investorTable.invested}</th>
                        <th className="py-1 text-right font-normal">{t.investorTable.repaid}</th>
                        <th className="py-1 text-right font-normal">{t.investorTable.owed}</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {p.positions.map((i) => (
                        <tr key={i.id} className="border-t border-black/5 dark:border-white/10">
                          <td className="py-1">
                            {i.name}
                            {i.refunded && <span className="ml-1 text-xs opacity-70">({t.refundedTag})</span>}
                          </td>
                          <td className="py-1 text-right">{f.eur(i.investedEur, 0)}</td>
                          <td className="py-1 text-right">{f.eur(i.repaidEur)}</td>
                          <td className="py-1 text-right">{f.eur(i.owedEur, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t.latestRepayments}</h3>
              {p.repayments.length === 0 ? (
                <p className="mt-1 text-sm opacity-70">{t.noneYet}</p>
              ) : (
                <div className="mt-2">
                  <BarList
                    total={f.eur(p.repayments.reduce((s, r) => s + r.eur, 0))}
                    totalLabel={t.repaidLatest(p.repayments.length)}
                    rows={p.repayments.map((r, i) => ({
                      key: r.batchId ?? String(r.periodStart),
                      label: f.time(r.periodStart),
                      // The day only where it changes, so the list stays quiet.
                      sub: i === 0 || f.day(p.repayments[i - 1].periodStart) !== f.day(r.periodStart) ? f.day(r.periodStart) : undefined,
                      value: r.eur,
                      amount: f.eur(r.eur),
                      color: "var(--viz-series-2)",
                      trailing: r.signatures.length > 0 ? <TxLink href={explorerTxUrl(r.signatures[0])} /> : null,
                    }))}
                  />
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 text-xs opacity-70">
            {t.waterfall(
              String(p.feeBps / 100),
              String(p.reserveBps / 100),
              f.eur(p.reserveTargetEur, 0),
              String(p.investorShareBps / 100),
              f.eur(p.owedEur, 0),
              String(p.returnBps / 100),
            )}
          </p>
        </section>
      ))}

      {!me && (
        <p className={`mt-6 text-sm ${card}`}>
          {t.haveRoof.before}{" "}
          <Link href="/login?next=/projects" className="text-blue-700 underline dark:text-blue-400">
            {t.haveRoof.link}
          </Link>{" "}
          {t.haveRoof.after}
        </p>
      )}
      {hostChoices.length > 0 && (
        <section className={`mt-6 ${card}`}>
          <h2 className="font-semibold">{t.start}</h2>
          <form action={createProject} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
            <label className="block">
              <span className="text-xs opacity-70">{t.roofHost}</span>
              <select name="hostMemberId" className={input}>
                {hostChoices.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs opacity-70">{t.projectName}</span>
              <input type="text" name="name" defaultValue={t.defaultName} className={input} />
            </label>
            <label className="block">
              <span className="text-xs opacity-70">{t.size}</span>
              <input type="number" name="kwp" min={1} max={100} step={0.5} defaultValue={10} className={input} />
            </label>
            <label className="block">
              <span className="text-xs opacity-70">{t.cost}</span>
              <input type="number" name="costEur" min={1000} step={500} defaultValue={14000} className={input} />
            </label>
            <label className="block">
              <span className="text-xs opacity-70">{t.fundingDays}</span>
              <input
                type="number"
                name="fundingDays"
                min={FUNDING_DAYS.min}
                max={FUNDING_DAYS.max}
                step={1}
                defaultValue={FUNDING_DAYS.default}
                className={input}
              />
            </label>
            <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
              {t.startFunding}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
