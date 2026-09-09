// football-data.org client for the UEFA Champions League league-phase table.
// CommonJS on purpose — same reasoning as functions/leaderboard/recomputeGuard.js:
// index.js is plain JS run by Cloud Functions, outside tsconfig.json's include.
const { TEAM_ID_MAP } = require("./teamIdMap");

const API_BASE = "https://api.football-data.org/v4";
/** football-data.org's `stage` value for the 36-team single-table phase.
 *  The knockout stages that follow it (PLAYOFFS, LAST_16, QUARTER_FINALS,
 *  SEMI_FINALS, FINAL) share this same endpoint, so anything that means
 *  "the league table" has to say so explicitly — see standings.js. */
const LEAGUE_STAGE = "LEAGUE_STAGE";
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

/** Every match (all 144 league-phase, plus the knockout rounds once they're
 *  drawn) for the current season — no ?matchday= or ?stage= filter, since
 *  both the upcoming-fixtures widgets and the rank-history replay need the
 *  whole calendar at once. */
async function fetchAllMatches(apiToken) {
  const body = await fetchJson(MATCHES_URL, apiToken);
  if (!Array.isArray(body.matches)) {
    throw new Error("football-data.org matches response had no matches array");
  }
  return body.matches;
}

/** A knockout fixture that has been scheduled but not yet drawn comes back
 *  with no team on one or both sides. That is expected data, not a mapping
 *  gap, so it's skipped rather than thrown on — the alternative is that the
 *  first response after a draw is announced takes both scheduled syncs down
 *  with it, which would stop results updating entirely. */
function isDrawn(match) {
  return match.homeTeam?.id != null && match.awayTeam?.id != null;
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
 * `stage` is carried through verbatim (LEAGUE_STAGE, PLAYOFFS, LAST_16, ...)
 * — the Matches page builds its tabs from it, and standings.js needs it to
 * keep knockout results out of the league table. `matchday` is null for every
 * knockout fixture, which is why nothing may assume it's a number.
 *
 * Throws on a team id that is present but unmapped — that really is a gap in
 * teamIdMap.js and should fail loudly.
 */
function mapMatchesToFixtures(matches) {
  const sorted = matches.filter(isDrawn).sort((a, b) => {
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
      matchday: match.matchday ?? null,
      stage: match.stage ?? null,
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
  LEAGUE_STAGE,
};
