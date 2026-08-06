import { TEAMS } from "../predictions/teams";
import { TeamResult } from "./teamResultTypes";
import { qualificationBand } from "./qualification";
import { TeamCrest } from "./TeamCrest";
import { Frame, FrameBody } from "@/components/ui/frame";
import { cn } from "@/lib/utils";

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

interface LeagueTableListProps {
  results: Record<string, TeamResult>;
  /** Fires with a team's id when its row is clicked — opens TeamPopup, same
   *  as TeamTable's own click behavior. No phase gate: identical for
   *  started and not-started, matching TeamTable. */
  onSelectTeam?: (teamId: string) => void;
}

/**
 * Home's logged-out league-phase "league table" column — the same 36-team
 * standing as TeamTable, laid out as one tall scrollable list (one row per
 * team) instead of TeamTable's space-constrained two-half compact grid. Row
 * height is matched to LeaderboardTable's row rhythm (the participant
 * standings sitting alongside it in the same page) rather than TeamTable's
 * denser rows — see the 2026-08-02 design spec's "large items, as tall as
 * participants" note.
 */
export function LeagueTableList({ results, onSelectTeam }: LeagueTableListProps) {
  const hasResults = Object.keys(results).length > 0;

  const ordered = hasResults
    ? [...TEAMS].sort((a, b) => {
        const ra = results[a.id];
        const rb = results[b.id];
        if (!ra && !rb) return 0;
        if (!ra) return 1;
        if (!rb) return -1;
        return ra.position - rb.position;
      })
    : TEAMS;

  return (
    <Frame className="h-full animate-cotton-rise border-color_border1/35">
      <FrameBody>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 sm:px-3">
          {/* Same column labels as TeamTable's own header (S / Takım /
              O / A / Y / AV / P) — no sort affordance here, just static
              labels, since this list isn't sortable. */}
          <div className="flex h-[1.875rem] items-center gap-2 border-b border-color_border1 px-2 font-mono text-[0.6rem] font-medium tracking-[0.18em] text-color_textsecondary uppercase">
            <span className="w-1 shrink-0" aria-hidden />
            <span className="w-6 shrink-0">S</span>
            <span className="size-7 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">Takım</span>
            <span className="w-6 shrink-0 text-right">O</span>
            <span className="w-6 shrink-0 text-right">A</span>
            <span className="w-6 shrink-0 text-right">Y</span>
            <span className="w-8 shrink-0 text-right">AV</span>
            <span className="w-8 shrink-0 text-right">P</span>
          </div>
          <ul>
            {ordered.map((team) => {
              const result = results[team.id];
              const band = result ? qualificationBand(result.position) : null;
              return (
                <li
                  key={team.id}
                  onClick={() => onSelectTeam?.(team.id)}
                  className={cn(
                    "flex h-12 cursor-pointer items-center gap-2 border-b border-color_border1/50 px-2 transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-color_hoverfill",
                    !result && "opacity-55"
                  )}
                >
                  <span aria-hidden className="flex w-1 shrink-0 justify-center">
                    {band === "direct" && <span className="h-4 w-1 rounded-r-full bg-color_accent" />}
                    {band === "playoff" && <span className="h-4 w-1 rounded-r-full bg-color_qualification" />}
                  </span>
                  <span className="w-6 shrink-0 font-mono text-xs tracking-tight text-color_textsecondary tnum">
                    {result ? String(result.position) : "--"}
                  </span>
                  <TeamCrest teamId={team.id} className="size-7 shrink-0" />
                  <span
                    className="min-w-0 flex-1 truncate font-display text-sm font-medium text-color_text"
                    title={team.name}
                  >
                    {team.shortName}
                  </span>
                  <span className="w-6 shrink-0 text-right font-mono text-xs tracking-tight text-color_textsecondary tnum">
                    {result?.matchesPlayed ?? "-"}
                  </span>
                  <span className="w-6 shrink-0 text-right font-mono text-xs tracking-tight text-color_textsecondary tnum">
                    {result?.goalsFor ?? "-"}
                  </span>
                  <span className="w-6 shrink-0 text-right font-mono text-xs tracking-tight text-color_textsecondary tnum">
                    {result?.goalsAgainst ?? "-"}
                  </span>
                  <span className="w-8 shrink-0 text-right font-mono text-xs tracking-tight text-color_text tnum">
                    {result ? signed(result.goalDifference) : "-"}
                  </span>
                  <span className="w-8 shrink-0 text-right font-mono text-xs font-bold tracking-tight text-color_text tnum">
                    {result?.points ?? "-"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </FrameBody>
    </Frame>
  );
}
