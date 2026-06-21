import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";

interface SavedPostsState {
  savedPostIds: Record<string, boolean>;
  toggleSavePost: (postId: string) => void;
  isSaved: (postId: string) => boolean;
}

export const useSavedPostsStore = create<SavedPostsState>()(
  persist(
    (set, get) => ({
      savedPostIds: {},
      toggleSavePost: (postId) =>
        set((state) => ({
          savedPostIds: {
            ...state.savedPostIds,
            [postId]: !state.savedPostIds[postId],
          },
        })),
      isSaved: (postId) => Boolean(get().savedPostIds[postId]),
    }),
    {
      name: "saved-posts-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
