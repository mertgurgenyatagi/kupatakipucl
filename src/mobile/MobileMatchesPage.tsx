import { useMemo, useState } from "react";
import { useFixtures } from "../leaderboard/useFixtures";
import { useResults } from "../leaderboard/useResults";
import { buildStageTabs, defaultStageKey } from "../leaderboard/fixtureStages";
import { StageTabs } from "../leaderboard/StageTabs";
import { MatchDayList } from "../leaderboard/MatchDayList";
import { useMobilePopups } from "../shell/MobilePopupHost";
import { useLoadingStuck } from "@/lib/useLoadingStuck";
import { SlowLoadNotice } from "@/components/ui/slow-load-notice";
import { Frame, FrameBody } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Maçlar on a phone: the same tabs and the same date-grouped list, with lean
 * rows — no consensus bar. The golden rule applied to the one row that has a
 * choice about it: a phone-width row already carries two crests, two names,
 * two league positions and a score, and a third tier of numbers under all
 * that is the thing to cut. The full detail is one tap away in MatchupPopup,
 * which is where it reads properly anyway.
 *
 * Dropping the bar also means this page never mounts `useLeaderboard`.
 *
 * No page header: the shell's own nav already says where you are, and the
 * tab strip is the first thing worth seeing.
 */
export function MobileMatchesPage() {
  const { openTeam, openFixture } = useMobilePopups();
  const { fixtures, loading } = useFixtures();
  const { results } = useResults();

  const tabs = useMemo(() => buildStageTabs(fixtures), [fixtures]);
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const selectedKey = pickedKey ?? defaultStageKey(tabs);
  const activeTab = tabs.find((tab) => tab.key === selectedKey) ?? null;

  const stuck = useLoadingStuck(loading);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3">
        {stuck ? (
          <SlowLoadNotice />
        ) : (
          <Frame className="min-h-0 flex-1 border-color_border1/35" aria-hidden data-testid="matches-skeleton">
            <div className="flex shrink-0 gap-1.5 px-3 py-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 shrink-0 rounded-full" />
              ))}
            </div>
            <div className="min-h-0 flex-1 px-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="mb-2 h-20 w-full rounded-lg" />
              ))}
            </div>
          </Frame>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <Frame className="min-h-0 flex-1 animate-cotton-rise border-color_border1/35">
        <FrameBody>
          <StageTabs tabs={tabs} selectedKey={selectedKey} onSelect={setPickedKey} />
          <MatchDayList
            fixtures={activeTab?.fixtures ?? []}
            results={results}
            onSelectTeam={openTeam}
            onSelectFixture={openFixture}
          />
        </FrameBody>
      </Frame>
    </div>
  );
}
