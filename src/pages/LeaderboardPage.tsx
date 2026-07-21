// src/pages/LeaderboardPage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import { Skeleton } from "@/components/ui/skeleton";

function LedgerSkeleton() {
  return (
    <section
      className="flex h-full min-h-0 flex-1 flex-col px-5 pt-6 pb-4 sm:px-8 lg:px-12 lg:pt-10"
      aria-hidden
      data-testid="leaderboard-skeleton"
    >
      <div className="shrink-0 pb-5">
        <Skeleton className="h-3 w-28 rounded-sm" />
        <Skeleton className="mt-2 h-12 w-56 rounded-sm" />
      </div>
      <div className="min-h-0 flex-1 border-t border-border pt-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/60 py-3.5">
            <Skeleton className="h-4 w-5 rounded-sm" />
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 flex-1 rounded-sm" />
            <Skeleton className="h-4 w-8 rounded-sm" />
          </div>
        ))}
      </div>
    </section>
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
  return <LeaderboardTable entries={entries} />;
}
