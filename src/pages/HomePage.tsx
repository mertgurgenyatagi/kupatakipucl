// src/pages/HomePage.tsx
import { useMemo } from "react";
import { useVisibilityState } from "../state/useVisibilityState";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useResults } from "../leaderboard/useResults";
import { usePlayers } from "../profile/usePlayers";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { HomeLandingLoggedOut } from "../home/HomeLandingLoggedOut";
import { LoggedInHome } from "../home/LoggedInHome";
import { HomeLandingLoggedOutStarted } from "../home/HomeLandingLoggedOutStarted";
import { LoggedInHomeStarted } from "../home/LoggedInHomeStarted";
import { HERO_IMAGES } from "../leaderboard/HeroCarousel";
import { TEAMS, teamCrestSrc } from "../predictions/teams";
import { useImagePreload } from "@/lib/useImagePreload";
import { HomeHeroBandSkeleton, HomeBentoSkeleton } from "../home/HomeSkeletons";
import { useIsMobile } from "@/lib/useIsMobile";
import { MobileHomeNotStartedLoggedOut } from "../home/mobile/MobileHomeNotStartedLoggedOut";
import { MobileHomeStartedLoggedOut } from "../home/mobile/MobileHomeStartedLoggedOut";

// Every image already known at this level (i.e. not still behind a
// deeper data-fetching wrapper's own hook, like LoggedInHome's posts) —
// folded into this page's own top-level loading gate so the whole bento
// reveals together instead of the avatar/crest images popping in after.
// Started-phase pages additionally gate on posts + their images inside
// their own wrapper (LoggedInHomeStarted, HomeLandingLoggedOutStarted),
// since `posts` isn't fetched until one level deeper than this component.
function homeImageUrls(
  state: string,
  players: { photoURL: string }[]
): string[] {
  if (state === "loggedout_notstarted") {
    // AvatarStack only ever renders the first 3 — no point preloading the
    // other 49 photos nobody will see.
    return players.slice(0, 3).map((p) => p.photoURL).filter(Boolean);
  }
  const avatarUrls = players.map((p) => p.photoURL).filter(Boolean);
  const heroUrls = [...HERO_IMAGES];
  if (state === "loggedin_notstarted") return [...avatarUrls, ...heroUrls];
  return [...avatarUrls, ...heroUrls, ...TEAMS.map((t) => teamCrestSrc(t.id))];
}

export function HomePage() {
  const state = useVisibilityState();
  const phase = useTournamentPhase();
  const isMobile = useIsMobile();

  const { results, loading: resultsLoading } = useResults();
  const { players, loading: playersLoading } = usePlayers();
  const { entries, loading: leaderboardLoading } = useLeaderboard();

  const imageUrls = useMemo(() => homeImageUrls(state, players), [state, players]);
  const imagesReady = useImagePreload(imageUrls);

  if (resultsLoading || playersLoading || leaderboardLoading || !imagesReady) {
    return state === "loggedout_notstarted" ? <HomeHeroBandSkeleton /> : <HomeBentoSkeleton />;
  }

  // Every VisibilityState has its own dedicated landing composition — see
  // onboarding/PAGE_BRIEFING.txt's "HOME - not logged in, not started" and
  // "HOME - logged in, not started" sections, plus PAGEMAP_SPEC.md §3.
  // Mobile runs its own composition per state — a separate tree, not a
  // reflow of the desktop one. See the mobile design spec for why. The two
  // logged-in branches fork one level deeper instead, inside their existing
  // data-fetching wrappers, so the (substantial) fetching logic isn't
  // duplicated.
  if (state === "loggedout_notstarted") {
    return isMobile ? (
      <MobileHomeNotStartedLoggedOut players={players} />
    ) : (
      <HomeLandingLoggedOut players={players} />
    );
  }
  if (state === "loggedin_notstarted") {
    return <LoggedInHome players={players} />;
  }
  // loggedout_leaguephase's composition is reused as-is for preknockout/
  // knockout too (2026-08-03, "populate the pages" pass — not a considered
  // design decision for those two phases yet, just filling the placeholder
  // in ahead of a proper pass later), same treatment as the logged-in branch
  // below.
  if (state === "loggedout_leaguephase" || state === "loggedout_preknockout" || state === "loggedout_knockout") {
    return isMobile ? (
      <MobileHomeStartedLoggedOut players={players} entries={entries} results={results} phase={phase} />
    ) : (
      <HomeLandingLoggedOutStarted results={results} players={players} entries={entries} phase={phase} />
    );
  }
  // loggedin_leaguephase's composition is reused as-is for preknockout/
  // knockout too (2026-08-03, "populate the pages" pass — not a considered
  // design decision for those two phases yet, just filling the placeholder
  // in ahead of a proper pass later).
  if (state === "loggedin_leaguephase" || state === "loggedin_preknockout" || state === "loggedin_knockout") {
    return <LoggedInHomeStarted results={results} players={players} entries={entries} phase={phase} />;
  }

  return null;
}
