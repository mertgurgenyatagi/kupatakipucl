// src/pages/LeaderboardPage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import {
  ParticipantCountCell,
  CurrentLeaderCell,
} from "../leaderboard/LeaderboardCells";
import { Frame, FrameHeader } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";

/** Desktop: a two-column bento — a stacked pair of small cells beside the
 *  standings oblong. Mobile: the same cells stacked in one clear column
 *  (DESIGN-SPEC §0b framing; §53 mobile clarity; §55 desktop no-scroll). */
function LeaderboardLayout({
  count,
  leader,
  table,
}: {
  count: React.ReactNode;
  leader: React.ReactNode;
  table: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:p-8">
      <div className="flex flex-col gap-4 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(272px,340px)_1fr] lg:gap-6">
        <div className="flex flex-col gap-4 lg:min-h-0 lg:gap-6">
          {count}
          {/* Quiet editorial caption filling the mat between the cells —
              the decided tagline voice (§38), real constants only so nothing
              here can drift. Desktop breathing room, hidden on mobile. */}
          <div className="hidden px-2 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:justify-center">
            <span aria-hidden className="mb-3 block h-px w-8 bg-brass/60" />
            <p className="animate-cotton-fade font-display text-[1.75rem] leading-[1.15] text-muted-foreground/75 italic [animation-delay:120ms]">
              36 takım.
              <br />
              Tek kupa.
            </p>
          </div>
          {leader}
        </div>
        {table}
      </div>
    </div>
  );
}

function LedgerSkeleton() {
  return (
    <div
      className="p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:p-8"
      aria-hidden
      data-testid="leaderboard-skeleton"
    >
      <div className="flex flex-col gap-4 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(272px,340px)_1fr] lg:gap-6">
        <div className="flex flex-col gap-4 lg:min-h-0 lg:justify-between lg:gap-6">
          <Frame>
            <FrameHeader tone="plain">
              <Skeleton className="h-3 w-20 rounded-sm" />
            </FrameHeader>
            <div className="px-5 py-5 sm:px-6">
              <Skeleton className="h-12 w-24 rounded-sm" />
            </div>
          </Frame>
          <Frame className="border-navy-line/40 bg-navy">
            <div className="border-b border-navy-line/50 px-5 py-3.5 sm:px-6">
              <Skeleton className="h-3 w-16 rounded-sm bg-navy-line/40" />
            </div>
            <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
              <Skeleton className="size-12 rounded-full bg-navy-line/40" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32 rounded-sm bg-navy-line/40" />
                <Skeleton className="h-3 w-16 rounded-sm bg-navy-line/40" />
              </div>
            </div>
          </Frame>
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
    <LeaderboardLayout
      count={<ParticipantCountCell entries={entries} />}
      leader={<CurrentLeaderCell entries={entries} />}
      table={<LeaderboardTable entries={entries} />}
    />
  );
}
