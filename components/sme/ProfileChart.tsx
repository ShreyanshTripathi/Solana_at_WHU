"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
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
  useGradientId,
  xAxisProps,
  yAxisProps,
  periodLabel,
} from "@/components/charts/kit";
import { useI18n } from "@/lib/i18n/client";

export interface HourPoint {
  hourTs: number;
  usage: number | null;
  surplus: number | null;
}

// Two measures in the same unit (kWh per hour), so they share one axis: the neighbourhood's surplus
// as a filled area behind, the business's use as a line on top. Where the line sits inside the
// orange area, the business can run on neighbours' solar.
export function ProfileChart({
  points,
  businessName,
}: {
  points: HourPoint[];
  businessName: string;
}) {
  const { m, f } = useI18n();
  const data = points.map((p) => ({ ...p, label: f.time(p.hourTs) }));
  const fill = useGradientId("surplus");
  return (
    <ChartFrame
      unit={m.charts.unitHour}
      period={periodLabel(
        f,
        points.map((p) => p.hourTs),
      )}
      legend={[
        { color: "var(--viz-series-2)", label: m.charts.surplus, mark: "area" },
        {
          color: "var(--viz-series-1)",
          label: m.charts.usage(businessName),
          mark: "line",
        },
      ]}
    >
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <Fade
              id={fill}
              color="var(--viz-series-2)"
              top={0.32}
              bottom={0.03}
            />
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" interval={2} {...xAxisProps} />
          <YAxis {...yAxisProps} tickFormatter={(v: number) => f.num(v, 0)} />
          <Tooltip
            cursor={lineCursor}
            content={({ active, payload }) => {
              const p = active
                ? (payload?.[0]?.payload as (typeof data)[number] | undefined)
                : undefined;
              if (!p || p.usage === null) return null;
              return (
                <ChartTooltip
                  title={`${p.label}–${f.time(p.hourTs + 3_600_000)}`}
                  rows={[
                    {
                      color: "var(--viz-series-1)",
                      mark: "line",
                      value: f.kwh(p.usage),
                      label: m.charts.used(businessName),
                    },
                    {
                      color: "var(--viz-series-2)",
                      mark: "area",
                      value: f.kwh(p.surplus ?? 0),
                      label: m.charts.surplusShort,
                    },
                  ]}
                />
              );
            }}
          />
          <Area
            dataKey="surplus"
            name={m.charts.surplus}
            type="monotone"
            stroke="var(--viz-series-2)"
            strokeWidth={2}
            fill={`url(#${fill})`}
            dot={false}
            activeDot={activeDot}
            isAnimationActive={false}
          />
          <Line
            dataKey="usage"
            name={m.charts.usage(businessName)}
            type="monotone"
            stroke="var(--viz-series-1)"
            strokeWidth={2.5}
            dot={false}
            activeDot={activeDot}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
