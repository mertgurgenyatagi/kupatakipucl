import { memo, useEffect, useState } from "react";
import { Frame } from "@/components/ui/frame";
import { UpcomingMatchesDrawer } from "./UpcomingMatchesDrawer";
import { TeamResult } from "./teamResultTypes";

// Three portrait crops (public/hero/, pre-cropped to a 3:2 height:width box
// — see scripts/crop-hero-images.mjs). One rectangular card, full-bleed
// (object-cover, no mask/fade at the edges), cross-fading between the
// three — not stacked, one slot, one image visible at a time. 7s each
// (Mert's explicit spec).
const HERO_IMAGES = ["/hero/harry_kane.webp", "/hero/mbappe.webp", "/hero/dembele.webp"];
const CYCLE_MS = 7000;
const FADE_MS = 1500;

/**
 * Fills the exact boundary the three stat widgets used to occupy (the
 * leaderboard page's middle column) — those widgets moved to the stats
 * page (still built, just not rendered here; see StatWidget.tsx), and
 * this card took their place rather than the page gaining dead space.
 *
 * Carries the upcoming-fixtures drawer (UpcomingMatchesDrawer) docked to its
 * bottom edge — results are threaded through only for that drawer's "current
 * place" column, the carousel itself doesn't use them.
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
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % HERO_IMAGES.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Frame className="relative h-full animate-cotton-rise border-navy-line/35">
      {HERO_IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          data-testid="hero-image"
          className="absolute inset-0 size-full object-cover transition-opacity ease-linear"
          style={{ opacity: i === active ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        />
      ))}
      <UpcomingMatchesDrawer results={results} />
    </Frame>
  );
});
