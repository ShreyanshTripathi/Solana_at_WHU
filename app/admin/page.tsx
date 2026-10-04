import Link from "next/link";
import { StatTile } from "@/components/StatTile";
import { Kpi, StatusBadge, TxLink } from "@/components/ui/kit";
import { isAdmin } from "@/lib/auth/policy";
import { requireMember } from "@/lib/auth/session";
import { PRICES, TOKEN } from "@/lib/config";
import { getAdminOverview, treasuryBalance } from "@/lib/dashboard/admin";
import { getI18n } from "@/lib/i18n/server";
import { rejectionText } from "@/lib/i18n/text";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/solana/wallets";
import { saveCommunityPrice, saveMarketSettings } from "./actions";
import { marketSettings } from "@/lib/dashboard/market";
import { settlementKey } from "@/lib/solana/p2p";
import { recentRegistrations } from "@/lib/sites/admin";
import { parseRejection } from "@/lib/sites/register";

const RECENT = 12; // settlement hours shown before "show older"

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-4 dark:border-white/15";
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const HHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function AdminPage() {
  const me = await requireMember("/admin");
  const { m, f } = await getI18n();
  const t = m.admin;
  if (!isAdmin(me)) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="mt-2 text-sm">{t.staffOnly}</p>
      </main>
    );
  }
  const d = getAdminOverview();
  const registrations = recentRegistrations();
  const market = marketSettings();
  const settlementPubkey = settlementKey().publicKey.toBase58();
  const reasonText = (r: ReturnType<typeof parseRejection>) => r && <span className="block text-xs opacity-70">{rejectionText(m, r)}</span>;
  const balance = await treasuryBalance();

  if (!d.community) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="mt-2 text-sm">{t.noCommunity}</p>
      </main>
    );
  }

  const batchTable = (rows: typeof d.batches) => (
    <table className="kw-table w-full text-sm">
      <thead>
        <tr>
          <th className="text-left">{t.batchTable.hour}</th>
          <th className="text-left">{t.batchTable.status}</th>
          <th className="text-right">{t.batchTable.recipients}</th>
          <th className="text-right">{t.batchTable.paid}</th>
          <th className="text-left">{t.batchTable.hash}</th>
          <th className="text-left">{t.batchTable.txs}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr key={b.id}>
            <td>
              {f.day(b.periodStart)} {f.time(b.periodStart)}
            </td>
            <td>
              <span className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={b.status} label={m.common.batchStatusShort[b.status] ?? b.status} />
                {b.mode === "p2p" && <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-xs text-blue-800 dark:text-blue-300">{t.batchMode.p2p}</span>}
              </span>
            </td>
            <td className="text-right">{b.recipients}</td>
            <td className="text-right font-medium">{f.eur(b.paidEur)}</td>
            <td>
              <Link href={`/verify/${b.id}`} className="inline-flex items-center gap-1.5 text-xs hover:text-blue-700 dark:hover:text-blue-300">
                <span className="font-mono opacity-60">{b.allocationHash.slice(0, 8)}</span>
                <span className="rounded-full border border-black/10 px-2 py-0.5 font-medium dark:border-white/15">{t.verifyShort} →</span>
              </Link>
            </td>
            <td>{b.txSignatures.length === 0 ? <span className="opacity-40">–</span> : <TxLink href={explorerTxUrl(b.txSignatures[0])} label={t.txCount(b.txSignatures.length)} />}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{d.community.name}</h1>
      <p className="mt-1 text-sm opacity-70">
        {t.subtitle(d.community.gridAreaId, d.members.length)}
      </p>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label={t.tiles.shared} value={f.kwh(d.totals.sharedKwh)} sub={t.tiles.sharedSub} />
        <StatTile label={t.tiles.paid} value={f.eur(d.totals.paidOutEur)} sub={t.tiles.paidSub(d.totals.confirmedBatches)} />
        <StatTile label={t.tiles.fees} value={f.eur(d.totals.feesEur)} sub={t.tiles.feesSub} />
        <StatTile
          label={t.tiles.treasury}
          value={balance === null ? t.tiles.unavailable : `${f.num(balance, 2)} ${TOKEN.symbol}`}
          sub={d.devnet ? t.tiles.live : t.tiles.setup}
        />
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className={card}>
          <h2 className="font-semibold">{t.price}</h2>
          <p className="mt-1 text-xs opacity-70">{t.priceNote(String(PRICES.feedInCt), String(PRICES.gridCt))}</p>
          <form action={saveCommunityPrice} className="mt-3 flex items-end gap-3 text-sm">
            <label className="block">
              <span className="text-xs opacity-70">ct/kWh</span>
              <input
                type="number"
                name="communityPriceCt"
                min={PRICES.feedInCt}
                max={PRICES.gridCt}
                step={0.5}
                defaultValue={d.community.communityPriceCt}
                className="mt-1 block w-28 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
              {m.common.save}
            </button>
          </form>
          <p className="mt-2 text-xs opacity-70">{t.priceApplies}</p>
          <form action={saveMarketSettings} className="mt-4 space-y-3 border-t border-black/10 pt-3 text-sm dark:border-white/15">
            <h3 className="font-semibold">{t.marketSettings}</h3>
            <fieldset>
              <legend className="text-xs opacity-70">{t.priceMode}</legend>
              {(["fixed", "auction"] as const).map((v) => (
                <label key={v} className="mt-1 flex items-center gap-2">
                  <input type="radio" name="priceMode" value={v} defaultChecked={market.priceMode === v} />
                  {v === "fixed" ? t.fixedPrice : t.auctionPrice}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend className="text-xs opacity-70">{t.settlementMode}</legend>
              {(["supplier", "p2p"] as const).map((v) => (
                <label key={v} className="mt-1 flex items-center gap-2">
                  <input type="radio" name="settlementMode" value={v} defaultChecked={market.settlementMode === v} />
                  {v === "supplier" ? t.supplierPays : t.p2pPays}
                </label>
              ))}
            </fieldset>
            <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
              {m.common.save}
            </button>
            <p className="text-xs opacity-70">{t.marketNote}</p>
            {market.settlementMode === "p2p" && (
              <p className="text-xs opacity-70">
                {t.settlementKey}:{" "}
                <a href={explorerAddressUrl(settlementPubkey)} target="_blank" rel="noreferrer" className="font-mono underline">
                  {short(settlementPubkey)}
                </a>
              </p>
            )}
          </form>
        </section>

        <section className={card}>
          <h2 className="font-semibold">{t.exports}</h2>
          <p className="mt-1 text-xs opacity-70">{t.exportsNote}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="kw-table w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">{t.exportCols.day}</th>
                  <th className="text-right">{t.exportCols.exchanges}</th>
                  <th className="text-right">{t.exportCols.kwh}</th>
                  <th className="text-right">{t.exportCols.file}</th>
                </tr>
              </thead>
              <tbody>
                {d.exportDayStats.map((x) => (
                  <tr key={x.day}>
                    <td>{f.day(Date.parse(`${x.day}T12:00:00Z`))}</td>
                    <td className="text-right">{f.int(x.count)}</td>
                    <td className="text-right">{f.num(x.kwh)}</td>
                    <td className="text-right">
                      <a
                        href={`/api/export/allocations?date=${x.day}`}
                        className="inline-flex items-center gap-1 rounded-md border border-black/15 px-2 py-0.5 text-xs font-medium hover:border-blue-600 hover:text-blue-700 dark:border-white/20 dark:hover:text-blue-300"
                      >
                        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                          <path d="M6 1.5v6.5M3 5.5L6 8.5 9 5.5M2 10.5h8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {t.download}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mt-6 text-sm font-semibold">{t.anchors}</h3>
          <div className="mt-2 space-y-2">
            {d.anchors.map((a) => (
              <div key={a.id} className="rounded-lg bg-black/[0.03] p-3 dark:bg-white/5">
                <p className="text-sm font-medium">{a.name}</p>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="opacity-60">{t.anchorWindow}</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">
                      {a.weekdaysOnly ? t.weekdays : t.daily}, {HHMM(a.fromMinute)}–{HHMM(a.toMinute)}
                    </dd>
                  </div>
                  <div>
                    <dt className="opacity-60">{t.anchorMax}</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{f.int(a.maxKwhPerDay)} kWh/day</dd>
                  </div>
                  <div>
                    <dt className="opacity-60">{t.anchorPrice}</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{a.priceCt} ct/kWh</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.members}</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="kw-table w-full text-sm">
            <thead className="text-left text-xs opacity-70">
              <tr>
                <th className="py-1 font-normal">{t.memberTable.member}</th>
                <th className="py-1 font-normal">{t.memberTable.type}</th>
                <th className="py-1 text-right font-normal">{t.memberTable.solar}</th>
                <th className="py-1 text-right font-normal">{t.memberTable.battery}</th>
                <th className="py-1 text-right font-normal">{t.memberTable.use}</th>
                <th className="py-1 pl-4 font-normal">{t.memberTable.wallet}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {d.members.map((x) => (
                <tr key={x.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-1">{x.name}</td>
                  <td className="py-1">
                    {m.common.kind[x.kind] ?? x.kind}
                    {x.kind === "sme" && (x.smeVerified ? " ✓" : t.unverified)}
                  </td>
                  <td className="py-1 text-right">{x.site && x.site.pvKwp > 0 ? `${f.num(x.site.pvKwp)} kWp` : "–"}</td>
                  <td className="py-1 text-right">{x.site && x.site.batteryKwh > 0 ? f.kwh(x.site.batteryKwh, 0) : "–"}</td>
                  <td className="py-1 text-right">{x.site ? f.kwh(x.site.annualKwh, 0) : "–"}</td>
                  <td className="py-1 pl-4">
                    {x.walletPubkey ? (
                      <a href={explorerAddressUrl(x.walletPubkey)} target="_blank" rel="noreferrer" className="font-mono text-xs underline">
                        {short(x.walletPubkey)}
                      </a>
                    ) : (
                      "–"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.registrations}</h2>
        <p className="mt-1 text-xs opacity-70">{t.registrationsNote(d.community.gridAreaId)}</p>
        {registrations.length === 0 ? (
          <p className="mt-3 text-sm opacity-70">{t.noRegistrations}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="kw-table w-full text-sm">
              <thead className="text-left text-xs opacity-70">
                <tr>
                  <th className="py-1 font-normal">{t.regTable.when}</th>
                  <th className="py-1 font-normal">{t.regTable.workspace}</th>
                  <th className="py-1 font-normal">{t.regTable.address}</th>
                  <th className="py-1 font-normal">{t.regTable.meter}</th>
                  <th className="py-1 font-normal">{t.regTable.grid}</th>
                  <th className="py-1 font-normal">{t.regTable.result}</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id} className="border-t border-black/5 align-top dark:border-white/10">
                    <td className="py-1.5 pr-3">
                      {f.day(r.createdAt)}, {f.time(r.createdAt)}
                    </td>
                    <td className="py-1.5 pr-3">{r.memberName}</td>
                    <td className="py-1.5 pr-3">
                      {r.street}, {r.postcode} {r.city}
                    </td>
                    <td className="py-1.5 pr-3 font-mono">{r.meterId}</td>
                    <td className="py-1.5 pr-3">{r.gridAreaId ?? m.common.unknown}</td>
                    <td className="py-1.5">
                      {m.site.status[r.status]}
                      {reasonText(parseRejection(r.reason))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.batches}</h2>
        <p className="mt-1 text-xs opacity-70">{t.batchesNote}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label={t.batchKpis.hours} value={f.int(d.batches.length)} />
          <Kpi label={t.batchKpis.onChain} value={f.int(d.batches.filter((b) => b.status === "confirmed").length)} />
          <Kpi label={t.batchKpis.simulated} value={f.int(d.batches.filter((b) => b.status === "simulated").length)} />
          <Kpi label={t.batchKpis.failed} value={f.int(d.batches.filter((b) => b.status === "failed").length)} />
          <Kpi label={t.batchKpis.paid} value={f.eur(d.batches.reduce((s, b) => s + b.paidEur, 0))} tone="accent" />
        </div>
        <div className="mt-4 overflow-x-auto">{batchTable(d.batches.slice(0, RECENT))}</div>
        {d.batches.length > RECENT && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">{t.olderHours(d.batches.length - RECENT)}</summary>
            <div className="mt-3 overflow-x-auto">{batchTable(d.batches.slice(RECENT))}</div>
          </details>
        )}
      </section>
    </main>
  );
}
