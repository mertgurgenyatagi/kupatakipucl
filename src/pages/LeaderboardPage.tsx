// src/pages/LeaderboardPage.tsx
import { useCallback, useMemo, useState } from "react";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useResults } from "../leaderboard/useResults";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import { TeamTable } from "../leaderboard/TeamTable";
import { LeaderboardHero } from "../leaderboard/LeaderboardHero";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { evaluatePicks } from "../leaderboard/scoring";
import { assignRanks } from "../leaderboard/ranking";
import { Frame } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";

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
 * Width note: this page loosens DESIGN-SPEC §0c's 1100px cap to 1400px — a
 * 6-column 36-row team table beside a hero column and a 51-row standings
 * genuinely needs the room. Flagged for discussion, not a silent drift.
 */
const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
// [&>*]:min-w-0/[&>*]:min-h-0 — grid items default to min-width/min-height:auto,
// which lets intrinsic content size (a wide table, a tall column) force the
// grid itself wider/taller than its container. Without this, that's exactly
// how a stray browser scrollbar sneaks in despite the fixed-viewport rule
// (§55) — nothing here should ever scroll but this row's own frames.
// The team-table column's 540px floor isn't a nice round number — it's the
// two 18-row halves' real minimum (rank + team-code + O/A/Y/AV/P columns,
// see TeamTable.tsx's grid) plus frame chrome. Below it the two halves no
// longer both fit at once; measured live via Playwright, not eyeballed.
const MAIN_ROW =
  "relative z-10 grid min-w-0 gap-4 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(540px,1.3fr)_300px_minmax(340px,1fr)] lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";

function LedgerSkeleton() {
  return (
    <div className={PAGE_SHELL} aria-hidden data-testid="leaderboard-skeleton">
      <div className={MAIN_ROW}>
        <Frame className="min-h-0 lg:h-full">
          <div className="min-h-0 flex-1 px-4 py-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border/60 py-3.5"
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
                className="flex items-center gap-3 border-b border-border/60 py-3.5"
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

export function LeaderboardPage() {
  const state = useVisibilityState();
  const { entries, loading } = useLeaderboard();
  const { results } = useResults();
  const phase = useTournamentPhase();
  const [hoveredUid, setHoveredUid] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

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

  // Stable identity — ParticipantPopup/TeamPopup are both memoized, and an
  // inline arrow function here would defeat that on every hover-driven
  // re-render. The two popups are mutually exclusive: selecting one clears
  // the other, since they cross-link into each other (a team's predictors
  // list opens a participant; a participant's predictions grid opens a
  // team) and stacking two Dialogs isn't worth the backdrop/z-index mess.
  const handlePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedUid(null);
  }, []);
  const handleTeamPopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTeamId(null);
  }, []);
  const handleSelectParticipant = useCallback((uid: string) => {
    setSelectedUid(uid);
    setSelectedTeamId(null);
  }, []);
  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
  }, []);

  if (!isPageAllowed("leaderboard", state)) {
    return (
      <div className="flex h-full flex-1 items-center px-5 sm:px-8 lg:px-12">
        <p className="font-display text-2xl text-muted-foreground italic">
          This section isn't available right now.
        </p>
      </div>
    );
  }

  if (loading) return <LedgerSkeleton />;

  return (
    <div className={PAGE_SHELL}>
      <div className={MAIN_ROW}>
        <TeamTable
          results={results}
          highlightedTeamIds={highlightedTeamIds}
          onSelectTeam={handleSelectTeam}
        />
        <LeaderboardHero results={results} />
        <LeaderboardTable
          entries={entries}
          revealCorrectness={phase === "post"}
          onHoverEntry={setHoveredUid}
          onSelectEntry={handleSelectParticipant}
        />
      </div>
      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        results={results}
        onOpenChange={handlePopupOpenChange}
        onSelectTeam={handleSelectTeam}
      />
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        results={results}
        onOpenChange={handleTeamPopupOpenChange}
        onSelectParticipant={handleSelectParticipant}
      />
    </div>
  );
}
