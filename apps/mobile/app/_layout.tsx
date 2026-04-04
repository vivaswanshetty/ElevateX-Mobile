import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, LogBox } from "react-native";
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
import { GlobalToast } from "../components/GlobalToast";
import { getAuthToken } from "../lib/authSession";
import { queryClient } from "../lib/queryClient";
import { useAuthStore } from "../stores/authStore";
import { api, getErrorMessage } from "../lib/api";
import { normalizeUserPayload } from "../lib/user";
import { usePushNotifications } from "../lib/pushNotifications";

// Suppress LogBox in production
LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

// ─── DIAGNOSTIC ERROR BOUNDARY ───────────────────────────────
// This catches React render errors and SHOWS them on screen
// instead of crashing the app
class DiagnosticErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; errorInfo: string }
> {
  state = { error: null as Error | null, errorInfo: "" };

  static getDerivedStateFromError(error: Error) {
    return { error, errorInfo: error.stack || error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({
      errorInfo: `${error.message}\n\n${error.stack}\n\nComponent Stack:\n${info.componentStack}`,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: "#1a0000", paddingTop: 60, paddingHorizontal: 16 }}>
          <Text style={{ color: "#ff4444", fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>
            🔴 CRASH CAUGHT — Screenshot this!
          </Text>
          <ScrollView style={{ flex: 1 }}>
            <Text style={{ color: "#ff9999", fontSize: 12, fontFamily: "monospace" }}>
              {this.state.errorInfo}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── GLOBAL JS ERROR CATCHER ─────────────────────────────────
// This catches errors that happen OUTSIDE React (native module errors, etc.)
function useGlobalErrorCatcher() {
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      setGlobalError(
        `[${isFatal ? "FATAL" : "NON-FATAL"}] ${error.message}\n\n${error.stack}`
      );
      // Don't call original handler to prevent crash
    });
    return () => ErrorUtils.setGlobalHandler(originalHandler);
  }, []);

  return globalError;
}

export default function RootLayout() {
  const globalError = useGlobalErrorCatcher();
  const { isLoading, setUser, setLoading, setAuthError } = useAuthStore();
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

        try {
          const user = await api.get("/api/users/profile");
          if (!cancelled) {
            setUser(normalizeUserPayload(user));
            setAuthError(null);
          }
        } catch (apiError) {
          if (!cancelled) {
            console.warn("Failed to load user profile:", getErrorMessage(apiError));
            setAuthError(null);
            setUser(null);
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
    return () => { cancelled = true; };
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

  // ── Show global JS errors on screen ──
  if (globalError) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1a0000", paddingTop: 60, paddingHorizontal: 16 }}>
        <Text style={{ color: "#ff4444", fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>
          🔴 JS ERROR CAUGHT — Screenshot this!
        </Text>
        <ScrollView style={{ flex: 1 }}>
          <Text style={{ color: "#ff9999", fontSize: 12, fontFamily: "monospace" }}>
            {globalError}
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ── Loading state ──
  if (isLoading || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, backgroundColor: "#07080a", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "bold" }}>Loading ElevateX...</Text>
        <Text style={{ color: "#888888", fontSize: 14, marginTop: 8 }}>Restoring your session</Text>
      </View>
    );
  }

  return (
    <DiagnosticErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
          </Stack>
          <GlobalToast />
          <StatusBar style="light" />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </DiagnosticErrorBoundary>
  );
}
