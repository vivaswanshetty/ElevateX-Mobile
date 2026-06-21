import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { Redirect } from "expo-router";
import { FullscreenMessage } from "../../components/FullscreenMessage";
import { AppTabBar } from "../../components/AppTabBar";
import { ControlCenterSheet } from "../../components/ControlCenterSheet";

export default function TabsLayout() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <FullscreenMessage title="Loading workspace" detail="Syncing your account." loading />;
  }

  if (!isLoading && !user) return <Redirect href="/auth/welcome" />;

  return (
    <>
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
        name="feed"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => <Feather name="users" color={color} size={size} />,
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
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => <Feather name="message-square" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="hub"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="alchemy"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="duels"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="resonance"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="streak"
        options={{
          href: null,
        }}
      />
    </Tabs>
    <ControlCenterSheet />
    </>
  );
}
