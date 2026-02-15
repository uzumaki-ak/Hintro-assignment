import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HiOutlineLogout, HiOutlineViewBoards } from "react-icons/hi";
import { useAuthStore } from "@/stores/authStore";

// Top navigation bar with logo, user info, and logout
export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <HiOutlineViewBoards className="text-green-500 text-xl group-hover:rotate-12 transition-transform" />
            <span className="text-lg font-bold text-green-500 tracking-wider">
              TASKFLOW
            </span>
          </Link>

          {/* User section */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm text-zinc-300">{user?.name}</span>
              <span className="text-xs text-zinc-500">{user?.email}</span>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>

            <button
              onClick={handleLogout}
              className="text-zinc-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
              title="Logout"
            >
              <HiOutlineLogout className="text-lg" />
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
