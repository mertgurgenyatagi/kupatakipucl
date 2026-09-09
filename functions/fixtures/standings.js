// Computes results/{teamId} (position, points, goalDifference, goalsFor,
// goalsAgainst, matchesPlayed) straight from the real fixture calendar,
// implementing UEFA's actual Champions League league-phase tiebreak order
// ourselves rather than trusting football-data.org's own `position` field
// (Mert, 2026-09-08: "make sure our table uses the same rules"). Replaces
// the old fetchCurrentStandingsTable/mapStandingsToResults pair in
// footballData.js, which just passed the API's own table through verbatim.
//
// UEFA's real tiebreak order for teams level on points (while the league
// phase is still in progress, i.e. before Matchday 8 finishes): goal
// difference, goals scored, away goals scored, wins, away wins. If still
// level after those five, UEFA says the teams "share an equal ranking" and
// are listed alphabetically — we go one step further and use the
// `opta-analyst` prediction (see below) instead of alphabetical whenever
// every tied team has played zero matches, since alphabetical is a
// meaningless opening-day ordering ("basically until the end of the first
// matches" per Mert) and Opta's is a genuinely informative one.
//
// Once Matchday 8 completes, UEFA adds five more criteria: opponents'
// collective points/goal-difference/goals-scored ("strength of schedule",
// all three computable from the same fixture list), then disciplinary
// points, then UEFA club coefficient. This app has no data source for the
// last two, so both are replaced by the same Opta order — Mert's explicit
// call: "just use the Opta Analyst's rankings" for that case too.
const { LEAGUE_STAGE } = require("./footballData");

const FINAL_MATCHDAY = 8;

/** `opta-analyst` is a real `predictions/{uid}` document (a custom
 *  "participant" Mert seeded by hand, not a real signup) whose 36-team
 *  `ranking` array IS the Opta prediction — read directly rather than
 *  duplicating it as a hardcoded list, so updating that one document is the
 *  only thing ever needed to change the fallback order. Throws if it's
 *  missing or doesn't cover the full team list, same "fail loud on bad
 *  data" convention as footballData.js's unmapped-id checks. */
function buildOptaRank(optaRanking, allTeamIds) {
  const rank = {};
  optaRanking.forEach((teamId, index) => {
    rank[teamId] = index;
  });
  const missing = allTeamIds.filter((id) => !(id in rank));
  if (missing.length > 0) {
    throw new Error(`opta-analyst prediction is missing team(s): ${missing.join(", ")}`);
  }
  return rank;
}

/** Every fixture with both goals present counts as decided — same test
 *  MatchupPopup.tsx and rankHistory.ts already use client-side, independent
 *  of `status` (which only distinguishes live from finished, not decided
 *  from undecided). */
function isDecided(fixture) {
  return fixture.homeGoals !== null && fixture.awayGoals !== null;
}

/** Base per-team stats folded from every decided fixture — everything
 *  UEFA's first five tiebreak criteria need. */
function computeBaseStats(fixtures, allTeamIds) {
  const stats = {};
  allTeamIds.forEach((id) => {
    stats[id] = { points: 0, goalsFor: 0, goalsAgainst: 0, matchesPlayed: 0, awayGoalsFor: 0, wins: 0, awayWins: 0 };
  });

  fixtures.filter(isDecided).forEach((f) => {
    const home = stats[f.homeTeamId];
    const away = stats[f.awayTeamId];
    home.matchesPlayed += 1;
    away.matchesPlayed += 1;
    home.goalsFor += f.homeGoals;
    home.goalsAgainst += f.awayGoals;
    away.goalsFor += f.awayGoals;
    away.goalsAgainst += f.homeGoals;
    away.awayGoalsFor += f.awayGoals;

    if (f.homeGoals > f.awayGoals) {
      home.points += 3;
      home.wins += 1;
    } else if (f.awayGoals > f.homeGoals) {
      away.points += 3;
      away.wins += 1;
      away.awayWins += 1;
    } else {
      home.points += 1;
      away.points += 1;
    }
  });

  return stats;
}

function goalDifference(teamStats) {
  return teamStats.goalsFor - teamStats.goalsAgainst;
}

/** True once every Matchday 8 fixture is decided — the point at which UEFA's
 *  criteria 6-10 (opponent strength, disciplinary, coefficient) switch on. */
function isPhaseComplete(fixtures) {
  const matchday8 = fixtures.filter((f) => f.matchday === FINAL_MATCHDAY);
  return matchday8.length > 0 && matchday8.every(isDecided);
}

/** Each team's own 8 opponents' collective points/GD/goals-for, per UEFA's
 *  "strength of schedule" criteria (6-8) — only meaningful, and only
 *  computed, once the phase is complete. */
function computeOpponentStats(fixtures, baseStats, allTeamIds) {
  const opponents = {};
  allTeamIds.forEach((id) => {
    opponents[id] = { points: 0, goalDifference: 0, goalsFor: 0 };
  });

  fixtures.forEach((f) => {
    const home = f.homeTeamId;
    const away = f.awayTeamId;
    opponents[home].points += baseStats[away].points;
    opponents[home].goalDifference += goalDifference(baseStats[away]);
    opponents[home].goalsFor += baseStats[away].goalsFor;
    opponents[away].points += baseStats[home].points;
    opponents[away].goalDifference += goalDifference(baseStats[home]);
    opponents[away].goalsFor += baseStats[home].goalsFor;
  });

  return opponents;
}

/**
 * Pure: `fixtures` is the same shape mapMatchesToFixtures produces (or
 * RealFixture client-side) — the whole season's calendar, decided or not.
 * `optaRanking` is `opta-analyst`'s own 36-id `ranking` array, best to
 * worst. Returns `{ [teamId]: TeamResult }`, ready to write to
 * results/{teamId} as-is.
 *
 * Only LEAGUE_STAGE fixtures count. football-data.org serves the knockout
 * rounds from the same endpoint, so without this filter the first playoff
 * result would start adding points to a league table that had already
 * finished — silently, which is the worst failure this app has (see
 * functions/leaderboard's own note on the same principle).
 */
function computeStandingsTable(allFixtures, optaRanking) {
  const fixtures = allFixtures.filter((f) => f.stage === LEAGUE_STAGE);
  const allTeamIds = Array.from(new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]))).sort();
  const optaRank = buildOptaRank(optaRanking, allTeamIds);
  const baseStats = computeBaseStats(fixtures, allTeamIds);
  const phaseComplete = isPhaseComplete(fixtures);
  const opponentStats = phaseComplete ? computeOpponentStats(fixtures, baseStats, allTeamIds) : null;

  function compare(a, b) {
    const sa = baseStats[a];
    const sb = baseStats[b];
    if (sa.points !== sb.points) return sb.points - sa.points;
    const gdA = goalDifference(sa);
    const gdB = goalDifference(sb);
    if (gdA !== gdB) return gdB - gdA;
    if (sa.goalsFor !== sb.goalsFor) return sb.goalsFor - sa.goalsFor;
    if (sa.awayGoalsFor !== sb.awayGoalsFor) return sb.awayGoalsFor - sa.awayGoalsFor;
    if (sa.wins !== sb.wins) return sb.wins - sa.wins;
    if (sa.awayWins !== sb.awayWins) return sb.awayWins - sa.awayWins;

    if (phaseComplete) {
      const oa = opponentStats[a];
      const ob = opponentStats[b];
      if (oa.points !== ob.points) return ob.points - oa.points;
      if (oa.goalDifference !== ob.goalDifference) return ob.goalDifference - oa.goalDifference;
      if (oa.goalsFor !== ob.goalsFor) return ob.goalsFor - oa.goalsFor;
      // Disciplinary points, then UEFA club coefficient — no data source for
      // either, so both fall through to the same Opta order.
      return optaRank[a] - optaRank[b];
    }

    if (sa.matchesPlayed === 0 && sb.matchesPlayed === 0) {
      return optaRank[a] - optaRank[b];
    }
    // UEFA's own rule for a genuine mid-season tie on all five criteria.
    // Team ids are slugified from their names and preserve the same
    // alphabetical order (teams.test.ts enforces the source list is
    // name-sorted), so comparing ids directly needs no separate name table.
    return a.localeCompare(b);
  }

  const ordered = [...allTeamIds].sort(compare);

  const results = {};
  ordered.forEach((teamId, index) => {
    const s = baseStats[teamId];
    results[teamId] = {
      position: index + 1,
      points: s.points,
      goalDifference: goalDifference(s),
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      matchesPlayed: s.matchesPlayed,
    };
  });
  return results;
}

module.exports = { computeStandingsTable };
