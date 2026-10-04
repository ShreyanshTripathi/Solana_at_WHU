"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  activeDot,
  ChartFrame,
  ChartTooltip,
  Fade,
  gridProps,
  lineCursor,
  refLabel,
  useGradientId,
  xAxisProps,
  yAxisProps,
  periodLabel,
} from "@/components/charts/kit";
import { useI18n } from "@/lib/i18n/client";

export interface PricePoint {
  ts: number;
  priceCt: number;
  tradedKwh: number;
}

// The auction's clearing price per 15 minutes, between the feed-in floor and the grid-price cap.
export function PriceChart({
  points,
  floor,
  cap,
}: {
  points: PricePoint[];
  floor: number;
  cap: number;
}) {
  const { m, f } = useI18n();
  const data = points.map((p) => ({
    ...p,
    label: f.time(p.ts),
    price: p.tradedKwh > 0 ? p.priceCt : null,
  }));
  const fill = useGradientId("price");
  return (
    <ChartFrame
      unit={m.charts.unitCt}
      period={periodLabel(
        f,
        points.map((p) => p.ts),
      )}
      legend={[
        { color: "var(--viz-series-2)", label: m.charts.price, mark: "line" },
      ]}
    >
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart
          data={data}
          margin={{ top: 14, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <Fade
              id={fill}
              color="var(--viz-series-2)"
              top={0.28}
              bottom={0.02}
            />
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" interval={11} {...xAxisProps} />
          <YAxis domain={[0, Math.ceil(cap / 5) * 5]} {...yAxisProps} />
          <ReferenceLine
            y={cap}
            stroke="var(--viz-axis)"
            strokeDasharray="5 4"
            label={refLabel(m.charts.cap(f.ct(cap)))}
          />
          <ReferenceLine
            y={floor}
            stroke="var(--viz-axis)"
            strokeDasharray="5 4"
            label={refLabel(m.charts.floor(f.ct(floor)), "insideBottomRight")}
          />
          <Tooltip
            cursor={lineCursor}
            content={({ active, payload }) => {
              const p = active
                ? (payload?.[0]?.payload as (typeof data)[number] | undefined)
                : undefined;
              if (!p || p.price === null) return null;
              return (
                <ChartTooltip
                  title={`${p.label}–${f.time(p.ts + 15 * 60_000)}`}
                  rows={[
                    {
                      color: "var(--viz-series-2)",
                      mark: "line",
                      value: f.ct(p.priceCt),
                      label: m.charts.price,
                    },
                  ]}
                  note={`${f.kwh(p.tradedKwh, 2)} ${m.market.traded}`}
                />
              );
            }}
          />
          <Area
            dataKey="price"
            type="stepAfter"
            stroke="var(--viz-series-2)"
            strokeWidth={2}
            fill={`url(#${fill})`}
            dot={false}
            activeDot={activeDot}
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
