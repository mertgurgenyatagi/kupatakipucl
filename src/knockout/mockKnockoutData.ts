import { KnockoutMatchup } from "./knockoutTypes";

/**
 * Placeholder Round of 16 matchups.
 * 8 pairings (16 teams) matching exact team IDs in TEAMS.
 */
export const MOCK_ROUND_OF_16: KnockoutMatchup[] = [
  // Left Bracket
  { id: "r16-1", homeTeamId: "real-madrid", awayTeamId: "bayern-munich" },
  { id: "r16-2", homeTeamId: "arsenal", awayTeamId: "paris-saint-germain" },
  { id: "r16-3", homeTeamId: "manchester-city", awayTeamId: "inter-milan" },
  { id: "r16-4", homeTeamId: "barcelona", awayTeamId: "atletico-madrid" },
  // Right Bracket
  { id: "r16-5", homeTeamId: "bayer-leverkusen", awayTeamId: "borussia-dortmund" },
  { id: "r16-6", homeTeamId: "juventus", awayTeamId: "liverpool" },
  { id: "r16-7", homeTeamId: "atalanta", awayTeamId: "napoli" },
  { id: "r16-8", homeTeamId: "benfica", awayTeamId: "sporting-cp" },
];
