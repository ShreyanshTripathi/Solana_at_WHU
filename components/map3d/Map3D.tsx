"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer, ColumnLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import * as maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map3dData, Map3dHour, Map3dSite } from "@/lib/dashboard/map3d";
import { useI18n } from "@/lib/i18n/client";

// MapLibre 5, not 6: deck.gl 9.4 draws inside the map through MapLibre 5's renderer internals.
// The neighbourhood in 3D: MapLibre draws the base map (free OpenFreeMap tiles with 3D buildings) and
// the real power grid from OpenStreetMap; deck.gl draws each home's solar and use as columns and the
// energy shared between neighbours as arcs, for one hour of the simulated day at a time.

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const METRES_PER_KWH = 5; // column height: 5 m per kWh in the hour
const USE_OFFSET_DEG = 0.00026; // the use column stands ~18 m east of the solar column
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

  // Whole-day columns are about 10x taller than one hour's, so scale them down to stay readable.
  const metresPerKwh = hour === "day" ? METRES_PER_KWH / 6 : METRES_PER_KWH;

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

  // deck.gl layers for the chosen hour.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const h = current;
    const kwh = (x: number | undefined) => f.kwh(x ?? 0, 2);
    overlay.setProps({
      layers: [
        new ScatterplotLayer<Map3dSite>({
          id: "homes",
          data: data.sites,
          getPosition: pos,
          getRadius: (s) => (s.self ? 16 : 11),
          radiusUnits: "meters",
          getFillColor: (s) => (s.self ? [42, 120, 214, 255] : [73, 80, 87, s.exact ? 230 : 120]),
          stroked: true,
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 2,
          pickable: true,
        }),
        new ColumnLayer<Map3dSite>({
          id: "solar",
          data: data.sites.filter((s) => (h.generation[s.id] ?? 0) > 0),
          visible: show.columns,
          getPosition: pos,
          getElevation: (s) => (h.generation[s.id] ?? 0) * metresPerKwh,
          radius: 9,
          diskResolution: 12,
          extruded: true,
          getFillColor: COLORS.solar,
          pickable: true,
          updateTriggers: { getElevation: [hour, focusSiteId] },
        }),
        new ColumnLayer<Map3dSite>({
          id: "use",
          data: data.sites.filter((s) => (h.use[s.id] ?? 0) > 0),
          visible: show.columns,
          getPosition: (s) => [s.lon + USE_OFFSET_DEG, s.lat],
          getElevation: (s) => (h.use[s.id] ?? 0) * metresPerKwh,
          radius: 7,
          diskResolution: 12,
          extruded: true,
          getFillColor: COLORS.use,
          pickable: true,
          updateTriggers: { getElevation: [hour, focusSiteId] },
        }),
        new ArcLayer<(typeof h.flows)[number]>({
          id: "flows",
          data: h.flows.filter((x) => siteById.has(x.from) && siteById.has(x.to)),
          visible: show.flows,
          getSourcePosition: (x) => pos(siteById.get(x.from)!),
          getTargetPosition: (x) => pos(siteById.get(x.to)!),
          getSourceColor: [...COLORS.solar, 230],
          getTargetColor: [...COLORS.use, 230],
          getWidth: (x) => Math.min(14, 2 + x.kwh * (hour === "day" ? 1 : 4)),
          getHeight: 0.35,
          widthUnits: "pixels",
          pickable: true,
          updateTriggers: { getWidth: [hour, focusSiteId] },
        }),
      ],
      getTooltip: ({ object, layer }: PickingInfo) => {
        if (!object || !layer) return null;
        if (layer.id === "flows") {
          const x = object as (typeof h.flows)[number];
          return tip(t.tipFlow(siteById.get(x.from)!.name, siteById.get(x.to)!.name, f.kwh(x.kwh, 2)));
        }
        const s = object as Map3dSite;
        const where = s.self ? ` (${t.you})` : s.exact ? "" : ` (${t.streetLevel})`;
        return tip(t.tipSite(s.name + where, kwh(h.generation[s.id]), kwh(h.use[s.id])));
      },
    });
    // pos and siteById only change with data; hour and toggles drive the redraw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, current, metresPerKwh, show.columns, show.flows, data, f, t]);

  // Play through the day, one hour per second.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setHour((x) => (x === "day" || x >= data.lastHour ? 0 : x + 1)), 1000);
    return () => clearInterval(timer);
  }, [playing, data.lastHour]);

  const hourStart = data.dayStart + (hour === "day" ? 0 : hour) * 3_600_000;
  const shared = current.flows.reduce((s, x) => s + x.kwh, 0);
  const box = "rounded-lg border border-black/10 bg-white/90 p-3 text-xs shadow-sm backdrop-blur dark:border-white/15 dark:bg-neutral-900/90";

  return (
    <div className="relative">
      <div ref={container} className={`${compact ? "h-[28rem]" : "h-[72vh] min-h-[480px]"} w-full overflow-hidden rounded-lg`} />

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
            className="mt-1 w-full accent-blue-600"
          />
          <div className="mt-1 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setPlaying((p) => !p)} className="whitespace-nowrap rounded bg-blue-600 px-2 py-1 font-medium text-white">
              {playing ? t.pause : t.play}
            </button>
            <button
              type="button"
              aria-pressed={hour === "day"}
              onClick={() => {
                setPlaying(false);
                setHour("day");
              }}
              className="whitespace-nowrap rounded border border-black/15 px-2 py-1 aria-pressed:bg-blue-600/10 aria-pressed:font-medium dark:border-white/20"
            >
              {t.wholeDay}
            </button>
            <button
              type="button"
              onClick={() => (frame ? mapRef.current?.fitBounds(frame, { ...fitOptions, duration: 800 }) : mapRef.current?.easeTo({ center, ...VIEW, duration: 800 }))}
              className="whitespace-nowrap rounded border border-black/15 px-2 py-1 dark:border-white/20"
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
              <span className="inline-block h-3 w-2 rounded-sm" style={{ background: `rgb(${COLORS.solar})` }} />
              {t.legend.solar}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-2 rounded-sm" style={{ background: `rgb(${COLORS.use})` }} />
              {t.legend.use}
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-1 w-4 rounded" style={{ background: `linear-gradient(90deg, rgb(${COLORS.solar}), rgb(${COLORS.use}))` }} />
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
