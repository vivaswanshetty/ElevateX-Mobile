import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticPressable } from "./HapticPressable";
import { fontFaces } from "../lib/typography";
import { webTheme } from "../lib/webTheme";

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

export function AppTabBar({ state, descriptors, navigation }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabSlotWidth = 54;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        bottom: Math.max(insets.bottom, 10),
      }}
    >
      <BlurView
        intensity={100}
        tint="dark"
        style={{
          borderRadius: 28,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.15)",
          backgroundColor: "rgba(20, 20, 25, 0.92)",
          paddingHorizontal: 8,
          paddingTop: 6,
          paddingBottom: 6,
          shadowColor: "#000",
          shadowOpacity: 0.5,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 16 },
          elevation: 24,
          overflow: "hidden",
        }}
      >
        {/* top glass highlight */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.12)", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
          }}
        />

        {/* ambient accent glow behind center */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -40,
            alignSelf: "center",
            width: 120,
            height: 60,
            borderRadius: 999,
            backgroundColor: webTheme.accentGlow,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-evenly",
          }}
        >
          {state.routes.map((route, index) => {
            if (!isRouteName(route.name)) {
              return null;
            }

            const focused = state.index === index;
            const { options } = descriptors[route.key];
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

            if (isCreate) {
              return (
                <View key={route.key} style={{ width: tabSlotWidth, alignItems: "center" }}>
                  <HapticPressable
                    hapticType="medium"
                    onPress={onPress}
                    onLongPress={onLongPress}
                    accessibilityRole="button"
                    accessibilityState={focused ? { selected: true } : {}}
                    accessibilityLabel={options.tabBarAccessibilityLabel}
                    testID={options.tabBarButtonTestID}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.92 : 1 }],
                    })}
                  >
                    <LinearGradient
                      colors={
                        focused
                          ? ["#FF4D5E", "#D63048"]
                          : ["#1E1517", "#161113"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: focused
                          ? "rgba(255,255,255,0.18)"
                          : webTheme.accentBorder,
                        shadowColor: webTheme.accent,
                        shadowOpacity: focused ? 0.3 : 0.12,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 8,
                      }}
                    >
                      <Feather
                        name={meta.icon}
                        size={20}
                        color={focused ? "#fff" : "rgba(255,255,255,0.72)"}
                      />
                    </LinearGradient>
                  </HapticPressable>

                  <Text
                    style={{
                      fontFamily: fontFaces.bold,
                      color: focused ? webTheme.text : webTheme.faint,
                      fontSize: 9,
                      marginTop: 6,
                      letterSpacing: 0.3,
                    }}
                  >
                    {meta.label}
                  </Text>
                </View>
              );
            }

            return (
              <HapticPressable
                key={route.key}
                hapticType="selection"
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
                style={({ pressed }) => ({
                  width: tabSlotWidth,
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 48,
                  borderRadius: 16,
                  backgroundColor: focused
                    ? "rgba(255,255,255,0.08)"
                    : "transparent",
                  borderWidth: focused ? 1 : 0,
                  borderColor: focused
                    ? "rgba(255,255,255,0.12)"
                    : "transparent",
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: focused ? 1.05 : 1 }],
                })}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: focused
                      ? webTheme.accentSoft
                      : "rgba(255,255,255,0.03)",
                    borderWidth: 1,
                    borderColor: focused
                      ? webTheme.accentBorder
                      : "rgba(255,255,255,0.06)",
                  }}
                >
                  <Feather
                    name={meta.icon}
                    size={17}
                    color={focused ? webTheme.accent : "rgba(255,255,255,0.40)"}
                  />
                </View>
                <Text
                  style={{
                    fontFamily: focused ? fontFaces.bold : fontFaces.semibold,
                    color: focused ? webTheme.text : webTheme.faint,
                    fontSize: 9,
                    marginTop: 5,
                    letterSpacing: 0.3,
                  }}
                >
                  {meta.label}
                </Text>
              </HapticPressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
