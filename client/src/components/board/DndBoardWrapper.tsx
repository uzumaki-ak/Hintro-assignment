import { useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useBoardStore } from "@/stores/boardStore";
import toast from "react-hot-toast";

interface DndBoardWrapperProps {
  boardId: string;
  children: React.ReactNode;
}

// Wraps board content with DnD context for cross-list task dragging
export default function DndBoardWrapper({ boardId, children }: DndBoardWrapperProps) {
  const { moveTaskLocal, moveTask, activeBoard } = useBoardStore();

  // Require 8px of movement before starting a drag (prevents accidental drags)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Handles dropping a task into a new position/list
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || !activeBoard?.lists) return;

      const taskId = active.id as string;
      const activeData = active.data.current as { listId: string } | undefined;
      if (!activeData) return;

      const fromListId = activeData.listId;

      // Determine target list: could be dropping on a task or on a list directly
      let toListId: string;
      let newPosition: number;

      const overData = over.data.current as { type?: string; task?: { listId: string }; listId?: string } | undefined;

      if (overData?.type === "task") {
        // Dropped on another task - use that task's list and position
        toListId = overData.task?.listId || fromListId;
        const targetList = activeBoard.lists.find((l) => l.id === toListId);
        const overIndex = targetList?.tasks.findIndex((t) => t.id === over.id) ?? 0;
        newPosition = overIndex;
      } else {
        // Dropped on a list container
        toListId = over.id as string;
        const targetList = activeBoard.lists.find((l) => l.id === toListId);
        newPosition = targetList?.tasks.length ?? 0;
      }

      if (fromListId === toListId && active.id === over.id) return;

      // Optimistic update
      moveTaskLocal(taskId, fromListId, toListId, newPosition);

      // Persist to server
      try {
        await moveTask(boardId, taskId, toListId, newPosition);
      } catch {
        toast.error("Failed to move task");
        // Revert by refetching
        useBoardStore.getState().fetchBoard(boardId);
      }
    },
    [boardId, activeBoard, moveTaskLocal, moveTask]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}
