import Link from "next/link";
import { isAdmin, viewedMemberId } from "@/lib/auth/policy";
import { requireMember } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { explorerTxUrl } from "@/lib/solana/wallets";
import { VAT_RATE } from "@/lib/statements/compute";
import { loadStatement, monthBounds, statementMonths } from "@/lib/statements/load";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";
const th = "py-1 font-normal";

export default async function StatementsPage({ searchParams }: PageProps<"/statements">) {
  const me = await requireMember("/statements");
  const { m, f } = await getI18n();
  const t = m.statements;
  const params = await searchParams;
  const memberId = viewedMemberId(me, typeof params.as === "string" ? params.as : undefined);
  const months = statementMonths(memberId);
  const month = typeof params.month === "string" && months.includes(params.month) ? params.month : months[0];
  const s = month ? loadStatement(memberId, month) : null;
  const eur = (micro: number) => f.eur(micro / 1_000_000);
  const asQuery: Record<string, string> = isAdmin(me) && memberId !== me.id ? { as: memberId } : {};
  const vat = f.pct(VAT_RATE);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="mt-1 text-sm opacity-70">{t.intro}</p>

      {!s ? (
        <p className={`mt-6 text-sm ${card}`}>{t.none}</p>
      ) : (
        <>
          <nav className="mt-4 flex flex-wrap items-center gap-2 text-sm" aria-label={t.month}>
            {months.map((mk) => (
              <Link
                key={mk}
                href={{ pathname: "/statements", query: { ...asQuery, month: mk } }}
                aria-current={mk === month ? "page" : undefined}
                className={`rounded-full border px-3 py-1 ${mk === month ? "border-blue-600 font-medium" : "border-black/15 opacity-80 dark:border-white/20"}`}
              >
                {f.month(monthBounds(mk).start)}
              </Link>
            ))}
            <a
              href={`/statements/pdf?${new URLSearchParams({ ...asQuery, month: s.monthKey })}`}
              className="ml-auto rounded-md bg-blue-600 px-4 py-1.5 font-medium text-white hover:bg-blue-700"
            >
              {t.download}
            </a>
          </nav>

          <article className={`mt-4 ${card}`}>
            <header className="flex flex-wrap justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{t.heading(f.month(s.periodStart))}</h2>
                <p className="mt-1 text-sm">{s.member.name}</p>
                {s.site?.address && <p className="text-sm opacity-80">{s.site.address}</p>}
              </div>
              <dl className="grid grid-cols-[auto_auto] gap-x-4 text-xs">
                <dt className="opacity-70">{t.number}</dt>
                <dd className="font-mono">{s.number}</dd>
                <dt className="opacity-70">{t.period}</dt>
                <dd>
                  {f.date(s.periodStart)} – {f.date(s.periodEnd - 1)}
                </dd>
                {s.site?.meterId && (
                  <>
                    <dt className="opacity-70">{t.meter}</dt>
                    <dd className="font-mono">{s.site.meterId}</dd>
                  </>
                )}
              </dl>
            </header>

            <section className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-black/[0.03] p-3 dark:bg-white/5">
                <p className="text-xs opacity-70">{t.paidOut}</p>
                <p className="text-xl font-semibold tabular-nums">{eur(s.totals.paidOutMicro)}</p>
                {s.totals.simulatedMicro > 0 && (
                  <p className="text-xs opacity-70">
                    + {eur(s.totals.simulatedMicro)} {m.common.batchStatus.simulated}
                  </p>
                )}
              </div>
              <div className="rounded-md bg-black/[0.03] p-3 dark:bg-white/5">
                <p className="text-xs opacity-70">{t.toBill}</p>
                <p className="text-xl font-semibold tabular-nums">{eur(s.totals.billedMicro)}</p>
                {s.totals.unsettledMicro !== 0 && (
                  <p className="text-xs opacity-70">
                    {t.unsettled}: {eur(s.totals.unsettledMicro)}
                  </p>
                )}
              </div>
              {s.totals.paidFromWalletMicro > 0 && (
                <div className="rounded-md bg-black/[0.03] p-3 sm:col-span-2 dark:bg-white/5">
                  <p className="text-xs opacity-70">{t.paidFromWallet}</p>
                  <p className="text-xl font-semibold tabular-nums">{eur(s.totals.paidFromWalletMicro)}</p>
                </div>
              )}
            </section>
            <p className="mt-2 text-xs opacity-70">{t.nettingNote}</p>

            <h3 className="mt-6 font-semibold">{t.bought}</h3>
            {s.bought.lines.length === 0 ? (
              <p className="mt-1 text-sm opacity-70">{t.noneBought}</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="kw-table w-full text-sm tabular-nums">
                  <thead className="text-left text-xs opacity-70">
                    <tr>
                      <th className={th}>{t.table.description}</th>
                      <th className={`${th} text-right`}>{t.table.kwh}</th>
                      <th className={`${th} text-right`}>{t.table.amount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.bought.lines.map((l) => (
                      <tr key={l.priceCt} className="border-t border-black/5 dark:border-white/10">
                        <td className="py-1">{t.atPrice(f.ct(l.priceCt))}</td>
                        <td className="py-1 text-right">{f.num(l.kwh, 2)}</td>
                        <td className="py-1 text-right">{eur(l.grossMicro)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-black/10 font-semibold dark:border-white/20">
                      <td className="py-1">{t.subtotal}</td>
                      <td className="py-1 text-right">{f.num(s.bought.kwh, 2)}</td>
                      <td className="py-1 text-right">{eur(s.bought.grossMicro)}</td>
                    </tr>
                  </tbody>
                  <caption className="caption-bottom pt-1 text-left text-xs opacity-70">{t.vatIncluded(vat, eur(s.bought.vatMicro))}</caption>
                </table>
              </div>
            )}

            <h3 className="mt-6 font-semibold">{t.sold}</h3>
            {s.sold.lines.length === 0 ? (
              <p className="mt-1 text-sm opacity-70">{t.noneSold}</p>
            ) : (
              <>
                <div className="mt-2 overflow-x-auto">
                  <table className="kw-table w-full text-sm tabular-nums">
                    <thead className="text-left text-xs opacity-70">
                      <tr>
                        <th className={th}>{t.table.description}</th>
                        <th className={`${th} text-right`}>{t.table.kwh}</th>
                        <th className={`${th} text-right`}>{t.table.amount}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.sold.lines.map((l) => (
                        <tr key={`${l.grid ? "grid" : "n"}:${l.priceCt}`} className="border-t border-black/5 dark:border-white/10">
                          <td className="py-1">{l.grid ? t.fedIn(f.ct(l.priceCt)) : t.atPrice(f.ct(l.priceCt))}</td>
                          <td className="py-1 text-right">{f.num(l.kwh, 2)}</td>
                          <td className="py-1 text-right">{eur(l.grossMicro)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-black/10 font-semibold dark:border-white/20">
                        <td className="py-1">{t.subtotal}</td>
                        <td className="py-1 text-right">{f.num(s.sold.kwh, 2)}</td>
                        <td className="py-1 text-right">{eur(s.sold.grossMicro)}</td>
                      </tr>
                    </tbody>
                    <caption className="caption-bottom pt-1 text-left text-xs opacity-70">
                      {s.sold.vatRate > 0 ? t.vatIncluded(vat, eur(s.sold.vatMicro)) : t.noVatSmall}
                    </caption>
                  </table>
                </div>
                {s.sold.deductions && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold">{t.waterfall}</h4>
                    <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
                      <dt>{t.sold}</dt>
                      <dd className="text-right">{eur(s.sold.grossMicro)}</dd>
                      <dt>
                        – {t.fee} <span className="text-xs opacity-70">({t.vatIncluded(vat, eur(s.sold.deductions.feeVatMicro))})</span>
                      </dt>
                      <dd className="text-right">{eur(-s.sold.deductions.feeMicro)}</dd>
                      <dt>– {t.reserve}</dt>
                      <dd className="text-right">{eur(-s.sold.deductions.reserveMicro)}</dd>
                      <dt>– {t.investors}</dt>
                      <dd className="text-right">{eur(-s.sold.deductions.investorMicro)}</dd>
                      <dt className="font-semibold">{t.toYou}</dt>
                      <dd className="text-right font-semibold">{eur(s.sold.creditedMicro)}</dd>
                    </dl>
                  </div>
                )}
              </>
            )}

            {s.repayments.lines.length > 0 && (
              <>
                <h3 className="mt-6 font-semibold">{t.repayments}</h3>
                <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
                  {s.repayments.lines.map((l) => (
                    <div key={l.siteId} className="contents">
                      <dt>{t.roof(s.roofNames[l.siteId] ?? l.siteId)}</dt>
                      <dd className="text-right">{eur(l.grossMicro)}</dd>
                    </div>
                  ))}
                  <dt className="font-semibold">{t.subtotal}</dt>
                  <dd className="text-right font-semibold">{eur(s.repayments.totalMicro)}</dd>
                </dl>
                <p className="mt-1 text-xs opacity-70">{t.repaymentsNote}</p>
              </>
            )}

            {s.meter && (
              <>
                <h3 className="mt-6 font-semibold">{t.usage}</h3>
                <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
                  <dt>{t.usageRows.load}</dt>
                  <dd className="text-right">{f.kwh(s.meter.loadKwh)}</dd>
                  <dt className="pl-4 opacity-80">{t.usageRows.fromNeighbours}</dt>
                  <dd className="text-right opacity-80">{f.kwh(s.meter.fromNeighboursKwh, 2)}</dd>
                  <dt className="pl-4 opacity-80">{t.usageRows.fromGrid}</dt>
                  <dd className="text-right opacity-80">{f.kwh(Math.max(0, s.meter.importKwh - s.meter.fromNeighboursKwh))}</dd>
                  {s.meter.generationKwh > 0 && (
                    <>
                      <dt>{t.usageRows.generated}</dt>
                      <dd className="text-right">{f.kwh(s.meter.generationKwh)}</dd>
                      <dt>{t.usageRows.exported}</dt>
                      <dd className="text-right">{f.kwh(s.meter.exportKwh)}</dd>
                    </>
                  )}
                </dl>
              </>
            )}

            <h3 className="mt-6 font-semibold">{t.payments}</h3>
            <p className="mt-1 text-xs opacity-70">{t.paymentsNote}</p>
            {s.payments.length === 0 ? (
              <p className="mt-1 text-sm opacity-70">{t.noPayments}</p>
            ) : (
              <div className="mt-2 max-h-96 overflow-auto">
                <table className="kw-table w-full text-sm tabular-nums">
                  <thead className="text-left text-xs opacity-70">
                    <tr>
                      <th className={th}>{t.paymentTable.hour}</th>
                      <th className={`${th} text-right`}>{t.paymentTable.amount}</th>
                      <th className={`${th} pl-4`}>{t.paymentTable.status}</th>
                      <th className={th}>{t.paymentTable.tx}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.payments.map((p) => (
                      <tr key={`${p.batchId}${p.amountMicro < 0 ? "-out" : ""}`} className="border-t border-black/5 dark:border-white/10">
                        <td className="py-1">
                          {f.day(p.periodStart)} {f.time(p.periodStart)}
                        </td>
                        <td className="py-1 text-right">
                          {eur(p.amountMicro)}
                          {p.amountMicro < 0 && <span className="block text-xs opacity-70">{t.outgoing}</span>}
                        </td>
                        <td className="py-1 pl-4">{m.common.batchStatus[p.status] ?? p.status}</td>
                        <td className="py-1">
                          {p.signatures.length === 0
                            ? "–"
                            : p.signatures.map((sig) => (
                                <a key={sig} href={explorerTxUrl(sig)} target="_blank" rel="noreferrer" className="mr-2 font-mono text-xs text-blue-700 underline dark:text-blue-400">
                                  {sig.slice(0, 6)}…{sig.slice(-6)} ↗
                                </a>
                              ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-6 text-xs opacity-60">{t.disclaimer}</p>
          </article>
        </>
      )}
    </main>
  );
}
