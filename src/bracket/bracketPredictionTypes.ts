import { MatchupId } from "./bracketStructure";

export interface BracketPrediction {
  picks: Record<MatchupId, string>;
  submittedAt: number;
}
