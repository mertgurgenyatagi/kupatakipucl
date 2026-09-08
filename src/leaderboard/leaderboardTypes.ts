export interface LeaderboardEntry {
  uid: string;
  firstName: string;
  photoURL: string;
  points: number;
  ranking: string[];
  /** Optional only so existing fixtures/tests that predate this field don't
   *  need updating — every real prediction doc has one. */
  submittedAt?: number;
  /** Tiebreaker only, never shown in the UI — see contrarianScore.ts. Sum of
   *  |predicted - crowd average| across this participant's correct picks.
   *  Optional for the same reason as submittedAt. */
  contrarianScore?: number;
}
