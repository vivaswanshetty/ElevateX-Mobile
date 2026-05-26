import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ComponentProps, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View, Dimensions } from "react-native";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const routeMeta = {
  index: { label: "Home", icon: "home" },
  explore: { label: "Explore", icon: "compass" },
  create: { label: "Create", icon: "plus" },
  activity: { label: "Updates", icon: "bell" },
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

  useEffect(() => {
    setIndex(activeIndex);
    indicatorX.value = withSpring(activeIndex * TAB_WIDTH, {
      damping: 18,
      stiffness: 150,
      mass: 0.8,
    });
  }, [activeIndex, setIndex]);

  if (isTabBarHidden) return null;

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const tint = isDark ? "dark" : "light";
  const barBg = isDark ? "rgba(10, 10, 15, 0.70)" : "rgba(255, 255, 255, 0.75)";
  const barBorder = isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.50)";
  const edgeHighlight = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.60)";
  const indicatorBg = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)";
  const indicatorBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)";

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: TAB_BAR_MARGIN,
        right: TAB_BAR_MARGIN,
        bottom: Math.max(insets.bottom, 14),
      }}
    >
      <BlurView
        intensity={95}
        tint={tint}
        style={{
          borderRadius: 32,
          borderWidth: 1,
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

        {/* Dynamic Indicator */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 8,
              left: 8,
              width: TAB_WIDTH,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
            },
            indicatorStyle,
          ]}
        >
          <View
            style={{
              width: "85%",
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
            const isCreate = route.name === "create";

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

            return (
              <TabItem
                key={route.key}
                focused={focused}
                meta={meta}
                isCreate={isCreate}
                onPress={onPress}
                onLongPress={onLongPress}
                isDark={isDark}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

function TabItem({ 
  focused, 
  meta, 
  isCreate, 
  onPress, 
  onLongPress,
  isDark
}: { 
  focused: boolean; 
  meta: any; 
  isCreate: boolean; 
  onPress: () => void;
  onLongPress: () => void;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(focused ? 1 : 0.4);

  useEffect(() => {
    opacity.value = withTiming(focused ? 1 : 0.4, { duration: 250 });
  }, [focused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const activeColor = webTheme.accent;
  const inactiveColor = isDark ? "#FFF" : "#737373";

  if (isCreate) {
    return (
      <HapticPressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={{ width: TAB_WIDTH, alignItems: "center", justifyContent: "center" }}
        onPressIn={() => { scale.value = withSpring(0.9); }}
        onPressOut={() => { scale.value = withSpring(1); }}
      >
        <LinearGradient
          colors={focused ? ["#FF4D5E", "#D63048"] : (isDark ? ["#2A2A35", "#1A1A22"] : ["#E5E5E5", "#D4D4D4"])}
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: focused ? "rgba(255,255,255,0.2)" : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"),
            shadowColor: focused ? webTheme.red : "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: focused ? 0.3 : (isDark ? 0.2 : 0.06),
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Feather name="plus" size={22} color={focused ? "#fff" : (isDark ? "#fff" : "#404040")} />
        </LinearGradient>
      </HapticPressable>
    );
  }

  return (
    <HapticPressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ width: TAB_WIDTH, height: 48, alignItems: "center", justifyContent: "center" }}
      onPressIn={() => { scale.value = withSpring(0.85); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      <Animated.View style={[{ alignItems: "center" }, animatedIconStyle]}>
        <Feather 
          name={meta.icon} 
          size={19} 
          color={focused ? activeColor : inactiveColor} 
        />
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

