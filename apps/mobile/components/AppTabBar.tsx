import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ComponentProps, useEffect, useState } from "react";
import { Text, View, Dimensions, Pressable, Keyboard, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  withTiming
} from "react-native-reanimated";
import { HapticPressable } from "./HapticPressable";
import { fontFaces } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { useTabStore } from "../stores/tabStore";
import { useThemeStore } from "../stores/themeStore";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const routeMeta = {
  index: { label: "Home", icon: "home" },
  feed: { label: "Community", icon: "users" },
  create: { label: "Create", icon: "plus" },
  chat: { label: "Chat", icon: "message-square" },
  profile: { label: "Profile", icon: "user" },
} as const;

type RouteName = keyof typeof routeMeta;
type AppTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

function isRouteName(value: string): value is RouteName {
  return value in routeMeta;
}

const TAB_BAR_MARGIN = 20;
const TAB_BAR_WIDTH = SCREEN_WIDTH - TAB_BAR_MARGIN * 2;
const TAB_COUNT = 5;
const TAB_WIDTH = (TAB_BAR_WIDTH - 16) / TAB_COUNT; // 16 is horizontal padding

export function AppTabBar({ state, descriptors, navigation }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;
  
  const indicatorX = useSharedValue(activeIndex * TAB_WIDTH);
  const setIndex = useTabStore((s) => s.setIndex);
  
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const isTabBarHidden = useTabStore((s) => s.isTabBarHidden);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get("/api/messages"),
    refetchInterval: 10000,
    enabled: !!user,
  });

  const unreadDMsCount = conversations.filter((c: any) => c.isUnread).length;

  useEffect(() => {
    setIndex(activeIndex);
    indicatorX.value = withSpring(activeIndex * TAB_WIDTH, {
      damping: 18,
      stiffness: 150,
      mass: 0.8,
    });
  }, [activeIndex, setIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const tint = isDark ? "dark" : "light";
  const barBg = isDark ? "rgba(10, 10, 15, 0.70)" : "rgba(255, 255, 255, 0.75)";
  const barBorder = isDark ? "rgba(255, 255, 255, 0.24)" : "rgba(0, 0, 0, 0.18)";
  const edgeHighlight = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.70)";

  const indicatorBg = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)";
  const indicatorBorder = isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.12)";

  const shouldHide = isTabBarHidden || isKeyboardVisible;

  return (
    <View
      pointerEvents={shouldHide ? "none" : "box-none"}
      style={{
        position: "absolute",
        left: TAB_BAR_MARGIN,
        right: TAB_BAR_MARGIN,
        bottom: Math.max(insets.bottom, 14),
        display: shouldHide ? "none" : "flex",
      }}
    >
      <BlurView
        intensity={95}
        tint={tint}
        style={{
          borderRadius: 28,
          borderWidth: 1.5,
          borderColor: barBorder,
          backgroundColor: barBg,
          paddingHorizontal: 8,
          paddingVertical: 8,
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 20,
          overflow: "hidden",
        }}
      >
        {/* Subtle top edge highlight */}
        <View 
          style={{ 
            position: "absolute", 
            top: 0, 
            left: 20, 
            right: 20, 
            height: 1, 
            backgroundColor: edgeHighlight 
          }} 
        />

        {/* Dynamic Indicator capsule */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 8,
              left: 8,
              width: TAB_WIDTH,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
            },
            indicatorStyle,
          ]}
        >
          <View
            style={{
              width: "92%",
              height: "100%",
              borderRadius: 20,
              backgroundColor: indicatorBg,
              borderWidth: 1,
              borderColor: indicatorBorder,
            }}
          />
        </Animated.View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {state.routes.map((route, index) => {
            if (!isRouteName(route.name)) return null;

            const focused = state.index === index;
            const meta = routeMeta[route.name];

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            if (route.name === "create") {
              return (
                <CreateTabItem
                  key={route.key}
                  focused={focused}
                  onPress={onPress}
                  onLongPress={onLongPress}
                />
              );
            }

            return (
              <TabItem
                key={route.key}
                focused={focused}
                meta={meta}
                onPress={onPress}
                onLongPress={onLongPress}
                isDark={isDark}
                badgeCount={route.name === "chat" ? unreadDMsCount : 0}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

function CreateTabItem({ 
  focused, 
  onPress, 
  onLongPress 
}: { 
  focused: boolean; 
  onPress: () => void; 
  onLongPress: () => void; 
}) {
  const scale = useSharedValue(1);

  return (
    <HapticPressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ width: TAB_WIDTH, height: 52, alignItems: "center", justifyContent: "center" }}
      onPressIn={() => { scale.value = withSpring(0.85); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      <Animated.View
        style={{
          transform: [{ scale: scale.value }],
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: webTheme.accent,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.15)",
          shadowColor: webTheme.accent,
          shadowOpacity: focused ? 0.35 : 0.15,
          shadowRadius: focused ? 8 : 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <Feather name="plus" size={20} color="#FFF" />
      </Animated.View>
    </HapticPressable>
  );
}

function TabItem({ 
  focused, 
  meta, 
  onPress, 
  onLongPress,
  isDark,
  badgeCount = 0
}: { 
  focused: boolean; 
  meta: any; 
  onPress: () => void;
  onLongPress: () => void;
  isDark: boolean;
  badgeCount?: number;
}) {
  const scale = useSharedValue(1);
  const iconTranslateY = useSharedValue(focused ? 0 : 6);
  const textOpacity = useSharedValue(focused ? 1 : 0);
  const textScale = useSharedValue(focused ? 1 : 0.85);

  useEffect(() => {
    iconTranslateY.value = withSpring(focused ? 0 : 6, { damping: 15, stiffness: 120 });
    textOpacity.value = withTiming(focused ? 1 : 0, { duration: 200 });
    textScale.value = withTiming(focused ? 1 : 0.85, { duration: 200 });
  }, [focused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconTranslateY.value }, { scale: scale.value }],
    opacity: withTiming(focused ? 1 : 0.45, { duration: 200 }),
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  const activeColor = webTheme.accent;
  const inactiveColor = isDark ? "#FFF" : "#737373";

  return (
    <HapticPressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ width: TAB_WIDTH, height: 52, alignItems: "center", justifyContent: "center" }}
      onPressIn={() => { scale.value = withSpring(0.85); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      <Animated.View style={[{ alignItems: "center" }, animatedIconStyle]}>
        <View style={{ position: "relative" }}>
          <Feather 
            name={meta.icon} 
            size={19} 
            color={focused ? activeColor : inactiveColor} 
          />
          {badgeCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: -5,
                right: -9,
                backgroundColor: "#ef4444",
                borderRadius: 8,
                minWidth: 15,
                height: 15,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
                borderWidth: 1.5,
                borderColor: isDark ? "rgba(10, 10, 15, 0.9)" : "#fff",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 7.5,
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                {badgeCount > 99 ? "99+" : badgeCount}
              </Text>
            </View>
          )}
        </View>
        <Animated.Text
          style={[
            {
              fontFamily: focused ? fontFaces.bold : fontFaces.semibold,
              color: focused ? webTheme.text : inactiveColor,
              fontSize: 9,
              marginTop: 4,
              letterSpacing: 0.2,
            },
            animatedTextStyle,
          ]}
        >
          {meta.label}
        </Animated.Text>
      </Animated.View>
    </HapticPressable>
  );
}
