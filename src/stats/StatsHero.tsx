import { Frame } from "@/components/ui/frame";
import { HeroCarousel } from "../leaderboard/HeroCarousel";

/**
 * The stats page's third section — the same crossfading portrait carousel
 * as leaderboard/LeaderboardHero.tsx, minus the upcoming-fixtures drawer
 * that's docked to that one. Nothing on this page needs "current place in
 * the next fixture", so there's no drawer here to dock.
 */
export function StatsHero() {
  return (
    <Frame className="relative h-full animate-cotton-rise border-navy-line/35">
      <HeroCarousel />
    </Frame>
  );
}
