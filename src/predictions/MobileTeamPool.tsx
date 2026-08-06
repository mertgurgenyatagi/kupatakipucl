import { useDraggable, useDroppable } from "@dnd-kit/core";
import { memo } from "react";
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
 * is deliberately assigned to the wrong club (PROJECT_STATE §9: the artwork
 * is randomly mapped pending a full roster replacement), so the grid on a
 * phone would be 36 unidentifiable badges and no way to tell which is which.
 * A row with the name written on it is the only version of this panel that
 * can actually be used.
 *
 * Drag ids match `TeamGrid`'s exactly (`grid:${team.id}`), so TeamRanker's
 * drag handling, the `grid-return` drop target and the placed/unplaced logic
 * all work unchanged — this swaps the panel's appearance, not its wiring.
 */

const PoolRow = memo(function PoolRow({ team, isPlaced }: { team: Team; isPlaced: boolean }) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `grid:${team.id}` });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({ id: `grid:${team.id}`, disabled: isPlaced });

  const combinedRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <li
      ref={combinedRef}
      {...(isPlaced ? {} : attributes)}
      {...(isPlaced ? {} : listeners)}
      style={style}
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-lg border px-2.5 select-none",
        "transition-[border-color,background-color,opacity] duration-200 ease-[var(--ease-cotton)]",
        // touch-none is what lets the TouchSensor's press-and-hold win over
        // the browser's own scroll gesture once a drag actually starts.
        !isPlaced && "touch-none",
        isPlaced
          ? "border-dashed border-color_border1/40 bg-foreground/[0.01]"
          : "border-color_border1/60 bg-background/80",
        isOver && "border-color_accent/80 bg-foreground/[0.08]",
        isDragging && "opacity-0"
      )}
    >
      {isPlaced ? (
        <span className="font-mono text-[0.65rem] tracking-[0.14em] text-color_textsecondary/50 uppercase">
          Sıralandı
        </span>
      ) : (
        <>
          <TeamCrest teamId={team.id} className="size-7 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-display text-sm text-color_text">
            {team.name}
          </span>
        </>
      )}
    </li>
  );
});

export function MobileTeamPool({
  teams,
  placedTeamIds,
}: {
  teams: Team[];
  placedTeamIds: Set<string>;
}) {
  const { setNodeRef } = useDroppable({ id: "grid-return" });

  return (
    <div ref={setNodeRef} className="p-1">
      <ul className="flex flex-col gap-1.5">
        {teams.map((team) => (
          <PoolRow key={team.id} team={team} isPlaced={placedTeamIds.has(team.id)} />
        ))}
      </ul>
    </div>
  );
}
