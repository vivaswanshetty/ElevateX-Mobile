import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";

interface MutedUsersState {
  mutedUserIds: string[];
  muteUser: (userId: string) => void;
  unmuteUser: (userId: string) => void;
  isMuted: (userId: string) => boolean;
}

export const useMutedUsersStore = create<MutedUsersState>()(
  persist(
    (set, get) => ({
      mutedUserIds: [],
      muteUser: (userId) =>
        set((state) => {
          if (state.mutedUserIds.includes(userId)) return state;
          return { mutedUserIds: [...state.mutedUserIds, userId] };
        }),
      unmuteUser: (userId) =>
        set((state) => ({
          mutedUserIds: state.mutedUserIds.filter((id) => id !== userId),
        })),
      isMuted: (userId) => get().mutedUserIds.includes(userId),
    }),
    {
      name: "muted-users-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
