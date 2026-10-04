// Port: what Volty needs from the grid operator about a meter. The grid operator, not the member,
// knows which grid area a market location is in, so registration never trusts a typed-in grid area.
// In production this goes through the supplier's market communication with the operator and
// answers within days; the demo adapter answers at once from a small registry.

export interface MarketLocation {
  maloId: string;
  gridAreaId: string;
  street: string;
  postcode: string;
  city: string;
  lat: number;
  lon: number;
}

export interface GridOperator {
  lookupMarketLocation(maloId: string): Promise<MarketLocation | null>;
}
