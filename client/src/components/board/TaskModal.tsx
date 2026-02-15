import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiOutlineX, HiOutlineTrash, HiOutlineUserAdd, HiOutlineUserRemove } from "react-icons/hi";
import { useBoardStore } from "@/stores/boardStore";
import { useAuthStore } from "@/stores/authStore";
import { Task, TaskPriority, User } from "@/types";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface TaskModalProps {
  task: Task;
  boardId: string;
  onClose: () => void;
}

// Full-screen modal for viewing and editing a task's details
export default function TaskModal({ task: initialTask, boardId, onClose }: TaskModalProps) {
  const { updateTask, deleteTask, assignTask, unassignTask, activeBoard } = useBoardStore();
  const { user: currentUser } = useAuthStore();

  // Find the latest version of this task from the store
  const latestTask = activeBoard?.lists
    ?.flatMap((l) => l.tasks)
    .find((t) => t.id === initialTask.id) || initialTask;

  const [title, setTitle] = useState(latestTask.title);
  const [description, setDescription] = useState(latestTask.description || "");
  const [priority, setPriority] = useState<TaskPriority>(latestTask.priority);
  const [dueDate, setDueDate] = useState(latestTask.dueDate ? latestTask.dueDate.split("T")[0] : "");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);

  // Sync with latest task data from store
  useEffect(() => {
    setTitle(latestTask.title);
    setDescription(latestTask.description || "");
    setPriority(latestTask.priority);
    setDueDate(latestTask.dueDate ? latestTask.dueDate.split("T")[0] : "");
  }, [latestTask]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTask(boardId, latestTask.id, {
        title,
        description: description || null,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      } as Partial<Task>);
      toast.success("Task updated");
    } catch {
      toast.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask(boardId, latestTask.id);
      onClose();
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleAssign = async (userId: string) => {
    try {
      await assignTask(boardId, latestTask.id, userId);
      setSearchQuery("");
      setSearchResults([]);
      toast.success("User assigned");
    } catch {
      toast.error("Failed to assign user");
    }
  };

  const handleUnassign = async (userId: string) => {
    try {
      await unassignTask(boardId, latestTask.id, userId);
      toast.success("User unassigned");
    } catch {
      toast.error("Failed to unassign user");
    }
  };

  // Search board members for assignment
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const members = activeBoard?.members
      .map((m) => m.user)
      .filter(
        (u) =>
          (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
          !latestTask.assignees.some((a) => a.userId === u.id)
      ) || [];

    setSearchResults(members);
  }, [searchQuery, activeBoard, latestTask.assignees]);

  const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const priorityColors: Record<TaskPriority, string> = {
    LOW: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    MEDIUM: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    URGENT: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <span className="text-xs text-zinc-500">Task Details</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-all"
              title="Delete task"
            >
              <HiOutlineTrash />
            </button>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-all"
            >
              <HiOutlineX />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-lg text-zinc-100 font-bold focus:outline-none border-b border-transparent focus:border-green-500/50 pb-1 transition-colors"
            placeholder="Task title"
          />

          {/* Description */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-black border border-zinc-800 focus:border-green-500/50 focus:outline-none text-zinc-300 placeholder:text-zinc-700 py-2 px-3 text-sm rounded-lg resize-none transition-colors"
              placeholder="Add a description..."
            />
          </div>

          {/* Priority + Due Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-1">Priority</label>
              <div className="flex gap-1.5">
                {priorities.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`text-[10px] px-2 py-1 rounded border transition-all ${
                      priority === p ? priorityColors[p] : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-black border border-zinc-800 focus:border-green-500/50 focus:outline-none text-zinc-300 py-1.5 px-3 text-sm rounded-lg transition-colors"
              />
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-2">Assignees</label>

            {/* Current assignees */}
            <div className="flex flex-wrap gap-2 mb-2">
              {latestTask.assignees.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1"
                >
                  <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center text-[9px] text-green-400">
                    {a.user.name.charAt(0)}
                  </div>
                  <span className="text-xs text-zinc-300">{a.user.name}</span>
                  <button
                    onClick={() => handleUnassign(a.userId)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <HiOutlineX className="text-xs" />
                  </button>
                </div>
              ))}
            </div>

            {/* Search to add assignee */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <HiOutlineUserAdd className="text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members to assign..."
                  className="flex-1 bg-black border border-zinc-800 focus:border-green-500/50 focus:outline-none text-zinc-300 placeholder:text-zinc-700 py-1.5 px-3 text-xs rounded-lg transition-colors"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 py-1 max-h-40 overflow-y-auto">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleAssign(u.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-[9px] text-green-400">
                        {u.name.charAt(0)}
                      </div>
                      <span>{u.name}</span>
                      <span className="text-zinc-500 ml-auto">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-800">
          <span className="text-[10px] text-zinc-600">
            {latestTask.list?.title && `In: ${latestTask.list.title}`}
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
