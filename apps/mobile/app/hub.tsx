import { useMemo, useState, useEffect, useRef } from "react";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppStackHeader } from "../components/AppStackHeader";
import { SurfaceCard } from "../components/SurfaceCard";
import { api } from "../lib/api";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";

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

function ToolCard({
  label,
  detail,
  icon,
  accent,
  onPress,
  badge,
}: {
  label: string;
  detail: string;
  icon: "credit-card" | "message-circle" | "bar-chart-2" | "award" | "users" | "zap" | "box" | "activity";
  accent: string;
  onPress?: () => void;
  badge?: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 15,
      mass: 1,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ width: "47%", transform: [{ scale: scaleAnim }] }}>
      <Pressable onPress={onPress} disabled={!onPress} style={{ width: "100%" }}>
        <SurfaceCard>
          <View style={{ position: "relative" }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: `${accent}18`,
                borderWidth: 1,
                borderColor: `${accent}33`,
              }}
            >
              <Feather name={icon} size={18} color={accent} />
            </View>
            {badge !== undefined && badge > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  backgroundColor: accent,
                  borderRadius: 10,
                  width: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: webTheme.bg,
                }}
              >
                <Text style={{ ...type.bold, color: webTheme.bg, fontSize: 10 }}>
                  {badge > 9 ? "9+" : badge}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ ...type.extrabold, color: webTheme.text, fontSize: 17, marginTop: 14 }}>
            {label}
          </Text>
          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, lineHeight: 20, marginTop: 6 }}>
            {detail}
          </Text>
        </SurfaceCard>
      </Pressable>
    </Animated.View>
  );
}

export default function HubScreen() {
  const [search, setSearch] = useState("");

  const analytics = useQuery<AnalyticsResponse>({
    queryKey: ["hubAnalytics"],
    queryFn: () => api.get("/api/analytics/tasks"),
    retry: false,
  });

  const myDuels = useQuery<Duel[]>({
    queryKey: ["hubDuels"],
    queryFn: () => api.get("/api/duels/my"),
  });

  const liveDuels = useQuery<Duel[]>({
    queryKey: ["hubLiveDuels"],
    queryFn: () => api.get("/api/duels/live"),
  });

  const alchemyProfile = useQuery<HubProfile>({
    queryKey: ["hubProfileAlchemy"],
    queryFn: () => api.get("/api/users/profile"),
  });

  const relics = useQuery<Relic[]>({
    queryKey: ["hubRelics"],
    queryFn: () => api.get("/api/alchemy/relics"),
    retry: false,
  });

  const tasks = useQuery<HubTask[]>({
    queryKey: ["hubTasks"],
    queryFn: () => api.get("/api/tasks"),
  });

  const userSearch = useQuery<SearchUser[]>({
    queryKey: ["hubUserSearch", search],
    queryFn: () => api.get(`/api/users/search?q=${encodeURIComponent(search)}`),
    enabled: search.trim().length >= 2,
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <AppStackHeader title="Workspace" detail="Secondary tools, search, duels, analytics, and live systems." hideWorkspaceButton={true} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
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
            tintColor={webTheme.red}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <ToolCard label="Wallet" detail="Balance, deposits, withdrawals, and coin flow." icon="credit-card" accent={webTheme.gold} onPress={() => router.push("/wallet")} />
          <ToolCard label="Chat" detail="Direct messages and user search." icon="message-circle" accent={webTheme.blue} onPress={() => router.push("/chat")} />
          <ToolCard label="Leaderboard" detail="All-time and seasonal performance." icon="award" accent={webTheme.red} onPress={() => router.push("/leaderboard")} />
          <ToolCard label="Feed" detail="Public momentum, wins, and posts." icon="users" accent={webTheme.green} onPress={() => router.push("/feed")} />
          <ToolCard label="Analytics" detail="Creator metrics from the shared backend." icon="bar-chart-2" accent={webTheme.orange} onPress={() => router.push("/analytics")} />
          <ToolCard label="Alchemy Lab" detail="Relics, essences, and crafting paths." icon="box" accent={webTheme.purple} onPress={() => router.push("/alchemy")} />
          <ToolCard label="Duels" detail="Pending challenges and live competitions." icon="zap" accent={webTheme.red} badge={pendingDuels.length} onPress={() => router.push("/duels")} />
          <ToolCard label="Resonance Room" detail="Live task energy, open opportunities, and momentum." icon="activity" accent={webTheme.blue} badge={openTasks} onPress={() => router.push("/resonance")} />
        </View>

        <SurfaceCard style={{ marginTop: 18 }}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
            User Search
          </Text>
          <View
            style={{
              marginTop: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: webTheme.border,
              backgroundColor: "rgba(255,255,255,0.03)",
              paddingHorizontal: 14,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Feather name="search" size={16} color={webTheme.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search people across ElevateX"
              placeholderTextColor="rgba(255,255,255,0.24)"
              style={{ ...type.regular, flex: 1, color: webTheme.text, fontSize: 14 }}
            />
          </View>

          {search.trim().length >= 2 ? (
            <View style={{ marginTop: 14, gap: 10 }}>
              {(userSearch.data || []).slice(0, 5).map((item) => (
                <Pressable
                  key={item._id}
                  onPress={() => router.push({ pathname: "/user/[id]", params: { id: item._id } })}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>{item.name}</Text>
                    <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 4 }}>
                      Level {Math.floor((item.xp || 0) / 500) + 1}
                    </Text>
                  </View>
                  <Feather name="arrow-up-right" size={16} color={webTheme.faint} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </SurfaceCard>

        <Pressable onPress={() => router.push("/analytics")}>
          <SurfaceCard style={{ marginTop: 18 }} accent={webTheme.orange}>
            <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
              Analytics
            </Text>
          <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
            {[
              { label: "Posted", value: analytics.data?.posted.total ?? 0 },
              { label: "Open", value: analytics.data?.posted.open ?? 0 },
              { label: "Completion", value: `${analytics.data?.posted.completionRate ?? 0}%` },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1 }}>
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    padding: 14,
                  }}
                >
                  <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase" }}>
                    {item.label}
                  </Text>
                  <Text style={{ ...type.black, color: webTheme.text, fontSize: 22, marginTop: 8 }}>
                    {item.value}
                  </Text>
                  {item.label === "Completion" && (analytics.data?.posted.completionRate ?? 0) > 0 && (
                    <View style={{ height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                      <View
                        style={{
                          height: "100%",
                          width: `${Math.min(analytics.data?.posted.completionRate ?? 0, 100)}%`,
                          backgroundColor: webTheme.orange,
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
            <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, lineHeight: 22, marginTop: 14 }}>
              Applicants: {analytics.data?.applicants.total ?? 0} total, average {analytics.data?.applicants.average ?? 0} per task. Balance {analytics.data?.coins.balance ?? 0} coins.
            </Text>
          </SurfaceCard>
        </Pressable>

        <Pressable onPress={() => router.push("/duels")}>
          <SurfaceCard style={{ marginTop: 18 }} accent={webTheme.red}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
                Duels
              </Text>
              {pendingDuels.length > 0 && (
                <View
                  style={{
                    backgroundColor: webTheme.red,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ ...type.bold, color: "#FFF", fontSize: 11 }}>
                    {pendingDuels.length} pending
                  </Text>
                </View>
              )}
            </View>
          <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
            {[
              { label: "Pending", value: pendingDuels.length, color: webTheme.red },
              { label: "Active", value: activeDuels.length, color: webTheme.orange },
              { label: "Live", value: (liveDuels.data || []).length, color: webTheme.green },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1 }}>
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    padding: 14,
                  }}
                >
                  <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase" }}>
                    {item.label}
                  </Text>
                  <Text style={{ ...type.black, color: item.value > 0 ? item.color : webTheme.text, fontSize: 22, marginTop: 8 }}>
                    {item.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          {(liveDuels.data || []).slice(0, 2).map((duel) => (
            <View
              key={duel._id}
              style={{
                marginTop: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: webTheme.border,
                backgroundColor: "rgba(255,255,255,0.03)",
                paddingHorizontal: 14,
                paddingVertical: 14,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
                    {duel.challenger?.name || "Unknown"} vs {duel.opponent?.name || "Shadow"}
                  </Text>
                  <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 6 }}>
                    {duel.type} • target {duel.target}
                  </Text>
                </View>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: webTheme.red,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="arrow-right" size={16} color="#FFF" />
                </View>
              </View>
            </View>
          ))}
          </SurfaceCard>
        </Pressable>

        <Pressable onPress={() => router.push("/alchemy")}>
          <SurfaceCard style={{ marginTop: 18 }} accent={webTheme.purple}>
            <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
              Alchemy Lab
            </Text>
          <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
            {[
              { label: "Focus", value: alchemyProfile.data?.essences?.focus ?? 0 },
              { label: "Creativity", value: alchemyProfile.data?.essences?.creativity ?? 0 },
              { label: "Discipline", value: alchemyProfile.data?.essences?.discipline ?? 0 },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1 }}>
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    padding: 14,
                  }}
                >
                  <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase" }}>
                    {item.label}
                  </Text>
                  <Text style={{ ...type.black, color: webTheme.text, fontSize: 22, marginTop: 8 }}>
                    {item.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, lineHeight: 22, marginTop: 14 }}>
            Crafted relics: {alchemyProfile.data?.relics?.length ?? 0}
          </Text>

            {(relics.data || []).slice(0, 2).map((relic) => (
              <View
                key={relic.id}
                style={{
                  marginTop: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: webTheme.border,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>{relic.name}</Text>
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 6 }}>
                {relic.tier} • {relic.bonus}
              </Text>
            </View>
          ))}
          </SurfaceCard>
        </Pressable>

        <SurfaceCard style={{ marginTop: 18 }} accent={webTheme.blue}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
            Resonance Room
          </Text>
          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, lineHeight: 22, marginTop: 10 }}>
            Shared live energy across open tasks, task chat, and completion events. Right now there are{" "}
            <Text style={{ ...type.bold, color: webTheme.blue }}>
              {openTasks}
            </Text>
            {" "}open opportunities ready to generate momentum.
          </Text>
          <Pressable
            onPress={() => router.push("/explore")}
            style={{
              marginTop: 16,
              alignSelf: "flex-start",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={[webTheme.blue, `${webTheme.blue}DD`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 11,
              }}
            >
              <Text style={{ ...type.bold, color: "#FFF", fontSize: 13 }}>
                Open task market →
              </Text>
            </LinearGradient>
          </Pressable>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}
