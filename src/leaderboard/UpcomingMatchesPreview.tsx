import { useMemo } from "react";
import { getUpcomingFixtures } from "./upcomingFixtures";
import { resolveNow } from "../tournament/now";
import { TeamResult } from "./teamResultTypes";
import { FixtureRow } from "./FixtureRow";

const PREVIEW_COUNT = 3;

/**
 * Home's logged-out league-phase "upcoming matches" widget — the same
 * fixture rows as UpcomingMatchesDrawer, but always-open and fixed at 3: no
 * collapse chrome, no infinite scroll, no scroll container at all. Per
 * Mert's own convention (see FixtureRow.tsx), the rows stay clickable but
 * inert, consistent with the drawer everywhere else fixtures show up.
 */
export function UpcomingMatchesPreview({ results }: { results: Record<string, TeamResult> }) {
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
    <div className="flex flex-1 flex-col justify-center">
      {upcoming.map((fixture) => (
        <FixtureRow key={fixture.id} fixture={fixture} results={results} />
      ))}
    </div>
  );
}
