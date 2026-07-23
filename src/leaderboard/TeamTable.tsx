import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { TEAMS, Team } from "../predictions/teams";
import { TeamResult } from "./teamResultTypes";
import { qualificationBand } from "./qualification";
import { TeamCrest } from "./TeamCrest";
import { Frame, FrameBody } from "@/components/ui/frame";
import { cn } from "@/lib/utils";

type SortKey = "position" | "matchesPlayed" | "goalsFor" | "goalsAgainst" | "goalDifference" | "points";

interface TeamTableProps {
  results: Record<string, TeamResult>;
  /** Team ids to wash faint green — driven by hovering a participant on the
   *  standings alongside (their currently-correct picks). */
  highlightedTeamIds?: ReadonlySet<string>;
}

// O · A · Y · AV · P — the standard compact Turkish league-table header set
// (Oynanan / Atılan / Yenen / Averaj / Puan). Single/double letters, not the
// full words — Mert: "compactified... I don't want to scroll horizontally."
const COLUMNS: { key: SortKey; label: string; help: string }[] = [
  { key: "matchesPlayed", label: "O", help: "Oynanan maç" },
  { key: "goalsFor", label: "A", help: "Atılan gol" },
  { key: "goalsAgainst", label: "Y", help: "Yenen gol" },
  { key: "goalDifference", label: "AV", help: "Averaj" },
  { key: "points", label: "P", help: "Puan" },
];

const HEADER_CELL = "flex h-5 items-center border-b border-border";

/** A lip peeking out above the frame's top edge, spanning the frame's full
 *  width with the same corner radius, behind the frame in stacking order
 *  so the frame's own opaque body covers the overlapping part — reads as
 *  a handle "growing out of" the card rather than a shape sitting on top
 *  of it. Matching the frame's own radius means it's obscured cleanly at
 *  the corners rather than poking a square edge past the curve. */
function FrameHandle() {
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 -top-2 z-0 h-4 rounded-t-[var(--radius-4xl)] bg-navy"
    />
  );
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** Clickable, but intentionally does nothing yet — reserved for future
 *  team-detail views. */
function handleTeamRowClick() {}

/**
 * One 18-row half of the split table (1-18 left, 19-36 right), built as a
 * CSS Grid "table" (role="table"/"row"/"columnheader"/"cell" on plain divs)
 * rather than an HTML <table> with hand-tuned px column widths and row
 * padding. Two browsers rasterize the same font at slightly different
 * sub-pixel widths, so any px budget tuned to "exactly zero overflow" in one
 * browser goes negative in another (Opera vs Chrome, directly reported).
 * Grid tracks sidestep that: the rank/stat columns are `auto` (sized to
 * their own intrinsic content, which is correct by definition in any
 * browser), the team column is `minmax(4.25rem,1fr)` (absorbs whatever's
 * left, down to a floor that still fits a 3-letter code — without a floor
 * it's the only flexible track, so it silently ate 100% of any width
 * squeeze first, e.g. truncating "ARS" to "A." on a narrower viewport),
 * and all 18 body rows are `minmax(0,1fr)` inside a `h-full` container — so
 * width and height both sum to exactly the container size by construction,
 * not by a magic number matching one browser's font metrics. The `.no-
 * scrollbar` wrapper around each half (see the parent component) stays on
 * only as a safety net; it should never actually engage now.
 */
function TeamTableHalf({
  teams,
  results,
  sortKey,
  onSort,
  highlightedTeamIds,
}: {
  teams: Team[];
  results: Record<string, TeamResult>;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
  highlightedTeamIds?: ReadonlySet<string>;
}) {
  return (
    <div
      role="table"
      className="grid h-full text-sm"
      style={{
        // The 5 stat columns are a fixed, *uniform* width — not auto-sized
        // per column. Auto sizing let "AV" (2 chars) claim more room than
        // "O"/"A"/"Y" (1 char), so the rhythm between columns was never
        // actually even (Mert: "the spaces between them are not uniform").
        // One shared width, one shared padding, applied identically to
        // every header and every cell: a real table, symmetric by
        // construction instead of tuned per column.
        gridTemplateColumns: "auto minmax(4.25rem,1fr) repeat(5, 1.75rem)",
        gridTemplateRows: `auto repeat(${teams.length}, minmax(0, 1fr))`,
      }}
    >
      <div role="rowgroup" className="contents">
        <div role="row" className="contents">
          <div role="columnheader" className={cn(HEADER_CELL, "relative pr-0 pl-3")}>
            <button
              type="button"
              title="Sıra"
              onClick={() => onSort("position")}
              aria-pressed={sortKey === "position"}
              className={cn(
                "absolute inset-0 flex items-center gap-1 pl-3 font-mono text-[0.6rem] font-medium tracking-[0.18em] uppercase transition-colors duration-150 ease-[var(--ease-cotton)] outline-none hover:bg-accent focus-visible:text-ink",
                sortKey === "position"
                  ? "text-ink"
                  : "text-muted-foreground hover:text-ink"
              )}
            >
              <span>S</span>
              {sortKey === "position" && <ChevronUp className="size-2.5" />}
            </button>
          </div>
          <div
            role="columnheader"
            className={cn(
              HEADER_CELL,
              "pl-2 font-mono text-[0.6rem] font-medium tracking-[0.18em] text-muted-foreground uppercase"
            )}
          >
            Takım
          </div>
          {COLUMNS.map((col) => {
            const active = sortKey === col.key;
            return (
              <div key={col.key} role="columnheader" className={cn(HEADER_CELL, "relative")}>
                <button
                  type="button"
                  title={col.help}
                  onClick={() => onSort(col.key)}
                  aria-pressed={active}
                  className={cn(
                    "absolute inset-0 flex items-center justify-end gap-0.5 px-1 font-mono text-[0.6rem] font-medium tracking-[0.18em] uppercase transition-colors duration-150 ease-[var(--ease-cotton)] outline-none hover:bg-accent focus-visible:text-ink",
                    active ? "text-ink" : "text-muted-foreground hover:text-ink"
                  )}
                >
                  <span>{col.label}</span>
                  {active && <ChevronDown className="size-2.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div role="rowgroup" className="contents">
        {teams.map((team, index) => {
          const result = results[team.id];
          const band = result ? qualificationBand(result.position) : null;
          const highlighted = highlightedTeamIds?.has(team.id) ?? false;
          const cell = cn(
            "flex items-center border-b border-border/50 py-1 transition-colors duration-150 ease-[var(--ease-cotton)] animate-cotton-rise group-hover:bg-accent",
            !result && "opacity-55",
            highlighted && "bg-brass/[0.12]"
          );
          const statCell = cn(cell, "justify-end px-1");
          return (
            <div
              key={team.id}
              role="row"
              onClick={handleTeamRowClick}
              className="group contents cursor-pointer"
              style={{ animationDelay: `${Math.min(index * 16, 500)}ms` }}
            >
              {/* Sıra — a hard-left/rounded-right oblong to the numeral's
                  left carries the qualification-route signal (green =
                  direct to the Round of 16, orange = playoff round); the
                  eliminated band (25-36) gets none. */}
              <div role="cell" className={cn(cell, "gap-1.5 pr-0 pl-3")}>
                {band === "direct" && (
                  <span aria-hidden className="h-3 w-1 shrink-0 rounded-r-full bg-brass" />
                )}
                {band === "playoff" && (
                  <span aria-hidden className="h-3 w-1 shrink-0 rounded-r-full bg-amber-500" />
                )}
                {band === "eliminated" && <span aria-hidden className="w-1 shrink-0" />}
                <span className="font-mono text-xs tracking-tight text-muted-foreground tnum">
                  {result ? String(result.position) : "--"}
                </span>
              </div>

              {/* Crest + short code. */}
              <div role="cell" className={cn(cell, "min-w-0 pl-2")}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <TeamCrest teamId={team.id} className="size-6 shrink-0" />
                  <span
                    className="truncate font-display text-sm font-medium text-ink"
                    title={team.name}
                  >
                    {team.shortName}
                  </span>
                </span>
              </div>

              <div role="cell" className={statCell}>
                <span className="font-mono text-xs tracking-tight text-muted-foreground tnum">
                  {result?.matchesPlayed ?? "-"}
                </span>
              </div>
              <div role="cell" className={statCell}>
                <span className="font-mono text-xs tracking-tight text-muted-foreground tnum">
                  {result?.goalsFor ?? "-"}
                </span>
              </div>
              <div role="cell" className={statCell}>
                <span className="font-mono text-xs tracking-tight text-muted-foreground tnum">
                  {result?.goalsAgainst ?? "-"}
                </span>
              </div>
              <div role="cell" className={statCell}>
                <span className="font-mono text-xs tracking-tight text-ink tnum">
                  {result ? signed(result.goalDifference) : "-"}
                </span>
              </div>
              {/* Puan — bold (not larger, not extra padding — every stat
                  column shares the same width and padding; the number
                  that decides the table is marked by weight/color only). */}
              <div role="cell" className={statCell}>
                <span className="font-mono text-xs font-bold tracking-tight text-ink tnum">
                  {result?.points ?? "-"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The team table (DESIGN-SPEC §0b frames): a real, data-backed 36-row
 * standing, given the same weight as the participant leaderboard rather than
 * shrunk into a side-widget. Crest + a 3-4 letter team code instead of full
 * names, split into two 18-row halves side by side. Tabular numerals
 * throughout; the rank numeral itself turns brass for the earned
 * direct-qualification distinction — no separate line accent. Puan is the
 * one bold column — the number that actually decides the table. Sortable
 * via clickable column headers with a mono active-sort caret, shared across
 * both halves. Before any result exists it degrades to an honest, quiet
 * roster of all 36 teams.
 */
export function TeamTable({ results, highlightedTeamIds }: TeamTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const hasResults = Object.keys(results).length > 0;

  // --- Pre-season: no results yet. An honest alphabetical roster, no sort
  //     affordances (there is nothing meaningful to sort yet). -----------
  if (!hasResults) {
    const half = Math.ceil(TEAMS.length / 2);
    const halves = [TEAMS.slice(0, half), TEAMS.slice(half)];
    return (
      <div className="relative h-full">
        <FrameHandle />
        <Frame className="relative z-10 h-full animate-cotton-rise border-navy-line/35">
        <FrameBody className="flex-row gap-3 px-3 py-1.5 sm:px-4">
          {halves.map((half, i) => (
            <div
              key={i}
              className={cn(
                "no-scrollbar min-w-0 flex-1 overflow-y-auto",
                i === 1 && "border-l border-border/50 pl-3"
              )}
            >
              <div
                role="table"
                className="grid h-full text-sm"
                style={{
                  gridTemplateColumns: "minmax(4.25rem,1fr) auto",
                  gridTemplateRows: `auto repeat(${half.length}, minmax(0, 1fr))`,
                }}
              >
                <div role="rowgroup" className="contents">
                  <div role="row" className="contents">
                    <div
                      role="columnheader"
                      className={cn(
                        HEADER_CELL,
                        "pl-3 font-mono text-[0.6rem] font-medium tracking-[0.18em] text-muted-foreground uppercase"
                      )}
                    >
                      Takım
                    </div>
                    <div
                      role="columnheader"
                      className={cn(
                        HEADER_CELL,
                        "justify-end pr-3 font-mono text-[0.6rem] font-medium tracking-[0.18em] text-muted-foreground uppercase"
                      )}
                    >
                      P
                    </div>
                  </div>
                </div>
                <div role="rowgroup" className="contents">
                  {half.map((team, index) => {
                    const cell = cn(
                      "flex items-center border-b border-border/50 py-1 transition-colors duration-150 ease-[var(--ease-cotton)] animate-cotton-rise group-hover:bg-accent"
                    );
                    return (
                      <div
                        key={team.id}
                        role="row"
                        onClick={handleTeamRowClick}
                        className="group contents cursor-pointer"
                        style={{ animationDelay: `${Math.min(index * 16, 500)}ms` }}
                      >
                        <div role="cell" className={cn(cell, "min-w-0 pl-3")}>
                          <span className="flex min-w-0 items-center gap-2.5">
                            <TeamCrest teamId={team.id} className="size-6 shrink-0" />
                            <span
                              className="truncate font-display text-sm font-medium text-ink"
                              title={team.name}
                            >
                              {team.shortName}
                            </span>
                          </span>
                        </div>
                        <div role="cell" className={cn(cell, "justify-end pr-3")}>
                          <span className="font-mono text-sm tracking-tight text-muted-foreground tnum">
                            0
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </FrameBody>
        </Frame>
      </div>
    );
  }

  // --- Live table: sortable, position-banded, split into two 18-row
  //     halves so all 36 teams show side by side. ------------------------
  const sorted = [...TEAMS].sort((a, b) => {
    const ra = results[a.id];
    const rb = results[b.id];
    if (!ra && !rb) return 0;
    if (!ra) return 1;
    if (!rb) return -1;
    if (sortKey === "position") return ra.position - rb.position;
    return (rb[sortKey] ?? 0) - (ra[sortKey] ?? 0);
  });
  const half = Math.ceil(sorted.length / 2);
  const left = sorted.slice(0, half);
  const right = sorted.slice(half);

  return (
    <div className="relative h-full">
      <FrameHandle />
      <Frame className="relative z-10 h-full animate-cotton-rise border-navy-line/35">
        <FrameBody className="min-h-0 gap-2 px-3 py-1 sm:px-4">
          <div className="flex min-h-0 flex-1 gap-3">
            <div className="no-scrollbar min-w-0 flex-1 overflow-y-auto">
              <TeamTableHalf
                teams={left}
                results={results}
                sortKey={sortKey}
                onSort={setSortKey}
                highlightedTeamIds={highlightedTeamIds}
              />
            </div>
            <div className="no-scrollbar min-w-0 flex-1 overflow-y-auto border-l border-border/50 pl-3">
              <TeamTableHalf
                teams={right}
                results={results}
                sortKey={sortKey}
                onSort={setSortKey}
                highlightedTeamIds={highlightedTeamIds}
              />
            </div>
          </div>
        </FrameBody>
      </Frame>
    </div>
  );
}
