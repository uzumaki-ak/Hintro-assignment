import { motion } from "framer-motion";
import { HiOutlineCalendar } from "react-icons/hi";
import { Task, TaskPriority } from "@/types";

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

// Priority color mapping
const priorityColors: Record<TaskPriority, string> = {
  LOW: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MEDIUM: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  URGENT: "bg-red-500/20 text-red-400 border-red-500/30",
};

// Renders a single task card inside a list column
export default function TaskCard({ task, onClick }: TaskCardProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onClick(task)}
      className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 cursor-pointer hover:border-green-500/30 hover:bg-zinc-800 transition-all group"
    >
      {/* Priority badge */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityColors[task.priority]}`}
        >
          {task.priority}
        </span>
      </div>

      {/* Title */}
      <h4 className="text-sm text-zinc-200 group-hover:text-green-400 transition-colors line-clamp-2">
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
          {task.description}
        </p>
      )}

      {/* Footer: due date + assignees */}
      <div className="flex items-center justify-between mt-2.5">
        {task.dueDate ? (
          <span
            className={`flex items-center gap-1 text-[10px] ${isOverdue ? "text-red-400" : "text-zinc-500"}`}
          >
            <HiOutlineCalendar className="text-xs" />
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        ) : (
          <span />
        )}

        {task.assignees.length > 0 && (
          <div className="flex -space-x-1">
            {task.assignees.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center text-[9px] text-zinc-300"
                title={a.user.name}
              >
                {a.user.name.charAt(0)}
              </div>
            ))}
            {task.assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center text-[9px] text-zinc-400">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
