// Graphics drawn on the real map: little isometric houses (with solar panels where a roof has them),
// as SVG images for deck.gl's IconLayer; plus the energy arcs as 3D curves, so the moving dots can
// ride exactly along them.

const C = 0.866;

// An isometric box as SVG polygons: a house of w x d plan units and h tall, in a small viewBox.
function houseSvg({ solar, business, self }: { solar: boolean; business: boolean; self: boolean }) {
  const w = business ? 46 : 32;
  const d = business ? 32 : 26;
  const h = business ? 22 : 18;
  const ox = d * C + 4;
  const oy = 6;
  const P = (x: number, y: number, z = 0) => `${(ox + (x - y) * C).toFixed(1)},${(oy + (x + y) * 0.5 + h - z).toFixed(1)}`;
  const poly = (pts: string[], fill: string, extra = "") => `<polygon points="${pts.join(" ")}" fill="${fill}" ${extra}/>`;
  const edge = 'stroke="#C9C8C1" stroke-width="0.8" stroke-linejoin="round"';
  const width = (w + d) * C + 8;
  const height = (w + d) * 0.5 + h + 12;
  const parts = [
    poly([P(w, 0), P(w, d), P(w, d, h), P(w, 0, h)], "#E9E8E2", edge),
    poly([P(0, d), P(w, d), P(w, d, h), P(0, d, h)], "#D9D8D1", edge),
    poly([P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)], "#FFFFFF", self ? 'stroke="#FF7A1A" stroke-width="2.2" stroke-linejoin="round"' : edge),
  ];
  for (let i = 1; i <= 3; i++) {
    const fx = (w * i) / 4 - 3;
    parts.push(poly([P(fx, d, h * 0.35), P(fx + 6, d, h * 0.35), P(fx + 6, d, h * 0.65), P(fx, d, h * 0.65)], "#C9D6E3"));
  }
  if (business) parts.push(poly([P(4, d, h * 0.78), P(w - 4, d, h * 0.78), P(w - 4, d + 5, h * 0.62), P(4, d + 5, h * 0.62)], "#F3B48A"));
  if (solar) {
    parts.push(poly([P(5, 5, h), P(w - 5, 5, h), P(w - 5, d - 5, h), P(5, d - 5, h)], "#22324A"));
    const lines = [1, 2, 3].map((i) => {
      const x = 5 + ((w - 10) * i) / 4;
      return `M${P(x, 5, h)} L${P(x, d - 5, h)}`;
    });
    lines.push(`M${P(5, d / 2, h)} L${P(w - 5, d / 2, h)}`);
    parts.push(`<path d="${lines.join(" ")}" stroke="#8FA3BF" stroke-width="0.7" fill="none"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(0)}" height="${height.toFixed(0)}" viewBox="0 0 ${width.toFixed(1)} ${height.toFixed(1)}"><ellipse cx="${(width / 2 + 3).toFixed(1)}" cy="${(height - 7).toFixed(1)}" rx="${(width / 2.4).toFixed(1)}" ry="5" fill="#000" fill-opacity="0.12"/>${parts.join("")}</svg>`;
  return { svg, width: Math.round(width), height: Math.round(height) };
}

const dataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export type HouseKind = "solar" | "plain" | "business" | "businessSolar";

// deck.gl IconLayer icon definitions (each needs a unique id; anchored at the bottom of the house).
export function houseIcon(kind: HouseKind, self: boolean) {
  const { svg, width, height } = houseSvg({ solar: kind === "solar" || kind === "businessSolar", business: kind.startsWith("business"), self });
  return { id: `house-${kind}-${self ? "self" : "other"}`, url: dataUrl(svg), width: width * 2, height: height * 2, anchorY: height * 2 - 8 };
}

export type LngLatZ = [number, number, number];

// A raised arc between two points on the map, in metres above ground: higher for longer distances.
export function arcPoints(from: [number, number], to: [number, number], steps = 32): LngLatZ[] {
  const metres = Math.hypot((to[0] - from[0]) * 111_320 * Math.cos((from[1] * Math.PI) / 180), (to[1] - from[1]) * 110_540);
  const peak = Math.max(70, metres * 0.5);
  const start = 18; // leave from the roof, not the ground
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, start + 4 * peak * t * (1 - t)];
  });
}

// The point a fraction t (0..1) along an arc.
export function along(points: LngLatZ[], t: number): LngLatZ {
  const x = Math.min(points.length - 1.0001, Math.max(0, t * (points.length - 1)));
  const i = Math.floor(x);
  const r = x - i;
  const a = points[i];
  const b = points[i + 1];
  return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r, a[2] + (b[2] - a[2]) * r];
}

// The arc's colour from sunny yellow at the roof to orange at the receiver.
export function arcColor(t: number, alpha = 255): [number, number, number, number] {
  return [255, Math.round(210 + (122 - 210) * t), Math.round(63 + (26 - 63) * t), alpha];
}
