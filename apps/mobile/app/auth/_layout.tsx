import { Redirect, Stack } from "expo-router";
import { FullscreenMessage } from "../../components/FullscreenMessage";
import { useAuthStore } from "../../stores/authStore";

export default function AuthLayout() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <FullscreenMessage title="Loading ElevateX" detail="Checking your session." loading />;
  }

  if (user) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
