// football-data.org client for the UEFA Champions League league-phase table.
// CommonJS on purpose — same reasoning as functions/leaderboard/recomputeGuard.js:
// index.js is plain JS run by Cloud Functions, outside tsconfig.json's include.
const { TEAM_ID_MAP } = require("./teamIdMap");

const API_BASE = "https://api.football-data.org/v4";
// No ?season= param: football-data.org resolves this to whatever it currently
// considers the active season, so this keeps working next year with no
// redeploy. If that ever needs pinning, add season here explicitly.
const MATCHES_URL = `${API_BASE}/competitions/CL/matches`;

async function fetchJson(url, apiToken) {
  const res = await fetch(url, { headers: { "X-Auth-Token": apiToken } });
  if (!res.ok) {
    throw new Error(`football-data.org request to ${url} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Every league-phase match (all 144, past and future) for the current
 *  season — no ?matchday= filter, since both the upcoming-fixtures widgets
 *  and the rank-history replay need the whole calendar at once. */
async function fetchAllMatches(apiToken) {
  const body = await fetchJson(MATCHES_URL, apiToken);
  if (!Array.isArray(body.matches)) {
    throw new Error("football-data.org matches response had no matches array");
  }
  return body.matches;
}

/**
 * Pure: turns the full match list into the fixtures/{id} shape, keyed by this
 * app's team slugs. `order` isn't in the API response, so it's derived here
 * — sorted by kickoff time (ties broken by football-data.org's own match id,
 * which is otherwise stable and unique) — so rank-history's match-by-match
 * replay (rankHistory.ts) always processes fixtures in true chronological
 * order, same guarantee src/devpanel/fixtures.ts's hand-authored `order`
 * field provides for the mock calendar.
 *
 * Throws on any unmapped team id, same reasoning as mapStandingsToResults.
 */
function mapMatchesToFixtures(matches) {
  const sorted = [...matches].sort((a, b) => {
    const byDate = new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
    return byDate !== 0 ? byDate : a.id - b.id;
  });

  return sorted.map((match, index) => {
    const homeTeamId = TEAM_ID_MAP[match.homeTeam.id];
    const awayTeamId = TEAM_ID_MAP[match.awayTeam.id];
    if (!homeTeamId || !awayTeamId) {
      throw new Error(
        `No team-id mapping for football-data.org match ${match.id} (home ${match.homeTeam.id}, away ${match.awayTeam.id})`
      );
    }
    return {
      id: String(match.id),
      matchday: match.matchday,
      order: index + 1,
      homeTeamId,
      awayTeamId,
      kickoffUtc: match.utcDate,
      status: match.status,
      homeGoals: match.score?.fullTime?.home ?? null,
      awayGoals: match.score?.fullTime?.away ?? null,
    };
  });
}

module.exports = {
  fetchAllMatches,
  mapMatchesToFixtures,
  MATCHES_URL,
};
