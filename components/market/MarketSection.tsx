import { PriceChart } from "@/components/market/PriceChart";
import { PRICES } from "@/lib/config";
import type { Messages } from "@/lib/i18n/messages";
import type { Format } from "@/lib/i18n/format";
import type { PricePoint } from "./PriceChart";

// "Today's market price" card for the dashboards, shown when the community trades by auction.
export function MarketSection({ m, f, points, averageCt }: { m: Messages; f: Format; points: PricePoint[]; averageCt: number | null }) {
  const card = "rounded-lg border border-black/10 p-4 dark:border-white/15";
  return (
    <section className={`mt-4 ${card}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{m.market.title}</h2>
        {averageCt !== null && <span className="text-sm opacity-70">{m.market.average(f.ct(averageCt))}</span>}
      </div>
      <p className="mt-1 text-xs opacity-70">{m.market.note(String(PRICES.feedInCt), String(PRICES.gridCt))}</p>
      {points.some((p) => p.tradedKwh > 0) ? (
        <div className="mt-3">
          <PriceChart points={points} floor={PRICES.feedInCt} cap={PRICES.gridCt} />
        </div>
      ) : (
        <p className="mt-2 text-sm opacity-70">{m.market.noTrades}</p>
      )}
    </section>
  );
}
