export interface KnockoutMatchup {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
}

export interface KnockoutPrediction {
  quarterFinalists: string[]; // 8 team IDs
  semiFinalists: string[];    // 4 team IDs
  finalists: string[];        // 2 team IDs
  champion: string;           // 1 team ID
  submittedAt: number;
  updatedAt: number;
}
