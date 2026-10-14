import { createHash } from "node:crypto";
import { COMMUNITY } from "@/lib/config";
import type { GridOperator, MarketLocation } from "./operator";

// Adapter for the product copy before a real grid-operator connection exists: every valid meter
// is accepted, in any area, at the address the member typed, and joins the one community. Its map
// position is the community's centre plus a small fixed offset from the meter id (until the operator
// or a geocoder supplies the real one), so homes don't sit on top of each other.
// Swap this for the operator's market communication before going live.
export function openGridOperator(typed: { street: string; postcode: string; city: string }, gridAreaId: string): GridOperator {
  return {
    async lookupMarketLocation(maloId): Promise<MarketLocation> {
      const h = createHash("sha256").update(maloId).digest();
      const offset = (byte: number) => (byte / 255 - 0.5) * 0.008; // up to about ±300 m
      return {
        maloId,
        gridAreaId,
        street: typed.street.trim(),
        postcode: typed.postcode.trim(),
        city: typed.city.trim(),
        lat: COMMUNITY.lat + offset(h[0]),
        lon: COMMUNITY.lon + offset(h[1]),
      };
    },
  };
}
