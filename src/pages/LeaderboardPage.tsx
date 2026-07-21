// src/pages/LeaderboardPage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useResults } from "../leaderboard/useResults";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import { TeamTable } from "../leaderboard/TeamTable";
import { StatWidget, STAT_WIDGETS } from "../leaderboard/StatWidget";
import { Frame, FrameHeader } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The leaderboard, per Mert's brief, rolls the participant standings, the team
 * table and the stats widgets "all into one page". Composed as one bento of
 * frames (DESIGN-SPEC §0b), desktop-first, one row, three columns per Mert's
 * explicit layout call:
 *
 *   ┌─ team table (the star) ─┬─ rating ─┬─ standings ─┐
 *   │                         ├─ scorers ┤             │
 *   │                         ├─ assists ┤             │
 *   └─────────────────────────┴──────────┴─────────────┘
 *
 * Team table and standings carry comparable weight — neither is shrunk into a
 * side-widget (brief: "full detailed team table"). The three stat widgets
 * stack in the middle column, honestly empty (see StatWidget). Each column
 * scrolls inside its own frame(s); the document itself never scrolls on
 * desktop (§55).
 *
 * Width note: this page loosens DESIGN-SPEC §0c's 1100px cap to 1400px — a
 * 6-column 36-row team table beside a stat column and a 51-row standings
 * genuinely needs the room. Flagged for discussion, not a silent drift.
 */
const PAGE_SHELL =
  "mx-auto flex w-full max-w-[1400px] flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-8";
const MAIN_ROW =
  "grid gap-4 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(420px,1.3fr)_300px_minmax(340px,1fr)] lg:gap-5";
const STATS_COLUMN = "grid grid-rows-3 gap-4 lg:min-h-0 lg:gap-5";

function LedgerSkeleton() {
  return (
    <div className={PAGE_SHELL} aria-hidden data-testid="leaderboard-skeleton">
      <div className={MAIN_ROW}>
        <Frame className="min-h-0 lg:h-full">
          <FrameHeader tone="navy">
            <Skeleton className="h-5 w-32 rounded-sm bg-navy-line/40" />
          </FrameHeader>
          <div className="min-h-0 flex-1 px-4 py-2">
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
        <div className={STATS_COLUMN}>
          {STAT_WIDGETS.map((s) => (
            <Frame key={s.key} className="min-h-[128px]" />
          ))}
        </div>
        <Frame className="min-h-0 lg:h-full">
          <FrameHeader tone="navy">
            <Skeleton className="h-5 w-32 rounded-sm bg-navy-line/40" />
          </FrameHeader>
          <div className="min-h-0 flex-1 px-4 py-2">
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
        <TeamTable results={results} />
        <div className={STATS_COLUMN}>
          {STAT_WIDGETS.map((spec, i) => (
            <StatWidget key={spec.key} spec={spec} index={i} />
          ))}
        </div>
        <LeaderboardTable
          entries={entries}
          results={results}
          revealCorrectness={phase === "post"}
        />
      </div>
    </div>
  );
}
