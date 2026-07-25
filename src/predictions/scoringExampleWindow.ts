import { Team } from "./teams";

const WINDOW_SIZE = 7;
const HALF = 3;

export interface ScoringExampleWindow {
  teams: Team[];
  /** Index within `teams` of the team the example is actually centered on —
   *  usually 3 (dead center of 7), but shifts if `centerTeamId` sits too
   *  close to either end of the real team list to stay perfectly centered. */
  centerIndex: number;
}

/** A 7-team slice of the real team list, centered as closely as possible on
 *  `centerTeamId` — the scoring-example diagram shown in the predictions
 *  intro (predictions-page-round-03 point 1). */
export function buildScoringExampleWindow(teams: Team[], centerTeamId: string): ScoringExampleWindow {
  const idx = teams.findIndex((t) => t.id === centerTeamId);
  if (idx === -1) {
    return { teams: teams.slice(0, WINDOW_SIZE), centerIndex: 0 };
  }
  const start = Math.max(0, Math.min(idx - HALF, teams.length - WINDOW_SIZE));
  return { teams: teams.slice(start, start + WINDOW_SIZE), centerIndex: idx - start };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** A stable stand-in for when someone never picked a favorite UCL team at
 *  signup — hashed off their uid (same deterministic-pick convention
 *  teams.ts already uses for crest assignment) rather than truly random, so
 *  the example doesn't reshuffle on every visit. */
export function pickFallbackTeam(teams: Team[], uid: string): Team {
  return teams[hashString(uid) % teams.length];
}
