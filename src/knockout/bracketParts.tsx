import { TEAMS, teamCrestSrc, Team } from "../predictions/teams";
import { cn } from "@/lib/utils";

/**
 * The pieces both bracket layouts draw with — one match box, two team pills.
 *
 * Lifted out of KnockoutBracket.tsx when the mobile bracket arrived so the
 * two layouts share a pill rather than each styling their own. The pill is
 * where all the state lives visually (picked / not picked / not yet
 * determined / champion), so two copies of it would drift the fastest.
 */

/** Resolves a team id to a Team, synthesising a placeholder for ids that
 *  aren't in the current roster — the knockout mock data predates the
 *  pending full team-list replacement (PROJECT_STATE §12). */
export function findTeam(id: string): Team | null {
  if (!id) return null;
  return (
    TEAMS.find((t) => t.id === id) ?? {
      id,
      name: id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      shortName: id.slice(0, 3).toUpperCase(),
    }
  );
}

export function CompactTeamPill({
  team,
  isSelected,
  isFinal,
  onClick,
  readOnly = false,
  onSelectTeam,
}: {
  team: Team | null;
  isSelected: boolean;
  isFinal: boolean;
  onClick: () => void;
  readOnly?: boolean;
  onSelectTeam?: (teamId: string) => void;
}) {
  if (!team) {
    return (
      <div className="flex h-9 min-w-0 items-center justify-center rounded border border-dashed border-color_border1/20 bg-background/20 px-1">
        <span className="font-mono text-xs text-color_textsecondary/30 select-none">—</span>
      </div>
    );
  }

  const selectedStyle = isFinal
    ? "border-amber-400 bg-amber-400/15 text-amber-200"
    : "border-white bg-white/10 text-white font-bold";

  return (
    <button
      type="button"
      onClick={() => {
        if (readOnly) {
          if (onSelectTeam) onSelectTeam(team.id);
        } else {
          onClick();
        }
      }}
      className={cn(
        "group flex h-9 w-full min-w-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded border px-2 text-left transition-colors duration-150 outline-none",
        isSelected
          ? selectedStyle
          : "border-color_border1/30 bg-card/60 text-color_textsecondary hover:border-color_border1/60 hover:text-color_text"
      )}
    >
      <img
        src={teamCrestSrc(team.id)}
        alt=""
        aria-hidden
        className="size-[18px] shrink-0 object-contain"
      />
      <span className="truncate font-mono text-sm font-semibold tracking-tight">
        {team.shortName}
      </span>
    </button>
  );
}

export function CompactMatchBox({
  isFinal = false,
  match,
  team1: team1Prop,
  team2: team2Prop,
  selectedWinner,
  onPick,
  readOnly = false,
  onSelectTeam,
  className,
}: {
  isFinal?: boolean;
  match?: { homeTeamId: string; awayTeamId: string };
  team1?: Team | null;
  team2?: Team | null;
  selectedWinner: string | null;
  onPick: (teamId: string) => void;
  readOnly?: boolean;
  onSelectTeam?: (teamId: string) => void;
  className?: string;
}) {
  const team1 = match ? findTeam(match.homeTeamId) : (team1Prop ?? null);
  const team2 = match ? findTeam(match.awayTeamId) : (team2Prop ?? null);

  return (
    <div
      className={cn(
        "flex w-24 min-w-0 shrink-0 flex-col gap-1.5 overflow-hidden rounded-xl border bg-card/40 p-1.5",
        isFinal ? "border-amber-400/40 bg-amber-400/5" : "border-color_border1/30",
        className
      )}
    >
      <CompactTeamPill
        team={team1}
        isSelected={selectedWinner === team1?.id}
        isFinal={isFinal}
        onClick={() => team1 && onPick(team1.id)}
        readOnly={readOnly}
        onSelectTeam={onSelectTeam}
      />
      <div className="h-px bg-color_border1/20" />
      <CompactTeamPill
        team={team2}
        isSelected={selectedWinner === team2?.id}
        isFinal={isFinal}
        onClick={() => team2 && onPick(team2.id)}
        readOnly={readOnly}
        onSelectTeam={onSelectTeam}
      />
    </div>
  );
}
