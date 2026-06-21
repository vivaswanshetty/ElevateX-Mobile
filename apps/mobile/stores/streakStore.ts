import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";

interface DailyActions {
  checkIn: boolean;
  quest: boolean;
  ai: boolean;
  chat: boolean;
}

interface StreakState {
  streakCount: number;
  longestStreak: number;
  streakFreezes: number;
  lastCheckedInDate: string | null;
  streakHistory: string[];
  completedDailyActions: DailyActions;
  
  checkIn: (todayStr: string, yesterdayStr: string) => "claimed" | "already_claimed" | "frozen" | "reset";
  purchaseFreeze: () => boolean;
  completeAction: (action: keyof Omit<DailyActions, "checkIn">) => void;
  resetDailyActions: () => void;
  initializeDefaultStreak: (todayStr: string) => void;
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      streakCount: 0,
      longestStreak: 0,
      streakFreezes: 0,
      lastCheckedInDate: null,
      streakHistory: [],
      completedDailyActions: {
        checkIn: false,
        quest: false,
        ai: false,
        chat: false,
      },

      checkIn: (todayStr, yesterdayStr) => {
        const state = get();
        if (state.lastCheckedInDate === todayStr) {
          return "already_claimed";
        }
        
        let newStreak = state.streakCount;
        let result: "claimed" | "frozen" | "reset" = "claimed";
        let newFreezes = state.streakFreezes;
        
        if (state.lastCheckedInDate === null) {
          // First time check-in
          newStreak = 1;
        } else if (state.lastCheckedInDate === yesterdayStr) {
          // Continued streak
          newStreak += 1;
        } else {
          // Missed yesterday!
          if (state.streakFreezes > 0) {
            newFreezes -= 1;
            newStreak += 1; // Protect and increment
            result = "frozen";
          } else {
            newStreak = 1;
            result = "reset";
          }
        }
        
        const newHistory = [...state.streakHistory];
        if (!newHistory.includes(todayStr)) {
          newHistory.push(todayStr);
        }
        
        set({
          streakCount: newStreak,
          longestStreak: Math.max(state.longestStreak, newStreak),
          streakFreezes: newFreezes,
          lastCheckedInDate: todayStr,
          streakHistory: newHistory,
          completedDailyActions: {
            ...state.completedDailyActions,
            checkIn: true,
          }
        });
        
        return result;
      },

      purchaseFreeze: () => {
        const state = get();
        set({
          streakFreezes: state.streakFreezes + 1,
        });
        return true;
      },

      completeAction: (action) => {
        const state = get();
        set({
          completedDailyActions: {
            ...state.completedDailyActions,
            [action]: true,
          }
        });
      },

      resetDailyActions: () => {
        set({
          completedDailyActions: {
            checkIn: false,
            quest: false,
            ai: false,
            chat: false,
          }
        });
      },

      initializeDefaultStreak: (todayStr) => {
        const state = get();
        if (state.streakCount > 0 || state.lastCheckedInDate !== null) {
          return; // Already initialized or user has active streak
        }
        
        // Populate past 6 days
        const history: string[] = [];
        const today = new Date(todayStr);
        for (let i = 6; i >= 1; i--) {
          const pastDate = new Date(today);
          pastDate.setDate(today.getDate() - i);
          const y = pastDate.getFullYear();
          const m = String(pastDate.getMonth() + 1).padStart(2, "0");
          const d = String(pastDate.getDate()).padStart(2, "0");
          history.push(`${y}-${m}-${d}`);
        }
        
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yy = yesterday.getFullYear();
        const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
        const dd = String(yesterday.getDate()).padStart(2, "0");
        const yesterdayStr = `${yy}-${mm}-${dd}`;
        
        set({
          streakCount: 6,
          longestStreak: 6,
          streakFreezes: 1,
          lastCheckedInDate: yesterdayStr,
          streakHistory: history,
          completedDailyActions: {
            checkIn: false,
            quest: false,
            ai: false,
            chat: false,
          }
        });
      }
    }),
    {
      name: "streak-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
