"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  barCursor,
  ChartFrame,
  ChartTooltip,
  Fade,
  gridProps,
  useGradientId,
  xAxisProps,
  yAxisProps,
  periodLabel,
} from "@/components/charts/kit";
import { useI18n } from "@/lib/i18n/client";

export interface HourTotals {
  hourTs: number;
  generated: number | null;
  shared: number | null;
}

// Grey for all solar generated, the accent for the part neighbours used: the title is about the second.
export function DayChart({ hours }: { hours: HourTotals[] }) {
  const { m, f } = useI18n();
  const data = hours.map((h) => ({ ...h, label: f.time(h.hourTs) }));
  const solar = useGradientId("solar");
  const shared = useGradientId("shared");
  return (
    <ChartFrame
      unit={m.charts.unitHour}
      period={periodLabel(
        f,
        hours.map((h) => h.hourTs),
      )}
      legend={[
        {
          color: "var(--viz-muted)",
          label: m.charts.solarGenerated,
          faded: true,
        },
        { color: "var(--viz-series-1)", label: m.charts.usedByNeighbours },
      ]}
    >
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barGap={2}
          barCategoryGap="18%"
        >
          <defs>
            <Fade
              id={solar}
              color="var(--viz-muted)"
              top={0.55}
              bottom={0.25}
            />
            <Fade
              id={shared}
              color="var(--viz-series-1)"
              top={1}
              bottom={0.7}
            />
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" interval={2} {...xAxisProps} />
          <YAxis {...yAxisProps} tickFormatter={(v: number) => f.num(v, 0)} />
          <Tooltip
            cursor={barCursor}
            content={({ active, payload }) => {
              const p = active
                ? (payload?.[0]?.payload as (typeof data)[number] | undefined)
                : undefined;
              if (!p || p.generated === null) return null;
              const share = p.generated > 0 ? (p.shared ?? 0) / p.generated : 0;
              return (
                <ChartTooltip
                  title={`${p.label}–${f.time(p.hourTs + 3_600_000)}`}
                  rows={[
                    {
                      color: "var(--viz-muted)",
                      faded: true,
                      value: f.kwh(p.generated),
                      label: m.charts.solarGenerated,
                    },
                    {
                      color: "var(--viz-series-1)",
                      value: f.kwh(p.shared ?? 0),
                      label: m.charts.usedByNeighbours,
                    },
                  ]}
                  note={
                    p.generated > 0
                      ? `${f.pct(share)} ${m.charts.usedByNeighbours.toLowerCase()}`
                      : undefined
                  }
                />
              );
            }}
          />
          <Bar
            dataKey="generated"
            name={m.charts.solarGenerated}
            fill={`url(#${solar})`}
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          />
          <Bar
            dataKey="shared"
            name={m.charts.usedByNeighbours}
            fill={`url(#${shared})`}
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
