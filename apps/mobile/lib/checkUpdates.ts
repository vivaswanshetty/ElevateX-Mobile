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
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    try {
      setIsChecking(true);
      setError(null);

      // Updates are only available in standalone/production builds
      if (!Updates.isEnabled) {
        console.log("Updates are not enabled in this build");
        return;
      }

      // checkForUpdateAsync only checks the manifest — it does NOT download anything.
      // fetchUpdateAsync (called only when user taps "Update") does the actual download.
      const result = await Updates.checkForUpdateAsync();

      if (result.isAvailable) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUpdateInfo({
          isUpdateAvailable: true,
          currentVersion: Updates.runtimeVersion || "1.0.0",
          newVersion: "latest",
          releaseNotes: "New features and improvements are ready to install.",
        });
      } else {
        setUpdateInfo({
          isUpdateAvailable: false,
          currentVersion: Updates.runtimeVersion || "1.0.0",
        });
      }
    } catch (err) {
      // No update available or network unavailable — do not surface to user
      setUpdateInfo({
        isUpdateAvailable: false,
        currentVersion: Updates.runtimeVersion || "1.0.0",
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  const downloadAndApplyUpdate = useCallback(async () => {
    try {
      setIsApplying(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Download then immediately reload
      await Updates.fetchUpdateAsync();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Updates.reloadAsync();
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = err instanceof Error ? err.message : "Failed to download update";
      setError(message);
      console.error("Update download failed:", message);
    } finally {
      setIsApplying(false);
    }
  }, []);

  // Auto-check for updates on app start
  useEffect(() => {
    checkForUpdates();
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
