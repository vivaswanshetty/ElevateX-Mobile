import * as Updates from "expo-updates";
import { useEffect, useState, useCallback } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    try {
      setIsChecking(true);
      setError(null);

      // Check if updates are enabled
      if (!Updates.isEnabled) {
        console.log("Updates are not enabled in this build");
        return;
      }

      // Attempt to fetch the latest update
      try {
        await Updates.fetchUpdateAsync();
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setUpdateInfo({
          isUpdateAvailable: true,
          currentVersion: Updates.runtimeVersion || "1.0.0",
          newVersion: "1.0.1",
          releaseNotes: "New features and improvements are available",
        });
      } catch (fetchError) {
        // No update available
        setUpdateInfo({
          isUpdateAvailable: false,
          currentVersion: Updates.runtimeVersion || "1.0.0",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to check for updates";
      setError(message);
      console.warn("Update check failed:", message);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const downloadAndApplyUpdate = useCallback(async () => {
    try {
      setIsChecking(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await Updates.fetchUpdateAsync();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reload the app
      await Updates.reloadAsync();
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = err instanceof Error ? err.message : "Failed to download update";
      setError(message);
      console.error("Update download failed:", message);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Auto-check for updates on app start
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  return {
    updateInfo,
    isChecking,
    error,
    checkForUpdates,
    downloadAndApplyUpdate,
  };
};
