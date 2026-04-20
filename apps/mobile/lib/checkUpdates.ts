import { useEffect, useState, useCallback, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Updates from "expo-updates";
import * as Haptics from "expo-haptics";

export interface UpdateInfo {
  isUpdateAvailable: boolean;
  currentVersion: string;
  newVersion?: string;
  releaseNotes?: string;
}

export const useCheckUpdates = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCheckRef = useRef<number>(0);

  const checkForUpdates = useCallback(async () => {
    try {
      setIsChecking(true);
      setError(null);

      // Updates are only available in production standalone builds
      if (__DEV__) {
        console.log("[Updates] Skipping — running in dev mode");
        return;
      }

      if (!Updates.isEnabled) {
        console.log("[Updates] expo-updates is not enabled in this build");
        return;
      }

      console.log("[Updates] Checking for updates…");
      const result = await Updates.checkForUpdateAsync();

      if (result.isAvailable) {
        console.log("[Updates] Update available!");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUpdateInfo({
          isUpdateAvailable: true,
          currentVersion: Updates.runtimeVersion ?? "1.0.0",
          newVersion: "latest",
          releaseNotes: "New features and improvements are ready to install.",
        });
      } else {
        console.log("[Updates] App is up to date");
        setUpdateInfo({
          isUpdateAvailable: false,
          currentVersion: Updates.runtimeVersion ?? "1.0.0",
        });
      }

      lastCheckRef.current = Date.now();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update check failed";
      console.warn("[Updates] Check failed:", message);
      setError(message);
      setUpdateInfo({
        isUpdateAvailable: false,
        currentVersion: Updates.runtimeVersion ?? "1.0.0",
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  const downloadAndApplyUpdate = useCallback(async () => {
    try {
      setIsApplying(true);
      setError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      console.log("[Updates] Downloading update…");
      const result = await Updates.fetchUpdateAsync();

      if (result.isNew) {
        console.log("[Updates] Update downloaded — reloading app");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await Updates.reloadAsync();
      } else {
        console.log("[Updates] Downloaded bundle was not new");
        setError("No new update to apply.");
      }
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = err instanceof Error ? err.message : "Failed to download update";
      setError(message);
      console.error("[Updates] Download failed:", message);
    } finally {
      setIsApplying(false);
    }
  }, []);

  // Auto-check on mount
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  // Re-check when app returns to foreground (throttled to once per 5 minutes)
  useEffect(() => {
    const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        const elapsed = Date.now() - lastCheckRef.current;
        if (elapsed > MIN_INTERVAL_MS) {
          checkForUpdates();
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [checkForUpdates]);

  return {
    updateInfo,
    isChecking,
    isApplying,
    error,
    checkForUpdates,
    downloadAndApplyUpdate,
  };
};
