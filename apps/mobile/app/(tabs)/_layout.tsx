import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { Redirect } from "expo-router";
import { FullscreenMessage } from "../../components/FullscreenMessage";
import { AppTabBar } from "../../components/AppTabBar";

export default function TabsLayout() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <FullscreenMessage title="Loading workspace" detail="Syncing your account." loading />;
  }

  if (!isLoading && !user) return <Redirect href="/auth/login" />;

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => <Feather name="compass" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size }) => <Feather name="plus-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <Feather name="bell" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
