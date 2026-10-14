"use client";

import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  barCursor,
  ChartTooltip,
  gridProps,
  periodLabel,
  xAxisProps,
  yAxisProps,
} from "@/components/charts/kit";
import { useI18n } from "@/lib/i18n/client";
import { seriesColor, utilityColor } from "@/lib/viz";

export interface SupplySeries {
  siteId: string;
  name: string;
  slot: number; // categorical slot, fixed per seller
}

const HOUR_MS = 3_600_000;
const SIZE_KEY = "volty.supplyChartHeight";
const MIN_H = 200;
const MAX_H = 520;
const DEFAULT_H = 300;

// The chosen height, kept in this browser only (a missing or blocked storage falls back to the default).
const sizeListeners = new Set<() => void>();
let sizeFallback = DEFAULT_H;
function readSize() {
  try {
    const saved = Number(localStorage.getItem(SIZE_KEY));
    if (saved >= MIN_H && saved <= MAX_H) return saved;
  } catch {}
  return sizeFallback;
}
function writeSize(h: number) {
  sizeFallback = h;
  try {
    localStorage.setItem(SIZE_KEY, String(h));
  } catch {}
  sizeListeners.forEach((l) => l());
}
function subscribeSize(l: () => void) {
  sizeListeners.add(l);
  return () => sizeListeners.delete(l);
}

type Row = {
  label: string;
  ts: number;
  top: string | null;
  [key: string]: number | string | null;
};

// One bar segment: a plain rectangle, with a white gap separating the segments.
function Segment(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
}) {
  const { x = 0, y = 0, width = 0, fill } = props;
  const height = Math.max(0, (props.height ?? 0) - 2); // the 2px gap above each segment
  if (height <= 0 || width <= 0) return null;
  return <rect x={x} y={y + 2} width={width} height={height} fill={fill} />;
}

// Where each hour's power came from: one stacked bar per hour, the utility in grey at the bottom and
// each neighbour above it in their fixed colour. A slider sets the chart's height (remembered in this
// browser only).
export function SupplyChart({
  points,
  series,
  title,
  note,
}: {
  points: Record<string, number | null>[];
  series: SupplySeries[];
  title: React.ReactNode;
  note?: string;
}) {
  const { m, f } = useI18n();
  const height = useSyncExternalStore(subscribeSize, readSize, () => DEFAULT_H);
  // Quarter-hours summed into hours; an hour with no reading yet stays empty.
  const byHour = new Map<number, Row>();
  let lastTs: number | null = null;
  for (const p of points) {
    const ts = p.ts as number;
    const hourTs = ts - (((ts % HOUR_MS) + HOUR_MS) % HOUR_MS);
    const row =
      byHour.get(hourTs) ??
      ({ label: f.time(hourTs), ts: hourTs, top: null } as Row);
    byHour.set(hourTs, row);
    if (p.grid === null) continue;
    lastTs = ts;
    for (const key of ["grid", ...series.map((s) => s.siteId)])
      row[key] =
        ((row[key] as number | null) ?? 0) + ((p[key] as number | null) ?? 0);
  }
  const stackOrder = ["grid", ...[...series].reverse().map((s) => s.siteId)]; // bottom to top
  const all = [...byHour.values()].sort((a, b) => a.ts - b.ts);
  for (const row of all)
    row.top =
      [...stackOrder].reverse().find((k) => ((row[k] as number) ?? 0) > 0) ??
      null;
  // Start at the first hour with any power, so the night before doesn't leave a long empty stretch.
  const first = all.findIndex((r) => r.top !== null);
  const data = first > 0 ? all.slice(first) : all;
  // "now" marks the hour being filled, while the day still has hours to come.
  const nowHour = lastTs === null ? null : lastTs - (lastTs % HOUR_MS);
  const nowLabel =
    nowHour !== null && nowHour < (all.at(-1)?.ts ?? 0)
      ? f.time(nowHour)
      : null;

  const unitAndDay = [
    m.charts.unitHour,
    periodLabel(
      f,
      data.map((r) => r.ts),
    ),
  ]
    .filter(Boolean)
    .join(" · ");
  const legend = [
    ...series.map((s) => ({ color: seriesColor(s.slot), label: s.name })),
    { color: utilityColor, label: m.charts.yourUtility },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {note && (
            <p className="mt-1 text-xs text-[var(--viz-muted)]">{note}</p>
          )}
        </div>
        <p className="pt-1 text-xs text-[var(--viz-muted)]">{unitAndDay}</p>
      </div>

      <div className="mt-5">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{ top: 22, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="22%"
          >
            <CartesianGrid {...gridProps} strokeDasharray={undefined} />
            <XAxis
              dataKey="label"
              {...xAxisProps}
              tick={{
                ...xAxisProps.tick,
                fontFamily: "var(--font-geist-mono)",
              }}
              interval={data.length > 14 ? 1 : 0}
            />
            <YAxis
              {...yAxisProps}
              tickFormatter={(v: number) => f.num(v, 0)}
              allowDecimals={false}
            />
            <Tooltip
              cursor={barCursor}
              content={({ active, payload }) => {
                const p = active
                  ? (payload?.[0]?.payload as Row | undefined)
                  : undefined;
                if (!p || p.top === null) return null;
                const rows = [
                  ...series.map((s) => ({
                    color: seriesColor(s.slot),
                    label: s.name,
                    kwh: (p[s.siteId] as number) ?? 0,
                  })),
                  {
                    color: utilityColor,
                    label: m.charts.yourUtility,
                    kwh: (p.grid as number) ?? 0,
                  },
                ].filter((r) => r.kwh > 0);
                const total = rows.reduce((s, r) => s + r.kwh, 0);
                const local = total - ((p.grid as number) ?? 0);
                return (
                  <ChartTooltip
                    title={`${p.label}–${f.time(p.ts + HOUR_MS)}`}
                    rows={rows.map((r) => ({
                      color: r.color,
                      value: f.kwh(r.kwh, 2),
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
            {stackOrder.map((key) => {
              const s = series.find((x) => x.siteId === key);
              return (
                <Bar
                  key={key}
                  dataKey={key}
                  name={s?.name ?? m.charts.yourUtility}
                  stackId="supply"
                  fill={s ? seriesColor(s.slot) : utilityColor}
                  shape={<Segment />}
                  maxBarSize={44}
                  isAnimationActive={false}
                />
              );
            })}
            {nowLabel && (
              <ReferenceLine
                x={nowLabel}
                stroke="var(--viz-now)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{
                  value: m.charts.now.toLowerCase(),
                  position: "insideTopLeft",
                  dx: 2,
                  dy: -20,
                  fill: "var(--viz-now)",
                  fontSize: 12,
                }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--viz-text-secondary)]">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-3 w-3"
                style={{ background: l.color }}
              />
              {l.label}
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-2 text-xs text-[var(--viz-muted)]">
          {m.charts.chartSize}
          <input
            type="range"
            min={MIN_H}
            max={MAX_H}
            step={20}
            value={height}
            onChange={(e) => writeSize(Number(e.target.value))}
            className="w-28 accent-[#111111]"
          />
        </label>
      </div>
    </div>
  );
}
