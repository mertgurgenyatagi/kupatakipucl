import { FIXTURES } from "../devpanel/fixtures";
import { MatchOutcome } from "../devpanel/standings";

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
   *  the popped-up team's own point of view. Synthetic but real (the same
   *  numbers already driving the live team table's own goal columns:
   *  standings.ts — every win is 1-0, every draw is 0-0). null until
   *  decided. */
  teamGoals: number | null;
  opponentGoals: number | null;
}

function resultLetter(outcome: MatchOutcome, home: boolean): ResultLetter | null {
  if (outcome === "notplayed") return null;
  if (outcome === "draw") return "B";
  const won = (home && outcome === "homewin") || (!home && outcome === "awaywin");
  return won ? "G" : "M";
}

function goalsFor(result: ResultLetter | null): { teamGoals: number | null; opponentGoals: number | null } {
  if (result === null) return { teamGoals: null, opponentGoals: null };
  if (result === "G") return { teamGoals: 1, opponentGoals: 0 };
  if (result === "M") return { teamGoals: 0, opponentGoals: 1 };
  return { teamGoals: 0, opponentGoals: 0 };
}

/**
 * Every one of a team's 8 league-phase fixtures (one per matchday), in
 * calendar order — real data throughout, derived from the same `FIXTURES` +
 * `devMatches` outcomes the rest of the leaderboard already reads, not
 * invented. Undecided fixtures carry `result`/goals `null` so the popup can
 * render them as "upcoming" rather than guessing.
 */
export function getTeamMatchHistory(
  teamId: string,
  outcomes: Record<string, MatchOutcome>
): TeamMatchHistoryEntry[] {
  return FIXTURES.filter((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)
    .sort((a, b) => a.order - b.order)
    .map((f) => {
      const home = f.homeTeamId === teamId;
      const outcome = outcomes[f.id] ?? "notplayed";
      const result = resultLetter(outcome, home);
      return {
        fixtureId: f.id,
        matchday: f.matchday,
        order: f.order,
        opponentId: home ? f.awayTeamId : f.homeTeamId,
        home,
        kickoffUtc: f.kickoffUtc,
        result,
        ...goalsFor(result),
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
