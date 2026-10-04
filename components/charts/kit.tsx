"use client";

import { useId } from "react";
import type { Format } from "@/lib/i18n/format";

// The shared look of every chart: quiet axes and gridlines, a unit label and a chip legend above the
// plot, soft gradient fills, and one tooltip card with a swatch per series. Colours come from the
// validated chart palette (the --viz-* tokens in globals.css), so light and dark both work.

export const axisTick = { fill: "var(--viz-muted)", fontSize: 12 };
export const xAxisProps = {
  tick: axisTick,
  tickLine: false,
  axisLine: { stroke: "var(--viz-axis)" },
  tickMargin: 8,
} as const;
export const yAxisProps = {
  tick: axisTick,
  tickLine: false,
  axisLine: false,
  width: 40,
  tickMargin: 4,
} as const;
export const gridProps = {
  vertical: false,
  stroke: "var(--viz-grid)",
  strokeDasharray: "3 4",
} as const;
export const activeDot = { r: 5, stroke: "var(--viz-surface)", strokeWidth: 2 };
export const barCursor = { fill: "var(--viz-grid)", fillOpacity: 0.45 };
export const lineCursor = {
  stroke: "var(--viz-muted)",
  strokeWidth: 1,
  strokeDasharray: "3 3",
};

// A gradient id that is safe inside url(#…).
export function useGradientId(name: string) {
  return `${name}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

// Vertical fade for areas and bars: strong at the top, nearly clear at the baseline.
export function Fade({
  id,
  color,
  top = 0.35,
  bottom = 0.02,
}: {
  id: string;
  color: string;
  top?: number;
  bottom?: number;
}) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={top} />
      <stop offset="100%" stopColor={color} stopOpacity={bottom} />
    </linearGradient>
  );
}

export type Mark = "bar" | "line" | "dashed" | "area";
export interface LegendItem {
  color: string;
  label: string;
  mark?: Mark;
  faded?: boolean;
}

function Swatch({
  color,
  mark = "bar",
  faded,
}: {
  color: string;
  mark?: Mark;
  faded?: boolean;
}) {
  if (mark === "line" || mark === "dashed") {
    return (
      <svg width="16" height="8" aria-hidden className="shrink-0">
        <line
          x1="0"
          y1="4"
          x2="16"
          y2="4"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={mark === "dashed" ? "4 3" : undefined}
        />
      </svg>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
      style={{
        background: color,
        opacity: faded ? 0.5 : mark === "area" ? 0.6 : 1,
      }}
    />
  );
}

// Unit on the left, legend chips on the right, then the chart.
// The day (or days) a chart covers, from its points' timestamps: "Tue 13 Oct", or "Tue 13 Oct – Wed 14 Oct".
export function periodLabel(
  f: Format,
  timestamps: number[],
): string | undefined {
  if (timestamps.length === 0) return undefined;
  const first = f.day(Math.min(...timestamps));
  const last = f.day(Math.max(...timestamps));
  return first === last ? first : `${first} – ${last}`;
}

export function ChartFrame({
  unit,
  period,
  legend,
  children,
}: {
  unit?: string;
  period?: string;
  legend?: LegendItem[];
  children: React.ReactNode;
}) {
  return (
    <div>
      {(unit || period || (legend && legend.length > 0)) && (
        <div className="mb-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {period && (
              <span className="rounded-md bg-[var(--viz-grid)] px-2 py-0.5 text-xs font-semibold text-[var(--viz-text-secondary)]">
                {period}
              </span>
            )}
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--viz-muted)]">
              {unit}
            </span>
          </span>
          {legend && legend.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {legend.map((l) => (
                <li
                  key={l.label}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--viz-ring)] bg-[var(--viz-surface)] px-2.5 py-0.5 text-xs text-[var(--viz-text-secondary)]"
                >
                  <Swatch color={l.color} mark={l.mark} faded={l.faded} />
                  {l.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export interface TooltipRow {
  color?: string;
  mark?: Mark;
  value: string;
  label: string;
  faded?: boolean;
}

export function ChartTooltip({
  title,
  rows,
  note,
}: {
  title: string;
  rows: TooltipRow[];
  note?: string;
}) {
  return (
    <div
      className="min-w-44 rounded-lg border border-[var(--viz-ring)] bg-[var(--viz-surface)] px-3 py-2.5 text-xs"
      style={{ boxShadow: "var(--viz-shadow)" }}
    >
      <p className="mb-1.5 font-medium text-[var(--viz-text-secondary)]">
        {title}
      </p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            {r.color && (
              <Swatch color={r.color} mark={r.mark} faded={r.faded} />
            )}
            <span className="flex-1 text-[var(--viz-text-secondary)]">
              {r.label}
            </span>
            <strong className="tabular-nums text-[var(--viz-text)]">
              {r.value}
            </strong>
          </li>
        ))}
      </ul>
      {note && (
        <p className="mt-1.5 border-t border-[var(--viz-ring)] pt-1.5 text-[var(--viz-muted)]">
          {note}
        </p>
      )}
    </div>
  );
}

// A labelled marker for reference lines (capacity, now, floor and cap).
export const refLabel = (
  value: string,
  position:
    | "insideTopRight"
    | "insideBottomRight"
    | "top"
    | "insideTopLeft" = "insideTopRight",
) => ({
  value,
  position,
  fill: "var(--viz-muted)",
  fontSize: 11,
  fontWeight: 600,
});
