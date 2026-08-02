import { type KeyboardEvent, type MouseEvent } from "react";
import { TEAM_BY_ID } from "../predictions/teams";
import { Fixture } from "../devpanel/fixtures";
import { TeamResult } from "./teamResultTypes";
import { TeamCrest } from "./TeamCrest";

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
}: {
  fixture: Fixture;
  results: Record<string, TeamResult>;
}) {
  const home = TEAM_BY_ID[fixture.homeTeamId];
  const away = TEAM_BY_ID[fixture.awayTeamId];
  const kickoff = new Date(fixture.kickoffUtc);

  return (
    <div className="h-24 px-2">
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
        <span className="font-mono text-xs text-color_textsecondary tnum">
          {place(results, home.id)}
        </span>
        <button
          type="button"
          onClick={handleTeamClick}
          className="group flex cursor-pointer flex-col items-center gap-1"
        >
          <TeamCrest teamId={home.id} className="size-7" />
          <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
            {home.shortName}
          </span>
        </button>

        <span className="flex flex-col items-center justify-center leading-tight">
          <span className="font-mono text-sm text-color_text tnum">
            {DATE_FMT.format(kickoff)}
          </span>
          <span className="font-mono text-sm text-color_textsecondary tnum">
            {TIME_FMT.format(kickoff)}
          </span>
        </span>

        <button
          type="button"
          onClick={handleTeamClick}
          className="group flex cursor-pointer flex-col items-center gap-1"
        >
          <TeamCrest teamId={away.id} className="size-7" />
          <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
            {away.shortName}
          </span>
        </button>
        <span className="font-mono text-xs text-color_textsecondary tnum">
          {place(results, away.id)}
        </span>
      </div>
    </div>
  );
}
