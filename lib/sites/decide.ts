import type { MarketLocation } from "@/lib/grid/operator";

// The rules for accepting a site, as one pure function so each has a unit test.

export interface SiteRequest {
  postcode: string; // as the member typed it; must match the operator's record for the meter
}

// A rejection reason as a code plus the facts the message needs; stored as JSON, worded on display.
export type RejectionReason =
  | { code: "unknown_meter" }
  | { code: "postcode_mismatch"; postcode: string; city: string }
  | { code: "outside_grid_area"; gridAreaId: string; communityGridAreaId: string };

export type SiteDecision = { approved: true; location: MarketLocation } | { approved: false; reason: RejectionReason };

export function decideSite(request: SiteRequest, location: MarketLocation | null, communityGridAreaId: string): SiteDecision {
  if (!location) return { approved: false, reason: { code: "unknown_meter" } };
  if (location.postcode !== request.postcode.trim()) {
    return { approved: false, reason: { code: "postcode_mismatch", postcode: location.postcode, city: location.city } };
  }
  if (location.gridAreaId !== communityGridAreaId) {
    return { approved: false, reason: { code: "outside_grid_area", gridAreaId: location.gridAreaId, communityGridAreaId } };
  }
  return { approved: true, location };
}
