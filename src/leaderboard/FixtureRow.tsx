import { type KeyboardEvent } from "react";
import { Star } from "lucide-react";
import { TEAM_BY_ID } from "../predictions/teams";
import { RealFixture } from "./realFixtureTypes";
import { TeamResult } from "./teamResultTypes";
import { TeamCrest } from "./TeamCrest";
import { isFixtureLive } from "./liveFixtures";
import { PickOutcome } from "./personalPicks";
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

export function FixtureRow({
  fixture,
  results,
  compact = false,
  personalPick,
  onSelectTeam,
  onSelectFixture,
}: {
  fixture: RealFixture;
  results: Record<string, TeamResult>;
  /** Home's UpcomingMatchesPreview lays crest+code side by side instead of
   *  stacked (narrower per row), everything else full-sized same as the
   *  drawer's own rows. The drawer itself keeps its default layout. */
  compact?: boolean;
  /** Mert-only: his pre-season pick for this fixture, shown on every match —
   *  past, present or future — not just decided ones. Unset for the two
   *  teaser widgets (UpcomingMatchesDrawer/Preview), which never pass it —
   *  only the mobile Matches page (via MatchDayList) does. */
  personalPick?: PickOutcome | null;
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
  const homeWon = decided && fixture.homeGoals! > fixture.awayGoals!;
  const awayWon = decided && fixture.awayGoals! > fixture.homeGoals!;
  const actualOutcome: PickOutcome | null = !decided ? null : homeWon ? "home" : awayWon ? "away" : "draw";
  const pickCorrect = decided && personalPick ? personalPick === actualOutcome : null;

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
    <div className={cn("px-2", compact ? "h-[4.5rem]" : "h-24")}>
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
          <span className="relative">
            <TeamCrest teamId={home.id} className="size-7" />
            {personalPick === "home" && (
              <Star
                className="absolute -top-1 -right-1 size-2.5 fill-color_gold text-color_gold drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
                aria-label="Tahminin"
              />
            )}
          </span>
          <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
            {home.shortName}
          </span>
        </button>

        <span className="relative flex flex-col items-center justify-center leading-tight">
          {personalPick === "draw" && (
            <Star
              className="absolute -top-2.5 size-2.5 fill-color_gold text-color_gold drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
              aria-label="Tahminin: berabere"
            />
          )}
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
              {live ? (
                <span className="font-mono text-xs text-color_textsecondary tnum">CANLI</span>
              ) : pickCorrect !== null ? (
                <span
                  className={cn(
                    "font-mono text-xs font-bold uppercase",
                    pickCorrect ? "text-color_green" : "text-color_remove"
                  )}
                >
                  {pickCorrect ? "correct" : "wrong"}
                </span>
              ) : (
                <span className="font-mono text-xs text-color_textsecondary tnum">{DATE_FMT.format(kickoff)}</span>
              )}
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
          <span className="relative">
            <TeamCrest teamId={away.id} className="size-7" />
            {personalPick === "away" && (
              <Star
                className="absolute -top-1 -left-1 size-2.5 fill-color_gold text-color_gold drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
                aria-label="Tahminin"
              />
            )}
          </span>
          <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
            {away.shortName}
          </span>
        </button>
        <span className="font-mono text-xs text-color_textsecondary tnum">{place(results, away.id)}</span>
      </div>
    </div>
  );
}
