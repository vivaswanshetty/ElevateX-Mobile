import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ComponentProps, useEffect, useMemo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View, Dimensions } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  withTiming,
  interpolateColor
} from "react-native-reanimated";
import { HapticPressable } from "./HapticPressable";
import { fontFaces } from "../lib/typography";
import { webTheme } from "../lib/webTheme";

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

  useEffect(() => {
    indicatorX.value = withSpring(activeIndex * TAB_WIDTH, {
      damping: 18,
      stiffness: 150,
      mass: 0.8,
    });
  }, [activeIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

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
        intensity={80}
        tint="dark"
        style={{
          borderRadius: 32,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.12)",
          backgroundColor: "rgba(10, 10, 15, 0.85)",
          paddingHorizontal: 8,
          paddingVertical: 8,
          shadowColor: "#000",
          shadowOpacity: 0.4,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
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
            backgroundColor: "rgba(255,255,255,0.08)" 
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
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
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
  onLongPress 
}: { 
  focused: boolean; 
  meta: any; 
  isCreate: boolean; 
  onPress: () => void;
  onLongPress: () => void;
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
          colors={focused ? ["#FF4D5E", "#D63048"] : ["#2A2A35", "#1A1A22"]}
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: focused ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
            shadowColor: focused ? webTheme.red : "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: focused ? 0.3 : 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Feather name="plus" size={22} color="#fff" />
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
          color={focused ? webTheme.accent : "#FFF"} 
        />
        <Animated.Text
          style={[
            {
              fontFamily: focused ? fontFaces.bold : fontFaces.semibold,
              color: focused ? webTheme.text : "#FFF",
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
