import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlinePlus, HiOutlineSearch, HiOutlineTrash } from "react-icons/hi";
import { useBoardStore } from "@/stores/boardStore";
import Header from "@/components/layout/Header";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    boards,
    boardsMeta,
    boardsLoading,
    fetchBoards,
    createBoard,
    deleteBoard,
  } = useBoardStore();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchBoards(1, search);
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const board = await createBoard(newTitle.trim());
      setNewTitle("");
      setShowCreate(false);
      toast.success("Board created!");
      navigate(`/board/${board.id}`);
    } catch {
      toast.error("Failed to create board");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteBoard(id);
      toast.success("Board deleted");
    } catch {
      toast.error("Failed to delete board");
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl text-zinc-100">Your Boards</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {boardsMeta?.total || 0} board
              {(boardsMeta?.total || 0) !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search boards..."
                className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 focus:border-green-500/50 focus:outline-none text-zinc-100 placeholder:text-zinc-600 py-2 pl-9 pr-4 text-sm rounded-lg transition-colors"
              />
            </div>

            {/* Create button */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
            >
              <HiOutlinePlus className="text-lg" />
              <span className="hidden sm:inline">New Board</span>
            </button>
          </div>
        </div>

        {/* Create board modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreate(false)}
            >
              <motion.form
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleCreate}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md"
              >
                <h3 className="text-lg text-zinc-200 mb-4">Create New Board</h3>
                <div className="relative mb-4">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
                    {">"}
                  </span>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Board title..."
                    autoFocus
                    required
                    className="w-full bg-black border border-zinc-800 focus:border-green-500/50 focus:outline-none text-zinc-100 placeholder:text-zinc-700 py-2.5 pl-8 pr-4 text-sm rounded-lg transition-colors"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Board grid */}
        {boardsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-green-500 animate-pulse text-lg">
              Loading boards...
            </div>
          </div>
        ) : boards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-zinc-500 text-lg mb-4">
              {search ? "No boards match your search" : "No boards yet"}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="text-green-500 hover:text-green-400 text-sm transition-colors"
              >
                Create your first board →
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {boards.map((board, index) => (
                <motion.div
                  key={board.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/board/${board.id}`)}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 cursor-pointer hover:border-green-500/30 hover:bg-zinc-900 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-zinc-200 font-bold truncate pr-2 group-hover:text-green-400 transition-colors">
                      {board.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(board.id, board.title);
                      }}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    >
                      <HiOutlineTrash />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{board._count?.lists || 0} lists</span>
                    <div className="flex -space-x-1.5">
                      {board.members.slice(0, 3).map((m) => (
                        <div
                          key={m.id}
                          className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400"
                          title={m.user.name}
                        >
                          {m.user.name.charAt(0)}
                        </div>
                      ))}
                      {board.members.length > 3 && (
                        <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">
                          +{board.members.length - 3}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] text-zinc-600">
                    by {board.owner.name}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {boardsMeta && boardsMeta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: boardsMeta.totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => fetchBoards(i + 1, search)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  boardsMeta.page === i + 1
                    ? "bg-green-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
