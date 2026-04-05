import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useAuthStore } from "../stores/authStore";
import { api } from "./api";

// Show notifications as banners even when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens don't work on simulators — silently skip
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "d10969e8-b2ca-45ea-9694-c933294201a6",
  });

  return tokenData.data;
}

export function usePushNotifications(enabled = true) {
  const { user } = useAuthStore();
  const lastTokenRef = useRef<string | null>(null);
  const listenerRef = useRef<Notifications.Subscription | null>(null);
  const responseListenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!enabled || !user) return;

    registerForPushNotificationsAsync()
      .then(async (token) => {
        if (!token || token === lastTokenRef.current) return;
        lastTokenRef.current = token;
        // Save token to backend via profile update
        await api.patch("/api/users/profile", { pushToken: token });
      })
      .catch((err) => {
        // Silently fail — push notifications are non-critical
        console.warn("[Push] Registration failed:", err?.message ?? err);
      });

    // Listen for notifications received while app is open
    listenerRef.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("[Push] Received:", notification.request.content.title);
      }
    );

    // Listen for user tapping a notification
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("[Push] Tapped:", data);
        // Future: router.push based on data.screen / data.id
      }
    );

    return () => {
      listenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, [enabled, user?.id]);
}
