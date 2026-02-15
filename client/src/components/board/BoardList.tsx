import { useState } from "react";
import { motion } from "framer-motion";
import {
  HiOutlinePlus,
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlinePencil,
} from "react-icons/hi";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useBoardStore } from "@/stores/boardStore";
import SortableTaskCard from "./SortableTaskCard";
import { List, Task } from "@/types";
import toast from "react-hot-toast";

interface BoardListProps {
  list: List;
  boardId: string;
  onTaskClick: (task: Task) => void;
}

// Renders a single list column with its tasks and add-task form
export default function BoardList({
  list,
  boardId,
  onTaskClick,
}: BoardListProps) {
  const { createTask, deleteList, updateList } = useBoardStore();
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);

  // Make this list a droppable zone for drag-and-drop
  const { setNodeRef, isOver } = useDroppable({ id: list.id });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await createTask(boardId, list.id, newTaskTitle.trim());
      setNewTaskTitle("");
      setShowAddTask(false);
      toast.success("Task created!");
    } catch {
      toast.error("Failed to create task");
    }
  };

  const handleDeleteList = async () => {
    if (!confirm(`Delete "${list.title}" and all its tasks?`)) return;
    try {
      await deleteList(boardId, list.id);
      toast.success("List deleted");
    } catch {
      toast.error("Failed to delete list");
    }
  };

  const handleRenameList = async () => {
    if (!editTitle.trim() || editTitle === list.title) {
      setIsEditing(false);
      setEditTitle(list.title);
      return;
    }
    try {
      await updateList(boardId, list.id, editTitle.trim());
      setIsEditing(false);
    } catch {
      toast.error("Failed to rename list");
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`flex-shrink-0 w-72 bg-zinc-900/50 border rounded-xl flex flex-col max-h-[calc(100vh-180px)] transition-colors ${
        isOver ? "border-green-500/50 bg-zinc-900/80" : "border-zinc-800"
      }`}
    >
      {/* List header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800/50">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRenameList}
            onKeyDown={(e) => e.key === "Enter" && handleRenameList()}
            autoFocus
            className="flex-1 bg-transparent border-b border-green-500/50 text-sm text-zinc-200 focus:outline-none py-0.5"
          />
        ) : (
          <h3
            className="text-sm font-bold text-zinc-300 truncate cursor-pointer hover:text-green-400 transition-colors"
            onDoubleClick={() => setIsEditing(true)}
          >
            {list.title}
          </h3>
        )}

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
            {list.tasks.length}
          </span>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors"
            >
              <HiOutlineDotsVertical className="text-sm" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 py-1 min-w-[140px]">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  <HiOutlinePencil /> Rename
                </button>
                <button
                  onClick={() => {
                    handleDeleteList();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-700 transition-colors"
                >
                  <HiOutlineTrash /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task list with drag-drop */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[60px]"
      >
        <SortableContext
          items={list.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {list.tasks.length === 0 && !showAddTask && (
          <div className="text-center py-4 text-xs text-zinc-600">
            No tasks yet
          </div>
        )}
      </div>

      {/* Add task form */}
      <div className="p-2 border-t border-zinc-800/50">
        {showAddTask ? (
          <form onSubmit={handleAddTask}>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title..."
              autoFocus
              className="w-full bg-black border border-zinc-800 focus:border-green-500/50 focus:outline-none text-zinc-100 placeholder:text-zinc-700 py-1.5 px-3 text-xs rounded-lg mb-1.5 transition-colors"
            />
            <div className="flex gap-1.5">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-500 text-white px-2.5 py-1 rounded text-[10px] font-bold transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddTask(false);
                  setNewTaskTitle("");
                }}
                className="text-zinc-400 hover:text-zinc-200 px-2.5 py-1 text-[10px] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            className="w-full flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 py-1.5 px-2 rounded-lg hover:bg-zinc-800/50 transition-all text-xs"
          >
            <HiOutlinePlus className="text-sm" />
            Add Task
          </button>
        )}
      </div>
    </motion.div>
  );
}
