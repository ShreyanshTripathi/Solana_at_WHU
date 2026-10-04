// Federation rules (pure). Power always flows through the one connected grid; what decides whether
// two energy communities may share is how close they are in the grid, not a chain of contracts.
//  - same substation: the closest level, least grid used;
//  - same grid area: energy sharing under §42c EnWG from 1 June 2026;
//  - directly adjacent grid area: §42c allows it from 1 June 2028;
//  - anything further away: ordinary electricity supply, not energy sharing (and a chain of
//    communities A -> B -> C nets out to C supplying A, so it can't get round this).
// The cost is a ranking weight for how much grid an exchange uses (more grid levels, more losses
// and congestion), so the model always prefers the nearest community that can help.

export type Relation = "same_substation" | "same_area" | "adjacent_area" | "remote";

export const RELATIONS: Record<Relation, { rank: number; costCt: number; allowedFrom: number | null }> = {
  same_substation: { rank: 0, costCt: 0.3, allowedFrom: Date.parse("2026-06-01T00:00:00+02:00") },
  same_area: { rank: 1, costCt: 1, allowedFrom: Date.parse("2026-06-01T00:00:00+02:00") },
  adjacent_area: { rank: 2, costCt: 2, allowedFrom: Date.parse("2028-06-01T00:00:00+02:00") },
  remote: { rank: 3, costCt: 5, allowedFrom: null },
};

export type Legality = { allowed: true } | { allowed: false; reason: "from_2028" | "not_sharing" };

export function legality(relation: Relation, ts: number): Legality {
  const from = RELATIONS[relation].allowedFrom;
  if (from === null) return { allowed: false, reason: "not_sharing" };
  return ts >= from ? { allowed: true } : { allowed: false, reason: "from_2028" };
}
