import { RealFixture } from "./realFixtureTypes";

/** Turkish football's own convention for a result letter — Galibiyet /
 *  Beraberlik / Mağlubiyet — already the source of this codebase's O/A/Y
 *  column letters (TeamTable.tsx), so this reads as one house style rather
 *  than a new one. Also the popup's result-dot color key: green (G), gray
 *  (B), red (M). */
export type ResultLetter = "G" | "B" | "M";

export interface TeamMatchHistoryEntry {
  fixtureId: string;
  matchday: number;
  order: number;
  opponentId: string;
  home: boolean;
  kickoffUtc: string;
  /** null while the fixture hasn't been decided yet. */
  result: ResultLetter | null;
  /** This team's own goal tally — always team-first regardless of literal
   *  home/away order, since every row in this popup is "us vs them" from
   *  the popped-up team's own point of view. null until decided. */
  teamGoals: number | null;
  opponentGoals: number | null;
}

// Same "not yet decided" test as MatchupPopup.tsx's own MatchupCenter and
// rankHistory.ts — a fixture is decided once both goal counts are non-null,
// independent of `status` (which is only used to distinguish live from
// finished, not decided from undecided).
function resultLetter(homeGoals: number | null, awayGoals: number | null, home: boolean): ResultLetter | null {
  if (homeGoals === null || awayGoals === null) return null;
  if (homeGoals === awayGoals) return "B";
  const won = (home && homeGoals > awayGoals) || (!home && awayGoals > homeGoals);
  return won ? "G" : "M";
}

/**
 * Every one of a team's fixtures, in calendar order — real data throughout,
 * derived from `useFixtures()`'s own `fixtures/{id}` sync (football-data.org),
 * the same source every other live consumer (FixtureRow, MatchupPopup,
 * TeamTable) already reads. Undecided fixtures carry `result`/goals `null`
 * so the popup can render them as "upcoming" rather than guessing.
 */
export function getTeamMatchHistory(teamId: string, fixtures: RealFixture[]): TeamMatchHistoryEntry[] {
  return fixtures
    .filter((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)
    .sort((a, b) => a.order - b.order)
    .map((f) => {
      const home = f.homeTeamId === teamId;
      const result = resultLetter(f.homeGoals, f.awayGoals, home);
      const teamGoals = result === null ? null : home ? f.homeGoals : f.awayGoals;
      const opponentGoals = result === null ? null : home ? f.awayGoals : f.homeGoals;
      return {
        fixtureId: f.id,
        matchday: f.matchday,
        order: f.order,
        opponentId: home ? f.awayTeamId : f.homeTeamId,
        home,
        kickoffUtc: f.kickoffUtc,
        result,
        teamGoals,
        opponentGoals,
      };
    });
}

/** The single next undecided fixture, or null once every fixture is
 *  decided (or the team has none at all). */
export function getNextMatch(history: TeamMatchHistoryEntry[]): TeamMatchHistoryEntry | null {
  return history.find((m) => m.result === null) ?? null;
}

/** Every decided fixture, most-recent-first — "going backwards in time"
 *  (Mert's own spec for the match-history box). */
export function getPastMatches(history: TeamMatchHistoryEntry[]): TeamMatchHistoryEntry[] {
  return history.filter((m) => m.result !== null).sort((a, b) => b.order - a.order);
}
