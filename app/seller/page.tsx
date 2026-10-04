import Link from "next/link";
import { livePayments } from "@/lib/dashboard/livePayments";
import { LivePayments } from "@/components/market/LivePayments";
import { Map3DLoader } from "@/components/map3d/Map3DLoader";
import {
  BatteryChart,
  GenerationChart,
} from "@/components/seller/SellerCharts";
import { liveKey } from "@/lib/dashboard/liveKey";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DemoButton } from "@/components/demo/DemoButton";
import { StatTile } from "@/components/StatTile";
import { chargeLimitFor } from "@/lib/sim/battery";
import { isAdmin, viewedMemberId } from "@/lib/auth/policy";
import { requireMember } from "@/lib/auth/session";
import { MarketSection } from "@/components/market/MarketSection";
import { getMap3d } from "@/lib/dashboard/map3d";
import { marketDay, marketSettings } from "@/lib/dashboard/market";
import { localMidnight } from "@/lib/sim/clock";
import { PRICES } from "@/lib/config";
import { getSellerDashboard, sellerPersonas } from "@/lib/dashboard/seller";
import { getI18n } from "@/lib/i18n/server";
import { explorerTxUrl } from "@/lib/solana/wallets";
import { saveSellerRules } from "./actions";
import {
  BarList,
  ChipCheckbox,
  StatusBadge,
  TxLink,
  UnitInput,
} from "@/components/ui/kit";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-4 dark:border-white/15";

export default async function SellerPage({
  searchParams,
}: PageProps<"/seller">) {
  const me = await requireMember("/seller");
  const { m, f } = await getI18n();
  const t = m.seller;
  const params = await searchParams;
  // Members see their own roof; Stadtwerk staff can open any seller's view.
  const as = viewedMemberId(
    me,
    typeof params.as === "string"
      ? params.as
      : isAdmin(me)
        ? "anna"
        : undefined,
  );
  const at = typeof params.at === "string" ? params.at : undefined;
  const personas = isAdmin(me) ? sellerPersonas() : [];
  const d = getSellerDashboard(as, at);

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
  const market =
    marketSettings().priceMode === "auction"
      ? marketDay(localMidnight(d.asOf), d.asOf)
      : null;
  const peak = d.chart.reduce(
    (best, p) => ((p.generation ?? 0) > (best.generation ?? 0) ? p : best),
    d.chart[0],
  );
  const endOfDay = d.asOf >= d.chart.at(-1)!.ts;
  const socPct =
    d.site.batteryKwh > 0
      ? Math.round((d.now.socKwh / d.site.batteryKwh) * 100)
      : 0;
  // FR-SEL-03: one line on why the battery is heading where it is.
  const chargeLimit = chargeLimitFor(
    d.site.batteryKwh,
    d.rules?.batteryReserveKwh,
  );
  const reason =
    (d.forecast.p50 >= d.now.socKwh ? t.reasonUp : t.reasonDown)(
      f.kwh(d.forecast.solarLeftKwh),
      f.kwh(d.forecast.useLeftKwh),
      f.num(d.forecast.daylightHoursLeft),
    ) +
    (chargeLimit < d.site.batteryKwh ? t.reasonCapped(f.kwh(chargeLimit)) : "");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">{d.member.name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm opacity-70">
            {m.common.asOf(f.day(d.asOf), f.time(d.asOf))} ·{" "}
            {f.num(d.site.pvKwp, 1)} kWp
            {d.site.batteryKwh > 0
              ? t.batteryKwh(f.kwh(d.site.batteryKwh, 0))
              : ""}
            {market?.nowCt != null && ` · ${m.market.now(f.ct(market.nowCt))}`}
            {!at && (
              <>
                {" · "}
                <AutoRefresh since={liveKey().key} />
              </>
            )}
          </p>
          <DemoButton next={`/seller?as=${d.member.id}`} />
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
                pathname: "/seller",
                query: at ? { as: p.id, at } : { as: p.id },
              }}
              className={`rounded-full border px-3 py-1 ${p.id === d.member.id ? "border-blue-600 font-medium" : "border-black/15 opacity-80 dark:border-white/20"}`}
            >
              {p.name}
            </Link>
          ))}
        </nav>
      )}

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile
          label={t.tiles.generatingNow}
          value={`${f.num(d.now.generatingKw, 2)} kW`}
          sub={t.tiles.today(f.kwh(d.today.generationKwh))}
        />
        {d.site.batteryKwh > 0 ? (
          <StatTile
            label={t.tiles.batteryNow}
            value={f.kwh(d.now.socKwh)}
            sub={t.tiles.batteryOf(
              f.pct(socPct / 100),
              f.kwh(d.site.batteryKwh, 0),
            )}
          />
        ) : (
          <StatTile
            label={t.tiles.battery}
            value={m.common.none}
            sub={t.tiles.noBatterySub}
          />
        )}
        {d.site.batteryKwh > 0 && (
          <StatTile
            label={endOfDay ? t.tiles.batteryEnd : t.tiles.batteryForecast}
            value={f.kwh(d.forecast.p50)}
            sub={
              endOfDay
                ? t.tiles.measured
                : t.tiles.likely(f.num(d.forecast.p10), f.num(d.forecast.p90))
            }
          />
        )}
        <StatTile
          label={t.tiles.sold}
          value={f.eur(d.today.salesEur)}
          sub={t.tiles.soldSub(
            f.kwh(d.today.soldKwh),
            f.eur(d.today.extraVsFeedInEur),
            String(PRICES.feedInCt),
          )}
        />
        <StatTile
          label={t.tiles.paid}
          value={f.eur(d.today.paidEur)}
          sub={t.tiles.paidSub}
        />
        <StatTile
          label={t.tiles.toPay}
          value={f.eur(d.today.toSettleEur)}
          sub={t.tiles.nextPayout(f.time(d.nextSettlement))}
        />
      </section>

      <section className={`mt-4 ${card}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{m.livePayments.receivedTitle}</h2>
          <p className="text-xs opacity-60">{m.livePayments.note}</p>
        </div>
        <LivePayments
          items={livePayments(d.member.id, "received")}
          direction="received"
        />
      </section>

      <section className={`mt-6 ${card}`}>
        <h2 className="font-semibold">
          {t.generationTitle(
            f.kwh(d.today.generationKwh),
            f.num((peak.generation ?? 0) * 4),
            f.time(peak.ts),
          )}
        </h2>
        <p className="mt-1 text-xs opacity-70">{t.generationNote}</p>
        <div className="mt-3">
          <GenerationChart points={d.chart} />
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

      {d.site.batteryKwh > 0 && (
        <section className={`mt-4 ${card}`}>
          <h2 className="font-semibold">
            {endOfDay
              ? t.batteryEnded(f.kwh(d.forecast.p50))
              : t.batteryExpected(
                  f.kwh(d.forecast.p50),
                  f.num(d.forecast.p10),
                  f.num(d.forecast.p90),
                )}
          </h2>
          {!endOfDay && <p className="mt-1 text-sm">{reason}</p>}
          <p className="mt-1 text-xs opacity-80">
            {d.forecast.accuracy
              ? t.learnedNote(
                  d.forecast.daysUsed,
                  f.pct(d.forecast.accuracy.learnedPct),
                  f.pct(d.forecast.accuracy.baselinePct),
                )
              : !d.forecast.learned && t.learningNote(d.forecast.daysUsed)}
          </p>
          <p className="mt-1 text-xs opacity-70">{t.batteryNote}</p>
          <div className="mt-3">
            <BatteryChart
              points={d.chart}
              asOf={d.asOf}
              capacityKwh={d.site.batteryKwh}
            />
          </div>
        </section>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className={card}>
          <h2 className="font-semibold">{t.suppliedToday}</h2>
          {d.orders.length === 0 ? (
            <p className="mt-2 text-sm opacity-70">{t.noSales}</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="kw-table w-full text-sm">
                <thead className="text-left text-xs opacity-70">
                  <tr>
                    <th className="py-1 font-normal">{t.table.buyer}</th>
                    <th className="py-1 text-right font-normal">
                      {t.table.kwh}
                    </th>
                    <th className="py-1 text-right font-normal">
                      {t.table.price}
                    </th>
                    <th className="py-1 text-right font-normal">
                      {t.table.amount}
                    </th>
                    <th className="py-1 text-right font-normal">
                      {t.table.status}
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {d.orders.map((o) => (
                    <tr
                      key={o.buyerSiteId}
                      className="border-t border-black/5 dark:border-white/10"
                    >
                      <td className="py-1">{o.buyerName}</td>
                      <td className="py-1 text-right">{f.num(o.kwh, 2)}</td>
                      <td className="py-1 text-right">{f.ct(o.avgPriceCt)}</td>
                      <td className="py-1 text-right">{f.eur(o.eur)}</td>
                      <td className="py-1 text-right">
                        {t.orderStatus[o.status]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {d.today.boughtEur > 0 && (
            <p className="mt-3 text-xs opacity-70">
              {t.alsoBought(f.eur(d.today.boughtEur))}
            </p>
          )}
        </section>

        <section className={card}>
          <h2 className="font-semibold">{t.payouts}</h2>
          {d.payouts.length === 0 ? (
            <p className="mt-2 text-sm opacity-70">{t.noPayouts}</p>
          ) : (
            <div className="mt-3">
              <BarList
                total={f.eur(
                  d.payouts.reduce((s, p) => s + p.micro, 0) / 1_000_000,
                )}
                totalLabel={t.paidOutToday}
                rows={d.payouts.map((p) => ({
                  key: p.batchId,
                  label: `${f.time(p.periodStart)}–${f.time(p.periodStart + 3_600_000)}`,
                  value: p.micro,
                  amount: f.eur(p.micro / 1_000_000),
                  color: "var(--viz-series-3)",
                  trailing:
                    p.signatures.length > 0 ? (
                      <TxLink href={explorerTxUrl(p.signatures[0])} />
                    ) : (
                      <StatusBadge
                        status={p.status}
                        label={m.common.batchStatusShort[p.status] ?? p.status}
                      />
                    ),
                }))}
              />
            </div>
          )}
        </section>
      </div>

      {d.waterfall && d.project && (
        <section className={`mt-4 ${card}`}>
          <h2 className="font-semibold">
            {t.waterfallTitle(f.eur(d.today.salesEur))}
          </h2>
          <p className="mt-1 text-xs opacity-70">
            {t.waterfallNote(d.project.name)}
          </p>
          <ul className="mt-2 space-y-1 text-sm tabular-nums">
            {d.waterfall.map((w) => (
              <li key={w.kind} className="flex justify-between">
                <span>{t.waterfall[w.kind] ?? w.kind}</span>
                <span>{f.eur(w.eur)}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/projects"
            className="mt-2 inline-block text-sm underline"
          >
            {t.repaymentProgress}
          </Link>
        </section>
      )}

      <section className={`mt-4 ${card}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">
            {t.reached(d.today.householdsSupplied)}
          </h2>
          <Link
            href="/map"
            className="shrink-0 text-sm text-blue-700 underline dark:text-blue-400"
          >
            {m.map3d.openFull} →
          </Link>
        </div>
        <p className="mt-1 text-xs opacity-70">
          {t.mapNote(f.num(d.today.co2Kg))}
        </p>
        <div className="mt-3">
          {map3d && (
            <Map3DLoader data={map3d} focusSiteId={d.site.id} compact />
          )}
        </div>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.rules}</h2>
        <p className="mt-1 text-sm opacity-70">{t.rulesIntro}</p>
        <form action={saveSellerRules} className="mt-5">
          <input type="hidden" name="memberId" value={d.member.id} />
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div className="flex flex-wrap gap-6 md:flex-col">
              <UnitInput
                name="minPriceCt"
                label={t.minPriceLabel}
                unit="ct/kWh"
                min={0}
                max={PRICES.gridCt}
                step={0.5}
                defaultValue={d.rules?.minPriceCt ?? 0}
                hint={t.minPriceHint(
                  String(PRICES.communityCt),
                  String(PRICES.feedInCt),
                )}
              />
              {d.site.batteryKwh > 0 && (
                <UnitInput
                  name="batteryReserveKwh"
                  label={t.reserveLabel}
                  unit={`kWh / ${f.num(d.site.batteryKwh, 0)}`}
                  min={0}
                  max={d.site.batteryKwh}
                  step={0.5}
                  defaultValue={chargeLimit}
                  hint={t.reserveHint(f.kwh(d.site.batteryKwh, 0))}
                />
              )}
            </div>
            <fieldset className="rounded-lg bg-black/[0.03] p-4 dark:bg-white/5">
              <legend className="sr-only">{t.priority}</legend>
              <p className="text-sm font-medium">{t.priority}</p>
              <p className="mt-0.5 text-xs opacity-60">{t.priorityHint}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {d.buyerChoices.map((b) => (
                  <ChipCheckbox
                    key={b.memberId}
                    name="priorityBuyers"
                    value={b.memberId}
                    label={b.name}
                    defaultChecked={d.rules?.priorityBuyers.includes(
                      b.memberId,
                    )}
                  />
                ))}
              </div>
            </fieldset>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/15">
            <p className="text-xs opacity-60">{m.common.rulesApplyFromNow}</p>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {m.common.saveRules}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
