import { memo } from "react";
import { Frame } from "@/components/ui/frame";
import { HeroCarousel } from "../leaderboard/HeroCarousel";
import { UpcomingMatchesDrawer } from "../leaderboard/UpcomingMatchesDrawer";
import { TeamResult } from "../leaderboard/teamResultTypes";

export const HomeStartedHero = memo(function HomeStartedHero({
  results,
  onSelectFixture,
}: {
  results: Record<string, TeamResult>;
  onSelectFixture?: (fixtureId: string) => void;
}) {
  return (
    <Frame className="relative h-full animate-cotton-rise overflow-hidden border-color_border1/35">
      {/* Center: Crossfading Hero Image Carousel */}
      <HeroCarousel />

      {/* Bottom Drawer: Yaklaşan Maçlar */}
      <UpcomingMatchesDrawer
        results={results}
        onSelectFixture={onSelectFixture}
      />
    </Frame>
  );
});
