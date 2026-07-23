import { memo } from "react";
import { Frame } from "@/components/ui/frame";
import { HeroCarousel } from "./HeroCarousel";
import { UpcomingMatchesDrawer } from "./UpcomingMatchesDrawer";
import { TeamResult } from "./teamResultTypes";

/**
 * Fills the exact boundary the three stat widgets used to occupy (the
 * leaderboard page's middle column) — those widgets moved to the stats
 * page (still built, just not rendered here; see StatWidget.tsx), and
 * this card took their place rather than the page gaining dead space.
 *
 * Carries the upcoming-fixtures drawer (UpcomingMatchesDrawer) docked to its
 * bottom edge — results are threaded through only for that drawer's "current
 * place" column, the carousel itself doesn't use them. The carousel itself
 * lives in HeroCarousel.tsx so the stats page's own hero section can reuse
 * it without the drawer.
 *
 * Wrapped in `memo`: `results` is a stable reference from LeaderboardPage,
 * so without this, hovering a leaderboard row elsewhere on the page (a
 * state update unrelated to this component) needlessly re-rendered the
 * drawer's own open/scroll state along with it.
 */
export const LeaderboardHero = memo(function LeaderboardHero({
  results,
}: {
  results: Record<string, TeamResult>;
}) {
  return (
    <Frame className="relative h-full animate-cotton-rise border-navy-line/35">
      <HeroCarousel />
      <UpcomingMatchesDrawer results={results} />
    </Frame>
  );
});
