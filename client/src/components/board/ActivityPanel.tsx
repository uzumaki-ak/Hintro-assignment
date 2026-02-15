import { useEffect } from "react";
import { motion } from "framer-motion";
import { HiOutlineX, HiOutlineClock } from "react-icons/hi";
import { useBoardStore } from "@/stores/boardStore";

interface ActivityPanelProps {
  boardId: string;
  onClose: () => void;
}

// Slide-in panel showing board activity history with pagination
export default function ActivityPanel({ boardId, onClose }: ActivityPanelProps) {
  const { activities, activitiesMeta, activitiesLoading, fetchActivities } = useBoardStore();

  useEffect(() => {
    fetchActivities(boardId, 1);
  }, [boardId]);

  const loadMore = () => {
    if (activitiesMeta && activitiesMeta.page < activitiesMeta.totalPages) {
      fetchActivities(boardId, activitiesMeta.page + 1);
    }
  };

  // Format relative time from ISO string
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <HiOutlineClock className="text-green-500" />
            <h3 className="text-sm font-bold text-zinc-200">Activity</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-all"
          >
            <HiOutlineX />
          </button>
        </div>

        {/* Activity list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 animate-fade-in">
              <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex-shrink-0 flex items-center justify-center text-[9px] text-zinc-400 mt-0.5">
                {activity.user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 leading-relaxed">{activity.message}</p>
                <span className="text-[10px] text-zinc-600">{timeAgo(activity.createdAt)}</span>
              </div>
            </div>
          ))}

          {activitiesLoading && (
            <div className="text-center py-4">
              <span className="text-xs text-green-500 animate-pulse">Loading...</span>
            </div>
          )}

          {activities.length === 0 && !activitiesLoading && (
            <div className="text-center py-8 text-xs text-zinc-600">No activity yet</div>
          )}

          {activitiesMeta && activitiesMeta.page < activitiesMeta.totalPages && (
            <button
              onClick={loadMore}
              className="w-full text-center py-2 text-xs text-green-500 hover:text-green-400 transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
