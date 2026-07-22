export interface LeaderboardEntry {
  uid: string;
  firstName: string;
  lastName: string;
  photoURL: string;
  points: number;
  ranking: string[];
  /** Optional only so existing fixtures/tests that predate this field don't
   *  need updating — every real prediction doc has one. */
  submittedAt?: number;
}
