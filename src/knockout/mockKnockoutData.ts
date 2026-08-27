import { KnockoutMatchup } from "./knockoutTypes";

/**
 * Placeholder Round of 16 matchups — 8 pairings, 16 distinct team ids drawn
 * from TEAMS.
 *
 * Invented, not drawn: the real Round of 16 cannot be known until the league
 * phase finishes, and nothing here reflects any actual result. The teams were
 * re-pointed at the 2026-27 field on 2026-08-27 (four of the previous
 * pairings named clubs that left the competition), and the pairings were
 * reshuffled at the same time so that no tie is between two clubs from the
 * same country — the old set had four such ties, which a real draw never
 * permits. mockKnockoutData.test.ts holds both properties.
 *
 * See PROJECT.md §11 problem 23: this drives every knockout surface in the
 * app and must be replaced with the real draw before the knockout phase.
 */
export const MOCK_ROUND_OF_16: KnockoutMatchup[] = [
  // Left Bracket
  { id: "r16-1", homeTeamId: "real-madrid", awayTeamId: "bayern-munich" },
  { id: "r16-2", homeTeamId: "arsenal", awayTeamId: "paris-saint-germain" },
  { id: "r16-3", homeTeamId: "manchester-city", awayTeamId: "atletico-madrid" },
  { id: "r16-4", homeTeamId: "barcelona", awayTeamId: "inter-milan" },
  // Right Bracket
  { id: "r16-5", homeTeamId: "slovan-bratislava", awayTeamId: "borussia-dortmund" },
  { id: "r16-6", homeTeamId: "roma", awayTeamId: "liverpool" },
  { id: "r16-7", homeTeamId: "real-betis", awayTeamId: "napoli" },
  { id: "r16-8", homeTeamId: "stuttgart", awayTeamId: "sporting-cp" },
];
