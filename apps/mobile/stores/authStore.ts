import { create } from "zustand";
import { clearAuthToken } from "../lib/authSession";
import type { AppUser } from "../lib/user";

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  authError: string | null;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  authError: null,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setAuthError: (authError) => set({ authError }),
  signOut: async () => {
    await clearAuthToken();
    set({ user: null, authError: null });
  },
}));
