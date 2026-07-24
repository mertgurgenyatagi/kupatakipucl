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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TeamRankerProps {
  teams: Team[];
  initialOrder: string[];
  onSubmit: (order: string[]) => void;
}

function SortableTeamRow({ team, index }: { team: Team; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: team.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex touch-none items-center gap-3 rounded-lg border border-border/50 bg-background px-4 py-2.5 outline-none select-none",
        "transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-cotton)]",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        isDragging
          ? "z-10 scale-[1.02] border-brass/50 bg-card shadow-frame"
          : "hover:border-border"
      )}
    >
      <GripVerticalIcon aria-hidden className="size-4 shrink-0 text-muted-foreground/50" />
      <TeamCrest teamId={team.id} className="size-8 shrink-0" />
      <span className="min-w-0 flex-1 truncate font-display text-base text-ink">
        {index + 1}. {team.name}
      </span>
    </li>
  );
}

export function TeamRanker({ teams, initialOrder, onSubmit }: TeamRankerProps) {
  const [order, setOrder] = useState<string[]>(initialOrder);
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
          <ol className="no-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto">
            {order.map((id, index) => {
              const team = teamsById.get(id);
              if (!team) return null;
              return <SortableTeamRow key={id} team={team} index={index} />;
            })}
          </ol>
        </SortableContext>
      </DndContext>
      <Button className="self-end" onClick={() => onSubmit(order)}>
        Sıralamayı kaydet
      </Button>
    </div>
  );
}
