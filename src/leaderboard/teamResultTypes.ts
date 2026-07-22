export interface TeamResult {
  position: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Optional only because results docs written before this field existed
   *  won't have it until the next outcome toggle re-writes standings. */
  matchesPlayed?: number;
}
