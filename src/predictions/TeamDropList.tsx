import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { memo, useCallback } from "react";
import { Team } from "./teams";
import { TeamCrest } from "../leaderboard/TeamCrest";
import { useBoundaryHover } from "./useBoundaryHover";
import { boundaryBandRole } from "./predictionBoundary";
import { cn } from "@/lib/utils";

interface TeamDropListProps {
  ranking: (string | null)[];
  teamsById: Map<string, Team>;
}

const ListSlot = memo(function ListSlot({
  index,
  teamId,
  team,
  inBand,
  isOrigin,
  onHoverStart,
  onMouseLeave,
}: {
  index: number;
  teamId: string | null;
  team: Team | undefined;
  inBand: boolean;
  isOrigin: boolean;
  /** Stable across renders — the slot builds its own bound handler below, so
   *  the parent doesn't hand down a fresh closure per row and defeat memo. */
  onHoverStart: (index: number) => void;
  onMouseLeave: () => void;
}) {
  // Every slot is a drop target.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `slot:${index}`,
  });

  // Occupied slots are also draggable (back to grid or to another slot).
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `list:${index}`,
    disabled: teamId === null,
  });

  // Combine the drop-target ref and the drag-source ref on the same node.
  const combinedRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  const style = transform ? { transform: CSS.Transform.toString(transform) } : undefined;

  const highlighted = inBand && !isDragging;

  const handleMouseEnter = useCallback(() => {
    if (teamId !== null) onHoverStart(index);
  }, [teamId, index, onHoverStart]);

  // Plain <li>, not <motion.li layout>. The layout animation re-measured all
  // 36 slots' bounding boxes on every render — and this list re-renders on
  // every pointer move during a drag — while never actually animating
  // anything: the list is a fixed 36 slots keyed by index, so a slot never
  // changes position, only its contents do. That measurement pass was the
  // single biggest cost in both the predictions page and the profile edit
  // popup (2026-08-06).
  return (
    <li
      ref={combinedRef}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "flex h-[42px] items-center gap-2.5 rounded-lg border px-3 py-2 select-none",
        "transition-[border-color,background-color,box-shadow,opacity] duration-200 ease-[var(--ease-cotton)]",
        teamId !== null
          ? [
              "border-color_border1/80 bg-background",
              "hover:border-color_border1 hover:bg-foreground/[0.03]",
              isDragging && "opacity-0 border-color_accent/40",
            ]
          : [
              "border-dashed bg-foreground/[0.01]",
              isOver
                ? "border-color_accent/80 bg-foreground/[0.06]"
                : "border-color_border1/40 hover:border-color_border1/60",
            ],
        highlighted && cn("bg-foreground/[0.06]", !isOrigin && "animate-pulse")
      )}
    >
      {/* Rank number */}
      <span className="w-5 shrink-0 text-right font-mono text-sm font-bold text-color_gold tnum">
        {index + 1}
      </span>

      {teamId !== null && team ? (
        <>
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex h-full items-center justify-center pr-1 text-color_textsecondary/40 touch-none cursor-grab active:cursor-grabbing outline-none"
            aria-label="Sürükle"
          >
            <GripVerticalIcon aria-hidden className="size-3.5 shrink-0" />
          </button>
          <TeamCrest teamId={team.id} className="size-7 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-display text-sm text-color_text">
            {team.name}
          </span>
        </>
      ) : (
        <span className="min-w-0 flex-1 font-display text-xs italic text-color_textsecondary/30">
          Buraya sürükle
        </span>
      )}
    </li>
  );
});

/**
 * The left-side ranking column — 36 numbered drop slots, initially all
 * empty. Occupied slots are draggable so the user can reorder internally
 * or drag a team back to the grid. Slots highlight (`isOver`) when a
 * dragged item is directly above them.
 */
export function TeamDropList({ ranking, teamsById }: TeamDropListProps) {
  const { activeIndex, handleMouseEnter, handleMouseLeave } = useBoundaryHover();

  return (
    <ol className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
      {ranking.map((teamId, index) => {
        const inBand =
          teamId !== null &&
          activeIndex !== null &&
          boundaryBandRole(index, activeIndex, ranking.length) !== "none";
        const isOrigin = index === activeIndex;
        return (
          <ListSlot
            key={index}
            index={index}
            teamId={teamId}
            team={teamId !== null ? teamsById.get(teamId) : undefined}
            inBand={inBand}
            isOrigin={isOrigin}
            onHoverStart={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
    </ol>
  );
}
