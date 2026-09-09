import { RealFixture } from "./realFixtureTypes";
import { LeaderboardEntry } from "./leaderboardTypes";
import { computeMatchConsensus } from "./matchConsensus";
import { PickOutcome, getPersonalPick, getPersonalPickResult } from "./personalPicks";

export interface OutcomeSplit {
  total: number;
  decided: number;
  correct: number;
}

export interface TeamPickRecord {
  teamId: string;
  total: number;
  decided: number;
  correct: number;
}

export interface PersonalPickStats {
  totalPicks: number;
  decided: number;
  pending: number;
  correct: number;
  incorrect: number;
  /** null until at least one pick has been decided. */
  accuracyPct: number | null;
  byOutcome: Record<PickOutcome, OutcomeSplit>;
  /** null until at least one pick has been decided. */
  currentStreak: { kind: "correct" | "incorrect"; length: number } | null;
  bestCorrectStreak: number;
  /** The team backed to win (home or away, never a draw pick) most often —
   *  ties broken by team id so the result is stable. null with no picks. */
  favoriteTeam: TeamPickRecord | null;
  /** Best/worst hit rate among teams backed to win at least
   *  MIN_DECIDED_FOR_RELIABILITY times. null until that bar is met. */
  mostReliableTeam: TeamPickRecord | null;
  leastReliableTeam: TeamPickRecord | null;
}

const MIN_DECIDED_FOR_RELIABILITY = 2;

function emptySplit(): OutcomeSplit {
  return { total: 0, decided: 0, correct: 0 };
}

function hitRate(record: TeamPickRecord): number {
  return record.decided === 0 ? 0 : record.correct / record.decided;
}

/**
 * Every stat the Matches page's side panels show, derived in one pass over
 * whatever fixtures are on hand — decided or not, league or knockout (only
 * league-phase fixtures carry a recorded pick, personalPicks.ts). Pure and
 * fixture-order-independent going in; sorts by RealFixture.order itself so
 * streaks read in true chronological order regardless of the caller's
 * fixture array order.
 */
export function computePersonalPickStats(fixtures: RealFixture[]): PersonalPickStats {
  const picked = fixtures
    .filter((f) => getPersonalPick(f) !== null)
    .slice()
    .sort((a, b) => a.order - b.order);

  const byOutcome: Record<PickOutcome, OutcomeSplit> = {
    home: emptySplit(),
    away: emptySplit(),
    draw: emptySplit(),
  };
  const teamRecords = new Map<string, TeamPickRecord>();
  const decidedChronological: boolean[] = [];

  let decided = 0;
  let correct = 0;
  let bestCorrectStreak = 0;
  let runningCorrectStreak = 0;

  picked.forEach((fixture) => {
    const pick = getPersonalPick(fixture) as PickOutcome;
    byOutcome[pick].total += 1;

    const backedTeamId = pick === "home" ? fixture.homeTeamId : pick === "away" ? fixture.awayTeamId : null;
    if (backedTeamId) {
      const record = teamRecords.get(backedTeamId) ?? { teamId: backedTeamId, total: 0, decided: 0, correct: 0 };
      record.total += 1;
      teamRecords.set(backedTeamId, record);
    }

    const result = getPersonalPickResult(fixture);
    if (result === null) return;

    const isCorrect = result === "correct";
    decided += 1;
    byOutcome[pick].decided += 1;
    if (isCorrect) {
      correct += 1;
      byOutcome[pick].correct += 1;
    }

    decidedChronological.push(isCorrect);
    runningCorrectStreak = isCorrect ? runningCorrectStreak + 1 : 0;
    bestCorrectStreak = Math.max(bestCorrectStreak, runningCorrectStreak);

    if (backedTeamId) {
      const record = teamRecords.get(backedTeamId)!;
      record.decided += 1;
      if (isCorrect) record.correct += 1;
    }
  });

  let currentStreak: PersonalPickStats["currentStreak"] = null;
  if (decidedChronological.length > 0) {
    const lastCorrect = decidedChronological[decidedChronological.length - 1];
    let length = 0;
    for (let i = decidedChronological.length - 1; i >= 0 && decidedChronological[i] === lastCorrect; i--) {
      length += 1;
    }
    currentStreak = { kind: lastCorrect ? "correct" : "incorrect", length };
  }

  const teamList = [...teamRecords.values()].sort((a, b) => a.teamId.localeCompare(b.teamId));

  let favoriteTeam: TeamPickRecord | null = null;
  teamList.forEach((record) => {
    if (!favoriteTeam || record.total > favoriteTeam.total) favoriteTeam = record;
  });

  const eligible = teamList.filter((r) => r.decided >= MIN_DECIDED_FOR_RELIABILITY);
  let mostReliableTeam: TeamPickRecord | null = null;
  let leastReliableTeam: TeamPickRecord | null = null;
  eligible.forEach((record) => {
    if (!mostReliableTeam || hitRate(record) > hitRate(mostReliableTeam)) mostReliableTeam = record;
    if (!leastReliableTeam || hitRate(record) < hitRate(leastReliableTeam)) leastReliableTeam = record;
  });

  return {
    totalPicks: picked.length,
    decided,
    pending: picked.length - decided,
    correct,
    incorrect: decided - correct,
    accuracyPct: decided > 0 ? Math.round((correct / decided) * 100) : null,
    byOutcome,
    currentStreak,
    bestCorrectStreak,
    favoriteTeam,
    mostReliableTeam,
    leastReliableTeam,
  };
}

export interface AccuracySplit {
  decided: number;
  correct: number;
  incorrect: number;
  accuracyPct: number | null;
}

function accuracySplit(decided: number, correct: number): AccuracySplit {
  return {
    decided,
    correct,
    incorrect: decided - correct,
    accuracyPct: decided > 0 ? Math.round((correct / decided) * 100) : null,
  };
}

/** The crowd's implied match-winner pick for a fixture: whichever side more
 *  participants ranked above the other in their finishing-order prediction
 *  (matchConsensus.ts) — that function is explicit this isn't really a match
 *  prediction, so this reads it as one anyway purely as a fun benchmark, not
 *  anything rigorous. A dead-even split counts as an implied draw. */
function impliedCrowdPick(homeTeamId: string, awayTeamId: string, entries: LeaderboardEntry[]): PickOutcome | null {
  const consensus = computeMatchConsensus(homeTeamId, awayTeamId, entries);
  if (!consensus) return null;
  if (consensus.home === consensus.away) return "draw";
  return consensus.home > consensus.away ? "home" : "away";
}

function actualOutcome(fixture: RealFixture): PickOutcome | null {
  if (fixture.homeGoals === null || fixture.awayGoals === null) return null;
  if (fixture.homeGoals === fixture.awayGoals) return "draw";
  return fixture.homeGoals > fixture.awayGoals ? "home" : "away";
}

/**
 * How the crowd would have scored on exactly the fixtures Mert picked, using
 * their implied pick (impliedCrowdPick above) — the benchmark his own
 * accuracy sits against. Only counts fixtures where the crowd actually had
 * an opinion (some participants ranked both teams) and the match is decided.
 */
export function computeCommunityPickStats(fixtures: RealFixture[], entries: LeaderboardEntry[]): AccuracySplit {
  let decided = 0;
  let correct = 0;

  fixtures.forEach((fixture) => {
    if (getPersonalPick(fixture) === null) return;
    const actual = actualOutcome(fixture);
    if (actual === null) return;
    const implied = impliedCrowdPick(fixture.homeTeamId, fixture.awayTeamId, entries);
    if (implied === null) return;

    decided += 1;
    if (implied === actual) correct += 1;
  });

  return accuracySplit(decided, correct);
}

export interface ContrarianStats {
  /** Fixtures where Mert's pick matched the crowd's implied pick. */
  withGrain: AccuracySplit;
  /** Fixtures where it didn't — going against the grain. */
  againstGrain: AccuracySplit;
}

/**
 * Splits Mert's decided picks by whether he agreed with the crowd's implied
 * pick (impliedCrowdPick) or went against it, with the hit rate for each —
 * "am I actually good at going against the grain, or just contrarian."
 */
export function computeContrarianStats(fixtures: RealFixture[], entries: LeaderboardEntry[]): ContrarianStats {
  let withGrainDecided = 0;
  let withGrainCorrect = 0;
  let againstGrainDecided = 0;
  let againstGrainCorrect = 0;

  fixtures.forEach((fixture) => {
    const pick = getPersonalPick(fixture);
    if (pick === null) return;
    const actual = actualOutcome(fixture);
    if (actual === null) return;
    const implied = impliedCrowdPick(fixture.homeTeamId, fixture.awayTeamId, entries);
    if (implied === null) return;

    const isCorrect = pick === actual;
    if (pick === implied) {
      withGrainDecided += 1;
      if (isCorrect) withGrainCorrect += 1;
    } else {
      againstGrainDecided += 1;
      if (isCorrect) againstGrainCorrect += 1;
    }
  });

  return {
    withGrain: accuracySplit(withGrainDecided, withGrainCorrect),
    againstGrain: accuracySplit(againstGrainDecided, againstGrainCorrect),
  };
}

export interface SelfContradictionStats {
  /** All such picks, decided or not. */
  total: number;
  decided: number;
  correct: number;
  incorrect: number;
  accuracyPct: number | null;
}

/**
 * Times Mert picked a team to beat one he'd predicted would finish *higher*
 * in his own end-of-season ranking (predictions/ — the 36-team finishing
 * order every participant submits, index 0 = 1st place) — his match
 * instinct overruling his own table. `ranking` is his own submitted
 * ranking; null (not signed in with one yet, or no entry found) yields all
 * zeros rather than throwing, since this is a bonus stat, not core.
 */
export function computeSelfContradictionStats(fixtures: RealFixture[], ranking: string[] | null): SelfContradictionStats {
  if (!ranking) return { total: 0, decided: 0, correct: 0, incorrect: 0, accuracyPct: null };

  let total = 0;
  let decided = 0;
  let correct = 0;

  fixtures.forEach((fixture) => {
    const pick = getPersonalPick(fixture);
    if (pick === null || pick === "draw") return;

    const homeRank = ranking.indexOf(fixture.homeTeamId);
    const awayRank = ranking.indexOf(fixture.awayTeamId);
    if (homeRank === -1 || awayRank === -1) return;

    const backedRank = pick === "home" ? homeRank : awayRank;
    const opponentRank = pick === "home" ? awayRank : homeRank;
    // A lower index is a better predicted finish, so backing the team with
    // the *higher* index is backing the one predicted to finish worse.
    if (backedRank <= opponentRank) return;

    total += 1;
    const actual = actualOutcome(fixture);
    if (actual === null) return;
    decided += 1;
    if (pick === actual) correct += 1;
  });

  return {
    total,
    decided,
    correct,
    incorrect: decided - correct,
    accuracyPct: decided > 0 ? Math.round((correct / decided) * 100) : null,
  };
}
