import { useMemo } from "react";
import { getUpcomingFixtures } from "./upcomingFixtures";
import { resolveNow } from "../tournament/now";
import { TeamResult } from "./teamResultTypes";
import { FixtureRow } from "./FixtureRow";

const PREVIEW_COUNT = 3;

/**
 * Home's logged-out league-phase "upcoming matches" widget — the same
 * fixture rows as UpcomingMatchesDrawer, but always-open and fixed at 3: no
 * collapse chrome, no infinite scroll, no scroll container at all. Rows
 * open MatchupPopup on click (via `onSelectFixture`, same as the drawer);
 * a team's crest/name within a row is a separate click target that opens
 * TeamPopup instead (via `onSelectTeam`), unchanged.
 */
export function UpcomingMatchesPreview({
  results,
  onSelectTeam,
  onSelectFixture,
}: {
  results: Record<string, TeamResult>;
  onSelectTeam?: (teamId: string) => void;
  onSelectFixture?: (fixtureId: string) => void;
}) {
  const upcoming = useMemo(() => getUpcomingFixtures(resolveNow()).slice(0, PREVIEW_COUNT), []);

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-6">
        <p className="text-center font-display text-sm text-color_textsecondary italic">
          Yaklaşan maç yok.
        </p>
      </div>
    );
  }

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-1 sm:px-3">
      {upcoming.map((fixture) => (
        <FixtureRow
          key={fixture.id}
          fixture={fixture}
          results={results}
          compact
          onSelectTeam={onSelectTeam}
          onSelectFixture={onSelectFixture}
        />
      ))}
    </div>
  );
}
