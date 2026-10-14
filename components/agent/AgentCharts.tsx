"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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

const PAST = "#111111";
const FORECAST = "#c27a12";
const LEARNED = "#ff7a1a";
const STANDARD = "#a8a8a2";

const Key = ({
  color,
  dashed,
  label,
}: {
  color: string;
  dashed?: boolean;
  label: string;
}) => (
  <li className="flex items-center gap-2">
    <svg width="18" height="8" aria-hidden>
      <line
        x1="0"
        y1="4"
        x2="18"
        y2="4"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={dashed ? "4 3" : undefined}
      />
    </svg>
    {label}
  </li>
);

// Today's clearing prices and the market's expected prices for the next 24 hours, one line.
export function PriceForecastChart(props: {
  past: { ts: number; priceCt: number }[];
  forecast: { ts: number; priceCt: number }[];
  asOf: number;
}) {
  const { m, f } = useI18n();
  const t = m.agent.prices;
  const byTs = new Map<
    number,
    { ts: number; past: number | null; expected: number | null }
  >();
  for (const p of props.past)
    byTs.set(p.ts, { ts: p.ts, past: p.priceCt, expected: null });
  for (const p of props.forecast)
    byTs.set(p.ts, {
      ts: p.ts,
      past: byTs.get(p.ts)?.past ?? null,
      expected: p.priceCt,
    });
  // Join the two lines at the last measured price.
  const lastPast = props.past.at(-1);
  if (lastPast)
    byTs.set(lastPast.ts, {
      ...byTs.get(lastPast.ts)!,
      expected: lastPast.priceCt,
    });
  const data = [...byTs.values()]
    .sort((a, b) => a.ts - b.ts)
    .map((p) => ({
      ...p,
      label: `${f.day(p.ts).split(" ")[0]} ${f.time(p.ts)}`,
    }));
  const nowLabel = lastPast
    ? data.find((p) => p.ts === lastPast.ts)?.label
    : undefined;
  const ahead = props.forecast;
  const hi = ahead.reduce<(typeof ahead)[number] | null>(
    (b, p) => (p.priceCt > (b?.priceCt ?? -Infinity) ? p : b),
    null,
  );
  const lo = ahead.reduce<(typeof ahead)[number] | null>(
    (b, p) => (p.priceCt < (b?.priceCt ?? Infinity) ? p : b),
    null,
  );
  return (
    <div>
      {hi && lo && hi.priceCt !== lo.priceCt && (
        <ul className="mb-3 flex flex-wrap gap-2 text-xs">
          <li className="rounded-full bg-[#fff4e6] px-3 py-1 font-medium text-[#8a4b0c]">
            {t.highest(
              `${f.day(hi.ts).split(" ")[0]} ${f.time(hi.ts)}`,
              f.ct(hi.priceCt),
            )}
          </li>
          <li className="rounded-full bg-[#eef2ff] px-3 py-1 font-medium text-[#3b4aa0]">
            {t.lowest(
              `${f.day(lo.ts).split(" ")[0]} ${f.time(lo.ts)}`,
              f.ct(lo.priceCt),
            )}
          </li>
        </ul>
      )}
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--viz-muted)]">
        {t.unit}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={data}
          margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="label"
            {...xAxisProps}
            interval={Math.max(1, Math.floor(data.length / 5))}
            tickFormatter={(v: string) => v.split(" ")[1] ?? v}
          />
          <YAxis
            {...yAxisProps}
            domain={["dataMin - 1", "dataMax + 1"]}
            tickFormatter={(v: number) => f.num(v, 0)}
          />
          <Tooltip
            cursor={lineCursor}
            content={({ active, payload }) => {
              const p = active
                ? (payload?.[0]?.payload as (typeof data)[number] | undefined)
                : undefined;
              if (!p) return null;
              const v = p.past ?? p.expected;
              return v === null ? null : (
                <ChartTooltip
                  title={p.label}
                  rows={[
                    {
                      color: p.past !== null ? PAST : FORECAST,
                      mark: "line",
                      value: f.ct(v),
                      label: p.past !== null ? t.today : t.expected,
                    },
                  ]}
                />
              );
            }}
          />
          <Line
            dataKey="past"
            stroke={PAST}
            strokeWidth={2}
            dot={false}
            type="stepAfter"
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            dataKey="expected"
            stroke={FORECAST}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            type="stepAfter"
            isAnimationActive={false}
            connectNulls={false}
          />
          {nowLabel && (
            <ReferenceLine
              x={nowLabel}
              stroke="var(--viz-now)"
              strokeDasharray="4 3"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#5c5c57]">
        <Key color={PAST} label={t.today} />
        <Key color={FORECAST} dashed label={t.expected} />
      </ul>
    </div>
  );
}

// The forecast's error day by day, learned against the standard model.
export function AccuracyChart(props: {
  days: { dayStart: number; learnedPct: number; baselinePct: number }[];
}) {
  const { m, f } = useI18n();
  const t = m.agent.accuracy;
  const data = props.days.map((d) => ({
    ...d,
    label: f.day(d.dayStart),
    learned: d.learnedPct * 100,
    standard: d.baselinePct * 100,
  }));
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--viz-muted)]">
        {t.unit}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={data}
          margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="label"
            {...xAxisProps}
            interval={Math.max(0, Math.floor(data.length / 5))}
          />
          <YAxis
            {...yAxisProps}
            tickFormatter={(v: number) => `${f.num(v, 0)}%`}
            domain={[0, "auto"]}
          />
          <Tooltip
            cursor={lineCursor}
            content={({ active, payload }) => {
              const p = active
                ? (payload?.[0]?.payload as (typeof data)[number] | undefined)
                : undefined;
              if (!p) return null;
              return (
                <ChartTooltip
                  title={p.label}
                  rows={[
                    {
                      color: LEARNED,
                      mark: "line",
                      value: f.pct(p.learnedPct),
                      label: t.learned,
                    },
                    {
                      color: STANDARD,
                      mark: "dashed",
                      value: f.pct(p.baselinePct),
                      label: t.standard,
                    },
                  ]}
                />
              );
            }}
          />
          <Line
            dataKey="standard"
            stroke={STANDARD}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="learned"
            stroke={LEARNED}
            strokeWidth={2.5}
            dot={{ r: 3, fill: LEARNED, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#5c5c57]">
        <Key color={LEARNED} label={t.learned} />
        <Key color={STANDARD} dashed label={t.standard} />
      </ul>
    </div>
  );
}
