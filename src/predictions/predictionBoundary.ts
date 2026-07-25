// A team scores if it lands within 2 places of its predicted position
// (SPEC.md §3: |predicted - actual| < 3). The hover boundary bracket
// (predictions-page-round-02 Q9-14, replaced with a bracket in round-03)
// visualizes exactly that band.
export const BOUNDARY_SPAN = 2;

/** 0-based [start, end] row-index band around `index`, clamped to the list. */
export function boundaryBand(index: number, total: number): [number, number] {
  return [Math.max(0, index - BOUNDARY_SPAN), Math.min(total - 1, index + BOUNDARY_SPAN)];
}

export type BoundaryBandRole = "none" | "top" | "middle" | "bottom";

/** Where `rowIndex` sits relative to the band hovered around `hoveredIndex` —
 *  "top"/"bottom" are the band's two capping rows (where the bracket's
 *  closing strokes go), "middle" is everything between them. */
export function boundaryBandRole(rowIndex: number, hoveredIndex: number, total: number): BoundaryBandRole {
  const [start, end] = boundaryBand(hoveredIndex, total);
  if (rowIndex < start || rowIndex > end) return "none";
  if (rowIndex === start) return "top";
  if (rowIndex === end) return "bottom";
  return "middle";
}
