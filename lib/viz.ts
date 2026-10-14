// Six neighbour colours that validate as a set (colour-blind separation and lightness); a seventh
// seller and beyond fold into neutral grey rather than repeating a colour. The utility stays grey.
export const SUPPLY_SLOTS = 6;
export const seriesColor = (slot: number) => (slot >= 1 && slot <= SUPPLY_SLOTS ? `var(--viz-supply-${slot})` : "var(--viz-muted)");
export const utilityColor = "var(--viz-supply-grid)";
