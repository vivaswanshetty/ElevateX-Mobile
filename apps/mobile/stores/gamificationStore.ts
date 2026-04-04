import { create } from "zustand";

interface GamificationState {
  pendingXP: number;
  showXPAnimation: boolean;
  addPendingXP: (amount: number) => void;
  clearPendingXP: () => void;
}

export const useGamificationStore = create<GamificationState>((set) => ({
  pendingXP: 0,
  showXPAnimation: false,
  addPendingXP: (amount) =>
    set((state) => ({
      pendingXP: state.pendingXP + amount,
      showXPAnimation: true,
    })),
  clearPendingXP: () =>
    set({ pendingXP: 0, showXPAnimation: false }),
}));
