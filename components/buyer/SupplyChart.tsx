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
  gridProps,
  xAxisProps,
  yAxisProps,
  periodLabel,
} from "@/components/charts/kit";
import { useI18n } from "@/lib/i18n/client";
import { seriesColor } from "@/lib/viz";

export interface SupplySeries {
  siteId: string;
  name: string;
  slot: number; // categorical slot, fixed per seller
}

// Where each quarter-hour came from: one stacked bar per 15 minutes, a colour per neighbour (fixed,
// so a neighbour keeps its colour on every chart) and the utility in grey on top.
export function SupplyChart({
  points,
  series,
}: {
  points: Record<string, number | null>[];
  series: SupplySeries[];
}) {
  const { m, f } = useI18n();
  type Row = {
    label: string;
    ts: number;
    grid: number | null;
    [siteId: string]: number | string | null;
  };
  const data = points.map(
    (p) => ({ ...p, label: f.time(p.ts as number) }) as Row,
  );
  return (
    <ChartFrame
      unit={m.charts.unitQuarter}
      period={periodLabel(
        f,
        points.map((p) => Number(p.ts)),
      )}
      legend={[
        ...series.map((s) => ({ color: seriesColor(s.slot), label: s.name })),
        { color: seriesColor(0), label: m.charts.yourUtility, faded: true },
      ]}
    >
      <ResponsiveContainer width="100%" height={270}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap={1}
        >
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" interval={11} {...xAxisProps} />
          <YAxis {...yAxisProps} tickFormatter={(v: number) => f.num(v, 2)} />
          <Tooltip
            cursor={barCursor}
            content={({ active, payload }) => {
              const p = active
                ? (payload?.[0]?.payload as (typeof data)[number] | undefined)
                : undefined;
              if (!p || p.grid === null) return null;
              const rows = [
                ...series.map((s) => ({
                  color: seriesColor(s.slot),
                  label: s.name,
                  kwh: (p[s.siteId] as number) ?? 0,
                  faded: false,
                })),
                {
                  color: seriesColor(0),
                  label: m.charts.yourUtility,
                  kwh: (p.grid as number) ?? 0,
                  faded: true,
                },
              ].filter((r) => r.kwh > 0);
              const total = rows.reduce((s, r) => s + r.kwh, 0);
              const local = total - ((p.grid as number) ?? 0);
              return (
                <ChartTooltip
                  title={`${p.label}–${f.time(p.ts + 15 * 60_000)}`}
                  rows={rows.map((r) => ({
                    color: r.color,
                    faded: r.faded,
                    value: f.kwh(r.kwh, 3),
                    label: r.label,
                  }))}
                  note={
                    total > 0
                      ? `${f.pct(local / total)} ${m.charts.fromNeighbours}`
                      : undefined
                  }
                />
              );
            }}
          />
          {series.map((s) => (
            <Bar
              key={s.siteId}
              dataKey={s.siteId}
              name={s.name}
              stackId="supply"
              fill={seriesColor(s.slot)}
              stroke="var(--viz-surface)"
              strokeWidth={1}
              maxBarSize={22}
              isAnimationActive={false}
            />
          ))}
          <Bar
            dataKey="grid"
            name={m.charts.yourUtility}
            stackId="supply"
            fill={seriesColor(0)}
            fillOpacity={0.4}
            stroke="var(--viz-surface)"
            strokeWidth={1}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
