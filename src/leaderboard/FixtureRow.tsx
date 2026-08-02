import { type KeyboardEvent } from "react";
import { TEAM_BY_ID } from "../predictions/teams";
import { Fixture } from "../devpanel/fixtures";
import { TeamResult } from "./teamResultTypes";
import { TeamCrest } from "./TeamCrest";
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

/** Clickable, but intentionally does nothing yet — Mert's own spec: "clickable
 *  but does nothing." Reserved for a future match-detail view. */
function handleMatchClick() {}
function handleMatchKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handleMatchClick();
  }
}

export function FixtureRow({
  fixture,
  results,
  compact = false,
  onSelectTeam,
}: {
  fixture: Fixture;
  results: Record<string, TeamResult>;
  /** Home's UpcomingMatchesPreview lays crest+code side by side instead of
   *  stacked (narrower per row), everything else full-sized same as the
   *  drawer's own rows. The drawer itself keeps its default layout. */
  compact?: boolean;
  /** Fires with a team's id when its crest/name is clicked — opens
   *  TeamPopup. Undefined for the drawer (unchanged, still just stops
   *  propagation with no further effect). */
  onSelectTeam?: (teamId: string) => void;
}) {
  const home = TEAM_BY_ID[fixture.homeTeamId];
  const away = TEAM_BY_ID[fixture.awayTeamId];
  const kickoff = new Date(fixture.kickoffUtc);

  return (
    <div className={compact ? "h-[4.5rem] px-2" : "h-24 px-2"}>
      {/* A div, not a <button> — a real <button> can't contain the
          home/away crest+name buttons below (invalid nesting). */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleMatchClick}
        onKeyDown={handleMatchKeyDown}
        className="grid h-full w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 transition-colors duration-150 ease-[var(--ease-cotton)] outline-none hover:bg-color_hoverfill focus-visible:bg-color_hoverfill"
        style={{ gridTemplateColumns: ROW_GRID_COLUMNS }}
      >
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
          <span className="font-mono text-sm text-color_text tnum">{DATE_FMT.format(kickoff)}</span>
          <span className="font-mono text-sm text-color_textsecondary tnum">{TIME_FMT.format(kickoff)}</span>
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
      </div>
    </div>
  );
}
