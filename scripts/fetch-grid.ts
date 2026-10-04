// Downloads the electricity grid around the community from OpenStreetMap (power lines, cables,
// substations, transformers) and saves it as GeoJSON for the 3D map. Run when the area changes:
//   npm run grid:fetch
// Data © OpenStreetMap contributors, ODbL. Street-level low-voltage cables are mostly underground
// and not in OpenStreetMap; the grid operator's own data would replace this in production.
import fs from "node:fs";
import path from "node:path";
import { COMMUNITY } from "@/lib/config";

const MARGIN_DEG = 0.025; // about 2-3 km around the community centre
const bbox = [COMMUNITY.lat - MARGIN_DEG, COMMUNITY.lon - MARGIN_DEG * 1.4, COMMUNITY.lat + MARGIN_DEG, COMMUNITY.lon + MARGIN_DEG * 1.4]
  .map((x) => x.toFixed(4))
  .join(",");
const query = `[out:json][timeout:60];
(way["power"~"^(line|minor_line|cable)$"](${bbox});
 way["power"="substation"](${bbox});
 node["power"~"^(transformer|substation)$"](${bbox}););
out geom;`;

interface Element {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

// Highest voltage on a line, in kV, from tags like "380000;110000".
const kv = (voltage?: string) => Math.max(0, ...(voltage ?? "").split(";").map((v) => Number(v) / 1000).filter(Number.isFinite));

(async () => {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "User-Agent": "Volty-demo/0.1", Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) throw new Error(`Overpass answered ${res.status}`);
  const { elements } = (await res.json()) as { elements: Element[] };

  type Feature = { type: "Feature"; properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } };
  const features = elements.flatMap((e): Feature[] => {
    const power = e.tags?.power ?? "";
    const properties = { id: `${e.type}/${e.id}`, power, kv: kv(e.tags?.voltage), name: e.tags?.name ?? null, operator: e.tags?.operator ?? null };
    if (e.type === "node") return [{ type: "Feature", properties, geometry: { type: "Point", coordinates: [e.lon, e.lat] } }];
    const coords = (e.geometry ?? []).map((p) => [p.lon, p.lat]);
    if (power === "substation") return [{ type: "Feature", properties, geometry: { type: "Polygon", coordinates: [coords] } }];
    return [{ type: "Feature", properties, geometry: { type: "LineString", coordinates: coords } }];
  });

  const out = path.join("public", "geo", "grid.geojson");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ type: "FeatureCollection", attribution: "© OpenStreetMap contributors (ODbL)", features }));
  console.log(`Saved ${features.length} grid features to ${out}`);
})();
