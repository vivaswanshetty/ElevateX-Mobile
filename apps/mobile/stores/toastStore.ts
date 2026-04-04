import { create } from "zustand";
import type { ToastType } from "../components/Toast";

interface ToastState {
  message: string | null;
  type: ToastType;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: "info",
  showToast: (message, type = "info") => set({ message, type }),
  hideToast: () => set({ message: null }),
}));

export const notify = {
  success: (message: string) => useToastStore.getState().showToast(message, "success"),
  error: (message: string) => useToastStore.getState().showToast(message, "error"),
  info: (message: string) => useToastStore.getState().showToast(message, "info"),
};