// Slots 1-3 of the reference palette validate as a set; the utility stays neutral grey.
export const seriesColor = (slot: number) => (slot >= 1 && slot <= 3 ? `var(--viz-series-${slot})` : "var(--viz-muted)");
