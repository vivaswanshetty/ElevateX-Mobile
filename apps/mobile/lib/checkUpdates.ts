import { useEffect, useState, useCallback, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Haptics from "expo-haptics";
import versionInfo from "../version.json";

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
      availableUpdate: null,
      isUpdateAvailable: false,
      isUpdatePending: false,
      checkError: null,
    };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return Updates.useUpdates();
};

let globalUpdateDismissed = false;
let globalManualUpdateAvailable = false;
let globalManualUpdateVersion = "latest";
const listeners = new Set<() => void>();

export const useCheckUpdates = () => {
  const { currentlyRunning, availableUpdate, isUpdateAvailable, isUpdatePending, checkError } = useSafeUpdates();
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCheckRef = useRef<number>(Date.now());
  
  const [updateDismissed, setUpdateDismissedState] = useState(globalUpdateDismissed);
  const [manualUpdateAvailable, setManualUpdateAvailable] = useState(globalManualUpdateAvailable);
  const [manualUpdateVersion, setManualUpdateVersion] = useState(globalManualUpdateVersion);

  useEffect(() => {
    const listener = () => {
      setUpdateDismissedState(globalUpdateDismissed);
      setManualUpdateAvailable(globalManualUpdateAvailable);
      setManualUpdateVersion(globalManualUpdateVersion);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setUpdateDismissed = useCallback((val: boolean) => {
    globalUpdateDismissed = val;
    listeners.forEach((listener) => listener());
  }, []);

  // Sync checkError to our local error state
  useEffect(() => {
    if (checkError) {
      setError(checkError.message);
    }
  }, [checkError]);

  const checkForUpdates = useCallback(async () => {
    if (__DEV__ || !isUpdatesEnabled || !Updates) {
      console.log("[Updates] Skipping check — in dev mode or updates disabled");
      return null;
    }
    try {
      setIsChecking(true);
      setError(null);
      console.log("[Updates] Checking for updates manually...");
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        globalUpdateDismissed = false;
        globalManualUpdateAvailable = true;
        globalManualUpdateVersion = result.manifest?.extra?.expoClient?.version ?? (result.manifest as any)?.version ?? "latest";
        listeners.forEach((listener) => listener());
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update check failed";
      console.warn("[Updates] Check failed:", message);
      setError(message);
      throw err;
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
        globalManualUpdateAvailable = false;
        listeners.forEach((listener) => listener());
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await Updates.reloadAsync();
        return;
      }

      console.log("[Updates] Fetching update...");
      await Updates.fetchUpdateAsync();
      
      console.log("[Updates] Update downloaded — reloading app");
      globalManualUpdateAvailable = false;
      listeners.forEach((listener) => listener());
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
    if ((isUpdateAvailable || manualUpdateAvailable) && !isUpdatePending && !isApplying && !__DEV__ && isUpdatesEnabled && Updates) {
      console.log("[Updates] Update is available but not pending, downloading in background...");
      Updates.fetchUpdateAsync().catch((err: any) => {
        console.warn("[Updates] Background fetch failed:", err);
      });
    }
  }, [isUpdateAvailable, manualUpdateAvailable, isUpdatePending, isApplying]);

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
    isUpdateAvailable: Boolean(isUpdateAvailable || isUpdatePending || manualUpdateAvailable),
    currentVersion: versionInfo.version,
    newVersion: availableUpdate?.manifest?.extra?.expoClient?.version ?? (availableUpdate?.manifest as any)?.version ?? manualUpdateVersion,
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
    updateDismissed,
    setUpdateDismissed,
  };
};
