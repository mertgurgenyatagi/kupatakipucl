/**
 * UEFA Champions League league-phase qualification bands (2024/25 format
 * onward): a single 36-team table where the finishing position decides the
 * route out of the group stage. This is real, position-derived structure —
 * not fabricated data — surfaced as a quiet accent on the team table so the
 * table reads as a real competition standing, not a flat list.
 *
 *   1–8   → direct to the Round of 16
 *   9–24  → two-legged knockout playoff round
 *   25–36 → eliminated
 */
export type QualificationBand = "direct" | "playoff" | "eliminated";

export function qualificationBand(position: number): QualificationBand {
  if (position <= 8) return "direct";
  if (position <= 24) return "playoff";
  return "eliminated";
}
