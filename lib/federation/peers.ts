import { COMMUNITY } from "@/lib/config";
import { distanceM } from "@/lib/geo";
import { expectedLoadKwh, pvKwhPerKwp } from "@/lib/sim/profiles";
import { jitter } from "@/lib/sim/random";
import type { Relation } from "./topology";

// The neighbouring energy communities of the demo. They are simulated: same weather as Vallendar,
// their own mix of homes, businesses and solar. Their positions in the grid are illustrative; a real
// federation gets them from the grid operator.
export interface PeerProfile {
  id: string;
  name: string;
  operator: string;
  relation: Relation;
  lat: number; // the community's centre (real places, illustrative grid positions)
  lon: number;
  households: number;
  householdKwh: number; // per home and year
  businessKwh: number; // all businesses, per year
  pvKwp: number;
  mode: "trade" | "credit";
}

export const FEDERATION_PEERS: PeerProfile[] = [
  { id: "mallendar", name: "Energiegemeinschaft Mallendar", operator: "Stadtwerk Vallendar", relation: "same_substation", lat: 50.4128, lon: 7.6402, households: 40, householdKwh: 3000, businessKwh: 0, pvKwp: 90, mode: "credit" },
  { id: "vallendar-nord", name: "Gewerbegebiet Vallendar-Nord", operator: "Stadtwerk Vallendar", relation: "same_area", lat: 50.4122, lon: 7.6131, households: 0, householdKwh: 0, businessKwh: 450_000, pvKwp: 60, mode: "trade" },
  { id: "hillscheid", name: "Solar-Genossenschaft Hillscheid", operator: "Bürgersolar Hillscheid eG", relation: "same_area", lat: 50.4061, lon: 7.6994, households: 6, householdKwh: 3500, businessKwh: 0, pvKwp: 350, mode: "trade" },
  // Closer in kilometres than Hillscheid, but in the neighbouring grid area: grid position decides.
  { id: "hoehr", name: "Bürgerenergie Höhr-Grenzhausen", operator: "Stadtwerke Höhr-Grenzhausen", relation: "adjacent_area", lat: 50.4344, lon: 7.6672, households: 60, householdKwh: 3200, businessKwh: 40_000, pvKwp: 260, mode: "trade" },
  // About 43 km away: exchanging with it would be ordinary supply, not energy sharing.
  { id: "cochem", name: "Quartier Cochem-Sehl", operator: "Energieversorgung Cochem (demo)", relation: "remote", lat: 50.1469, lon: 7.1669, households: 80, householdKwh: 3000, businessKwh: 0, pvKwp: 500, mode: "trade" },
];

export const peerDistanceKm = (p: { lat: number; lon: number }) => distanceM(p, { lat: COMMUNITY.lat, lon: COMMUNITY.lon }) / 1000;

export const peerProfile = (id: string) => FEDERATION_PEERS.find((p) => p.id === id);

// A community's net position in one interval after its own members have shared: + surplus, - demand.
export function peerNetKwh(p: PeerProfile, ts: number, expected = false): number {
  const noise = (key: string) => (expected ? 1 : jitter(`${key}:${p.id}:${ts}`, 0.12));
  const generation = p.pvKwp * pvKwhPerKwp(ts, COMMUNITY.lat, COMMUNITY.lon) * noise("peer-pv");
  const load =
    (p.households > 0 ? p.households * expectedLoadKwh("household", p.householdKwh, ts) : 0) +
    (p.businessKwh > 0 ? expectedLoadKwh("business", p.businessKwh, ts) : 0);
  return generation - load * noise("peer-load");
}
