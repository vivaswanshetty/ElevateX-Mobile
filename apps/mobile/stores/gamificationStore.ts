import { create } from "zustand";

interface GamificationState {
  pendingXP: number;
  pendingCoins: number;
  showXPAnimation: boolean;
  addPendingXP: (amount: number) => void;
  addPendingCoins: (amount: number) => void;
  clearPendingXP: () => void;
}

export const useGamificationStore = create<GamificationState>((set) => ({
  pendingXP: 0,
  pendingCoins: 0,
  showXPAnimation: false,
  addPendingXP: (amount) =>
    set((state) => ({
      pendingXP: state.pendingXP + amount,
      showXPAnimation: true,
    })),
  addPendingCoins: (amount) =>
    set((state) => ({
      pendingCoins: state.pendingCoins + amount,
      showXPAnimation: true,
    })),
  clearPendingXP: () =>
    set({ pendingXP: 0, pendingCoins: 0, showXPAnimation: false }),
}));
