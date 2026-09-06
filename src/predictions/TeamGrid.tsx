import { memo, useCallback, useRef, useState } from "react";
import { Team } from "./teams";
import { TeamCrest } from "../leaderboard/TeamCrest";
import { cn } from "@/lib/utils";

interface TeamGridProps {
  /** All teams to display in the grid, in alphabetical order. */
  teams: Team[];
  /** IDs of teams currently placed in the ranking list (shown as empty cells). */
  placedTeamIds: Set<string>;
  /** The team currently picked up, if it came from this pool. */
  heldTeamId: string | null;
  onTeamClick: (teamId: string) => void;
  /** Clicking anywhere in the panel that isn't an available team. */
  onBackgroundClick: () => void;
}

const GridCell = memo(function GridCell({
  team,
  isPlaced,
  isHeld,
  onTeamClick,
}: {
  team: Team;
  isPlaced: boolean;
  isHeld: boolean;
  onTeamClick: (teamId: string) => void;
}) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseEnter() {
    if (isPlaced) return;
    tooltipTimer.current = setTimeout(() => setTooltipVisible(true), 750);
  }

  function handleMouseLeave() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltipVisible(false);
  }

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      // Don't let this also read as a click on the panel background, which
      // means something different (put the held team back in the pool).
      event.stopPropagation();
      onTeamClick(team.id);
    },
    [onTeamClick, team.id]
  );

  const className = cn(
    "relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border select-none p-1.5 outline-none",
    // Transform deliberately left out of the transition list, and the
    // hover scale dropped: 36 cells each animating a transform kept the
    // whole grid on its own compositing layers, which is most of what made
    // this panel feel heavy. Color/opacity only now.
    "transition-[border-color,background-color,opacity] duration-200 ease-[var(--ease-cotton)]",
    isPlaced
      ? "border-dashed border-color_border1/40 bg-foreground/[0.01]"
      : [
          "bg-background/80 cursor-pointer shadow-sm",
          isHeld
            ? "border-color_accent bg-foreground/[0.08]"
            : "border-color_border1/60 hover:border-color_border1 hover:bg-foreground/[0.06]",
        ]
  );

  // A placed team's cell is a placeholder, not a target — clicks fall through
  // to the panel background.
  if (isPlaced) {
    return <div className={className} />;
  }

  return (
    <button
      type="button"
      aria-label={team.name}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      <TeamCrest teamId={team.id} className="size-11 shrink-0" />

      {/* Expanding tooltip — name slides down after 0.75 s hover */}
      <div
        aria-hidden
        className={cn(
          "absolute bottom-1 left-0 right-0 overflow-hidden px-1 transition-[max-height,opacity,margin] duration-300 ease-[var(--ease-cotton)]",
          tooltipVisible ? "max-h-8 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <span className="block text-center text-[10px] font-medium leading-tight text-color_text whitespace-nowrap truncate bg-background/90 rounded px-1 py-0.5 shadow-sm border border-color_border1/50">
          {team.name}
        </span>
      </div>
    </button>
  );
});

/**
 * The right-side pool panel — a 6-column grid of every team's crest. Teams
 * already placed in the ranking show as empty cells. Clicking an available
 * crest picks that team up; clicking anywhere else in the panel puts a held
 * team back into the pool.
 */
export function TeamGrid({
  teams,
  placedTeamIds,
  heldTeamId,
  onTeamClick,
  onBackgroundClick,
}: TeamGridProps) {
  return (
    <div className="p-1" data-testid="team-pool" onClick={onBackgroundClick}>
      <div className="grid grid-cols-6 gap-2.5">
        {teams.map((team) => (
          <GridCell
            key={team.id}
            team={team}
            isPlaced={placedTeamIds.has(team.id)}
            isHeld={heldTeamId === team.id}
            onTeamClick={onTeamClick}
          />
        ))}
      </div>
    </div>
  );
}
