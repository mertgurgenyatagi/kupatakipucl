import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "../auth/AuthProvider";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useFixtures } from "../leaderboard/useFixtures";
import { useResults } from "../leaderboard/useResults";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { usePlayers } from "../profile/usePlayers";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { buildStageTabs, defaultStageKey } from "../leaderboard/fixtureStages";
import { isPersonalPicksViewer } from "../leaderboard/personalPicks";
import {
  computePersonalPickStats,
  computeCommunityPickStats,
  computeContrarianStats,
  computeSelfContradictionStats,
} from "../leaderboard/personalPickStats";
import { PersonalPickStatsPanel } from "../leaderboard/PersonalPickStatsPanel";
import { StageTabs } from "../leaderboard/StageTabs";
import { MatchDayList } from "../leaderboard/MatchDayList";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { MatchupPopup } from "../leaderboard/MatchupPopup";
import { assignRanks } from "../leaderboard/ranking";
import { TEAMS, teamCrestSrc } from "../predictions/teams";
import { useImagePreload } from "@/lib/useImagePreload";
import { useLoadingStuck } from "@/lib/useLoadingStuck";
import { SlowLoadNotice } from "@/components/ui/slow-load-notice";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { PageUnavailable } from "@/components/ui/page-unavailable";
import { useIsMobile } from "@/lib/useIsMobile";
import { MobileMatchesPage } from "../mobile/MobileMatchesPage";

/**
 * Maçlar — the whole competition calendar, one round at a time.
 *
 * A single column, unlike the leaderboard's three: there is one thing on this
 * page and widening it would only add furniture. Rounds are tabs
 * (fixtureStages.ts builds them from the fixture data itself, so knockout
 * rounds appear as each draw lands), and within a round the fixtures sit
 * under date headers, because a matchday is played across two or three
 * evenings and that is how anyone reads it.
 *
 * Signed-in only, all started phases. The rows carry the head-to-head
 * consensus bar — how the group split on these two teams when they ranked all
 * 36 — which is participant data, and the reason this page isn't open to
 * logged-out visitors the way the forum is.
 */

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[900px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";

// Same shell, widened and switched to a row at lg so the two Mert-only stats
// panels can flank the (still 900px-capped) matches column instead of
// pushing it off-centre.
const PAGE_SHELL_WITH_STATS =
  "relative mx-auto flex w-full max-w-[1500px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch lg:justify-center lg:gap-5 lg:p-6";

function MatchesSkeleton() {
  return (
    <div className={PAGE_SHELL} aria-hidden data-testid="matches-skeleton">
      <Frame className="min-h-0 lg:h-full">
        <div className="flex shrink-0 gap-1.5 px-3 py-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="min-h-0 flex-1 px-4 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-color_border1/60 py-6">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-4 flex-1 rounded-sm" />
              <Skeleton className="h-4 w-10 rounded-sm" />
              <Skeleton className="h-4 flex-1 rounded-sm" />
              <Skeleton className="size-7 rounded-full" />
            </div>
          ))}
        </div>
      </Frame>
    </div>
  );
}

export function MatchesPage() {
  const state = useVisibilityState();
  const isMobile = useIsMobile();

  if (!isPageAllowed("matches", state)) {
    return <PageUnavailable />;
  }

  return isMobile ? <MobileMatchesPage /> : <DesktopMatchesPage />;
}

/** Split out so `useLeaderboard` — a live listener the mobile page has no use
 *  for, since its rows carry no consensus bar — is never mounted on a phone. */
function DesktopMatchesPage() {
  const { user } = useAuth();
  const phase = useTournamentPhase();
  const { fixtures, loading: fixturesLoading } = useFixtures();
  const { results } = useResults();
  const { entries } = useLeaderboard();
  const { players } = usePlayers();
  const showPersonalPicks = isPersonalPicksViewer(user?.email);

  // Mert's own submitted finishing-order ranking, for the "picked a team you
  // ranked lower" stat — null if he hasn't submitted one (or isn't Mert).
  const myRanking = entries.find((e) => e.uid === user?.uid)?.ranking ?? null;
  const personalStats = useMemo(
    () => (showPersonalPicks ? computePersonalPickStats(fixtures) : null),
    [showPersonalPicks, fixtures]
  );
  const communityStats = useMemo(
    () => (showPersonalPicks ? computeCommunityPickStats(fixtures, entries) : null),
    [showPersonalPicks, fixtures, entries]
  );
  const contrarianStats = useMemo(
    () => (showPersonalPicks ? computeContrarianStats(fixtures, entries) : null),
    [showPersonalPicks, fixtures, entries]
  );
  const selfContradictionStats = useMemo(
    () => (showPersonalPicks ? computeSelfContradictionStats(fixtures, myRanking) : null),
    [showPersonalPicks, fixtures, myRanking]
  );
  const hasStatsPanel = Boolean(
    showPersonalPicks && personalStats && communityStats && contrarianStats && selfContradictionStats
  );

  const tabs = useMemo(() => buildStageTabs(fixtures), [fixtures]);
  // Null until someone picks a tab, so the default keeps tracking the data —
  // a round finishing, or a match kicking off, moves it with no effect to
  // synchronise. The moment a tab is clicked, that choice sticks.
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const selectedKey = pickedKey ?? defaultStageKey(tabs);
  const activeTab = tabs.find((tab) => tab.key === selectedKey) ?? null;

  const crestUrls = useMemo(() => TEAMS.map((team) => teamCrestSrc(team.id)), []);
  const imagesReady = useImagePreload(crestUrls);

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  const rankedEntries = useMemo(() => assignRanks(entries), [entries]);
  const selectedRanked = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;

  const handleParticipantOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedUid(null);
  }, []);
  const handleTeamOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTeamId(null);
  }, []);
  const handleFixtureOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedFixtureId(null);
  }, []);
  const handleSelectParticipant = useCallback((uid: string) => {
    setSelectedUid(uid);
    setSelectedTeamId(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectFixture = useCallback((fixtureId: string) => {
    setSelectedFixtureId(fixtureId);
    setSelectedTeamId(null);
    setSelectedUid(null);
  }, []);

  const isLoading = fixturesLoading || !imagesReady;
  const stuck = useLoadingStuck(isLoading);

  if (isLoading) {
    return stuck ? (
      <div className="p-4 sm:p-6">
        <SlowLoadNotice />
      </div>
    ) : (
      <MatchesSkeleton />
    );
  }

  return (
    <div className={hasStatsPanel ? PAGE_SHELL_WITH_STATS : PAGE_SHELL}>
      {hasStatsPanel && (
        <PersonalPickStatsPanel
          side="left"
          stats={personalStats!}
          community={communityStats!}
          contrarian={contrarianStats!}
          selfContradiction={selfContradictionStats!}
          className="hidden lg:flex"
        />
      )}

      <Frame className={cn("min-h-0 animate-cotton-rise lg:h-full", hasStatsPanel && "lg:w-[900px] lg:shrink-0")}>
        <FrameHeader tone="navy">
          <FrameTitle>Maçlar</FrameTitle>
        </FrameHeader>
        <FrameBody>
          <StageTabs tabs={tabs} selectedKey={selectedKey} onSelect={setPickedKey} />
          <MatchDayList
            fixtures={activeTab?.fixtures ?? []}
            results={results}
            entries={entries}
            showPersonalPicks={showPersonalPicks}
            onSelectTeam={handleSelectTeam}
            onSelectFixture={handleSelectFixture}
          />
        </FrameBody>
      </Frame>

      {hasStatsPanel && (
        <PersonalPickStatsPanel
          side="right"
          stats={personalStats!}
          community={communityStats!}
          contrarian={contrarianStats!}
          selfContradiction={selfContradictionStats!}
          className="hidden lg:flex"
        />
      )}

      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={handleParticipantOpenChange}
        onSelectTeam={handleSelectTeam}
        tournamentStarted
        viewerLoggedIn={Boolean(user)}
        phase={phase}
      />
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={handleTeamOpenChange}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        onSelectFixture={handleSelectFixture}
        tournamentStarted
        phase={phase}
      />
      <MatchupPopup
        fixtureId={selectedFixtureId}
        onOpenChange={handleFixtureOpenChange}
        phase={phase}
        tournamentStarted
        entries={entries}
        players={players}
        results={results}
        onSelectTeam={handleSelectTeam}
        onSelectParticipant={handleSelectParticipant}
      />
    </div>
  );
}
