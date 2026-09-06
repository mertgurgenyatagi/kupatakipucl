import { memo, useCallback } from "react";
import { Team } from "./teams";
import { TeamCrest } from "../leaderboard/TeamCrest";
import { cn } from "@/lib/utils";

/**
 * The team pool as a list, for mobile — the wireframe's *"teams,
 * alphabetical, list"*.
 *
 * Not a styling preference. `TeamGrid` shows a crest and nothing else, and
 * puts the team's name in a tooltip that appears after 750ms of **hover** —
 * which a touchscreen never produces. On top of that, every crest in this app
 * is deliberately assigned to the wrong club (PROJECT.md §11 #2: the artwork
 * is randomly mapped pending a full roster replacement), so the grid on a
 * phone would be 36 unidentifiable badges and no way to tell which is which.
 * A row with the name written on it is the only version of this panel that
 * can actually be used.
 *
 * Behaves exactly like `TeamGrid` otherwise — tap an available team to pick
 * it up, tap anywhere else in the panel to send a held team back to the pool.
 */

const PoolRow = memo(function PoolRow({
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
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onTeamClick(team.id);
    },
    [onTeamClick, team.id]
  );

  const className = cn(
    "flex h-11 w-full items-center gap-2.5 rounded-lg border px-2.5 text-left select-none outline-none",
    "transition-[border-color,background-color,opacity] duration-200 ease-[var(--ease-cotton)]",
    isPlaced
      ? "border-dashed border-color_border1/40 bg-foreground/[0.01]"
      : [
          "bg-background/80 cursor-pointer",
          isHeld ? "border-color_accent bg-foreground/[0.08]" : "border-color_border1/60",
        ]
  );

  if (isPlaced) {
    return (
      <li>
        <div className={className}>
          <span className="font-mono text-[0.65rem] tracking-[0.14em] text-color_textsecondary/50 uppercase">
            Sıralandı
          </span>
        </div>
      </li>
    );
  }

  return (
    <li>
      <button type="button" onClick={handleClick} className={className}>
        <TeamCrest teamId={team.id} className="size-7 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-display text-sm text-color_text">
          {team.name}
        </span>
      </button>
    </li>
  );
});

export function MobileTeamPool({
  teams,
  placedTeamIds,
  heldTeamId,
  onTeamClick,
  onBackgroundClick,
}: {
  teams: Team[];
  placedTeamIds: Set<string>;
  heldTeamId: string | null;
  onTeamClick: (teamId: string) => void;
  onBackgroundClick: () => void;
}) {
  return (
    <div className="p-1" data-testid="team-pool" onClick={onBackgroundClick}>
      <ul className="flex flex-col gap-1.5">
        {teams.map((team) => (
          <PoolRow
            key={team.id}
            team={team}
            isPlaced={placedTeamIds.has(team.id)}
            isHeld={heldTeamId === team.id}
            onTeamClick={onTeamClick}
          />
        ))}
      </ul>
    </div>
  );
}
