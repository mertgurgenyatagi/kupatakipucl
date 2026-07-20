import { useState } from "react";
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
import { Team } from "./teams";

interface TeamRankerProps {
  teams: Team[];
  initialOrder: string[];
  onSubmit: (order: string[]) => void;
}

function SortableTeamRow({ team, index }: { team: Team; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: team.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {index + 1}. {team.name}
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
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol>
            {order.map((id, index) => {
              const team = teamsById.get(id);
              if (!team) return null;
              return <SortableTeamRow key={id} team={team} index={index} />;
            })}
          </ol>
        </SortableContext>
      </DndContext>
      <button onClick={() => onSubmit(order)}>Sıralamayı kaydet</button>
    </div>
  );
}
