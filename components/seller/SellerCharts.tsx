"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
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
import type { Format } from "@/lib/i18n/format";

export interface ChartPoint {
  ts: number;
  generation: number | null;
  soc: number | null;
  p50: number | null;
  band: [number, number] | null;
}

const withLabels = (points: ChartPoint[], f: Format) =>
  points.map((p) => ({ ...p, label: f.time(p.ts) }));

// Solar output per quarter-hour: a filled curve, the shape of the day at a glance.
export function GenerationChart({ points }: { points: ChartPoint[] }) {
  const { m, f } = useI18n();
  const data = withLabels(points, f);
  const fill = useGradientId("generation");
  return (
    <ChartFrame
      unit={m.charts.unitQuarter}
      period={periodLabel(
        f,
        points.map((p) => p.ts),
      )}
      legend={[
        {
          color: "var(--viz-series-1)",
          label: m.charts.generation,
          mark: "area",
        },
      ]}
    >
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <Fade
              id={fill}
              color="var(--viz-series-1)"
              top={0.4}
              bottom={0.03}
            />
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" interval={11} {...xAxisProps} />
          <YAxis {...yAxisProps} tickFormatter={(v: number) => f.num(v)} />
          <Tooltip
            cursor={lineCursor}
            content={({ active, payload }) => {
              const p = active
                ? (payload?.[0]?.payload as (typeof data)[number] | undefined)
                : undefined;
              if (!p || p.generation === null) return null;
              return (
                <ChartTooltip
                  title={`${p.label}–${f.time(p.ts + 15 * 60_000)}`}
                  rows={[
                    {
                      color: "var(--viz-series-1)",
                      mark: "area",
                      value: f.kwh(p.generation, 2),
                      label: m.charts.generation,
                    },
                  ]}
                />
              );
            }}
          />
          <Area
            dataKey="generation"
            type="monotone"
            stroke="var(--viz-series-1)"
            strokeWidth={2}
            fill={`url(#${fill})`}
            dot={false}
            activeDot={activeDot}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// The battery so far (solid, filled) and the forecast to the end of the day (dashed, with its likely range).
export function BatteryChart({
  points,
  asOf,
  capacityKwh,
}: {
  points: ChartPoint[];
  asOf: number;
  capacityKwh: number;
}) {
  const { m, f } = useI18n();
  const data = withLabels(points, f);
  const fill = useGradientId("soc");
  return (
    <ChartFrame
      unit={m.charts.unitKwh}
      period={periodLabel(
        f,
        points.map((p) => p.ts),
      )}
      legend={[
        { color: "var(--viz-series-1)", label: m.charts.battery, mark: "area" },
        {
          color: "var(--viz-series-1)",
          label: m.charts.forecastLine,
          mark: "dashed",
        },
        { color: "var(--viz-series-1)", label: m.charts.range, faded: true },
      ]}
    >
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart
          data={data}
          margin={{ top: 18, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <Fade
              id={fill}
              color="var(--viz-series-1)"
              top={0.35}
              bottom={0.03}
            />
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" interval={11} {...xAxisProps} />
          <YAxis
            domain={[0, capacityKwh]}
            {...yAxisProps}
            tickFormatter={(v: number) => f.int(v)}
          />
          <ReferenceLine
            y={capacityKwh}
            stroke="var(--viz-axis)"
            strokeDasharray="5 4"
            label={refLabel(m.charts.capacity(f.num(capacityKwh, 0)))}
          />
          <ReferenceLine
            x={f.time(asOf)}
            stroke="var(--viz-text-secondary)"
            strokeWidth={1.5}
            label={refLabel(m.charts.now, "top")}
          />
          <Tooltip
            cursor={lineCursor}
            content={({ active, payload }) => {
              const p = active
                ? (payload?.[0]?.payload as (typeof data)[number] | undefined)
                : undefined;
              if (!p) return null;
              if (p.soc !== null && p.ts <= asOf) {
                return (
                  <ChartTooltip
                    title={p.label}
                    rows={[
                      {
                        color: "var(--viz-series-1)",
                        mark: "area",
                        value: f.kwh(p.soc, 2),
                        label: m.charts.battery,
                      },
                    ]}
                  />
                );
              }
              if (p.p50 === null || !p.band) return null;
              return (
                <ChartTooltip
                  title={`${p.label} · ${m.charts.forecast}`}
                  rows={[
                    {
                      color: "var(--viz-series-1)",
                      mark: "dashed",
                      value: f.kwh(p.p50, 2),
                      label: m.charts.expected,
                    },
                    {
                      color: "var(--viz-series-1)",
                      faded: true,
                      value: `${f.num(p.band[0])}–${f.num(p.band[1])} kWh`,
                      label: m.charts.likelyRange,
                    },
                  ]}
                />
              );
            }}
          />
          <Area
            dataKey="band"
            fill="var(--viz-series-1)"
            fillOpacity={0.12}
            stroke="none"
            isAnimationActive={false}
            activeDot={false}
          />
          <Area
            dataKey="soc"
            type="monotone"
            stroke="var(--viz-series-1)"
            strokeWidth={2}
            fill={`url(#${fill})`}
            dot={false}
            activeDot={activeDot}
            isAnimationActive={false}
          />
          <Line
            dataKey="p50"
            type="monotone"
            stroke="var(--viz-series-1)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={activeDot}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
