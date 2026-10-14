"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { IconLayer, PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import * as maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map3dData, Map3dHour, Map3dSite } from "@/lib/dashboard/map3d";
import { useI18n } from "@/lib/i18n/client";
import { along, arcColor, arcPoints, houseIcon, type LngLatZ } from "./graphics";

// MapLibre 5, not 6: deck.gl 9.4 draws inside the map through MapLibre 5's renderer internals.
// The neighbourhood in 3D: MapLibre draws the base map (free OpenFreeMap tiles with 3D buildings) and
// the real power grid from OpenStreetMap; deck.gl draws each home as a little house (with its solar
// panels) and the energy shared between neighbours as glowing arcs that Volty rides along, for one
// hour of the simulated day at a time or the whole day.

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const COLORS = {
  solar: [245, 159, 0] as [number, number, number],
  use: [42, 120, 214] as [number, number, number],
  line380: "#c2255c",
  line110: "#e8590c",
  minor: "#7048e8",
  transformer: "#0c8599",
  substation: "#868e96",
  area: "#2a78d6",
};
const VIEW = { zoom: 15.3, pitch: 58, bearing: -28 };
// Graphics are drawn over the map's 3D buildings, so a tall block never hides a house or an arc.
const ON_TOP = { depthCompare: "always", depthWriteEnabled: false } as const;
type Toggle = "buildings" | "grid" | "flows" | "columns" | "area";

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const tip = (text: string) => ({ html: escapeHtml(text).replace(/\n/g, "<br/>"), style: { fontSize: "12px", borderRadius: "6px", padding: "6px 8px" } });

// `focusSiteId`: on a dashboard, draw only the arcs to and from that home and centre on it.
// `compact`: a smaller map for dashboards that starts on the whole day's totals.
export default function Map3D({ data, focusSiteId, compact = false }: { data: Map3dData; focusSiteId?: string; compact?: boolean }) {
  const { m, f } = useI18n();
  const t = m.map3d;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [ready, setReady] = useState(false);
  const [hour, setHour] = useState<number | "day">(compact ? "day" : data.startHour);
  const [playing, setPlaying] = useState(false);
  const [show, setShow] = useState<Record<Toggle, boolean>>({ buildings: true, grid: true, flows: true, columns: true, area: true });

  const siteById = useMemo(() => new Map(data.sites.map((s) => [s.id, s])), [data.sites]);
  const pos = (s: Map3dSite): [number, number] => [s.lon, s.lat];
  const focus = focusSiteId ? siteById.get(focusSiteId) : undefined;
  const center: [number, number] = focus ? pos(focus) : [data.center.lon, data.center.lat];

  // The chosen hour, or the whole day so far added up; on a dashboard only this home's arcs.
  const current = useMemo<Map3dHour>(() => {
    const picked = hour === "day" ? data.hours.slice(0, data.lastHour + 1) : [data.hours[hour]];
    const generation: Record<string, number> = {};
    const use: Record<string, number> = {};
    const flows = new Map<string, Map3dHour["flows"][number]>();
    for (const h of picked) {
      for (const [id, kwh] of Object.entries(h.generation)) generation[id] = (generation[id] ?? 0) + kwh;
      for (const [id, kwh] of Object.entries(h.use)) use[id] = (use[id] ?? 0) + kwh;
      for (const x of h.flows) {
        if (focusSiteId && x.from !== focusSiteId && x.to !== focusSiteId) continue;
        const key = `${x.from}|${x.to}`;
        flows.set(key, { from: x.from, to: x.to, kwh: (flows.get(key)?.kwh ?? 0) + x.kwh });
      }
    }
    return { generation, use, flows: [...flows.values()] };
  }, [data.hours, data.lastHour, hour, focusSiteId]);
  // On a dashboard, frame the home and everyone it traded with today; otherwise the community.
  const frame = useMemo(() => {
    if (!focus) return null;
    const ids = new Set([focus.id]);
    for (const h of data.hours) for (const x of h.flows) if (x.from === focus.id || x.to === focus.id) ids.add(x.from).add(x.to);
    const pts = [...ids].map((id) => siteById.get(id)).filter((x): x is Map3dSite => Boolean(x));
    const lons = pts.map((p) => p.lon);
    const lats = pts.map((p) => p.lat);
    const pad = 0.0005;
    return [
      [Math.min(...lons) - pad, Math.min(...lats) - pad],
      [Math.max(...lons) + pad, Math.max(...lats) + pad],
    ] as [[number, number], [number, number]];
  }, [focus, data.hours, siteById]);
  const fitOptions = { padding: { top: 30, bottom: 20, left: compact ? 290 : 40, right: 50 }, maxZoom: 16.2, pitch: VIEW.pitch, bearing: VIEW.bearing };


  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      ...(frame ? { bounds: frame, fitBoundsOptions: fitOptions } : { center, ...VIEW }),
      ...(frame ? { pitch: VIEW.pitch, bearing: VIEW.bearing } : {}),
      maxPitch: 70,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay);

    map.on("load", () => {
      // A sky behind the horizon when the map is tilted far.
      map.setSky({ "sky-color": "#bcd8f5", "horizon-color": "#eef3f8", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.4 });
      // Grid area outline (illustrative).
      map.addSource("kw-area", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [data.gridArea] } },
      });
      map.addLayer({ id: "kw-area-fill", type: "fill", source: "kw-area", paint: { "fill-color": COLORS.area, "fill-opacity": 0.05 } });
      map.addLayer({
        id: "kw-area-line",
        type: "line",
        source: "kw-area",
        paint: { "line-color": COLORS.area, "line-width": 2, "line-dasharray": [3, 2] },
      });

      // The real grid from OpenStreetMap (npm run grid:fetch).
      map.addSource("kw-grid", { type: "geojson", data: "/geo/grid.geojson" });
      map.addLayer({
        id: "kw-substations",
        type: "fill",
        source: "kw-grid",
        filter: ["==", ["get", "power"], "substation"],
        paint: { "fill-color": COLORS.substation, "fill-opacity": 0.45, "fill-outline-color": "#495057" },
      });
      map.addLayer({
        id: "kw-lines",
        type: "line",
        source: "kw-grid",
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["case", [">=", ["get", "kv"], 300], COLORS.line380, [">=", ["get", "kv"], 60], COLORS.line110, COLORS.minor],
          "line-width": ["case", [">=", ["get", "kv"], 300], 4, [">=", ["get", "kv"], 60], 3, 2],
          "line-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "kw-transformers",
        type: "circle",
        source: "kw-grid",
        filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "power"], "transformer"]],
        paint: { "circle-color": COLORS.transformer, "circle-radius": 6, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
      });
      // Make buildings slightly see-through so columns and arcs behind them stay visible.
      if (map.getLayer("building-3d")) map.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.55);
      setReady(true);
    });

    mapRef.current = map;
    overlayRef.current = overlay;
    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
    // The map is created once; the centre only matters for the first view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.gridArea]);

  // Map layers on and off.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const vis = (on: boolean) => (on ? "visible" : "none");
    for (const id of ["building-3d", "building"]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis(show.buildings));
    for (const id of ["kw-lines", "kw-transformers", "kw-substations"]) map.setLayoutProperty(id, "visibility", vis(show.grid));
    for (const id of ["kw-area-fill", "kw-area-line"]) map.setLayoutProperty(id, "visibility", vis(show.area));
  }, [ready, show.buildings, show.grid, show.area]);

  // The arcs for the chosen hour: 3D curves, so the mascots can ride exactly along them.
  const arcs = useMemo(
    () =>
      current.flows
        .filter((x) => siteById.has(x.from) && siteById.has(x.to) && x.kwh > 0.0005)
        .map((x, i) => ({ flow: x, points: arcPoints(pos(siteById.get(x.from)!), pos(siteById.get(x.to)!)), offset: (i * 0.37) % 1 })),
    [current.flows, siteById],
  );

  // deck.gl layers for the chosen hour: arcs, houses and the "You" label. The mascots are added by
  // the animation loop below, which redraws them along the arcs every frame.
  const baseRef = useRef<{ layers: unknown[]; tooltip: (info: PickingInfo) => ReturnType<typeof tip> | null }>({ layers: [], tooltip: () => null });
  useEffect(() => {
    const h = current;
    const kwh = (x: number | undefined) => f.kwh(x ?? 0, 2);
    const maxKwh = Math.max(...arcs.map((a) => a.flow.kwh), 0.001);
    // Each arc as a few overlapping smooth pieces, so the colour can fade from yellow to orange.
    type Segment = { path: LngLatZ[]; t: number; flow: (typeof h.flows)[number]; width: number };
    const PIECES = 6;
    const segments: Segment[] = arcs.flatMap((a) => {
      const width = 2.5 + (a.flow.kwh / maxKwh) * 6;
      const per = (a.points.length - 1) / PIECES;
      return Array.from({ length: PIECES }, (_, k) => ({
        path: a.points.slice(Math.floor(k * per), Math.min(a.points.length, Math.ceil((k + 1) * per) + 1)),
        t: (k + 0.5) / PIECES,
        flow: a.flow,
        width,
      }));
    });
    const kindOf = (s: Map3dSite) => (s.kind === "sme" ? (s.pvKwp > 0 ? "businessSolar" : "business") : s.pvKwp > 0 ? "solar" : "plain");
    // Only homes that traded today: on a dashboard this home and its trading partners, otherwise
    // everyone who bought or sold. The furthest are drawn first, so nearer ones overlap them.
    const traded = new Set<string>(focus ? [focus.id] : []);
    for (const hr of data.hours)
      for (const x of hr.flows)
        if (!focus || x.from === focus.id || x.to === focus.id) traded.add(x.from).add(x.to);
    const homes = data.sites.filter((s) => traded.has(s.id)).sort((a, b) => b.lat - a.lat);
    baseRef.current = {
      layers: [
        new PathLayer<Segment>({
          id: "flows-glow",
          parameters: ON_TOP,
          data: segments,
          visible: show.flows,
          getPath: (x) => x.path,
          getColor: (x) => arcColor(x.t, 55),
          getWidth: (x) => x.width + 10,
          widthUnits: "pixels",
          capRounded: true,
          jointRounded: true,
        }),
        new PathLayer<Segment>({
          id: "flows",
          parameters: ON_TOP,
          data: segments,
          visible: show.flows,
          getPath: (x) => x.path,
          getColor: (x) => arcColor(x.t),
          getWidth: (x) => x.width,
          widthUnits: "pixels",
          capRounded: true,
          jointRounded: true,
          pickable: true,
        }),
        new IconLayer<Map3dSite>({
          id: "homes",
          parameters: ON_TOP,
          data: homes,
          visible: show.columns,
          getPosition: pos,
          getIcon: (s) => houseIcon(kindOf(s), s.self),
          getSize: (s) => (s.self ? 44 : s.kind === "sme" ? 38 : 32),
          sizeUnits: "pixels",
          getColor: (s) => [255, 255, 255, s.exact || s.self ? 255 : 200],
          pickable: true,
        }),
        new TextLayer<Map3dSite>({
          id: "you",
          parameters: ON_TOP,
          data: data.sites.filter((s) => s.self),
          visible: show.columns,
          getPosition: pos,
          getText: () => t.youShort,
          getSize: 12,
          getColor: [255, 255, 255],
          getPixelOffset: [0, -66],
          fontWeight: 600,
          background: true,
          getBackgroundColor: [17, 17, 17, 255],
          backgroundPadding: [8, 3],
        }),
      ],
      tooltip: ({ object, layer }: PickingInfo) => {
        if (!object || !layer) return null;
        if (layer.id === "flows") {
          const x = (object as Segment).flow;
          return tip(t.tipFlow(siteById.get(x.from)!.name, siteById.get(x.to)!.name, f.kwh(x.kwh, 2)));
        }
        const s = object as Map3dSite;
        const where = s.self ? ` (${t.you})` : s.exact ? "" : ` (${t.streetLevel})`;
        return tip(t.tipSite(s.name + where, kwh(h.generation[s.id]), kwh(h.use[s.id])));
      },
    };
    // pos and siteById only change with data; hour and toggles drive the redraw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, current, arcs, show.columns, show.flows, data, f, t]);

  // A small dot rides each arc from the supplier to the receiver. ~30 frames a second while the map
  // is open; for visitors who prefer reduced motion, the dots wait halfway along instead.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !ready) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = 0;
    const draw = (now: number) => {
      const at = (x: (typeof arcs)[number]) => along(x.points, still ? 0.5 : (now / 2600 + x.offset) % 1);
      const glow = new ScatterplotLayer<(typeof arcs)[number]>({
        id: "pulse-glow",
        data: arcs,
        visible: show.flows,
        parameters: ON_TOP,
        getPosition: at,
        getRadius: 9,
        radiusUnits: "pixels",
        getFillColor: [255, 176, 32, 70],
        updateTriggers: { getPosition: now },
      });
      const dots = new ScatterplotLayer<(typeof arcs)[number]>({
        id: "pulse",
        data: arcs,
        visible: show.flows,
        parameters: ON_TOP,
        getPosition: at,
        getRadius: 4.5,
        radiusUnits: "pixels",
        getFillColor: [255, 122, 26, 255],
        stroked: true,
        getLineColor: [255, 255, 255, 255],
        lineWidthMinPixels: 1.5,
        updateTriggers: { getPosition: now },
      });
      overlay.setProps({ layers: [...(baseRef.current.layers as never[]), glow, dots], getTooltip: baseRef.current.tooltip as never });
    };
    const tick = (now: number) => {
      if (now - last > 33) {
        last = now;
        draw(now);
      }
      frame = requestAnimationFrame(tick);
    };
    if (still) draw(0);
    else frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, arcs, show.flows, current, show.columns]);

  // Play through the day, one hour per second.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setHour((x) => (x === "day" || x >= data.lastHour ? 0 : x + 1)), 1000);
    return () => clearInterval(timer);
  }, [playing, data.lastHour]);

  const hourStart = data.dayStart + (hour === "day" ? 0 : hour) * 3_600_000;
  const shared = current.flows.reduce((s, x) => s + x.kwh, 0);
  const box = "rounded-2xl border border-[#ecece8] bg-white/90 p-3.5 text-xs shadow-[0_20px_50px_-24px_rgba(17,17,17,0.35)] backdrop-blur";

  return (
    <div className="relative">
      <div ref={container} className={`${compact ? "h-[28rem]" : "h-[72vh] min-h-[480px]"} w-full overflow-hidden rounded-[18px]`} />

      <div className={`absolute left-3 top-3 w-72 space-y-3 ${box}`}>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="kw-hour" className="font-medium">
              {hour === "day" ? t.wholeDay : `${t.hour}: ${f.time(hourStart)}–${f.time(hourStart + 3_600_000)}`}
            </label>
            <span className="tabular-nums opacity-70">{f.kwh(shared, 1)}</span>
          </div>
          <input
            id="kw-hour"
            type="range"
            min={0}
            max={data.lastHour}
            value={hour === "day" ? data.lastHour : hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="mt-1 w-full accent-[#111111]"
          />
          <div className="mt-1 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setPlaying((p) => !p)} className="v-btn min-h-9 whitespace-nowrap px-3.5 py-1.5 text-xs">
              {playing ? t.pause : t.play}
            </button>
            <button
              type="button"
              aria-pressed={hour === "day"}
              onClick={() => {
                setPlaying(false);
                setHour("day");
              }}
              className="v-btn-secondary min-h-9 px-3 py-1.5 text-xs aria-pressed:border-[#111111] aria-pressed:font-semibold"
            >
              {t.wholeDay}
            </button>
            <button
              type="button"
              onClick={() => (frame ? mapRef.current?.fitBounds(frame, { ...fitOptions, duration: 800 }) : mapRef.current?.easeTo({ center, ...VIEW, duration: 800 }))}
              className="v-btn-secondary min-h-9 px-3 py-1.5 text-xs"
            >
              {t.resetView}
            </button>
          </div>
        </div>

        <details open={!compact} className="space-y-3">
          <summary className="cursor-pointer font-medium">{t.legendTitle}</summary>
          <fieldset>
            <legend className="mb-1 font-medium">{t.layers}</legend>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {(Object.keys(show) as Toggle[]).map((k) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={show[k]} onChange={(e) => setShow((s) => ({ ...s, [k]: e.target.checked }))} />
                  {t.layer[k]}
                </label>
              ))}
            </div>
          </fieldset>
  
          <ul className="space-y-1">
            <li className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={houseIcon("solar", false).url} alt="" className="h-4 w-auto" />
              {t.legend.solar}
            </li>
            <li className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={houseIcon("plain", false).url} alt="" className="h-4 w-auto" />
              {t.legend.use}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-1 w-4 rounded" style={{ background: "linear-gradient(90deg, #FFD23F, #FF7A1A)" }} />
              {t.legend.flow}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-1 w-4 rounded" style={{ background: COLORS.line380 }} />
              {t.legend.line380}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-1 w-4 rounded" style={{ background: COLORS.line110 }} />
              {t.legend.line110}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-4 rounded" style={{ background: COLORS.minor }} />
              {t.legend.minor}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-white" style={{ background: COLORS.transformer }} />
              {t.legend.transformer}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-3 rounded-sm opacity-60" style={{ background: COLORS.substation }} />
              {t.legend.substation}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: COLORS.area }} />
              {t.legend.area(data.gridAreaId)}
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}
