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

/**
 * The desktop Matches page's own row — deliberately not FixtureRow.
 *
 * FixtureRow serves the two teaser widgets (the leaderboard hero's drawer and
 * Home's 3-fixture preview), both of which live in narrow columns, only ever
 * show upcoming matches, and want three-letter codes. This page has a full
 * 900px to work with and is mostly about matches that have already been
 * played, so it wants the opposite of all three: full club names, a score
 * big enough to read at a glance, and an obvious winner. Forcing both jobs
 * through one component would have meant a third layout mode on top of
 * `compact`, which is where that component stops being readable.
 *
 * Mobile keeps FixtureRow — a phone column can't hold a full club name
 * either.
 *
 * Home reads right-to-left into the score and away reads left-to-right out
 * of it, the standard fixture-list arrangement, so the two crests sit either
 * side of the result rather than the names colliding with it.
 */

// place | home name+crest | score | away crest+name | place
const ROW_GRID_COLUMNS = "2rem minmax(0,1fr) 9rem minmax(0,1fr) 2rem";

function place(results: Record<string, TeamResult>, teamId: string): string {
  const position = results[teamId]?.position;
  return position ? String(position) : "-";
}

/**
 * How the group split on these two teams when they ranked all 36
 * (matchConsensus.ts). Wider and heavier than the version this started as —
 * it's the one number on the row that only this app has, and at hairline
 * size it read as a divider rather than as data. Still centred under the
 * score rather than spanning the row, so its two counts stay clear of the
 * league positions out at the edges.
 */
function ConsensusBar({ home, away }: { home: number; away: number }) {
  const homeShare = (home / (home + away)) * 100;

  return (
    <div
      className="col-span-full mx-auto mt-2.5 flex w-72 items-center gap-2.5"
      title="Sıralamada üstte görenler"
      aria-label={`Sıralamada üstte görenler: ${home} - ${away}`}
    >
      <span className="w-5 shrink-0 text-right font-mono text-xs text-color_textsecondary tnum">{home}</span>
      <span className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-color_border1">
        <span className="h-full rounded-full bg-color_accent/80" style={{ width: `${homeShare}%` }} />
      </span>
      <span className="w-5 shrink-0 font-mono text-xs text-color_textsecondary tnum">{away}</span>
    </div>
  );
}

/** Winner gets full weight and full brightness, loser recedes — the whole
 *  point of a results list is being able to see who won without reading the
 *  numbers. A draw, and anything not yet played, leaves both level. */
function outcomeClass(isWinner: boolean, isLoser: boolean): string {
  if (isWinner) return "font-semibold text-color_text";
  if (isLoser) return "font-normal text-color_textsecondary";
  return "font-medium text-color_text";
}

export function MatchesRow({
  fixture,
  results,
  consensus,
  onSelectTeam,
  onSelectFixture,
}: {
  fixture: RealFixture;
  results: Record<string, TeamResult>;
  consensus?: MatchConsensus | null;
  onSelectTeam?: (teamId: string) => void;
  onSelectFixture?: (fixtureId: string) => void;
}) {
  const home = TEAM_BY_ID[fixture.homeTeamId];
  const away = TEAM_BY_ID[fixture.awayTeamId];
  const kickoff = new Date(fixture.kickoffUtc);
  const live = isFixtureLive(fixture);
  // Both goals present — the same "decided" test used by MatchupPopup,
  // rankHistory.ts and functions/fixtures' standings.js, rather than
  // anything derived from `status`.
  const decided = fixture.homeGoals !== null && fixture.awayGoals !== null;

  const homeWon = decided && fixture.homeGoals! > fixture.awayGoals!;
  const awayWon = decided && fixture.awayGoals! > fixture.homeGoals!;

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
    <div className={cn("px-2", consensus ? "h-32" : "h-24")}>
      {/* A div, not a <button> — a real <button> can't contain the two team
          buttons below (invalid nesting). */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleMatchClick}
        onKeyDown={handleMatchKeyDown}
        className={cn(
          "grid h-full w-full cursor-pointer content-center items-center gap-2 rounded-lg px-3 transition-colors duration-150 ease-[var(--ease-cotton)] outline-none hover:bg-color_hoverfill focus-visible:bg-color_hoverfill",
          live && "bg-color_remove/[0.08] hover:bg-color_remove/[0.14]"
        )}
        style={{ gridTemplateColumns: ROW_GRID_COLUMNS }}
      >
        <span className="font-mono text-xs text-color_textsecondary tnum">{place(results, home.id)}</span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTeam?.(home.id);
          }}
          className="group flex cursor-pointer items-center justify-end gap-3"
        >
          <span
            className={cn("truncate text-right font-display text-base group-hover:underline", outcomeClass(homeWon, awayWon))}
            title={home.name}
          >
            {home.name}
          </span>
          <TeamCrest teamId={home.id} className="size-9 shrink-0" />
        </button>

        <span className="flex flex-col items-center justify-center gap-1 leading-none">
          {decided ? (
            // Labelled as a whole: the three spans exist only so the winning
            // side can be brighter than the losing one, and read out
            // separately they'd be three unrelated numbers.
            <span
              className="flex items-baseline gap-1.5 font-mono text-3xl font-bold tnum"
              aria-label={`${home.name} ${fixture.homeGoals} - ${fixture.awayGoals} ${away.name}`}
            >
              <span className={live ? "text-color_remove" : outcomeClass(homeWon, awayWon)}>{fixture.homeGoals}</span>
              <span className="text-color_textsecondary">–</span>
              <span className={live ? "text-color_remove" : outcomeClass(awayWon, homeWon)}>{fixture.awayGoals}</span>
            </span>
          ) : (
            <span className="font-mono text-2xl font-semibold text-color_text tnum">{TIME_FMT.format(kickoff)}</span>
          )}

          {live ? (
            <span className="flex items-center gap-1.5 font-mono text-[0.6rem] font-semibold tracking-[0.18em] text-color_remove uppercase">
              <LiveDot className="size-1.5" />
              Canlı
            </span>
          ) : (
            <span className="font-mono text-[0.6rem] tracking-[0.18em] text-color_textsecondary uppercase">
              {decided ? "Bitti" : DATE_FMT.format(kickoff)}
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTeam?.(away.id);
          }}
          className="group flex cursor-pointer items-center justify-start gap-3"
        >
          <TeamCrest teamId={away.id} className="size-9 shrink-0" />
          <span
            className={cn("truncate font-display text-base group-hover:underline", outcomeClass(awayWon, homeWon))}
            title={away.name}
          >
            {away.name}
          </span>
        </button>

        <span className="text-right font-mono text-xs text-color_textsecondary tnum">{place(results, away.id)}</span>

        {consensus && <ConsensusBar home={consensus.home} away={consensus.away} />}
      </div>
    </div>
  );
}
