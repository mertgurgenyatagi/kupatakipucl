import { useMemo } from "react";
import { RealFixture } from "./realFixtureTypes";
import { TeamResult } from "./teamResultTypes";
import { LeaderboardEntry } from "./leaderboardTypes";
import { groupFixturesByDay } from "./fixtureStages";
import { computeMatchConsensus } from "./matchConsensus";
import { getPersonalPickResult } from "./personalPicks";
import { FixtureRow } from "./FixtureRow";
import { MatchesRow } from "./MatchesRow";

/**
 * One round's fixtures, split under date headers. A matchday is played across
 * two or three calendar days, so grouping by day is how the list actually
 * reads — the round is already established by the selected tab above it.
 *
 * `entries` is what separates desktop from mobile. With it, rows are the
 * full-width MatchesRow — full club names, a large score, a visible winner —
 * plus the head-to-head consensus bar it needs those entries for. Without
 * it, rows are the narrow shared FixtureRow. Mobile omits it, which is also
 * why the mobile page never mounts the leaderboard listener.
 *
 * `showPersonalPicks` tints a decided row by whether Mert's own pre-season
 * pick (personalPicks.ts) came in — visible only to him, on both desktop and
 * mobile, since it's just a lookup against data already on the page rather
 * than anything that needs its own fetch.
 */
export function MatchDayList({
  fixtures,
  results,
  entries,
  showPersonalPicks = false,
  onSelectTeam,
  onSelectFixture,
}: {
  fixtures: RealFixture[];
  results: Record<string, TeamResult>;
  entries?: LeaderboardEntry[];
  showPersonalPicks?: boolean;
  onSelectTeam?: (teamId: string) => void;
  onSelectFixture?: (fixtureId: string) => void;
}) {
  const days = useMemo(() => groupFixturesByDay(fixtures), [fixtures]);

  if (days.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <p className="text-center font-display text-sm text-color_textsecondary italic">Bu turda maç yok.</p>
      </div>
    );
  }

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-3 sm:px-3">
      {days.map((day) => (
        <section key={day.key}>
          <h3 className="sticky top-0 z-10 bg-card px-3 py-2 font-mono text-[0.6rem] tracking-[0.18em] text-color_textsecondary uppercase">
            {day.label}
          </h3>
          {day.fixtures.map((fixture) => {
            const personalPick = showPersonalPicks ? getPersonalPickResult(fixture) : null;
            return entries ? (
              <MatchesRow
                key={fixture.id}
                fixture={fixture}
                results={results}
                consensus={computeMatchConsensus(fixture.homeTeamId, fixture.awayTeamId, entries)}
                personalPick={personalPick}
                onSelectTeam={onSelectTeam}
                onSelectFixture={onSelectFixture}
              />
            ) : (
              <FixtureRow
                key={fixture.id}
                fixture={fixture}
                results={results}
                personalPick={personalPick}
                onSelectTeam={onSelectTeam}
                onSelectFixture={onSelectFixture}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}
