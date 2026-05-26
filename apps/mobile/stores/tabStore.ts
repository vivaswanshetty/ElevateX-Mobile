import { create } from "zustand";

interface TabState {
  currentIndex: number;
  previousIndex: number;
  isTabBarHidden: boolean;
  setIndex: (index: number) => void;
  setTabBarHidden: (hidden: boolean) => void;
}

export const useTabStore = create<TabState>((set) => ({
  currentIndex: 0,
  previousIndex: 0,
  isTabBarHidden: false,
  setIndex: (index) =>
    set((state) => {
      // Avoid unnecessary state updates if index hasn't changed
      if (state.currentIndex === index) return state;
      return {
        previousIndex: state.currentIndex,
        currentIndex: index,
      };
    }),
  setTabBarHidden: (hidden) => set({ isTabBarHidden: hidden }),
}));

