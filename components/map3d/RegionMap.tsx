"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer, ColumnLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import * as maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RegionCommunity, RegionHour, RegionMapData } from "@/lib/dashboard/regionMap";
import { useI18n } from "@/lib/i18n/client";

// The region in 3D: this community and its neighbouring energy communities, coloured by where they
// sit in the grid. Columns show what each had left in the hour (orange: surplus, blue: shortfall);
// arcs show the energy exchanged with this community (paid, borrowed, repaid).

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const METRES_PER_KWH = 18;
const OFFSET_DEG = 0.004; // the shortfall column stands next to the surplus column
type RGB = [number, number, number];
const LEVEL: Record<RegionCommunity["relation"], RGB> = {
  us: [42, 120, 214],
  same_substation: [47, 158, 68],
  same_area: [28, 126, 214],
  adjacent_area: [232, 89, 12],
  remote: [201, 42, 42],
};
const KIND: Record<string, RGB> = { trade: [245, 159, 0], credit: [112, 72, 232], repay: [47, 158, 68], credit_settled: [134, 142, 150] };
const SURPLUS: RGB = [245, 159, 0];
const SHORT: RGB = [42, 120, 214];

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const tip = (text: string) => ({ html: escapeHtml(text).replace(/\n/g, "<br/>"), style: { fontSize: "12px", borderRadius: "6px", padding: "6px 8px" } });

// A rough outline around a group of places (illustrative; the grid operator's real boundary would replace it).
function outline(points: { lat: number; lon: number }[], padDeg: number): [number, number][] {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const [s, n, w, e] = [Math.min(...lats) - padDeg, Math.max(...lats) + padDeg, Math.min(...lons) - padDeg * 1.5, Math.max(...lons) + padDeg * 1.5];
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
}

export default function RegionMap({ data, dayStart, lastHour, startHour }: { data: RegionMapData; dayStart: number; lastHour: number; startHour: number }) {
  const { m, f } = useI18n();
  const t = m.map3d.region;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [ready, setReady] = useState(false);
  const [hour, setHour] = useState<number | "day">(startHour);
  const [playing, setPlaying] = useState(false);

  const byId = useMemo(() => new Map(data.communities.map((c) => [c.id, c])), [data.communities]);
  const us = byId.get("us")!;
  const local = data.communities.filter((c) => c.relation !== "remote");
  const localBounds = useMemo(() => {
    const o = outline(local, 0.012);
    return [o[0], o[2]] as [[number, number], [number, number]];
  }, [local]);
  const allBounds = useMemo(() => {
    const o = outline(data.communities, 0.02);
    return [o[0], o[2]] as [[number, number], [number, number]];
  }, [data.communities]);
  const fit = { padding: { top: 40, bottom: 40, left: 320, right: 60 }, pitch: 45, bearing: -15 };

  const current = useMemo<RegionHour>(() => {
    const picked = hour === "day" ? data.hours.slice(0, lastHour + 1) : [data.hours[hour]];
    const net: Record<string, number> = {};
    const flows = new Map<string, RegionHour["flows"][number]>();
    for (const h of picked) {
      for (const [id, kwh] of Object.entries(h.net)) net[id] = (net[id] ?? 0) + kwh;
      for (const x of h.flows) {
        const key = `${x.peerId}|${x.direction}|${x.kind}`;
        flows.set(key, { ...x, kwh: (flows.get(key)?.kwh ?? 0) + x.kwh });
      }
    }
    return { net, flows: [...flows.values()] };
  }, [data.hours, hour, lastHour]);
  const scale = hour === "day" ? METRES_PER_KWH / 8 : METRES_PER_KWH;

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      bounds: localBounds,
      fitBoundsOptions: fit,
      pitch: fit.pitch,
      bearing: fit.bearing,
      maxPitch: 70,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay);
    map.on("load", () => {
      map.setSky({ "sky-color": "#bcd8f5", "horizon-color": "#eef3f8", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.4 });
      // Illustrative grid areas: ours (with the communities in it) and the adjacent one.
      const area = (id: string, points: { lat: number; lon: number }[], pad: number, color: string) => {
        if (points.length === 0) return;
        map.addSource(id, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [outline(points, pad)] } } });
        map.addLayer({ id: `${id}-fill`, type: "fill", source: id, paint: { "fill-color": color, "fill-opacity": 0.06 } });
        map.addLayer({ id: `${id}-line`, type: "line", source: id, paint: { "line-color": color, "line-width": 2, "line-dasharray": [3, 2] } });
      };
      area("kw-own-area", data.communities.filter((c) => c.relation === "us" || c.relation === "same_substation" || c.relation === "same_area"), 0.006, "#1c7ed6");
      area("kw-adjacent-area", data.communities.filter((c) => c.relation === "adjacent_area"), 0.008, "#e8590c");
      setReady(true);
    });
    mapRef.current = map;
    overlayRef.current = overlay;
    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.communities]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const h = current;
    const pos = (c: RegionCommunity): [number, number] => [c.lon, c.lat];
    const status = (c: RegionCommunity) => (c.relation === "us" ? t.you : c.allowed ? t.allowed : t.blocked[c.blockedReason ?? "not_sharing"]);
    overlay.setProps({
      layers: [
        new ScatterplotLayer<RegionCommunity>({
          id: "communities",
          data: data.communities,
          getPosition: pos,
          getRadius: (c) => (c.relation === "us" ? 650 : 520),
          radiusUnits: "meters",
          getFillColor: (c) => [...LEVEL[c.relation], c.allowed ? 110 : 45],
          stroked: true,
          getLineColor: (c) => [...LEVEL[c.relation], 255],
          lineWidthMinPixels: 2,
          pickable: true,
        }),
        new ColumnLayer<RegionCommunity>({
          id: "surplus",
          data: data.communities.filter((c) => (h.net[c.id] ?? 0) > 0.05),
          getPosition: pos,
          getElevation: (c) => (h.net[c.id] ?? 0) * scale,
          radius: 220,
          extruded: true,
          getFillColor: SURPLUS,
          pickable: true,
          updateTriggers: { getElevation: [hour] },
        }),
        new ColumnLayer<RegionCommunity>({
          id: "short",
          data: data.communities.filter((c) => (h.net[c.id] ?? 0) < -0.05),
          getPosition: (c) => [c.lon + OFFSET_DEG, c.lat],
          getElevation: (c) => -(h.net[c.id] ?? 0) * scale,
          radius: 220,
          extruded: true,
          getFillColor: SHORT,
          pickable: true,
          updateTriggers: { getElevation: [hour] },
        }),
        new ArcLayer<RegionHour["flows"][number]>({
          id: "exchanges",
          data: h.flows.filter((x) => byId.has(x.peerId)),
          getSourcePosition: (x) => pos(x.direction === "import" ? byId.get(x.peerId)! : us),
          getTargetPosition: (x) => pos(x.direction === "import" ? us : byId.get(x.peerId)!),
          getSourceColor: (x) => [...(KIND[x.kind] ?? KIND.trade), 240],
          getTargetColor: (x) => [...(KIND[x.kind] ?? KIND.trade), 240],
          getWidth: (x) => Math.min(18, 3 + x.kwh * (hour === "day" ? 0.08 : 0.6)),
          getHeight: 0.5,
          widthUnits: "pixels",
          pickable: true,
          updateTriggers: { getWidth: [hour] },
        }),
        new TextLayer<RegionCommunity>({
          id: "labels",
          data: data.communities,
          getPosition: pos,
          // Each label sits outside its circle, pushed away from our community so close ones don't overlap.
          getPixelOffset: (c) => {
            if (c.relation === "us") return [0, 46];
            const dx = c.lon - us.lon;
            const dy = c.lat - us.lat;
            const len = Math.hypot(dx * 0.64, dy) || 1;
            return [((dx * 0.64) / len) * 90, (-dy / len) * 70];
          },
          getText: (c) => (c.relation === "us" ? `${c.name}\n${t.you}` : `${c.name}\n${t.level[c.relation]} · ${status(c)}`),
          getSize: 12,
          getColor: [33, 37, 41],
          background: true,
          getBackgroundColor: [255, 255, 255, 220],
          backgroundPadding: [4, 2],
          characterSet: "auto",
          fontFamily: "system-ui, sans-serif",
          getTextAnchor: "middle",
          getAlignmentBaseline: "center",
          updateTriggers: { getText: [m] },
        }),
      ],
      getTooltip: ({ object, layer }: PickingInfo) => {
        if (!object || !layer) return null;
        if (layer.id === "exchanges") {
          const x = object as RegionHour["flows"][number];
          const peer = byId.get(x.peerId)!.name;
          const [from, to] = x.direction === "import" ? [peer, us.name] : [us.name, peer];
          return tip(t.tipFlow(from, to, f.kwh(x.kwh, 1), t.kind[x.kind] ?? x.kind));
        }
        const c = object as RegionCommunity;
        const net = h.net[c.id] ?? 0;
        return tip(
          `${c.name}\n${c.relation === "us" ? t.you : `${t.level[c.relation]} · ${f.num(c.distanceKm)} km · ${status(c)}`}\n${net >= 0 ? t.surplus(f.kwh(net, 1)) : t.short(f.kwh(-net, 1))}`,
        );
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, current, scale, data, f, t]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setHour((x) => (x === "day" || x >= lastHour ? 0 : x + 1)), 1200);
    return () => clearInterval(timer);
  }, [playing, lastHour]);

  const hourStart = dayStart + (hour === "day" ? 0 : hour) * 3_600_000;
  const imported = current.flows.filter((x) => x.direction === "import").reduce((s, x) => s + x.kwh, 0);
  const exported = current.flows.filter((x) => x.direction === "export").reduce((s, x) => s + x.kwh, 0);
  const box = "rounded-lg border border-black/10 bg-white/90 p-3 text-xs shadow-sm backdrop-blur dark:border-white/15 dark:bg-neutral-900/90";
  const swatch = (rgb: RGB) => ({ background: `rgb(${rgb.join(",")})` });

  return (
    <div className="relative">
      <div ref={container} className="h-[72vh] min-h-[480px] w-full overflow-hidden rounded-lg" />
      <div className={`absolute left-3 top-3 w-72 space-y-3 ${box}`}>
        <div>
          <p className="font-medium">{hour === "day" ? m.map3d.wholeDay : `${m.map3d.hour}: ${f.time(hourStart)}–${f.time(hourStart + 3_600_000)}`}</p>
          <p className="mt-0.5 tabular-nums opacity-80">{t.summary(f.kwh(imported, 1), f.kwh(exported, 1))}</p>
          <input
            type="range"
            min={0}
            max={lastHour}
            value={hour === "day" ? lastHour : hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="mt-1 w-full accent-blue-600"
            aria-label={m.map3d.hour}
          />
          <div className="mt-1 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setPlaying((p) => !p)} className="rounded bg-blue-600 px-2 py-1 font-medium text-white">
              {playing ? m.map3d.pause : m.map3d.play}
            </button>
            <button type="button" aria-pressed={hour === "day"} onClick={() => (setPlaying(false), setHour("day"))} className="rounded border border-black/15 px-2 py-1 aria-pressed:bg-blue-600/10 dark:border-white/20">
              {m.map3d.wholeDay}
            </button>
            <button type="button" onClick={() => mapRef.current?.fitBounds(localBounds, { ...fit, duration: 900 })} className="rounded border border-black/15 px-2 py-1 dark:border-white/20">
              {t.near}
            </button>
            <button type="button" onClick={() => mapRef.current?.fitBounds(allBounds, { ...fit, duration: 1200 })} className="rounded border border-black/15 px-2 py-1 dark:border-white/20">
              {t.all}
            </button>
          </div>
        </div>
        {!data.enabled && <p className="rounded bg-amber-500/10 p-2">{t.off}</p>}
        <details open className="space-y-2">
          <summary className="cursor-pointer font-medium">{m.map3d.legendTitle}</summary>
          <ul className="space-y-1">
            {(["same_substation", "same_area", "adjacent_area", "remote"] as const).map((r) => (
              <li key={r} className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={swatch(LEVEL[r])} />
                {t.level[r]}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-2 rounded-sm" style={swatch(SURPLUS)} />
              {t.legendSurplus}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-2 rounded-sm" style={swatch(SHORT)} />
              {t.legendShort}
            </li>
            {(["trade", "credit", "repay"] as const).map((k) => (
              <li key={k} className="flex items-center gap-2">
                <span className="inline-block h-1 w-4 rounded" style={swatch(KIND[k])} />
                {t.kind[k]}
              </li>
            ))}
          </ul>
          <p className="opacity-70">{t.note}</p>
        </details>
      </div>
    </div>
  );
}
