import React, { useMemo, useEffect } from "react";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { AppStackHeader } from "../../components/AppStackHeader";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";
import { SurfaceCard } from "../../components/SurfaceCard";
import { webTheme } from "../../lib/webTheme";
import { type } from "../../lib/typography";
import { useThemeStore } from "../../stores/themeStore";
import { useStreakStore } from "../../stores/streakStore";
import { useAuthStore } from "../../stores/authStore";
import { HapticPressable } from "../../components/HapticPressable";
import { notify } from "../../stores/toastStore";
import { router } from "expo-router";
import { api } from "../../lib/api";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";

export default function StreakScreen() {
  const isDark = useThemeStore((s) => s.theme) === "dark";
  const { user, setUser } = useAuthStore();
  const tabBarPadding = useTabBarPadding();
  const queryClient = useQueryClient();
  const {
    streakCount,
    longestStreak,
    streakFreezes,
    streakHistory,
    completedDailyActions,
    checkIn,
    purchaseFreeze,
    completeAction,
    initializeDefaultStreak,
  } = useStreakStore();

  // Date formatting helpers
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getLocalDateString(yesterday);
  }, []);

  // Initialize mock 6-day streak on load if empty
  useEffect(() => {
    initializeDefaultStreak(todayStr);
  }, [initializeDefaultStreak, todayStr]);

  const isCheckedInToday = completedDailyActions.checkIn;

  // Calculate the dates for the current week (Monday to Sunday)
  const currentWeekDays = useMemo(() => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(today.setDate(diff));

    const days = [];
    const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateString(d);
      days.push({
        name: weekdayNames[i],
        dateStr,
        isToday: dateStr === todayStr,
        isPast: d < new Date(today.setHours(0, 0, 0, 0)),
        isCheckedIn: streakHistory.includes(dateStr),
      });
    }
    return days;
  }, [streakHistory, todayStr]);

  const handleCheckIn = async () => {
    // Run the local check-in first to verify status
    const res = checkIn(todayStr, yesterdayStr);
    
    if (res === "already_claimed") {
      notify.info("Check-in already claimed for today!");
      return;
    }

    try {
      // Sync coin reward (+10 Coins) to the backend database
      const apiRes: any = await api.post("/api/transactions/deposit", { amount: 10, description: "Daily Check-in" });
      
      if (user) {
        setUser({
          ...user,
          tokenBalance: apiRes.coins,
        });
      }
      
      // Invalidate queries to refresh the wallet transactions list and profile queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);

      if (res === "claimed") {
        notify.success("Daily Check-in claimed! +10 Coins awarded.");
      } else if (res === "frozen") {
        notify.success("Streak saved using a Freeze! Check-in claimed.");
      } else if (res === "reset") {
        notify.info("Streak reset to 1 day. Check-in claimed!");
      }
    } catch (err) {
      console.warn("Failed to check in on backend, awarding locally as fallback:", err);
      // Fallback local awarding if API fails
      if (user) {
        setUser({
          ...user,
          tokenBalance: user.tokenBalance + 10,
        });
      }
      notify.success("Daily Check-in claimed! (Local offline mode)");
    }
  };

  const handleBuyFreeze = async () => {
    if (!user) return;
    if (user.tokenBalance < 100) {
      notify.error("Insufficient Coins. You need 100 Coins to buy a Freeze.");
      return;
    }

    try {
      // Sync coin spend (-100 Coins) to the backend database
      const apiRes: any = await api.post("/api/transactions/withdraw", { amount: 100, description: "Streak Freeze Purchase" });
      
      setUser({
        ...user,
        tokenBalance: apiRes.coins,
      });
      
      // Increment freeze count in local store
      purchaseFreeze();
      
      // Invalidate queries to refresh the wallet transactions list and profile queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);

      notify.success("Purchased Streak Freeze! Protected against missed check-ins.");
    } catch (err) {
      console.warn("Failed to purchase freeze on backend:", err);
      notify.error("Failed to purchase Streak Freeze on server.");
    }
  };

  const handleNavigateAction = (route: string, action: "quest" | "ai" | "chat") => {
    completeAction(action);
    router.navigate(route as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop accent={webTheme.blue} secondaryAccent={webTheme.gold} />
      
      {/* Header */}
      <AppStackHeader
        title="Streak Performance"
        detail="Daily check-ins, EXP boosts, and streak protection."
        hideWorkspaceButton
        rightElement={
          <HapticPressable
            onPress={() => router.push("/wallet" as any)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(251, 191, 36, 0.08)",
              borderWidth: 1,
              borderColor: "rgba(251, 191, 36, 0.18)",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 14,
            }}
            hapticType="light"
          >
            <MaterialCommunityIcons name="star-four-points" size={14} color={webTheme.gold} />
            <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
              {user?.tokenBalance ?? 0}
            </Text>
          </HapticPressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: tabBarPadding + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Large Flame & Claim Card (Top Half - Blue Accent) */}
        <SurfaceCard style={{ marginTop: 12, alignItems: "center", paddingVertical: 36, paddingHorizontal: 20 }}>
          {/* Flame Centered Concentric Circles (avoids overlaps, irregularities, and cuts) */}
          <View style={{ width: 140, height: 140, alignItems: "center", justifyContent: "center", position: "relative", marginTop: 10, alignSelf: "center" }}>
            {/* Outermost pulsing ring */}
            <View
              style={{
                position: "absolute",
                width: 140,
                height: 140,
                borderRadius: 70,
                borderWidth: 1,
                borderColor: isCheckedInToday ? "rgba(96, 165, 250, 0.15)" : "rgba(255, 255, 255, 0.03)",
                backgroundColor: isCheckedInToday ? "rgba(96, 165, 250, 0.03)" : "transparent",
              }}
            />
            
            {/* Inner background glow */}
            <View
              style={{
                position: "absolute",
                width: 116,
                height: 116,
                borderRadius: 58,
                backgroundColor: isCheckedInToday ? "rgba(96, 165, 250, 0.10)" : "rgba(255, 255, 255, 0.02)",
                borderWidth: 1,
                borderColor: isCheckedInToday ? "rgba(96, 165, 250, 0.25)" : "rgba(255, 255, 255, 0.05)",
              }}
            />
            
            {/* Main Flame Container Gradient */}
            <LinearGradient
              colors={isCheckedInToday ? ["#3B82F6", "#60A5FA"] : ["#18181B", "#09090B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1.5,
                borderColor: isCheckedInToday ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.08)",
                shadowColor: webTheme.blue,
                shadowOpacity: isCheckedInToday ? 0.45 : 0,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
                elevation: isCheckedInToday ? 12 : 0,
              }}
            >
              <MaterialCommunityIcons
                name="fire"
                size={54}
                color={isCheckedInToday ? "#FFFFFF" : "rgba(255, 255, 255, 0.3)"}
                style={{ marginTop: -3 }}
              />
            </LinearGradient>

            {isCheckedInToday && (
              <View
                style={{
                  position: "absolute",
                  bottom: 18,
                  right: 18,
                  backgroundColor: "#FFFFFF",
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: webTheme.blue,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                }}
              >
                <Feather name="check" size={14} color={webTheme.blue} />
              </View>
            )}
          </View>

          <Text style={{ ...type.black, color: webTheme.text, fontSize: 32, marginTop: 20, textAlign: "center" }}>
            {streakCount} {streakCount === 1 ? "Day" : "Days"}
          </Text>
          <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 13, marginTop: 8, textAlign: "center" }}>
            Longest Active Streak: {longestStreak} days
          </Text>

          {/* Multiplier status bar (Blue Accent) */}
          <View
            style={{
              marginTop: 24,
              backgroundColor: isCheckedInToday ? "rgba(96,165,250,0.08)" : "rgba(96,165,250,0.04)",
              borderWidth: 1,
              borderColor: isCheckedInToday ? "rgba(96,165,250,0.25)" : "rgba(96,165,250,0.12)",
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 10,
              alignSelf: "center",
            }}
          >
            <Text style={{ ...type.bold, color: webTheme.blue, fontSize: 11, letterSpacing: 0.5, textAlign: "center" }}>
              {isCheckedInToday ? "✓ 1.25x EXP BOOST ACTIVE" : "CLAIM CHECK-IN TO ACTIVATE BOOST"}
            </Text>
          </View>

          {/* Claim Button (Blue Accent) */}
          {!isCheckedInToday ? (
            <HapticPressable
              onPress={handleCheckIn}
              hapticType="medium"
              style={{
                width: "90%",
                borderRadius: 20,
                backgroundColor: webTheme.blue,
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 26,
                alignSelf: "center",
                shadowColor: webTheme.blue,
                shadowOpacity: 0.25,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
              }}
            >
              <Text style={{ ...type.bold, color: "#000000", fontSize: 14, textAlign: "center" }}>
                Claim Daily Check-in (+10 Coins)
              </Text>
            </HapticPressable>
          ) : (
            <View
              style={{
                width: "90%",
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 1,
                borderColor: webTheme.border,
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 26,
                alignSelf: "center",
              }}
            >
              <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 13, textAlign: "center" }}>
                Claimed Today
              </Text>
            </View>
          )}
        </SurfaceCard>

        {/* 2. Weekly Calendar Grid (Red Accent Section) */}
        <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, marginTop: 26, marginBottom: 12 }}>
          Weekly Check-in Calendar
        </Text>
        
        <SurfaceCard style={{ paddingHorizontal: 10, paddingVertical: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {currentWeekDays.map((day) => (
              <View key={day.dateStr} style={{ flex: 1, alignItems: "center", gap: 8 }}>
                <Text style={{ ...type.semibold, color: day.isToday ? webTheme.red : webTheme.faint, fontSize: 11 }}>
                  {day.name}
                </Text>
                
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1.5,
                    borderColor: day.isCheckedIn
                      ? webTheme.red
                      : day.isToday
                        ? webTheme.text
                        : "transparent",
                    backgroundColor: day.isCheckedIn
                      ? "rgba(229, 54, 75, 0.08)"
                      : day.isToday
                        ? "rgba(255, 255, 255, 0.04)"
                        : "rgba(0, 0, 0, 0.25)",
                  }}
                >
                  {day.isCheckedIn ? (
                    <MaterialCommunityIcons name="fire" size={18} color={webTheme.red} />
                  ) : day.isToday ? (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: webTheme.text }} />
                  ) : day.isPast ? (
                    <Feather name="minus" size={14} color={webTheme.faint} />
                  ) : (
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: webTheme.border }} />
                  )}
                </View>
              </View>
            ))}
          </View>
        </SurfaceCard>

        {/* 3. Multiplier Perks (Bottom Half - Gold Accent Tiers) */}
        <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, marginTop: 22, marginBottom: 12 }}>
          Active Streak Multipliers
        </Text>
        
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { days: "3 Days", perk: "1.1x EXP", active: streakCount >= 3 },
            { days: "7 Days", perk: "1.25x EXP", active: streakCount >= 7 },
            { days: "15 Days", perk: "1.5x EXP", active: streakCount >= 15 },
          ].map((tier, idx) => (
            <View
              key={idx}
              style={{
                flex: 1,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: tier.active ? webTheme.gold : webTheme.border,
                backgroundColor: tier.active ? "rgba(251, 191, 36, 0.06)" : "transparent",
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name={tier.active ? "shield-check" : "lock-outline"}
                size={16}
                color={tier.active ? webTheme.gold : webTheme.faint}
              />
              <Text style={{ ...type.bold, color: tier.active ? webTheme.text : webTheme.faint, fontSize: 12, marginTop: 6 }}>
                {tier.days}
              </Text>
              <Text style={{ ...type.bold, color: tier.active ? webTheme.gold : webTheme.faint, fontSize: 11, marginTop: 2 }}>
                {tier.perk}
              </Text>
            </View>
          ))}
        </View>

        {/* 4. Streak Freeze (Bottom Half - Gold Accent & Upgraded State) */}
        <SurfaceCard style={{ marginTop: 18, padding: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 15 }}>
                  Streak Saver Freeze
                </Text>
                
                {/* Active Protection Status Badge */}
                {streakFreezes > 0 ? (
                  <View
                    style={{
                      backgroundColor: "rgba(251, 191, 36, 0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(251, 191, 36, 0.25)",
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ ...type.bold, color: webTheme.gold, fontSize: 8, letterSpacing: 0.5 }}>
                      ACTIVE PROTECTION
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(239, 68, 68, 0.25)",
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ ...type.bold, color: "#EF4444", fontSize: 8, letterSpacing: 0.5 }}>
                      UNPROTECTED
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 11, lineHeight: 16 }}>
                Automatically protects your active streak count if you miss checking in for a calendar day.
              </Text>
              <Text style={{ ...type.bold, color: webTheme.gold, fontSize: 12, marginTop: 4 }}>
                Freeze Inventory: {streakFreezes} active
              </Text>
            </View>

            {/* Shield / Snowflake Icon styled in Gold */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "rgba(251, 191, 36, 0.08)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(251, 191, 36, 0.18)",
                marginLeft: 12,
              }}
            >
              <MaterialCommunityIcons name="snowflake" size={24} color={webTheme.gold} />
            </View>
          </View>

          <HapticPressable
            onPress={handleBuyFreeze}
            hapticType="light"
            style={{
              width: "100%",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: webTheme.gold,
              backgroundColor: "rgba(251, 191, 36, 0.06)",
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 14,
            }}
          >
            <Text style={{ ...type.bold, color: webTheme.gold, fontSize: 12 }}>
              Buy Streak Freeze (100 Coins)
            </Text>
          </HapticPressable>
        </SurfaceCard>

        {/* 5. Streak Daily Quests Checklist (Bottom Half - Gold Accent) */}
        <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, marginTop: 22, marginBottom: 12 }}>
          Daily Tasks to Secure Streak
        </Text>

        <SurfaceCard style={{ paddingVertical: 12 }}>
          {[
            {
              id: "checkIn",
              label: "Claim Daily Check-in bonus",
              completed: completedDailyActions.checkIn,
              actionText: "Claim Now",
              action: handleCheckIn,
            },
            {
              id: "quest",
              label: "Complete an active Quest opportunity",
              completed: completedDailyActions.quest,
              actionText: "Quests",
              action: () => handleNavigateAction("/explore", "quest"),
            },
            {
              id: "ai",
              label: "Consult Elev AI System Assistant",
              completed: completedDailyActions.ai,
              actionText: "Consult",
              action: () => handleNavigateAction("/assistant?from=streak", "ai"),
            },
            {
              id: "chat",
              label: "Send a check-in message in Chat",
              completed: completedDailyActions.chat,
              actionText: "Open Chat",
              action: () => handleNavigateAction("/chat", "chat"),
            },
          ].map((task) => (
            <View
              key={task.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderBottomWidth: task.id === "chat" ? 0 : 1,
                borderColor: webTheme.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: task.completed ? webTheme.gold : webTheme.border,
                    backgroundColor: task.completed ? "rgba(251, 191, 36, 0.08)" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {task.completed && <Feather name="check" size={12} color={webTheme.gold} />}
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    ...type.semibold,
                    color: task.completed ? webTheme.faint : webTheme.text,
                    fontSize: 12,
                    textDecorationLine: task.completed ? "line-through" : "none",
                    flex: 1,
                  }}
                >
                  {task.label}
                </Text>
              </View>

              {!task.completed && (
                <Pressable
                  onPress={task.action}
                  style={{
                    backgroundColor: webTheme.inputBg,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ ...type.bold, color: webTheme.gold, fontSize: 9 }}>
                    {task.actionText}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </SurfaceCard>

      </ScrollView>
    </SafeAreaView>
  );
}
