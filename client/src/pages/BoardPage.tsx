import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineArrowLeft,
  HiOutlineSearch,
  HiOutlineClock,
  HiOutlineUserAdd,
  HiOutlinePlus,
} from "react-icons/hi";
import { useBoardStore } from "@/stores/boardStore";
import { getSocket, joinBoard, leaveBoard, connectSocket } from "@/lib/socket";
import Header from "@/components/layout/Header";
import DndBoardWrapper from "@/components/board/DndBoardWrapper";
import BoardList from "@/components/board/BoardList";
import TaskModal from "@/components/board/TaskModal";
import ActivityPanel from "@/components/board/ActivityPanel";
import MemberPanel from "@/components/board/MemberPanel";
import SearchPanel from "@/components/board/SearchPanel";
import { Task } from "@/types";
import toast from "react-hot-toast";

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const {
    activeBoard,
    activeBoardLoading,
    fetchBoard,
    createList,
    handleBoardUpdate,
    handleListUpdate,
    handleTaskUpdate,
    handleTaskMove,
  } = useBoardStore();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  // Fetch board data and set up socket listeners
  useEffect(() => {
    if (!boardId) return;

    fetchBoard(boardId);
    connectSocket();

    // Small delay to ensure socket is connected before joining
    const timer = setTimeout(() => {
      joinBoard(boardId);
    }, 500);

    const socket = getSocket();

    // Register real-time event handlers
    socket.on("board:update", handleBoardUpdate);
    socket.on("list:update", handleListUpdate);
    socket.on("task:update", handleTaskUpdate);
    socket.on("task:move", handleTaskMove);

    return () => {
      leaveBoard(boardId);
      socket.off("board:update", handleBoardUpdate);
      socket.off("list:update", handleListUpdate);
      socket.off("task:update", handleTaskUpdate);
      socket.off("task:move", handleTaskMove);
      clearTimeout(timer);
    };
  }, [boardId]);

  const handleAddList = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newListTitle.trim() || !boardId) return;
      try {
        await createList(boardId, newListTitle.trim());
        setNewListTitle("");
        setShowAddList(false);
        toast.success("List created!");
      } catch {
        toast.error("Failed to create list");
      }
    },
    [newListTitle, boardId, createList],
  );

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  if (activeBoardLoading || !activeBoard) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-green-500 animate-pulse text-lg">
            Loading board...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Board header */}
      <div className="border-b border-zinc-800 bg-zinc-900/30 px-4 sm:px-6 py-3">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="text-zinc-400 hover:text-zinc-200 transition-colors p-1"
            >
              <HiOutlineArrowLeft className="text-lg" />
            </button>
            <div>
              <h1 className="text-lg text-zinc-100 font-bold">
                {activeBoard.title}
              </h1>
              <span className="text-xs text-zinc-500">
                {activeBoard.members.length} member
                {activeBoard.members.length !== 1 ? "s" : ""} ·{" "}
                {activeBoard.lists?.length || 0} lists
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition-all"
              title="Search tasks"
            >
              <HiOutlineSearch />
            </button>
            <button
              onClick={() => setShowMembers(true)}
              className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition-all"
              title="Members"
            >
              <HiOutlineUserAdd />
            </button>
            <button
              onClick={() => setShowActivity(true)}
              className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition-all"
              title="Activity"
            >
              <HiOutlineClock />
            </button>
          </div>
        </div>
      </div>

      {/* Board content - horizontal scrolling lists */}
      <DndBoardWrapper boardId={boardId!}>
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div
          className="flex gap-4 p-4 sm:p-6 h-full min-h-0"
          style={{ minWidth: "fit-content" }}
        >
          <AnimatePresence mode="popLayout">
            {activeBoard.lists?.map((list) => (
              <BoardList
                key={list.id}
                list={list}
                boardId={boardId!}
                onTaskClick={handleTaskClick}
              />
            ))}
          </AnimatePresence>

          {/* Add list button/form */}
          <div className="flex-shrink-0 w-72">
            {showAddList ? (
              <motion.form
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onSubmit={handleAddList}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3"
              >
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="List title..."
                  autoFocus
                  className="w-full bg-black border border-zinc-800 focus:border-green-500/50 focus:outline-none text-zinc-100 placeholder:text-zinc-700 py-2 px-3 text-sm rounded-lg mb-2 transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  >
                    Add List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddList(false);
                      setNewListTitle("");
                    }}
                    className="text-zinc-400 hover:text-zinc-200 px-3 py-1.5 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            ) : (
              <button
                onClick={() => setShowAddList(true)}
                className="w-full flex items-center gap-2 text-zinc-500 hover:text-zinc-300 bg-zinc-900/30 hover:bg-zinc-900/50 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all"
              >
                <HiOutlinePlus />
                <span className="text-sm">Add List</span>
              </button>
            )}
          </div>
        </div>
      </div>
      </DndBoardWrapper>

      {/* Modals and panels */}
      <AnimatePresence>
        {selectedTask && (
          <TaskModal
            task={selectedTask}
            boardId={boardId!}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showActivity && (
          <ActivityPanel
            boardId={boardId!}
            onClose={() => setShowActivity(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMembers && (
          <MemberPanel
            board={activeBoard}
            onClose={() => setShowMembers(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSearch && (
          <SearchPanel
            boardId={boardId!}
            onClose={() => setShowSearch(false)}
            onTaskClick={(task) => {
              setShowSearch(false);
              setSelectedTask(task);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
