"use client";

import { useState } from "react";
import {
  Area,
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
  ChartTooltip,
  gridProps,
  lineCursor,
  xAxisProps,
  yAxisProps,
} from "@/components/charts/kit";
import { useI18n } from "@/lib/i18n/client";
import type { SunDay } from "@/lib/dashboard/agentDay";

const HOUR_MS = 3_600_000;
const COLORS = {
  clearSky: "#a8a8a2",
  range: "#f5c26b",
  forecast: "#c27a12",
  measured: "#ff7a1a",
};

// The solar predictor: the sun expected through the day (forecast and its likely range) against
// a clear sky, with what the panels have measured so far. Today or tomorrow.
export function SolarPredictor(props: {
  today: SunDay;
  tomorrow: SunDay;
  asOf: number;
}) {
  const { m, f } = useI18n();
  const t = m.agent.sun;
  const [which, setWhich] = useState<"today" | "tomorrow">("today");
  const day = which === "today" ? props.today : props.tomorrow;

  // Show daylight with an hour either side.
  const from = (day.sunrise ?? day.points[0].ts) - HOUR_MS;
  const to = (day.sunset ?? day.points[day.points.length - 1].ts) + HOUR_MS;
  const data = day.points
    .filter((p) => p.ts >= from && p.ts <= to)
    .map((p) => ({
      ...p,
      label: f.time(p.ts),
      band: [p.p10, p.p90] as [number, number],
    }));
  const nowLabel =
    which === "today"
      ? data.find((p) => p.ts >= props.asOf - 15 * 60_000)?.label
      : undefined;

  const kwh = (x: number) => f.kwh(x, x < 10 ? 1 : 0);
  const chips = [
    day.sunrise && day.sunset
      ? t.sunUp(f.time(day.sunrise), f.time(day.sunset))
      : null,
    day.peakTs ? t.peak(f.time(day.peakTs)) : null,
    t.expected(kwh(day.kwh.p50), kwh(day.kwh.p10), kwh(day.kwh.p90)),
    day.kwh.clearSky > 0
      ? t.clearShare(f.pct(day.kwh.p50 / day.kwh.clearSky))
      : null,
    which === "today" && day.actualKwh !== null && day.expectedSoFarKwh
      ? t.soFar(
          kwh(day.actualKwh),
          `${day.actualKwh >= day.expectedSoFarKwh ? "+" : "−"}${f.pct(Math.abs(day.actualKwh / day.expectedSoFarKwh - 1))}`,
        )
      : null,
  ].filter(Boolean) as string[];

  const legend = [
    {
      label: t.clearSky,
      el: (
        <svg width="18" height="8" aria-hidden>
          <line
            x1="0"
            y1="4"
            x2="18"
            y2="4"
            stroke={COLORS.clearSky}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        </svg>
      ),
    },
    {
      label: t.range,
      el: (
        <span
          aria-hidden
          className="inline-block h-2.5 w-4 rounded-[3px]"
          style={{ background: COLORS.range, opacity: 0.55 }}
        />
      ),
    },
    {
      label: t.forecast,
      el: (
        <svg width="18" height="8" aria-hidden>
          <line
            x1="0"
            y1="4"
            x2="18"
            y2="4"
            stroke={COLORS.forecast}
            strokeWidth="2.5"
          />
        </svg>
      ),
    },
    ...(which === "today"
      ? [
          {
            label: t.measured,
            el: (
              <span
                aria-hidden
                className="inline-block h-2.5 w-4 rounded-[3px]"
                style={{ background: COLORS.measured }}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-2 text-xs">
          {chips.map((c) => (
            <li
              key={c}
              className="rounded-full bg-[#fff4e6] px-3 py-1 font-medium text-[#8a4b0c]"
            >
              {c}
            </li>
          ))}
        </ul>
        <div
          role="tablist"
          className="flex rounded-full bg-[#f4f4f1] p-0.5 text-xs"
        >
          {(["today", "tomorrow"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={which === k}
              onClick={() => setWhich(k)}
              className="rounded-full px-3 py-1 text-[#5c5c57] aria-selected:bg-white aria-selected:font-semibold aria-selected:text-[#111111] aria-selected:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            >
              {t[k]}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-[var(--viz-muted)]">
        {t.unit}
      </p>
      <div className="mt-1">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={data}
            margin={{ top: 18, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="sun-measured" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={COLORS.measured}
                  stopOpacity={0.55}
                />
                <stop
                  offset="100%"
                  stopColor={COLORS.measured}
                  stopOpacity={0.08}
                />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...xAxisProps} interval={7} />
            <YAxis
              {...yAxisProps}
              tickFormatter={(v: number) => f.num(v, v < 10 ? 1 : 0)}
            />
            <Tooltip
              cursor={lineCursor}
              content={({ active, payload }) => {
                const p = active
                  ? (payload?.[0]?.payload as (typeof data)[number] | undefined)
                  : undefined;
                if (!p) return null;
                const kw = (x: number) => `${f.num(x, 2)} kW`;
                return (
                  <ChartTooltip
                    title={`${p.label}–${f.time(p.ts + 15 * 60_000)}`}
                    rows={[
                      ...(p.actual !== null
                        ? [
                            {
                              color: COLORS.measured,
                              value: kw(p.actual),
                              label: t.measured,
                            },
                          ]
                        : []),
                      {
                        color: COLORS.forecast,
                        mark: "line" as const,
                        value: kw(p.p50),
                        label: t.forecast,
                      },
                      {
                        color: COLORS.range,
                        value: `${kw(p.p10)} – ${kw(p.p90)}`,
                        label: t.range,
                      },
                      {
                        color: COLORS.clearSky,
                        mark: "dashed" as const,
                        value: kw(p.clearSky),
                        label: t.clearSky,
                      },
                    ]}
                  />
                );
              }}
            />
            <Area
              dataKey="band"
              stroke="none"
              fill={COLORS.range}
              fillOpacity={0.35}
              isAnimationActive={false}
              activeDot={false}
            />
            {which === "today" && (
              <Area
                dataKey="actual"
                stroke={COLORS.measured}
                strokeWidth={2}
                fill="url(#sun-measured)"
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            <Line
              dataKey="clearSky"
              stroke={COLORS.clearSky}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="p50"
              stroke={COLORS.forecast}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            {nowLabel && (
              <ReferenceLine
                x={nowLabel}
                stroke="var(--viz-now)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{
                  value: t.now,
                  position: "insideTopLeft",
                  dx: 2,
                  dy: -16,
                  fill: "var(--viz-now)",
                  fontSize: 12,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#5c5c57]">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-2">
            {l.el}
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
