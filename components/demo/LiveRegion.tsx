"use client";

import { useMemo, useState } from "react";
import type { RegionCommunity } from "@/lib/dashboard/regionMap";
import type { DemoHour } from "@/lib/demo/run";
import { useI18n } from "@/lib/i18n/client";

// The federation live, while the demo simulates the day: every community at its place, what each had
// left this hour (bar), and the energy flowing between ours and the neighbours (animated arrows).
// Plain SVG, so it runs smoothly on any presentation laptop.

const W = 860;
const H = 520;
const R = 24;
// Schematic, not geographic: our community on the left, each neighbour on a ring by grid level, so
// "closer in the grid" reads as closer on screen (kilometres are in the labels).
const CENTER = { x: 170, y: 255 };
const RING: Record<
  Exclude<RegionCommunity["relation"], "us">,
  { radius: number; angle: number }
> = {
  same_substation: { radius: 175, angle: -88 },
  same_area: { radius: 330, angle: 0 },
  adjacent_area: { radius: 500, angle: -22 },
  remote: { radius: 640, angle: 14 },
};
const BOUNDARY: {
  radius: number;
  color: string;
  key: "substation" | "area" | "adjacent";
}[] = [
  { radius: 250, color: "#2f9e44", key: "substation" },
  { radius: 420, color: "#1c7ed6", key: "area" },
  { radius: 575, color: "#e8590c", key: "adjacent" },
];
const LEVEL: Record<RegionCommunity["relation"], string> = {
  us: "#2a78d6",
  same_substation: "#2f9e44",
  same_area: "#1c7ed6",
  adjacent_area: "#e8590c",
  remote: "#c92a2a",
};
const KIND: Record<string, string> = {
  trade: "#f59f00",
  credit: "#7048e8",
  repay: "#2f9e44",
  credit_settled: "#868e96",
};
const explorer = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

export function LiveRegion({
  communities,
  hours,
  running,
}: {
  communities: RegionCommunity[];
  hours: DemoHour[];
  running: boolean;
}) {
  const { m, f } = useI18n();
  const t = m.demo.live;
  const r = m.map3d.region;
  const withRegion = hours.filter((h) => h.region);
  const [picked, setPicked] = useState<number | null>(null);
  // Follow the newest hour while the demo runs; afterwards the slider picks one.
  const index =
    running || picked === null
      ? withRegion.length - 1
      : Math.min(picked, withRegion.length - 1);
  const hour = withRegion[index];

  const pos = useMemo(() => {
    const out = new Map<string, { x: number; y: number }>();
    for (const c of communities) {
      if (c.relation === "us") {
        out.set(c.id, CENTER);
        continue;
      }
      const ring = RING[c.relation];
      const same = communities.filter((x) => x.relation === c.relation);
      const i = same.findIndex((x) => x.id === c.id);
      const spread = same.length > 1 ? (i / (same.length - 1) - 0.5) * 70 : 0;
      const a = ((ring.angle + spread) * Math.PI) / 180;
      out.set(c.id, {
        x: Math.min(W - 95, CENTER.x + ring.radius * Math.cos(a)),
        y: CENTER.y + ring.radius * Math.sin(a),
      });
    }
    return out;
  }, [communities]);

  const net = hour?.region?.net ?? {};
  const flows = hour?.region?.flows ?? [];
  const imported = flows
    .filter((x) => x.direction === "import")
    .reduce((s, x) => s + x.kwh, 0);
  const exported = flows
    .filter((x) => x.direction === "export")
    .reduce((s, x) => s + x.kwh, 0);
  const us = pos.get("us")!;
  const recent = withRegion
    .filter((h) => (h.region?.flows.length ?? 0) > 0)
    .slice(-6)
    .reverse();
  const nameOf = (id: string) =>
    communities.find((c) => c.id === id)?.name ?? id;
  const status = (c: RegionCommunity) =>
    c.relation === "us"
      ? r.you
      : c.allowed
        ? r.level[c.relation]
        : r.blocked[c.blockedReason ?? "not_sharing"];

  return (
    <section className="mt-6 rounded-lg border border-black/10 p-5 dark:border-white/15">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          {running && (
            <span
              className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-600 align-middle"
              aria-hidden
            />
          )}
          {t.title}
        </h2>
        {hour && (
          <p className="text-sm tabular-nums">
            <span className="font-medium">
              {f.day(hour.hourStart)} {f.time(hour.hourStart)}–
              {f.time(hour.hourStart + 3_600_000)}
            </span>
            <span className="opacity-70">
              {" "}
              · {r.summary(f.kwh(imported, 1), f.kwh(exported, 1))}
            </span>
          </p>
        )}
      </div>
      <p className="mt-1 text-xs opacity-70">{t.intro}</p>

      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[640px]"
          role="img"
          aria-label={t.title}
        >
          <defs>
            <style>{`.kw-flow{stroke-dasharray:10 8;animation:kw-dash .7s linear infinite}@keyframes kw-dash{to{stroke-dashoffset:-18}}`}</style>
            {Object.entries(KIND).map(([k, c]) => (
              <marker
                key={k}
                id={`kw-arrow-${k}`}
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerUnits="userSpaceOnUse"
                markerWidth="16"
                markerHeight="16"
                orient="auto-start-reverse"
              >
                <path d="M0 0L10 5L0 10z" fill={c} />
              </marker>
            ))}
          </defs>
          {BOUNDARY.map((b) => (
            <g key={b.key}>
              <circle
                cx={CENTER.x}
                cy={CENTER.y}
                r={b.radius}
                fill="none"
                stroke={b.color}
                strokeOpacity="0.55"
                strokeDasharray="6 5"
              />
              {/* The ring's name where it meets the top edge. */}
              <text
                x={
                  CENTER.x +
                  Math.sqrt(Math.max(0, b.radius ** 2 - (CENTER.y - 18) ** 2)) +
                  6
                }
                y={18}
                fontSize="11"
                fill={b.color}
              >
                {t.boundary[b.key]}
              </text>
            </g>
          ))}

          {/* Exchanges this hour: from the giver to the taker, dashes moving the way the energy goes. */}
          {flows.map((x, i) => {
            const peer = pos.get(x.peerId);
            if (!peer) return null;
            const [a, b] = x.direction === "import" ? [peer, us] : [us, peer];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const [ux, uy] = [dx / len, dy / len];
            const start = { x: a.x + ux * (R + 4), y: a.y + uy * (R + 4) };
            const end = { x: b.x - ux * (R + 8), y: b.y - uy * (R + 8) };
            const bend = (i % 2 === 0 ? 1 : -1) * (24 + 10 * Math.floor(i / 2));
            const mid = {
              x: (start.x + end.x) / 2 - uy * bend,
              y: (start.y + end.y) / 2 + ux * bend,
            };
            const color = KIND[x.kind] ?? KIND.trade;
            return (
              <g key={`${x.peerId}${x.direction}${x.kind}`}>
                <path
                  d={`M${start.x} ${start.y} Q${mid.x} ${mid.y} ${end.x} ${end.y}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={Math.min(12, 2.5 + x.kwh * 0.35)}
                  strokeLinecap="round"
                  className="kw-flow"
                  markerEnd={`url(#kw-arrow-${x.kind in KIND ? x.kind : "trade"})`}
                />
                {/* One label per neighbour: several exchanges with the same one are listed together. */}
                {flows.findIndex((y) => y.peerId === x.peerId) === i && (
                  <text
                    x={mid.x}
                    y={mid.y - 6}
                    fontSize="11.5"
                    textAnchor="middle"
                    fontWeight="600"
                    stroke="white"
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {flows
                      .filter((y) => y.peerId === x.peerId)
                      .map((y, k) => (
                        <tspan
                          key={k}
                          x={mid.x}
                          dy={k === 0 ? 0 : 14}
                          fill={KIND[y.kind] ?? KIND.trade}
                        >
                          {f.kwh(y.kwh, 1)} · {r.kind[y.kind] ?? y.kind}
                        </tspan>
                      ))}
                  </text>
                )}
              </g>
            );
          })}

          {communities.map((c) => {
            const p = pos.get(c.id)!;
            const v = net[c.id] ?? 0;
            const bar = Math.min(60, Math.abs(v) * 1.2);
            return (
              <g key={c.id} opacity={c.allowed ? 1 : 0.6}>
                {Math.abs(v) > 0.05 && (
                  <rect
                    x={p.x - R - 16}
                    y={v > 0 ? p.y - bar : p.y}
                    width="9"
                    height={bar}
                    rx="2"
                    fill={v > 0 ? "#f59f00" : "#2a78d6"}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={c.relation === "us" ? R + 4 : R}
                  fill={LEVEL[c.relation]}
                  fillOpacity={c.relation === "us" ? 0.9 : 0.25}
                  stroke={LEVEL[c.relation]}
                  strokeWidth="2.5"
                  strokeDasharray={c.allowed ? undefined : "4 3"}
                />
                {!c.allowed && (
                  <text
                    x={p.x}
                    y={p.y + 6}
                    fontSize="18"
                    textAnchor="middle"
                    fill={LEVEL[c.relation]}
                  >
                    ✕
                  </text>
                )}
                <text
                  x={p.x}
                  y={p.y + R + 18}
                  fontSize="12"
                  fontWeight="600"
                  textAnchor="middle"
                  fill="currentColor"
                >
                  {c.relation === "us"
                    ? c.name.replace(/\s*\(demo\)/, "")
                    : c.name}
                </text>
                <text
                  x={p.x}
                  y={p.y + R + 32}
                  fontSize="10.5"
                  textAnchor="middle"
                  fill="currentColor"
                  opacity="0.7"
                >
                  {status(c)}
                  {c.relation === "remote"
                    ? ` · ${f.num(c.distanceKm, 0)} km`
                    : ""}
                  {Math.abs(v) > 0.05
                    ? ` · ${v > 0 ? "+" : "−"}${f.num(Math.abs(v))} kWh`
                    : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {!running && withRegion.length > 1 && (
        <input
          type="range"
          min={0}
          max={withRegion.length - 1}
          value={index}
          onChange={(e) => setPicked(Number(e.target.value))}
          className="mt-2 w-full accent-blue-600"
          aria-label={m.map3d.hour}
        />
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
        {(["trade", "credit", "repay"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              className="inline-block h-1 w-4 rounded"
              style={{ background: KIND[k] }}
            />
            {r.kind[k]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-2 rounded-sm bg-[#f59f00]" />
          {r.legendSurplus}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-2 rounded-sm bg-[#2a78d6]" />
          {r.legendShort}
        </span>
      </div>

      {recent.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium">{t.ticker}</h3>
          <ul className="mt-1 space-y-1 text-xs tabular-nums">
            {recent.map((h) => (
              <li key={h.hourStart} className="flex flex-wrap gap-x-3">
                <span className="w-20 opacity-60">{f.time(h.hourStart)}</span>
                <span className="flex flex-wrap gap-x-3">
                  {h.region!.flows.map((x) => (
                    <span key={`${x.peerId}${x.direction}${x.kind}`}>
                      {x.direction === "import"
                        ? `${nameOf(x.peerId)} → ${r.you}`
                        : `${r.you} → ${nameOf(x.peerId)}`}
                      : {f.kwh(x.kwh, 1)} ({r.kind[x.kind] ?? x.kind})
                    </span>
                  ))}
                </span>
                {h.signatures.length > 0 && (
                  <a
                    href={explorer(h.signatures.at(-1)!)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 underline dark:text-blue-400"
                  >
                    {t.settled} ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
