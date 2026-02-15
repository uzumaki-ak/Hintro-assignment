import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { HiOutlineX, HiOutlineSearch } from "react-icons/hi";
import { useBoardStore } from "@/stores/boardStore";
import { Task, TaskPriority } from "@/types";

interface SearchPanelProps {
  boardId: string;
  onClose: () => void;
  onTaskClick: (task: Task) => void;
}

const priorityColors: Record<TaskPriority, string> = {
  LOW: "text-blue-400",
  MEDIUM: "text-amber-400",
  HIGH: "text-orange-400",
  URGENT: "text-red-400",
};

// Overlay search panel for finding tasks within a board
export default function SearchPanel({
  boardId,
  onClose,
  onTaskClick,
}: SearchPanelProps) {
  const { searchTasks } = useBoardStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const tasks = await searchTasks(boardId, query);
        setResults(tasks);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, boardId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: -20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
          <HiOutlineSearch className="text-green-500 text-lg" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-600 focus:outline-none text-sm"
          />
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1 transition-colors"
          >
            <HiOutlineX />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center">
              <span className="text-xs text-green-500 animate-pulse">
                Searching...
              </span>
            </div>
          )}

          {!loading && results.length === 0 && query.length > 0 && (
            <div className="p-4 text-center text-xs text-zinc-600">
              No tasks found
            </div>
          )}

          {results.map((task) => (
            <button
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="w-full flex items-start gap-3 p-3 hover:bg-zinc-800/50 transition-colors text-left border-b border-zinc-800/50 last:border-0"
            >
              <span
                className={`text-[10px] mt-0.5 ${priorityColors[task.priority]}`}
              >
                ●
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{task.title}</p>
                {task.description && (
                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                    {task.description}
                  </p>
                )}
                {task.list && (
                  <span className="text-[10px] text-zinc-600 mt-0.5">
                    in {task.list.title}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
