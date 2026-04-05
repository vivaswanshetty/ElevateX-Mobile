import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { FullscreenMessage } from "../components/FullscreenMessage";
import { GlobalToast } from "../components/GlobalToast";
import { AppErrorBoundary } from "../components/AppErrorBoundary";
import { getAuthToken } from "../lib/authSession";
import { queryClient } from "../lib/queryClient";
import { useAuthStore } from "../stores/authStore";
import { api, getErrorMessage } from "../lib/api";
import { normalizeUserPayload } from "../lib/user";
import { usePushNotifications } from "../lib/pushNotifications";
import { useCheckUpdates } from "../lib/checkUpdates";
import { UpdatePrompt } from "../components/UpdatePrompt";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoading, authError, setUser, setLoading, setAuthError } =
    useAuthStore();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    let cancelled = false;

    const hydrateUser = async () => {
      try {
        const token = await getAuthToken();

        if (!token) {
          if (!cancelled) {
            setUser(null);
            setAuthError(null);
          }
          return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          const user = await api.get("/api/users/profile", { signal: controller.signal });
          clearTimeout(timeout);
          if (!cancelled) {
            setUser(normalizeUserPayload(user));
            setAuthError(null);
          }
        } catch (apiError) {
          clearTimeout(timeout);
          if (!cancelled) {
            console.warn(
              "Failed to load user profile:",
              getErrorMessage(apiError)
            );
            // Token exists but profile fetch failed (cold start / network).
            // Set a placeholder user so we don't kick to login.
            // The profile query in the tabs will retry in the background.
            setUser({
              id: "",
              username: "member",
              displayName: null,
              avatarUrl: null,
              level: 1,
              xp: 0,
              tokenBalance: 0,
            });
            setAuthError(null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Auth hydration error:", error);
          setUser(null);
          setAuthError(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    hydrateUser();
    return () => {
      cancelled = true;
    };
  }, [setUser, setAuthError, setLoading]);

  useEffect(() => {
    if (!isLoading && (fontsLoaded || fontError)) {
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => null);
      }, 100);
    }
  }, [fontError, fontsLoaded, isLoading]);

  const appReady = !isLoading && Boolean(fontsLoaded || fontError);
  usePushNotifications(appReady);

  const { updateInfo, isApplying: isApplyingUpdate, downloadAndApplyUpdate } = useCheckUpdates();
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const showUpdatePrompt = Boolean(updateInfo?.isUpdateAvailable) && !updateDismissed;

  if (isLoading || (!fontsLoaded && !fontError)) {
    return (
      <FullscreenMessage
        title="Loading ElevateX"
        detail="Restoring your session."
        loading
      />
    );
  }

  if (authError) {
    return <FullscreenMessage title="Connection error" detail={authError} />;
  }

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
          </Stack>
          <GlobalToast />
          <StatusBar style="light" />
          <UpdatePrompt
            visible={showUpdatePrompt}
            updateInfo={updateInfo}
            isApplying={isApplyingUpdate}
            onUpdate={downloadAndApplyUpdate}
            onDismiss={() => setUpdateDismissed(true)}
          />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
