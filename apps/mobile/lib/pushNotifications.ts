import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../stores/authStore";

// Stubbing notifications for now because the FCM config (google-services.json) was missing.
// This prevents the app from crashing on startup.

export function usePushNotifications(enabled = true) {
  const { user } = useAuthStore();
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();

  useEffect(() => {
    // Push notifications disabled for stability
    if (!enabled || !user) return;
    
    console.log("Push notifications are currently disabled (missing config).");
  }, [user, enabled]);

  return { expoPushToken };
}
