import { useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineX, HiOutlineUserGroup, HiOutlineTrash } from "react-icons/hi";
import { useBoardStore } from "@/stores/boardStore";
import { useAuthStore } from "@/stores/authStore";
import { Board } from "@/types";
import toast from "react-hot-toast";

interface MemberPanelProps {
  board: Board;
  onClose: () => void;
}

// Slide-in panel for managing board members
export default function MemberPanel({ board, onClose }: MemberPanelProps) {
  const { addMember, removeMember } = useBoardStore();
  const { user: currentUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const isOwner = board.ownerId === currentUser?.id;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      await addMember(board.id, email.trim());
      setEmail("");
      toast.success("Member added!");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this board?`)) return;
    try {
      await removeMember(board.id, userId);
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
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
            <HiOutlineUserGroup className="text-green-500" />
            <h3 className="text-sm font-bold text-zinc-200">Members ({board.members.length})</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-all"
          >
            <HiOutlineX />
          </button>
        </div>

        {/* Add member form */}
        {isOwner && (
          <form onSubmit={handleAdd} className="p-4 border-b border-zinc-800">
            <label className="block text-xs text-zinc-500 uppercase mb-1">Add Member by Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 bg-black border border-zinc-800 focus:border-green-500/50 focus:outline-none text-zinc-300 placeholder:text-zinc-700 py-1.5 px-3 text-xs rounded-lg transition-colors"
              />
              <button
                type="submit"
                disabled={adding}
                className="bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                {adding ? "..." : "Add"}
              </button>
            </div>
          </form>
        )}

        {/* Member list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {board.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 text-sm font-bold">
                  {member.user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-zinc-200">{member.user.name}</p>
                  <p className="text-[10px] text-zinc-500">{member.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  member.role === "OWNER" ? "bg-green-500/20 text-green-400" :
                  member.role === "ADMIN" ? "bg-blue-500/20 text-blue-400" :
                  "bg-zinc-700 text-zinc-400"
                }`}>
                  {member.role}
                </span>

                {isOwner && member.userId !== board.ownerId && (
                  <button
                    onClick={() => handleRemove(member.userId, member.user.name)}
                    className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <HiOutlineTrash className="text-sm" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
