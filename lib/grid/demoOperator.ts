import { COMMUNITY } from "@/lib/config";
import { PERSONAS } from "@/lib/demo/personas";
import type { GridOperator, MarketLocation } from "./operator";

// Adapter: a stand-in grid operator that knows a handful of meters. The demo homes are in the
// community's grid area; the free ones let you register new sites, including two in Koblenz,
// which sit in another grid area and must be rejected.

const VALLENDAR = { postcode: "56179", city: "Vallendar", gridAreaId: COMMUNITY.gridAreaId };
const KOBLENZ = { postcode: "56068", city: "Koblenz", gridAreaId: "DE-DEMO-KOBLENZ" };

export const DEMO_FREE_METERS: (MarketLocation & { note: string })[] = [
  { maloId: "50178001117", street: "Burgstraße 9", lat: 50.4005, lon: 7.6198, ...VALLENDAR, note: "house, Vallendar" },
  { maloId: "50178001125", street: "Kirchstraße 21", lat: 50.4019, lon: 7.6239, ...VALLENDAR, note: "house, Vallendar" },
  { maloId: "50178001133", street: "Mallendarer Berg 3", lat: 50.404, lon: 7.6255, ...VALLENDAR, note: "house, Vallendar" },
  { maloId: "50178001141", street: "Rheinstraße 40", lat: 50.3994, lon: 7.6215, ...VALLENDAR, note: "shop, Vallendar" },
  { maloId: "50681002016", street: "Schloßstraße 10", lat: 50.357, lon: 7.596, ...KOBLENZ, note: "Koblenz: other grid area" },
  { maloId: "50681002024", street: "Görresplatz 1", lat: 50.359, lon: 7.595, ...KOBLENZ, note: "Koblenz: other grid area" },
];

const DEMO_HOMES: MarketLocation[] = PERSONAS.flatMap((p) =>
  p.site ? [{ maloId: p.site.meterId, street: p.site.street, lat: p.site.lat, lon: p.site.lon, ...VALLENDAR }] : [],
);

const REGISTRY = new Map([...DEMO_HOMES, ...DEMO_FREE_METERS].map((l) => [l.maloId, l]));

export const demoGridOperator: GridOperator = {
  async lookupMarketLocation(maloId) {
    const location = REGISTRY.get(maloId);
    return location ? { ...location } : null;
  },
};
