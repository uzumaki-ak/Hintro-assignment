import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import { User, AuthResponse, LoginPayload, SignupPayload } from "@/types";
import { connectSocket, disconnectSocket } from "@/lib/socket";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setAuth: (user: User, token: string) => void;
}

// Auth store with localStorage persistence for token and user
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      // Authenticates user with email/password, stores JWT
      login: async (payload: LoginPayload) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<{ success: boolean; data: AuthResponse }>("/auth/login", payload);
          const { user, token } = data.data;
          localStorage.setItem("token", token);
          set({ user, token, isAuthenticated: true, isLoading: false });
          connectSocket();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Registers a new user account
      signup: async (payload: SignupPayload) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<{ success: boolean; data: AuthResponse }>("/auth/signup", payload);
          const { user, token } = data.data;
          localStorage.setItem("token", token);
          set({ user, token, isAuthenticated: true, isLoading: false });
          connectSocket();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Clears auth state and disconnects socket
      logout: () => {
        localStorage.removeItem("token");
        disconnectSocket();
        set({ user: null, token: null, isAuthenticated: false });
      },

      // Fetches current user profile from /auth/me
      fetchMe: async () => {
        const token = get().token || localStorage.getItem("token");
        if (!token) return;

        try {
          const { data } = await api.get<{ success: boolean; data: User }>("/auth/me");
          set({ user: data.data, isAuthenticated: true });
          connectSocket();
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
          localStorage.removeItem("token");
        }
      },

      // Directly sets auth state (used for restoring session)
      setAuth: (user: User, token: string) => {
        localStorage.setItem("token", token);
        set({ user, token, isAuthenticated: true });
        connectSocket();
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
