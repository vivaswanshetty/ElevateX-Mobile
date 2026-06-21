import React, { useMemo, useState, useEffect, useRef } from "react";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  Modal,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { SurfaceCard } from "./SurfaceCard";
import { api } from "../lib/api";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { useThemeStore } from "../stores/themeStore";
import { useControlCenterStore } from "../stores/controlCenterStore";
import { UserAvatar } from "./UserAvatar";
import { LinearGradient } from "expo-linear-gradient";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SearchUser {
  _id: string;
  name: string;
  avatar?: string;
  xp?: number;
}

interface AnalyticsResponse {
  posted: {
    total: number;
    completed: number;
    inProgress: number;
    open: number;
    completionRate: number;
  };
  applicants: {
    total: number;
    average: number;
  };
  coins: {
    totalPosted: number;
    income: number;
    spending: number;
    coinsEarned: number;
    balance: number;
  };
  recentTasks: Array<{
    _id: string;
    title: string;
    status: string;
    coins: number;
    applicants: number;
  }>;
}

interface DuelUser {
  _id: string;
  name: string;
}

interface Duel {
  _id: string;
  type: string;
  status: "pending" | "active" | "completed" | "rejected" | "cancelled";
  target: number;
  challengerProgress?: number;
  opponentProgress?: number;
  challenger?: DuelUser;
  opponent?: DuelUser;
}

interface Relic {
  id: string;
  name: string;
  tier: string;
  bonus: string;
  recipe: {
    focus: number;
    creativity: number;
    discipline: number;
  };
}

interface HubProfile {
  essences?: {
    focus?: number;
    creativity?: number;
    discipline?: number;
  };
  relics?: Array<{
    id: string;
    name: string;
    tier: string;
    bonus: string;
  }>;
}

interface HubTask {
  _id: string;
  status?: string;
}

export function ControlCenterSheet() {
  const { isOpen, close } = useControlCenterStore();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const workspaceFrom = "control_center";

  const analytics = useQuery<AnalyticsResponse>({
    queryKey: ["hubAnalytics"],
    queryFn: () => api.get("/api/analytics/tasks"),
    retry: false,
    enabled: isOpen,
  });

  const myDuels = useQuery<Duel[]>({
    queryKey: ["hubDuels"],
    queryFn: () => api.get("/api/duels/my"),
    enabled: isOpen,
  });

  const liveDuels = useQuery<Duel[]>({
    queryKey: ["hubLiveDuels"],
    queryFn: () => api.get("/api/duels/live"),
    enabled: isOpen,
  });

  const alchemyProfile = useQuery<HubProfile>({
    queryKey: ["hubProfileAlchemy"],
    queryFn: () => api.get("/api/users/profile"),
    enabled: isOpen,
  });

  const relics = useQuery<Relic[]>({
    queryKey: ["hubRelics"],
    queryFn: () => api.get("/api/alchemy/relics"),
    retry: false,
    enabled: isOpen,
  });

  const tasks = useQuery<HubTask[]>({
    queryKey: ["hubTasks"],
    queryFn: () => api.get("/api/tasks"),
    enabled: isOpen,
  });

  const userSearch = useQuery<SearchUser[]>({
    queryKey: ["hubUserSearch", search],
    queryFn: () => api.get(`/api/users/search?q=${encodeURIComponent(search)}`),
    enabled: isOpen && search.trim().length >= 2,
  });

  const pendingDuels = (myDuels.data || []).filter((item) => item.status === "pending");
  const activeDuels = (myDuels.data || []).filter((item) => item.status === "active");
  const openTasks = useMemo(
    () => (tasks.data || []).filter((item) => item.status === "Open").length,
    [tasks.data],
  );

  const refreshing =
    analytics.isFetching ||
    myDuels.isFetching ||
    liveDuels.isFetching ||
    alchemyProfile.isFetching ||
    relics.isFetching;

  const handleNavigate = (route: string) => {
    close();
    router.navigate(route as any);
  };

  const focusVal = alchemyProfile.data?.essences?.focus ?? 0;
  const creativityVal = alchemyProfile.data?.essences?.creativity ?? 0;
  const disciplineVal = alchemyProfile.data?.essences?.discipline ?? 0;

  let aiAdvice = "Your character essences are perfectly balanced. Enter the quest arena to maintain your alignment.";
  if (focusVal <= creativityVal && focusVal <= disciplineVal) {
    aiAdvice = "Focus essence is currently lagging. Crafting relics or starting Pomodoro sessions will restore focus balance.";
  } else if (creativityVal <= focusVal && creativityVal <= disciplineVal) {
    aiAdvice = "Creativity levels are low. Participate in community events or share a dynamic update to boost it.";
  } else if (disciplineVal <= focusVal && disciplineVal <= creativityVal) {
    aiAdvice = "Discipline is dropping. Finish pending daily task objectives to keep active streaks going.";
  }

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="slide"
      onRequestClose={close}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
        {/* Transparent dismiss backdrop */}
        <Pressable style={{ flex: 1 }} onPress={close} />

        {/* The Bottom Sheet Panel */}
        <View
          style={{
            height: SCREEN_HEIGHT * 0.85,
            backgroundColor: webTheme.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: webTheme.border,
            overflow: "hidden",
          }}
        >
          {/* Header & Drag Handle */}
          <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 }}>
            <View
              style={{
                width: 38,
                height: 5,
                borderRadius: 3,
                backgroundColor: webTheme.border,
                alignSelf: "center",
                marginBottom: 14,
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ ...type.bold, color: webTheme.accent, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>
                  ElevateX System
                </Text>
                <Text style={{ ...type.extrabold, color: webTheme.text, fontSize: 20, marginTop: 2, letterSpacing: 0.5 }}>
                  LOBBY
                </Text>
              </View>
              <Pressable
                onPress={close}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: webTheme.inputBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="x" size={16} color={webTheme.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  analytics.refetch();
                  myDuels.refetch();
                  liveDuels.refetch();
                  alchemyProfile.refetch();
                  relics.refetch();
                  tasks.refetch();
                }}
                tintColor={webTheme.accent}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* 1. USER SEARCH (REDESIGNED) */}
            <SurfaceCard style={{ marginTop: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ ...type.black, color: webTheme.text, fontSize: 18 }}>
                  User Search
                </Text>
                <Feather name="users" size={16} color={webTheme.faint} />
              </View>
              
              <View
                style={{
                  marginTop: 12,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: isFocused ? webTheme.accent : webTheme.border,
                  backgroundColor: webTheme.inputBg,
                  paddingHorizontal: 16,
                  height: 46,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Feather name="search" size={16} color={isFocused ? webTheme.accent : webTheme.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Search peers across ElevateX"
                  placeholderTextColor={webTheme.faint}
                  style={{ ...type.regular, flex: 1, color: webTheme.text, fontSize: 14, backgroundColor: "transparent", padding: 0 }}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch("")} style={{ padding: 4 }}>
                    <Feather name="x-circle" size={16} color={webTheme.muted} />
                  </Pressable>
                )}
              </View>

              {search.trim().length >= 2 ? (
                <View style={{ marginTop: 14, gap: 8 }}>
                  {(userSearch.data || []).slice(0, 5).map((item) => (
                    <Pressable
                      key={item._id}
                      onPress={() => handleNavigate(`/user/${item._id}`)}
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: webTheme.border,
                        backgroundColor: webTheme.cardBg,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <UserAvatar avatar={item.avatar} size={36} borderWidth={1} borderColor={webTheme.border} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 11, marginTop: 2 }}>
                          Level {Math.floor((item.xp || 0) / 500) + 1}
                        </Text>
                      </View>
                      
                      <View
                        style={{
                          backgroundColor: `${webTheme.accent}12`,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: `${webTheme.accent}20`,
                        }}
                      >
                        <Text style={{ ...type.bold, color: webTheme.accent, fontSize: 10 }}>
                          {item.xp || 0} XP
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={14} color={webTheme.faint} />
                    </Pressable>
                  ))}
                  {(!userSearch.data || userSearch.data.length === 0) && !userSearch.isLoading && (
                    <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 12, textAlign: "center", marginTop: 8 }}>
                      No peers found for "{search}"
                    </Text>
                  )}
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingHorizontal: 4 }}>
                  <Feather name="info" size={12} color={webTheme.faint} />
                  <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 11 }}>
                    Enter at least 2 characters to search the global directory.
                  </Text>
                </View>
              )}
            </SurfaceCard>

            {/* 2. LOBBY PILLARS */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 18 }}>
              {[
                {
                  label: "Alchemy Lab",
                  detail: "Forge Relics",
                  icon: "flask-outline",
                  accent: webTheme.purple,
                  route: `/alchemy?from=${workspaceFrom}`,
                },
                {
                  label: "Leaderboard",
                  detail: "Climb Ranks",
                  icon: "trophy-outline",
                  accent: webTheme.red,
                  route: `/leaderboard?from=${workspaceFrom}`,
                },
                {
                  label: "Resonance",
                  detail: "Enter Portal",
                  icon: "atom",
                  accent: webTheme.blue,
                  route: `/resonance?from=${workspaceFrom}`,
                },
              ].map((pillar) => (
                <Pressable
                  key={pillar.label}
                  onPress={() => handleNavigate(pillar.route)}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: `${pillar.accent}20`,
                    backgroundColor: `${pillar.accent}08`,
                    padding: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 100,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: `${pillar.accent}14`,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: `${pillar.accent}24`,
                      marginBottom: 8,
                    }}
                  >
                    <MaterialCommunityIcons name={pillar.icon as any} size={18} color={pillar.accent} />
                  </View>
                  <Text style={{ ...type.bold, color: webTheme.text, fontSize: 11, textAlign: "center" }} numberOfLines={1}>
                    {pillar.label}
                  </Text>
                  <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 9, marginTop: 2, textAlign: "center" }} numberOfLines={1}>
                    {pillar.detail}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* 3. ELEV AI (REDESIGNED WITH LOGO INTEGRATION) */}
            <SurfaceCard style={{ marginTop: 18 }} tone="danger">
              <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
                <View style={{ width: 50, height: 50, position: "relative" }}>
                  <LinearGradient
                    colors={["#E5364B", "#8B5CF6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialCommunityIcons name="robot" size={26} color="#FFFFFF" />
                  </LinearGradient>
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: "#34D399",
                      borderWidth: 2,
                      borderColor: webTheme.bg,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 16 }}>Elev AI</Text>
                    <View
                      style={{
                        backgroundColor: "rgba(229,54,75,0.08)",
                        borderWidth: 1,
                        borderColor: "rgba(229,54,75,0.2)",
                        borderRadius: 8,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ ...type.bold, color: webTheme.accent, fontSize: 9 }}>ONLINE</Text>
                    </View>
                  </View>
                  <Text style={{ ...type.regular, color: webTheme.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
                    {aiAdvice}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 14 }}>
                <Pressable
                  onPress={() => handleNavigate(`/assistant?from=${workspaceFrom}`)}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: webTheme.accent,
                    backgroundColor: "rgba(229,54,75,0.08)",
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text style={{ ...type.bold, color: webTheme.accent, fontSize: 11 }}>Consult AI</Text>
                  <Feather name="arrow-right" size={12} color={webTheme.accent} />
                </Pressable>
              </View>
            </SurfaceCard>

            {/* 4. UTILITIES DECK */}
            <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 20, marginBottom: 10 }}>
              Utilities
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 20 }}
              style={{ marginBottom: 4 }}
            >
              {[
                { label: "Wallet", detail: `${analytics.data?.coins.balance ?? 0} Coins`, icon: "credit-card", accent: webTheme.gold, route: `/wallet?from=${workspaceFrom}` },
                { label: "Analytics Desk", detail: "Task completion metrics", icon: "bar-chart-2", accent: webTheme.orange, route: `/analytics?from=${workspaceFrom}` },
              ].map((tool, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleNavigate(tool.route)}
                  style={{
                    width: 140,
                    backgroundColor: webTheme.cardBg,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    borderRadius: 14,
                    padding: 12,
                    justifyContent: "space-between",
                    height: 98,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: `${tool.accent}12`,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: `${tool.accent}24`,
                    }}
                  >
                    <Feather name={tool.icon as any} size={14} color={tool.accent} />
                  </View>
                  <View>
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12 }} numberOfLines={1}>{tool.label}</Text>
                    <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 10, marginTop: 1 }} numberOfLines={1}>{tool.detail}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {/* 5. HERO STATUS CARD */}
            <SurfaceCard accent={webTheme.purple} style={{ marginTop: 18 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ ...type.black, color: webTheme.text, fontSize: 18 }}>
                  Hero Status
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: `${webTheme.purple}14`,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 10,
                  }}
                >
                  <MaterialCommunityIcons name="shield-sun" size={12} color={webTheme.purple} />
                  <Text style={{ ...type.bold, color: webTheme.purple, fontSize: 10 }}>
                    Level {Math.floor(((alchemyProfile.data?.essences?.focus ?? 0) + (alchemyProfile.data?.essences?.creativity ?? 0) + (alchemyProfile.data?.essences?.discipline ?? 0)) / 150) + 1}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 10, marginTop: 14 }}>
                {[
                  { label: "Focus", value: alchemyProfile.data?.essences?.focus ?? 0, color: webTheme.purple, icon: "lightning-bolt" },
                  { label: "Creativity", value: alchemyProfile.data?.essences?.creativity ?? 0, color: webTheme.orange, icon: "palette" },
                  { label: "Discipline", value: alchemyProfile.data?.essences?.discipline ?? 0, color: webTheme.green, icon: "shield-check" },
                ].map((essence) => (
                  <View key={essence.label}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <MaterialCommunityIcons name={essence.icon as any} size={12} color={essence.color} />
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12 }}>{essence.label}</Text>
                      </View>
                      <Text style={{ ...type.bold, color: essence.color, fontSize: 12 }}>{essence.value} EXP</Text>
                    </View>
                    <View style={{ height: 5, backgroundColor: webTheme.inputBg, borderRadius: 2.5, overflow: "hidden" }}>
                      <View style={{ height: "100%", width: `${Math.min((essence.value / 100) * 100, 100)}%`, backgroundColor: essence.color }} />
                    </View>
                  </View>
                ))}
              </View>

              <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 14, marginBottom: 8 }}>
                Equipped Relics
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                {[0, 1, 2].map((index) => {
                  const relic = alchemyProfile.data?.relics?.[index];
                  if (relic) {
                    return (
                      <Pressable
                        key={relic.id || index}
                        onPress={() => handleNavigate(`/alchemy?from=${workspaceFrom}`)}
                        style={{
                          flex: 1,
                          height: 60,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: webTheme.purple,
                          backgroundColor: "rgba(139, 92, 246, 0.06)",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 4,
                        }}
                      >
                        <MaterialCommunityIcons name="diamond-stone" size={16} color={webTheme.purple} />
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 9, marginTop: 2, textAlign: "center" }} numberOfLines={1}>
                          {relic.name}
                        </Text>
                      </Pressable>
                    );
                  }
                  return (
                    <Pressable
                      key={index}
                      onPress={() => handleNavigate(`/alchemy?from=${workspaceFrom}`)}
                      style={{
                        flex: 1,
                        height: 60,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: webTheme.border,
                        backgroundColor: "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="plus" size={12} color={webTheme.faint} />
                      <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 8, marginTop: 2 }}>
                        Empty
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SurfaceCard>

            {/* DUELS MATCHUP ARENA */}
            {activeDuels.length > 0 ? (
              (() => {
                const activeDuel = activeDuels[0];
                const challengerVal = activeDuel.challengerProgress ?? 0;
                const opponentVal = activeDuel.opponentProgress ?? 0;
                const targetVal = activeDuel.target || 1;
                const progressRatio = challengerVal / (challengerVal + opponentVal || 1);

                return (
                  <Pressable onPress={() => handleNavigate(`/duels?from=${workspaceFrom}`)}>
                    <SurfaceCard style={{ marginTop: 18 }} accent={webTheme.red}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <Text style={{ ...type.black, color: webTheme.text, fontSize: 16 }}>
                          Active Duel Arena
                        </Text>
                        <View style={{ backgroundColor: webTheme.red, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ ...type.bold, color: "#FFF", fontSize: 9 }}>LIVE</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 6 }}>
                        <View style={{ flex: 1, alignItems: "center" }}>
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12, textAlign: "center" }} numberOfLines={1}>
                            {activeDuel.challenger?.name || "You"}
                          </Text>
                          <Text style={{ ...type.black, color: webTheme.red, fontSize: 18, marginTop: 2 }}>
                            {challengerVal}
                          </Text>
                          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 9 }}>Progress</Text>
                        </View>

                        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(229,54,75,0.12)", alignItems: "center", justifyContent: "center", marginHorizontal: 6 }}>
                          <Text style={{ ...type.black, color: webTheme.red, fontSize: 10 }}>VS</Text>
                        </View>

                        <View style={{ flex: 1, alignItems: "center" }}>
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12, textAlign: "center" }} numberOfLines={1}>
                            {activeDuel.opponent?.name || "Opponent"}
                          </Text>
                          <Text style={{ ...type.black, color: webTheme.muted, fontSize: 18, marginTop: 2 }}>
                            {opponentVal}
                          </Text>
                          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 9 }}>Progress</Text>
                        </View>
                      </View>

                      <View style={{ height: 5, backgroundColor: webTheme.inputBg, borderRadius: 2.5, overflow: "hidden", marginVertical: 8 }}>
                        <View style={{ height: "100%", width: `${progressRatio * 100}%`, backgroundColor: webTheme.red }} />
                      </View>

                      <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 10, textAlign: "center", textTransform: "uppercase", letterSpacing: 1 }}>
                        Target: {targetVal} Tasks
                      </Text>
                    </SurfaceCard>
                  </Pressable>
                );
              })()
            ) : (
              <Pressable onPress={() => handleNavigate(`/duels?from=${workspaceFrom}`)}>
                <SurfaceCard style={{ marginTop: 18 }} accent={webTheme.red}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Text style={{ ...type.black, color: webTheme.text, fontSize: 16 }}>
                      Duel Arena
                    </Text>
                    <Feather name="zap" size={14} color={webTheme.red} />
                  </View>
                  <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, lineHeight: 18 }}>
                    No active focus duel. Challenge a teammate to dynamic execution matches and earn extra essences.
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <View style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: webTheme.border, backgroundColor: webTheme.inputBg, paddingVertical: 6, paddingHorizontal: 10, justifyContent: "center" }}>
                      <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 11 }}>Lobby idle...</Text>
                    </View>
                    <View style={{ backgroundColor: webTheme.red, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ ...type.bold, color: "#FFF", fontSize: 11 }}>Battle →</Text>
                    </View>
                  </View>
                </SurfaceCard>
              </Pressable>
            )}

            {/* LIVE QUEST BOARD */}
            <SurfaceCard style={{ marginTop: 18 }} accent={webTheme.orange}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: webTheme.green }} />
                  <Text style={{ ...type.black, color: webTheme.text, fontSize: 16 }}>Live Quest Board</Text>
                </View>
                <View style={{ backgroundColor: `${webTheme.orange}14`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ ...type.bold, color: webTheme.orange, fontSize: 10 }}>{openTasks} open</Text>
                </View>
              </View>
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>
                Multiple resonance quests are open in the task market. Claim them to earn coin bounties.
              </Text>
              <Pressable
                onPress={() => handleNavigate("/explore")}
                style={{
                  marginTop: 10,
                  alignSelf: "flex-start",
                  borderRadius: 16,
                  backgroundColor: webTheme.orange,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ ...type.bold, color: "#FFF", fontSize: 11 }}>Browse Quests →</Text>
              </Pressable>
            </SurfaceCard>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
