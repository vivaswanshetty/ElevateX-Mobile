import { create } from "zustand";

interface ControlCenterState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useControlCenterStore = create<ControlCenterState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
