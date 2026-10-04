import Link from "next/link";
import { livePayments } from "@/lib/dashboard/livePayments";
import { LivePayments } from "@/components/market/LivePayments";
import { SupplyChart } from "@/components/buyer/SupplyChart";
import { Map3DLoader } from "@/components/map3d/Map3DLoader";
import { liveKey } from "@/lib/dashboard/liveKey";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DemoButton } from "@/components/demo/DemoButton";
import { StatTile } from "@/components/StatTile";
import { isAdmin, viewedMemberId } from "@/lib/auth/policy";
import { requireMember } from "@/lib/auth/session";
import { MarketSection } from "@/components/market/MarketSection";
import { WalletCard } from "@/components/market/WalletCard";
import { getMap3d } from "@/lib/dashboard/map3d";
import { marketDay, marketSettings } from "@/lib/dashboard/market";
import { localMidnight } from "@/lib/sim/clock";
import { isServerHeldWallet, walletStatusOf } from "@/lib/solana/demoWallet";
import { suggestSpendingLimit } from "@/lib/agents/spending";
import { PRICES } from "@/lib/config";
import {
  buyerPersonas,
  getBuyerDashboard,
  type RankBy,
} from "@/lib/dashboard/buyer";
import { authConfig } from "@/lib/auth/config";
import { getI18n } from "@/lib/i18n/server";
import { explorerTxUrl } from "@/lib/solana/wallets";
import { seriesColor } from "@/lib/viz";
import { BarList, TxLink } from "@/components/ui/kit";
import { saveBuyerRules } from "./actions";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-4 dark:border-white/15";
const RANKS: RankBy[] = ["score", "reliability", "distance", "price"];

function Swatch({ slot }: { slot: number }) {
  return (
    <span
      className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle"
      style={{ background: seriesColor(slot) }}
    />
  );
}

export default async function BuyerPage({ searchParams }: PageProps<"/buyer">) {
  const me = await requireMember("/buyer");
  const { m, f } = await getI18n();
  const t = m.buyer;
  const pct = f.pct;
  const metres = (x: number) =>
    x < 1000 ? `${f.int(Math.round(x / 10) * 10)} m` : `${f.num(x / 1000)} km`;
  const params = await searchParams;
  const as = viewedMemberId(
    me,
    typeof params.as === "string" ? params.as : isAdmin(me) ? "ben" : undefined,
  );
  const at = typeof params.at === "string" ? params.at : undefined;
  const rank = RANKS.find((r) => r === params.rank) ?? "score";
  const personas = isAdmin(me) ? buyerPersonas() : [];
  const d = getBuyerDashboard(as, at, rank);

  if (!d) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="mt-2 text-sm">
          {t.empty.before}{" "}
          <Link
            href="/site"
            className="text-blue-700 underline dark:text-blue-400"
          >
            {t.empty.link}
          </Link>{" "}
          {t.empty.after}
        </p>
      </main>
    );
  }

  // The 3D map for the dashboard's day and time, seen as this member (staff see exact locations).
  const map3d = getMap3d({ id: d.member.id, role: me.role }, d.asOf);
  // Energy trading (1b) and peer-to-peer payments (1a), when the Stadtwerk has switched them on.
  const settings = marketSettings();
  const market =
    settings.priceMode === "auction"
      ? marketDay(localMidnight(d.asOf), d.asOf)
      : null;
  const p2p = settings.settlementMode === "p2p";
  const walletStatus = p2p ? await walletStatusOf(d.member) : null;
  const query = (extra: Record<string, string>) => ({
    ...(at ? { at } : {}),
    as: d.member.id,
    ...extra,
  });
  const top = d.suppliers[0];
  const month = f.monthName(d.asOf);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">{d.member.name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm opacity-70">
            {m.common.asOf(f.day(d.asOf), f.time(d.asOf))} ·{" "}
            {market?.nowCt != null
              ? m.market.now(f.ct(market.nowCt))
              : t.communityPrice(String(d.priceCt))}
            {!at && (
              <>
                {" · "}
                <AutoRefresh since={liveKey().key} />
              </>
            )}
          </p>
          <DemoButton next={`/buyer?as=${d.member.id}`} />
        </div>
      </div>
      {personas.length > 0 && (
        <nav
          className="mt-3 flex flex-wrap gap-2 text-sm"
          aria-label={t.choose}
        >
          {personas.map((p) => (
            <Link
              key={p.id}
              href={{
                pathname: "/buyer",
                query: { ...(at ? { at } : {}), as: p.id },
              }}
              className={`rounded-full border px-3 py-1 ${p.id === d.member.id ? "border-blue-600 font-medium" : "border-black/15 opacity-80 dark:border-white/20"}`}
            >
              {p.name}
            </Link>
          ))}
        </nav>
      )}

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label={t.tiles.localShare}
          value={pct(
            d.today.importKwh > 0 ? d.today.sharedKwh / d.today.importKwh : 0,
          )}
          sub={t.tiles.fromNeighbours(f.kwh(d.today.sharedKwh, 2))}
        />
        <StatTile
          label={t.tiles.fromUtility}
          value={f.kwh(d.today.utilityKwh, 2)}
          sub={t.tiles.fromUtilitySub}
        />
        <StatTile
          label={t.tiles.saved(month)}
          value={f.eur(d.month.savedEur)}
          sub={t.tiles.savedSub(String(PRICES.gridCt))}
        />
        <StatTile
          label={t.tiles.bill(month)}
          value={f.eur(d.month.billEur)}
          sub={t.tiles.billSub}
        />
      </section>

      <section className={`mt-4 ${card}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{m.livePayments.paidTitle}</h2>
          <p className="text-xs opacity-60">{m.livePayments.note}</p>
        </div>
        <LivePayments
          items={livePayments(d.member.id, "paid")}
          direction="paid"
        />
      </section>

      <section className={`mt-6 ${card}`}>
        <h2 className="font-semibold">
          {top
            ? t.chartTitle(
                pct(
                  d.today.importKwh > 0
                    ? d.today.sharedKwh / d.today.importKwh
                    : 0,
                ),
                top.name,
              )
            : t.chartTitleNone}
        </h2>
        <p className="mt-1 text-xs opacity-70">{t.chartNote}</p>
        <div className="mt-3">
          <SupplyChart points={d.chart} series={d.sellers} />
        </div>
      </section>

      {market && (
        <MarketSection
          m={m}
          f={f}
          points={market.points}
          averageCt={market.averageCt}
        />
      )}
      {p2p && (
        <WalletCard
          m={m}
          f={f}
          wallet={d.member.walletPubkey}
          status={walletStatus}
          ownWallet={d.member.id === me.id}
          canAct={isServerHeldWallet(d.member)}
          suggestion={suggestSpendingLimit(d.member.id, d.asOf)}
          privyEnabled={authConfig().privyEnabled}
        />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className={card}>
          <h2 className="font-semibold">{t.suppliers(month)}</h2>
          {d.suppliers.length === 0 ? (
            <p className="mt-2 text-sm opacity-70">{t.noneYet}</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="kw-table w-full text-sm">
                <thead className="text-left text-xs opacity-70">
                  <tr>
                    <th className="py-1 font-normal">{t.table.supplier}</th>
                    <th className="py-1 text-right font-normal">
                      {t.table.kwhToday}
                    </th>
                    <th className="py-1 text-right font-normal">
                      {t.table.eurToday}
                    </th>
                    <th className="py-1 text-right font-normal">
                      {t.table.kwh}
                    </th>
                    <th className="py-1 text-right font-normal">
                      {t.table.share}
                    </th>
                    <th className="py-1 text-right font-normal">
                      {t.table.amount}
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {d.suppliers.map((s) => (
                    <tr
                      key={s.siteId}
                      className="border-t border-black/5 dark:border-white/10"
                    >
                      <td className="py-1">
                        <Swatch slot={s.slot} />
                        {s.name}
                      </td>
                      <td className="py-1 text-right">
                        {f.num(s.todayKwh, 2)}
                      </td>
                      <td className="py-1 text-right">{f.eur(s.todayEur)}</td>
                      <td className="py-1 text-right">{f.num(s.kwh, 2)}</td>
                      <td className="py-1 text-right">
                        {pct(s.shareOfDemand)}
                      </td>
                      <td className="py-1 text-right">{f.eur(s.eur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs opacity-70">{t.shareNote}</p>
        </section>

        <section className={card}>
          <h2 className="font-semibold">{t.payments}</h2>
          {d.suppliers.length === 0 ? (
            <p className="mt-2 text-sm opacity-70">{t.nothingToPay}</p>
          ) : (
            <div className="mt-3">
              <BarList
                total={f.eur(d.suppliers.reduce((s, x) => s + x.paidEur, 0))}
                totalLabel={t.paidThisMonth}
                rows={[...d.suppliers]
                  .sort((a, b) => b.paidEur - a.paidEur)
                  .map((s) => ({
                    key: s.siteId,
                    label: (
                      <>
                        <Swatch slot={s.slot} />
                        {s.name}
                      </>
                    ),
                    sub:
                      s.pendingEur > 0
                        ? t.pendingShort(f.eur(s.pendingEur))
                        : undefined,
                    value: s.paidEur,
                    amount: f.eur(s.paidEur),
                    color: seriesColor(s.slot),
                    trailing:
                      s.signatures.length > 0 ? (
                        <TxLink
                          href={explorerTxUrl(s.signatures.at(-1)!)}
                          label={t.payCount(s.signatures.length)}
                        />
                      ) : null,
                  }))}
              />
            </div>
          )}
          <p className="mt-3 text-xs opacity-60">
            {p2p ? t.paymentsNoteP2p : t.paymentsNote}
          </p>
        </section>
      </div>

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.next24}</h2>
        <p className="mt-1 text-xs opacity-70">{t.next24Note}</p>
        {d.schedule.length === 0 ? (
          <p className="mt-2 text-sm opacity-70">{t.next24None}</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="kw-table w-full text-sm">
              <thead className="text-left text-xs opacity-70">
                <tr>
                  <th className="py-1 font-normal">{t.scheduleTable.hour}</th>
                  {d.sellers
                    .filter((s) => s.siteId !== d.site.id)
                    .map((s) => (
                      <th
                        key={s.siteId}
                        className="py-1 text-right font-normal"
                      >
                        <Swatch slot={s.slot} />
                        {s.name}
                      </th>
                    ))}
                  <th className="py-1 text-right font-normal">
                    {t.scheduleTable.utility}
                  </th>
                  <th className="py-1 pl-4 font-normal">
                    {t.scheduleTable.backup}
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {d.schedule.map((h) => (
                  <tr
                    key={h.hourTs}
                    className="border-t border-black/5 dark:border-white/10"
                  >
                    <td className="py-1">
                      {f.day(h.hourTs)} {f.time(h.hourTs)}
                    </td>
                    {d.sellers
                      .filter((s) => s.siteId !== d.site.id)
                      .map((s) => (
                        <td key={s.siteId} className="py-1 text-right">
                          {h.bySeller[s.siteId]
                            ? f.num(h.bySeller[s.siteId], 2)
                            : "–"}
                        </td>
                      ))}
                    <td className="py-1 text-right">
                      {f.num(h.utilityKwh, 2)}
                    </td>
                    <td className="py-1 pl-4">
                      {h.backup ?? t.scheduleTable.utility}
                      {h.backup && h.backupPct !== undefined && (
                        <span className="text-xs opacity-60">
                          {" "}
                          · {t.backupPct(pct(h.backupPct))}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.shifts}</h2>
        {d.shifts.length === 0 ? (
          <p className="mt-2 text-sm opacity-70">{t.noShifts}</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {d.shifts.map((s) => (
              <li key={s.ts}>
                <span className="tabular-nums">{f.time(s.ts)}</span>:{" "}
                {t.shift(f.num(s.kwh, 2), s.from, s.to)}
                <span className="opacity-70">
                  {" "}
                  (
                  {s.reason === "fell"
                    ? t.shiftReason.fell(s.from)
                    : t.shiftReason.rebalanced}
                  )
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`mt-4 ${card}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{t.potential}</h2>
          <nav className="flex flex-wrap gap-2 text-xs" aria-label={t.rankBy}>
            {RANKS.map((r) => (
              <Link
                key={r}
                href={{ pathname: "/buyer", query: query({ rank: r }) }}
                className={`rounded-full border px-2 py-0.5 ${r === d.rankBy ? "border-blue-600 font-medium" : "border-black/15 opacity-80 dark:border-white/20"}`}
              >
                {t.ranks[r]}
              </Link>
            ))}
          </nav>
        </div>
        {d.pick && (
          <div className="mt-3 rounded-lg border border-blue-600/30 bg-blue-600/5 px-3 py-2 text-sm">
            <p className="font-medium">
              {t.agentPick(
                d.pick.name,
                f.kwh(d.pick.likelyKwh),
                metres(d.pick.distanceM),
              )}
            </p>
            <p className="mt-0.5 text-xs opacity-70">{t.agentPickNote}</p>
          </div>
        )}
        <div className="mt-2 overflow-x-auto">
          <table className="kw-table w-full text-sm">
            <thead className="text-left text-xs opacity-70">
              <tr>
                <th className="py-1 font-normal">{t.potentialTable.seller}</th>
                <th className="py-1 text-right font-normal">
                  {t.potentialTable.price}
                </th>
                <th className="py-1 text-right font-normal">
                  {t.potentialTable.distance}
                </th>
                <th className="py-1 text-right font-normal">
                  {t.potentialTable.available}
                </th>
                <th className="py-1 text-right font-normal">
                  {t.potentialTable.steadiness}
                </th>
                <th className="py-1 text-right font-normal">
                  {t.potentialTable.next24}
                </th>
                <th className="py-1 text-right font-normal">
                  {t.potentialTable.likely}
                </th>
                <th className="py-1 pl-4 font-normal">
                  {t.potentialTable.status}
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {d.potential.map((p) => (
                <tr
                  key={p.siteId}
                  className="border-t border-black/5 dark:border-white/10"
                >
                  <td className="py-1">
                    <Swatch slot={p.slot} />
                    {p.name}
                  </td>
                  <td className="py-1 text-right">{f.ct(p.priceCt)}</td>
                  <td className="py-1 text-right">{metres(p.distanceM)}</td>
                  <td className="py-1 text-right">{pct(p.availability)}</td>
                  <td className="py-1 text-right">{pct(p.steadiness)}</td>
                  <td className="py-1 text-right">{f.kwh(p.forecastKwh)}</td>
                  <td className="py-1 text-right">{f.kwh(p.likelyKwh)}</td>
                  <td className="py-1 pl-4">
                    {p.blocked
                      ? t.potentialStatus.blocked
                      : !p.available
                        ? t.potentialStatus.outside
                        : p.preferred
                          ? t.potentialStatus.preferred
                          : t.potentialStatus.available}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs opacity-70">{t.potentialNote}</p>
      </section>

      <section className={`mt-4 ${card}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{t.mapTitle}</h2>
          <Link
            href="/map"
            className="shrink-0 text-sm text-blue-700 underline dark:text-blue-400"
          >
            {m.map3d.openFull} →
          </Link>
        </div>
        <p className="mt-1 text-xs opacity-70">{t.mapNote}</p>
        <div className="mt-3">
          {map3d && (
            <Map3DLoader data={map3d} focusSiteId={d.site.id} compact />
          )}
        </div>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.rules}</h2>
        <form action={saveBuyerRules} className="mt-3 space-y-3 text-sm">
          <input type="hidden" name="memberId" value={d.member.id} />
          <div className="flex flex-wrap gap-6">
            <label className="block">
              <span className="text-xs opacity-70">{t.maxPrice}</span>
              <input
                type="number"
                name="maxPriceCt"
                min={0}
                max={PRICES.gridCt}
                step={0.5}
                defaultValue={d.rule?.maxPriceCt ?? d.priceCt}
                className="mt-1 block w-32 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="block">
              <span className="text-xs opacity-70">{t.maxDistance}</span>
              <input
                type="number"
                name="maxDistanceM"
                min={100}
                max={20000}
                step={100}
                defaultValue={d.rule?.maxDistanceM ?? 3000}
                className="mt-1 block w-32 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
          </div>
          <fieldset>
            <legend className="text-xs opacity-70">{t.prefer}</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {d.choices.map((c) => (
                <label key={c.memberId} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    name="preferred"
                    value={c.memberId}
                    defaultChecked={d.rule?.preferred.includes(c.memberId)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-xs opacity-70">{t.never}</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {d.choices.map((c) => (
                <label key={c.memberId} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    name="blocked"
                    value={c.memberId}
                    defaultChecked={d.rule?.blocked.includes(c.memberId)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="rounded bg-blue-600 px-3 py-1 text-white"
          >
            {m.common.saveRules}
          </button>
          <p className="text-xs opacity-70">{t.rulesNote}</p>
        </form>
      </section>
    </main>
  );
}
