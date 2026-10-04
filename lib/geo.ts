const EARTH_RADIUS_M = 6_371_000;
const DEG = Math.PI / 180;

export interface Point {
  lat: number;
  lon: number;
}

export function distanceM(a: Point, b: Point): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLon = (b.lon - a.lon) * DEG;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
