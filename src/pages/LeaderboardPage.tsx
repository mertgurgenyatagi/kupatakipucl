// src/pages/LeaderboardPage.tsx
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { usePlayers } from "../profile/usePlayers";
import { useResults } from "../leaderboard/useResults";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import { TeamTable } from "../leaderboard/TeamTable";
import { LeaderboardHero } from "../leaderboard/LeaderboardHero";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { MatchupPopup } from "../leaderboard/MatchupPopup";
import { KnockoutBracket } from "../knockout/KnockoutBracket";
import { evaluatePicks } from "../leaderboard/scoring";
import { assignRanks } from "../leaderboard/ranking";
import { TEAMS, teamCrestSrc } from "../predictions/teams";
import { useImagePreload } from "@/lib/useImagePreload";
import { Frame } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { PageUnavailable } from "@/components/ui/page-unavailable";
import { useIsMobile } from "@/lib/useIsMobile";
import { MobileLeaderboardPage } from "../mobile/MobileLeaderboardPage";

/**
 * The leaderboard, per Mert's brief, rolls the participant standings and the
 * team table "all into one page". Composed as one bento of frames
 * (DESIGN-SPEC §0b), desktop-first, one row, three columns:
 *
 *   ┌─ team table (the star) ─┬─ hero ───┬─ standings ─┐
 *   └─────────────────────────┴──────────┴─────────────┘
 *
 * Team table and standings carry comparable weight — neither is shrunk into a
 * side-widget (brief: "full detailed team table"). The middle column used to
 * stack the three stat widgets; those moved to the stats page (still built,
 * just not rendered here — see StatWidget.tsx) and LeaderboardHero took the
 * exact space they vacated rather than leaving it empty. Each column scrolls
 * inside its own frame(s); the document itself never scrolls on desktop (§55).
 *
 * Width note: this page loosens DESIGN-SPEC §0c's 1100px cap to 1400px for
 * league phases — a 6-column 36-row team table beside a hero column and a
 * 51-row standings genuinely needs the room. Flagged for discussion, not a
 * silent drift.
 *
 * During knockout/preknockout phases a different layout is used: the bracket
 * dominates the left section and the standings are docked to the right. The
 * team table and hero carousel are absent in this mode — the bracket is the
 * star. Max-width is widened to 1600px for this variant.
 *
 *   ┌─ Knockout Bracket ──────────────────────────────┬─ standings ─┐
 *   └─────────────────────────────────────────────────┴─────────────┘
 */

// ─── Layout tokens ────────────────────────────────────────────────────────────

const LEAGUE_PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";

// [&>*]:min-w-0/[&>*]:min-h-0 — grid items default to min-width/min-height:auto,
// which lets intrinsic content size force the grid wider/taller than its
// container. Without this, a stray scrollbar sneaks in despite the fixed-viewport
// rule (§55).
const LEAGUE_MAIN_ROW =
  "relative z-10 grid min-w-0 gap-4 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(540px,1.3fr)_300px_minmax(340px,1fr)] lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";

// Knockout layout: same 3-column structure as league (bracket | hero | standings)
// but the bracket takes the team-table slot. The bracket column uses a generous
// flex share — it needs horizontal room for 7 columns of match boxes.
const KNOCKOUT_PAGE_SHELL = LEAGUE_PAGE_SHELL;
const KNOCKOUT_MAIN_ROW =
  "relative z-10 grid min-w-0 gap-4 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_256px_297px] lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";

// ─── Skeleton placeholders ────────────────────────────────────────────────────

function LedgerSkeleton() {
  return (
    <div className={LEAGUE_PAGE_SHELL} aria-hidden data-testid="leaderboard-skeleton">
      <div className={LEAGUE_MAIN_ROW}>
        <Frame className="min-h-0 lg:h-full">
          <div className="min-h-0 flex-1 px-4 py-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-color_border1/60 py-3.5"
              >
                <Skeleton className="h-4 w-6 rounded-sm" />
                <Skeleton className="h-4 flex-1 rounded-sm" />
                <Skeleton className="h-4 w-8 rounded-sm" />
              </div>
            ))}
          </div>
        </Frame>
        <Frame className="min-h-[128px] lg:h-full" />
        <Frame className="min-h-0 lg:h-full">
          <div className="min-h-0 flex-1 px-4 py-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-color_border1/60 py-3.5"
              >
                <Skeleton className="h-4 w-6 rounded-sm" />
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 flex-1 rounded-sm" />
                <Skeleton className="h-4 w-8 rounded-sm" />
              </div>
            ))}
          </div>
        </Frame>
      </div>
    </div>
  );
}

function KnockoutSkeleton() {
  return (
    <div className={KNOCKOUT_PAGE_SHELL} aria-hidden data-testid="leaderboard-skeleton">
      <div className={KNOCKOUT_MAIN_ROW}>
        {/* Bracket placeholder — 7 evenly-spaced column stubs */}
        <Frame className="min-h-0 lg:h-full">
          <div className="flex h-full items-center justify-around gap-2 p-4">
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} className="flex h-full flex-col items-center justify-around gap-2">
                {Array.from({ length: col === 3 ? 1 : col === 2 || col === 4 ? 1 : col === 1 || col === 5 ? 2 : 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-24 rounded-xl" />
                ))}
              </div>
            ))}
          </div>
        </Frame>
        {/* Hero placeholder */}
        <Frame className="min-h-[128px] lg:h-full" />
        {/* Standings placeholder */}
        <Frame className="min-h-0 lg:h-full">
          <div className="min-h-0 flex-1 px-4 py-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-color_border1/60 py-3.5"
              >
                <Skeleton className="h-4 w-6 rounded-sm" />
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 flex-1 rounded-sm" />
                <Skeleton className="h-4 w-8 rounded-sm" />
              </div>
            ))}
          </div>
        </Frame>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const state = useVisibilityState();
  const { entries, loading } = useLeaderboard();
  const { players } = usePlayers();
  const { user } = useAuth();
  const { results } = useResults();
  const phase = useTournamentPhase();
  const isMobile = useIsMobile();

  const isKnockoutPhase = phase === "knockout" || phase === "preknockout";

  const imageUrls = useMemo(
    () => [...players.map((p) => p.photoURL).filter(Boolean), ...TEAMS.map((t) => teamCrestSrc(t.id))],
    [players]
  );
  const imagesReady = useImagePreload(imageUrls);
  const [hoveredUid, setHoveredUid] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  // The hovered participant's currently-correct teams — recomputed only
  // when the hover target or the live results change, not on every render.
  const highlightedTeamIds = useMemo(() => {
    const hovered = entries.find((e) => e.uid === hoveredUid);
    if (!hovered) return undefined;
    return new Set(
      evaluatePicks(hovered.ranking, results)
        .filter((e) => e.correct)
        .map((e) => e.teamId)
    );
  }, [entries, hoveredUid, results]);

  // Ranks are computed once here (not re-derived inside the popup) so the
  // clicked participant's rank matches exactly what the standings frame
  // itself is showing.
  const rankedEntries = useMemo(() => assignRanks(entries), [entries]);
  const selectedRanked = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;

  // Stable identity — ParticipantPopup/TeamPopup/MatchupPopup are all
  // memoized, and an inline arrow function here would defeat that on every
  // hover-driven re-render. The three popups are mutually exclusive:
  // selecting one clears the other two, since they cross-link into each
  // other (a team's predictors list opens a participant; a participant's
  // predictions grid opens a team; a fixture opens either team) and
  // stacking multiple Dialogs isn't worth the backdrop/z-index mess.
  const handlePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedUid(null);
  }, []);
  const handleTeamPopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTeamId(null);
  }, []);
  const handleFixturePopupOpenChange = useCallback((open: boolean) => {
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

  if (!isPageAllowed("leaderboard", state)) {
    return <PageUnavailable />;
  }

  if (loading || !imagesReady) {
    return isKnockoutPhase ? <KnockoutSkeleton /> : <LedgerSkeleton />;
  }

  // Mobile drops the hero carousel, the full team table and the fixtures
  // drawer, keeping the two frames the wireframe asks for. Its popups come
  // from MobilePopupHost at the shell, so `popupLayer` below isn't rendered.
  if (isMobile) {
    return (
      <MobileLeaderboardPage
        entries={entries}
        players={players}
        results={results}
        phase={phase}
        myUid={user?.uid}
      />
    );
  }

  // ── Shared popup layer (identical for both layouts) ────────────────────────
  const popupLayer = (
    <>
      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={handlePopupOpenChange}
        onSelectTeam={handleSelectTeam}
        tournamentStarted={phase !== "notstarted"}
        viewerLoggedIn={Boolean(user)}
        phase={phase}
      />
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={handleTeamPopupOpenChange}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        onSelectFixture={handleSelectFixture}
        tournamentStarted={phase !== "notstarted"}
        phase={phase}
      />
      <MatchupPopup
        fixtureId={selectedFixtureId}
        onOpenChange={handleFixturePopupOpenChange}
        phase={phase}
        tournamentStarted={phase !== "notstarted"}
        entries={entries}
        players={players}
        results={results}
        onSelectTeam={handleSelectTeam}
        onSelectParticipant={handleSelectParticipant}
      />
    </>
  );

  // ── Knockout layout: bracket | hero | standings ──────────────────────────
  if (isKnockoutPhase) {
    return (
      <div className={KNOCKOUT_PAGE_SHELL}>
        <div className={KNOCKOUT_MAIN_ROW}>
          {/* Bracket — compact+read-only; team pills open TeamPopup.
              bg-background makes it dissolve into the page canvas rather than
              sitting inside a card-colored box. border-transparent kills the
              hairline so the bracket genuinely floats. shadow-none drops the
              frame drop-shadow since there's no surface to lift. */}
          <Frame className="relative min-h-0 animate-cotton-rise bg-background border-transparent shadow-none lg:h-full">
            <KnockoutBracket
              readOnly
              compact
              onSelectTeam={handleSelectTeam}
            />
          </Frame>

          {/* Hero carousel + upcoming fixtures drawer — identical to league layout */}
          <LeaderboardHero results={results} onSelectTeam={handleSelectTeam} onSelectFixture={handleSelectFixture} />

          {/* Standings — identical to the league-phase layout */}
          <LeaderboardTable
            entries={entries}
            players={players}
            myUid={user?.uid}
            revealCorrectness={true /* always true in knockout/preknockout */}
            onHoverEntry={setHoveredUid}
            onSelectEntry={handleSelectParticipant}
          />
        </div>
        {popupLayer}
      </div>
    );
  }

  // ── League / default layout: team table | hero | standings ────────────────
  return (
    <div className={LEAGUE_PAGE_SHELL}>
      <div className={LEAGUE_MAIN_ROW}>
        <TeamTable
          results={results}
          highlightedTeamIds={highlightedTeamIds}
          onSelectTeam={handleSelectTeam}
        />
        <LeaderboardHero results={results} onSelectTeam={handleSelectTeam} onSelectFixture={handleSelectFixture} />
        <LeaderboardTable
          entries={entries}
          players={players}
          myUid={user?.uid}
          revealCorrectness={phase !== "notstarted"}
          onHoverEntry={setHoveredUid}
          onSelectEntry={handleSelectParticipant}
        />
      </div>
      {popupLayer}
    </div>
  );
}
