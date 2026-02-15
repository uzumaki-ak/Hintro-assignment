import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HiOutlineViewBoards } from "react-icons/hi";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signup, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup({ name, email, password });
      toast.success("Account created!");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <HiOutlineViewBoards className="text-green-500 text-3xl" />
            <span className="text-2xl font-bold text-green-500 tracking-wider">
              TASKFLOW
            </span>
          </div>
          <p className="text-zinc-500 text-sm">Create your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-xl text-zinc-200 mb-4">Sign Up</h2>

          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-1">
              Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
                {">"}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                minLength={2}
                className="w-full bg-black border border-zinc-800 focus:border-green-500/50 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-2.5 pl-8 pr-4 text-sm rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-1">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
                {">"}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-black border border-zinc-800 focus:border-green-500/50 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-2.5 pl-8 pr-4 text-sm rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
                {">"}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                className="w-full bg-black border border-zinc-800 focus:border-green-500/50 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-2.5 pl-8 pr-4 text-sm rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-bold transition-colors"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-zinc-500 text-sm">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-green-500 hover:text-green-400 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
