import { TeamResult } from "./teamResultTypes";

/**
 * The core scoring rule, isolated so the leaderboard's live score and the
 * per-participant "which picks are hitting" hover both read from one source
 * of truth. A pick is correct when the predicted finishing position lands
 * within two places of the actual one — a delta of exactly 3 is excluded
 * (pinned by scoring.test.ts).
 */
export function isPickCorrect(predictedPosition: number, actualPosition: number): boolean {
  return Math.abs(predictedPosition - actualPosition) < 3;
}

export const POINTS_PER_CORRECT_PICK = 3;

export function computeScore(ranking: string[], results: Record<string, TeamResult>): number {
  let score = 0;
  ranking.forEach((teamId, index) => {
    const result = results[teamId];
    if (!result) return;
    const predictedPosition = index + 1;
    if (isPickCorrect(predictedPosition, result.position)) {
      score += POINTS_PER_CORRECT_PICK;
    }
  });
  return score;
}

/** One participant's pick, evaluated against the live table. */
export interface PickEvaluation {
  teamId: string;
  /** Where the participant predicted this team would finish (1-based). */
  predictedPosition: number;
  /** Where the team actually sits now, or null if the table has no row yet. */
  actualPosition: number | null;
  correct: boolean;
}

/**
 * Evaluate every pick in a participant's predicted order against the current
 * results. Teams with no result yet are carried through as `actualPosition:
 * null` / `correct: false` so callers can distinguish "wrong" from "no data".
 */
export function evaluatePicks(
  ranking: string[],
  results: Record<string, TeamResult>
): PickEvaluation[] {
  return ranking.map((teamId, index) => {
    const predictedPosition = index + 1;
    const result = results[teamId];
    if (!result) {
      return { teamId, predictedPosition, actualPosition: null, correct: false };
    }
    return {
      teamId,
      predictedPosition,
      actualPosition: result.position,
      correct: isPickCorrect(predictedPosition, result.position),
    };
  });
}
