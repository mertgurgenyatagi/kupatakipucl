export interface RankSnapshotEntry {
  uid: string;
  points: number;
  rank: number;
}

export interface RankSnapshot {
  matchday: number;
  entries: RankSnapshotEntry[];
  computedAt: number;
}
