import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";

interface MuteState {
  mutedCreatorIds: Record<string, boolean>;
  muteCreator: (creatorId: string) => void;
  unmuteCreator: (creatorId: string) => void;
  isMuted: (creatorId: string) => boolean;
}

export const useMuteStore = create<MuteState>()(
  persist(
    (set, get) => ({
      mutedCreatorIds: {},
      muteCreator: (creatorId) =>
        set((state) => ({
          mutedCreatorIds: { ...state.mutedCreatorIds, [creatorId]: true },
        })),
      unmuteCreator: (creatorId) =>
        set((state) => {
          const updated = { ...state.mutedCreatorIds };
          delete updated[creatorId];
          return { mutedCreatorIds: updated };
        }),
      isMuted: (creatorId) => Boolean(get().mutedCreatorIds[creatorId]),
    }),
    {
      name: "mute-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
