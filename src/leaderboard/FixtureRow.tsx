import { type KeyboardEvent, type MouseEvent } from "react";
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

/** Its own clickable target broken out of the row's big clickable zone
 *  (stops propagation) — one object per Mert's spec, so the name underlines
 *  whenever any part of it, crest included, is hovered. */
function handleTeamClick(e: MouseEvent) {
  e.stopPropagation();
}

export function FixtureRow({
  fixture,
  results,
  compact = false,
}: {
  fixture: Fixture;
  results: Record<string, TeamResult>;
  /** Home's UpcomingMatchesPreview needs a much shorter row than the
   *  drawer's own — same content, crest+code laid out side by side instead
   *  of stacked, everything sized down a notch. The drawer itself keeps its
   *  default (non-compact) rows unchanged. */
  compact?: boolean;
}) {
  const home = TEAM_BY_ID[fixture.homeTeamId];
  const away = TEAM_BY_ID[fixture.awayTeamId];
  const kickoff = new Date(fixture.kickoffUtc);

  return (
    <div className={compact ? "h-9 px-2" : "h-24 px-2"}>
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
        <span className={cn("font-mono text-color_textsecondary tnum", compact ? "text-[0.6rem]" : "text-xs")}>
          {place(results, home.id)}
        </span>
        <button
          type="button"
          onClick={handleTeamClick}
          className={cn(
            "group flex cursor-pointer items-center",
            compact ? "flex-row justify-center gap-1.5" : "flex-col gap-1"
          )}
        >
          <TeamCrest teamId={home.id} className={compact ? "size-4" : "size-7"} />
          <span
            className={cn(
              "truncate font-display font-medium text-color_text group-hover:underline",
              compact ? "text-[0.68rem]" : "text-sm"
            )}
          >
            {home.shortName}
          </span>
        </button>

        <span className={cn("flex flex-col items-center justify-center", compact ? "leading-none" : "leading-tight")}>
          <span className={cn("font-mono text-color_text tnum", compact ? "text-[0.62rem]" : "text-sm")}>
            {DATE_FMT.format(kickoff)}
          </span>
          <span className={cn("font-mono text-color_textsecondary tnum", compact ? "text-[0.58rem]" : "text-sm")}>
            {TIME_FMT.format(kickoff)}
          </span>
        </span>

        <button
          type="button"
          onClick={handleTeamClick}
          className={cn(
            "group flex cursor-pointer items-center",
            compact ? "flex-row justify-center gap-1.5" : "flex-col gap-1"
          )}
        >
          <TeamCrest teamId={away.id} className={compact ? "size-4" : "size-7"} />
          <span
            className={cn(
              "truncate font-display font-medium text-color_text group-hover:underline",
              compact ? "text-[0.68rem]" : "text-sm"
            )}
          >
            {away.shortName}
          </span>
        </button>
        <span className={cn("font-mono text-color_textsecondary tnum", compact ? "text-[0.6rem]" : "text-xs")}>
          {place(results, away.id)}
        </span>
      </div>
    </div>
  );
}
