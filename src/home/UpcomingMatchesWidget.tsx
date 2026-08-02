import { CSSProperties, useMemo } from "react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { getUpcomingFixtures } from "../leaderboard/upcomingFixtures";
import { resolveNow } from "../tournament/now";
import { FixtureRow } from "../leaderboard/FixtureRow";
import { TeamResult } from "../leaderboard/teamResultTypes";

const VISIBLE_COUNT = 3;

/**
 * GREAT_LEAP_SPEC.md §2.6: same fixture-row content/treatment as
 * UpcomingMatchesDrawer, but 3 at a time and always visible inline, not
 * behind a collapsible drawer.
 */
export function UpcomingMatchesWidget({
  className,
  style,
  results,
}: {
  className?: string;
  style?: CSSProperties;
  results: Record<string, TeamResult>;
}) {
  const upcoming = useMemo(() => getUpcomingFixtures(resolveNow()).slice(0, VISIBLE_COUNT), []);

  return (
    <Frame className={className} style={style}>
      <FrameHeader tone="navy">
        <FrameTitle className="text-base text-color_text sm:text-lg">Yaklaşan Maçlar</FrameTitle>
      </FrameHeader>
      <FrameBody className="flex flex-col">
        {upcoming.map((fixture) => (
          <FixtureRow key={fixture.id} fixture={fixture} results={results} />
        ))}
      </FrameBody>
    </Frame>
  );
}
