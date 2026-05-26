import { useEffect, useState, useCallback, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Haptics from "expo-haptics";

// Lazily load expo-updates to prevent native crash when the module is not present in development builds
let Updates: any = null;
let isUpdatesEnabled = false;

try {
  Updates = require("expo-updates");
  isUpdatesEnabled = !!Updates?.isEnabled;
} catch (e) {
  isUpdatesEnabled = false;
}

export interface UpdateInfo {
  isUpdateAvailable: boolean;
  currentVersion: string;
  newVersion?: string;
  releaseNotes?: string;
}

// Safe wrapper around useUpdates to prevent native module crashes in development
const useSafeUpdates = () => {
  if (__DEV__ || !isUpdatesEnabled || !Updates) {
    return {
      currentlyRunning: null,
      isUpdateAvailable: false,
      isUpdatePending: false,
      checkError: null,
    };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return Updates.useUpdates();
};

export const useCheckUpdates = () => {
  const { currentlyRunning, isUpdateAvailable, isUpdatePending, checkError } = useSafeUpdates();
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCheckRef = useRef<number>(Date.now());

  // Sync checkError to our local error state
  useEffect(() => {
    if (checkError) {
      setError(checkError.message);
    }
  }, [checkError]);

  const checkForUpdates = useCallback(async () => {
    if (__DEV__ || !isUpdatesEnabled || !Updates) {
      console.log("[Updates] Skipping check — in dev mode or updates disabled");
      return;
    }
    try {
      setIsChecking(true);
      setError(null);
      console.log("[Updates] Checking for updates manually...");
      await Updates.checkForUpdateAsync();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update check failed";
      console.warn("[Updates] Check failed:", message);
      setError(message);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const downloadAndApplyUpdate = useCallback(async () => {
    if (__DEV__ || !isUpdatesEnabled || !Updates) {
      console.log("[Updates] Skipping download/apply — in dev mode or updates disabled");
      return;
    }
    try {
      setIsApplying(true);
      setError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (isUpdatePending) {
        console.log("[Updates] Update already pending. Reloading...");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await Updates.reloadAsync();
        return;
      }

      console.log("[Updates] Fetching update...");
      await Updates.fetchUpdateAsync();
      
      console.log("[Updates] Update downloaded — reloading app");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Updates.reloadAsync();
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = err instanceof Error ? err.message : "Failed to download update";
      setError(message);
      console.error("[Updates] Download failed:", message);
    } finally {
      setIsApplying(false);
    }
  }, [isUpdatePending]);

  // If there's an update available but not pending, fetch it automatically!
  useEffect(() => {
    if (isUpdateAvailable && !isUpdatePending && !isApplying && !__DEV__ && isUpdatesEnabled && Updates) {
      console.log("[Updates] Update is available but not pending, downloading in background...");
      Updates.fetchUpdateAsync().catch((err: any) => {
        console.warn("[Updates] Background fetch failed:", err);
      });
    }
  }, [isUpdateAvailable, isUpdatePending, isApplying]);

  // Re-check when app returns to foreground (throttled to once per 5 minutes)
  useEffect(() => {
    if (__DEV__ || !isUpdatesEnabled) return;

    const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        const elapsed = Date.now() - lastCheckRef.current;
        if (elapsed > MIN_INTERVAL_MS) {
          lastCheckRef.current = Date.now();
          checkForUpdates();
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [checkForUpdates]);

  // Expose reactive update state
  const updateInfo: UpdateInfo = {
    isUpdateAvailable: Boolean(isUpdateAvailable || isUpdatePending),
    currentVersion: currentlyRunning?.runtimeVersion ?? "1.0.0",
    newVersion: "latest",
    releaseNotes: isUpdatePending 
      ? "A new update is downloaded and ready to apply."
      : "New features and improvements are ready to install.",
  };

  return {
    updateInfo,
    isChecking,
    isApplying,
    error,
    checkForUpdates,
    downloadAndApplyUpdate,
  };
};
