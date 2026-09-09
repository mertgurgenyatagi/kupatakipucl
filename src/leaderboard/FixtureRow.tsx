import { type KeyboardEvent } from "react";
import { TEAM_BY_ID } from "../predictions/teams";
import { RealFixture } from "./realFixtureTypes";
import { TeamResult } from "./teamResultTypes";
import { TeamCrest } from "./TeamCrest";
import { isFixtureLive } from "./liveFixtures";
import { MatchConsensus } from "./matchConsensus";
import { LiveDot } from "./LiveDot";
import { cn } from "@/lib/utils";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  timeZone: "Europe/Istanbul",
});
const TIME_FMT = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Istanbul",
});

// Home place · home crest-over-code | date/time | away crest-over-code ·
// away place — see UpcomingMatchesDrawer.tsx's original comment (git blame)
// for the layout history. Shared verbatim between the drawer and
// UpcomingMatchesPreview (Home's static 3-fixture widget) since 2026-08-02.
const ROW_GRID_COLUMNS = "1.25rem minmax(0,1fr) 5rem minmax(0,1fr) 1.25rem";

function place(results: Record<string, TeamResult>, teamId: string): string {
  const position = results[teamId]?.position;
  return position ? String(position) : "-";
}

/**
 * The desktop Matches page's one addition to a row: how the group split on
 * these two teams when they ranked all 36 (matchConsensus.ts). A hairline
 * bar, a count at each end, and nothing else — the rest of the prediction
 * detail is a click away in MatchupPopup.
 */
function ConsensusBar({ home, away }: { home: number; away: number }) {
  const total = home + away;
  const homeShare = (home / total) * 100;

  return (
    // Narrow and centred under the score rather than spanning the row: the
    // flanking league positions are already numbers at both edges, and a
    // full-width bar put a second pair out there to be confused with them.
    // Sitting under the score also says what it is about — the pairing.
    <div
      className="col-span-full mx-auto mt-1.5 flex w-40 items-center gap-2"
      title="Sıralamada üstte görenler"
      aria-label={`Sıralamada üstte görenler: ${home} - ${away}`}
    >
      <span className="w-4 shrink-0 text-right font-mono text-[0.6rem] text-color_textsecondary tnum">{home}</span>
      <span className="flex h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-color_border1">
        <span className="h-full rounded-full bg-color_accent/70" style={{ width: `${homeShare}%` }} />
      </span>
      <span className="w-4 shrink-0 font-mono text-[0.6rem] text-color_textsecondary tnum">{away}</span>
    </div>
  );
}

export function FixtureRow({
  fixture,
  results,
  compact = false,
  consensus,
  onSelectTeam,
  onSelectFixture,
}: {
  fixture: RealFixture;
  results: Record<string, TeamResult>;
  /** Home's UpcomingMatchesPreview lays crest+code side by side instead of
   *  stacked (narrower per row), everything else full-sized same as the
   *  drawer's own rows. The drawer itself keeps its default layout. */
  compact?: boolean;
  /** Desktop Matches page only — adds the head-to-head consensus bar under
   *  the score. Omitted everywhere else, including mobile, which keeps the
   *  lean row and never pays for the leaderboard read it needs. */
  consensus?: MatchConsensus | null;
  /** Fires with a team's id when its crest/name is clicked — opens
   *  TeamPopup. Undefined for the drawer (unchanged, still just stops
   *  propagation with no further effect). */
  onSelectTeam?: (teamId: string) => void;
  /** Fires with the fixture's id when the row itself (not a team) is
   *  clicked — opens MatchupPopup.tsx. */
  onSelectFixture?: (fixtureId: string) => void;
}) {
  const home = TEAM_BY_ID[fixture.homeTeamId];
  const away = TEAM_BY_ID[fixture.awayTeamId];
  const kickoff = new Date(fixture.kickoffUtc);
  const live = isFixtureLive(fixture);
  // Same "decided" test as MatchupPopup's MatchupCenter, rankHistory.ts and
  // functions/fixtures' standings.js — both goals present, independent of
  // `status`. This row used to show a score only while a match was *live*,
  // which was fine for the two upcoming-only widgets it was built for
  // (getUpcomingFixtures never yields a FINISHED fixture) but meant the
  // Matches page — which lists a whole round, played or not — rendered a
  // finished match as its kickoff time with no result at all (2026-09-09).
  const decided = fixture.homeGoals !== null && fixture.awayGoals !== null;

  function handleMatchClick() {
    onSelectFixture?.(fixture.id);
  }
  function handleMatchKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleMatchClick();
    }
  }

  return (
    <div className={cn("px-2", compact ? "h-[4.5rem]" : consensus ? "h-28" : "h-24")}>
      {/* A div, not a <button> — a real <button> can't contain the
          home/away crest+name buttons below (invalid nesting). */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleMatchClick}
        onKeyDown={handleMatchKeyDown}
        className={cn(
          "relative grid h-full w-full cursor-pointer content-center items-center gap-1.5 rounded-lg px-2 transition-colors duration-150 ease-[var(--ease-cotton)] outline-none hover:bg-color_hoverfill focus-visible:bg-color_hoverfill",
          live && "bg-color_remove/[0.08] hover:bg-color_remove/[0.14]"
        )}
        style={{ gridTemplateColumns: ROW_GRID_COLUMNS }}
      >
        {live && <LiveDot className="absolute top-0.5 left-1/2 size-1.5 -translate-x-1/2" />}
        <span className="font-mono text-xs text-color_textsecondary tnum">{place(results, home.id)}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTeam?.(home.id);
          }}
          className={cn(
            "group flex cursor-pointer items-center",
            compact ? "flex-row justify-center gap-2" : "flex-col gap-1"
          )}
        >
          <TeamCrest teamId={home.id} className="size-7" />
          <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
            {home.shortName}
          </span>
        </button>

        <span className="flex flex-col items-center justify-center leading-tight">
          {decided ? (
            <>
              <span
                className={cn(
                  "font-mono text-base font-bold tnum",
                  live ? "text-color_remove" : "text-color_text"
                )}
              >
                {fixture.homeGoals} - {fixture.awayGoals}
              </span>
              <span className="font-mono text-xs text-color_textsecondary tnum">
                {live ? "CANLI" : DATE_FMT.format(kickoff)}
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-sm text-color_text tnum">{DATE_FMT.format(kickoff)}</span>
              <span className="font-mono text-sm text-color_textsecondary tnum">{TIME_FMT.format(kickoff)}</span>
            </>
          )}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTeam?.(away.id);
          }}
          className={cn(
            "group flex cursor-pointer items-center",
            compact ? "flex-row justify-center gap-2" : "flex-col gap-1"
          )}
        >
          <TeamCrest teamId={away.id} className="size-7" />
          <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
            {away.shortName}
          </span>
        </button>
        <span className="font-mono text-xs text-color_textsecondary tnum">{place(results, away.id)}</span>
        {consensus && <ConsensusBar home={consensus.home} away={consensus.away} />}
      </div>
    </div>
  );
}
