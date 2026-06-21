import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
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
import { GamificationOverlay } from "../components/GamificationOverlay";
import { useThemeStore } from "../stores/themeStore";
import { webTheme } from "../lib/webTheme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoading, authError, setUser, setLoading, setAuthError } =
    useAuthStore();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
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

  const { updateInfo, isApplying: isApplyingUpdate, downloadAndApplyUpdate, updateDismissed, setUpdateDismissed } = useCheckUpdates();
  const showUpdatePrompt = Boolean(updateInfo?.isUpdateAvailable) && !updateDismissed;

  const theme = useThemeStore((state) => state.theme);

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
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: webTheme.bg }}>
        <FullscreenMessage title="Connection error" detail={authError} />
        <UpdatePrompt
          visible={showUpdatePrompt}
          updateInfo={updateInfo}
          isApplying={isApplyingUpdate}
          onUpdate={downloadAndApplyUpdate}
          onDismiss={() => setUpdateDismissed(true)}
        />
      </GestureHandlerRootView>
    );
  }

  return (
    <AppErrorBoundary key={theme}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: webTheme.bg }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: webTheme.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
          </Stack>
          <GlobalToast />
          <GamificationOverlay />
          <StatusBar style={theme === "dark" ? "light" : "dark"} />
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
