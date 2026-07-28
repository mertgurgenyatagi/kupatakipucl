import { GripVerticalIcon } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Team } from "./teams";
import { TeamCrest } from "../leaderboard/TeamCrest";
import { useBoundaryHover } from "./useBoundaryHover";
import { boundaryBandRole } from "./predictionBoundary";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TeamRankerProps {
  teams: Team[];
  initialOrder: string[];
  onSubmit: (order: string[]) => void;
}

function SortableTeamRow({
  team,
  index,
  inBand,
  isOrigin,
  onMouseEnter,
  onMouseLeave,
}: {
  team: Team;
  index: number;
  inBand: boolean;
  isOrigin: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: team.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const highlighted = inBand && !isDragging;
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "flex cursor-pointer touch-none items-center gap-2.5 rounded-lg border border-color_border1/50 bg-background px-3 py-2 outline-none select-none",
        "transition-[transform,box-shadow,border-color,background-color] duration-200 ease-[var(--ease-cotton)]",
        "focus-visible:ring-2 focus-visible:ring-color_border2/50",
        isDragging ? "z-10 scale-[1.02] border-color_accent/50 bg-card shadow-frame" : "hover:border-color_border1",
        highlighted && cn("bg-foreground/[0.06]", !isOrigin && "animate-pulse")
      )}
    >
      <span className="w-5 shrink-0 text-right font-mono text-sm font-bold text-color_gold tnum">
        {index + 1}
      </span>
      <GripVerticalIcon aria-hidden className="size-3.5 shrink-0 text-color_textsecondary/50" />
      <TeamCrest teamId={team.id} className="size-7 shrink-0" />
      <span className="min-w-0 flex-1 truncate font-display text-sm text-color_text">{team.name}</span>
    </li>
  );
}

/**
 * Rank number lives in its own left-most column now (predictions-page-round-02
 * Q7), not folded into the name text — rows were briefly made roomier for the
 * full-viewport flow (Q8), then sized back down ~30% since 36 of them at that
 * size took over the whole screen. Hovering a settled
 * row for a couple of seconds tints the ±2-row band it'd need to land in to
 * score — same treatment as the intro's ScoringExampleDiagram (a bracket
 * attempt here didn't read well visually and was dropped), pulsing except on
 * the row you're actually hovering, clamped at the list's own edges.
 */
export function TeamRanker({ teams, initialOrder, onSubmit }: TeamRankerProps) {
  const [order, setOrder] = useState<string[]>(initialOrder);
  const { activeIndex, handleMouseEnter, handleMouseLeave } = useBoundaryHover();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto">
            {order.map((id, index) => {
              const team = teamsById.get(id);
              if (!team) return null;
              return (
                <SortableTeamRow
                  key={id}
                  team={team}
                  index={index}
                  inBand={activeIndex !== null && boundaryBandRole(index, activeIndex, order.length) !== "none"}
                  isOrigin={index === activeIndex}
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}
          </ol>
        </SortableContext>
      </DndContext>
      <Button className="cursor-pointer self-end" onClick={() => onSubmit(order)}>
        Tamam
      </Button>
    </div>
  );
}
