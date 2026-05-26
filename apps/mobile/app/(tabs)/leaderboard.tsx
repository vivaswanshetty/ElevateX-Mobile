import { useMemo, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppStackHeader } from "../../components/AppStackHeader";
import { SurfaceCard } from "../../components/SurfaceCard";
import { EmptyState } from "../../components/EmptyState";
import { type } from "../../lib/typography";
import { webTheme } from "../../lib/webTheme";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../lib/api";
import { useThemeStore } from "../../stores/themeStore";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";

interface LeaderboardUser {
  _id: string;
  name: string;
  username?: string;
  xp?: number;
  coins?: number;
  level?: number;
  seasonXP?: number;
  seasonCoins?: number;
  seasonTasksCompleted?: number;
}

interface CurrentSeasonResponse {
  season: {
    number: number;
    name: string;
    theme?: string;
    endDate?: string;
  } | null;
  leaderboard: LeaderboardUser[];
}

export default function LeaderboardScreen() {
  const theme = useThemeStore((s) => s.theme);
  const currentUser = useAuthStore((state) => state.user);
  const [mode, setMode] = useState<"alltime" | "season">("alltime");
  const [sortBy, setSortBy] = useState<"xp" | "coins" | "level">("xp");
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const allTime = useQuery<LeaderboardUser[]>({
    queryKey: ["leaderboard", sortBy],
    queryFn: () => api.get(`/api/users/leaderboard?sort=${sortBy}`),
  });

  const season = useQuery<CurrentSeasonResponse>({
    queryKey: ["seasonLeaderboard"],
    queryFn: () => api.get("/api/seasons/current"),
  });

  const activeRows = mode === "season" ? season.data?.leaderboard || [] : allTime.data || [];
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return activeRows;

    return activeRows.filter((item) => {
      return item.name?.toLowerCase().includes(needle) || item.username?.toLowerCase().includes(needle);
    });
  }, [activeRows, query]);

  const topThree = filteredRows.slice(0, 3);
  const rest = filteredRows.slice(3);

  const tabBarPadding = useTabBarPadding();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <AppStackHeader title="Leaderboard" detail="All-time and season performance from the web backend." />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBarPadding }}
        refreshControl={
          <RefreshControl
            refreshing={allTime.isFetching || season.isFetching}
            onRefresh={() => {
              allTime.refetch();
              season.refetch();
            }}
            tintColor={webTheme.red}
          />
        }
      >
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { key: "alltime", label: "All-time" },
            { key: "season", label: "Season" },
          ].map((item) => {
            const active = mode === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setMode(item.key as typeof mode)}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? "rgba(229,54,75,0.3)" : webTheme.border,
                  backgroundColor: active ? "rgba(229,54,75,0.12)" : webTheme.cardBg,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ ...type.bold, color: active ? webTheme.red : webTheme.text, fontSize: 12 }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === "alltime" ? (
          <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
            {[
              { key: "xp", label: "XP" },
              { key: "coins", label: "Coins" },
              { key: "level", label: "Level" },
            ].map((item) => {
              const active = sortBy === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setSortBy(item.key as typeof sortBy)}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "rgba(251,146,60,0.3)" : webTheme.border,
                    backgroundColor: active ? "rgba(251,146,60,0.12)" : webTheme.cardBg,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ ...type.bold, color: active ? webTheme.orange : webTheme.muted, fontSize: 12 }}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {mode === "season" && season.data?.season ? (
          <SurfaceCard style={{ marginTop: 16 }} accent={webTheme.orange}>
            <Text style={{ ...type.bold, color: webTheme.orange, fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>
              Season {season.data.season.number}
            </Text>
            <Text style={{ ...type.black, color: webTheme.text, fontSize: 24, marginTop: 8 }}>
              {season.data.season.name}
            </Text>
            {season.data.season.theme ? (
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, marginTop: 8 }}>
                {season.data.season.theme}
              </Text>
            ) : null}
          </SurfaceCard>
        ) : null}

        <View
          style={{
            marginTop: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isFocused ? webTheme.accent : webTheme.border,
            backgroundColor: webTheme.inputBg,
            paddingHorizontal: 16,
            height: 50,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Feather name="search" size={16} color={isFocused ? webTheme.accent : webTheme.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search members"
            placeholderTextColor={webTheme.faint}
            style={{ ...type.regular, flex: 1, color: webTheme.text, fontSize: 14, backgroundColor: "transparent", padding: 0 }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x-circle" size={16} color={webTheme.muted} />
            </Pressable>
          )}
        </View>

        {filteredRows.length === 0 && !allTime.isFetching && !season.isFetching && (
          <EmptyState
            icon="users"
            title="No members found"
            description="We couldn't find anyone matching your search or there is no data to display yet."
            actionLabel={query ? "Clear Search" : undefined}
            onAction={query ? () => setQuery("") : undefined}
          />
        )}

        <View style={{ marginTop: 18, gap: 12 }}>
          {topThree.map((item, index) => {
            const rank = index + 1;
            const value =
              mode === "season"
                ? item.seasonXP || 0
                : sortBy === "coins"
                  ? item.coins || 0
                  : sortBy === "level"
                    ? item.level || Math.floor((item.xp || 0) / 500) + 1
                    : item.xp || 0;

            return (
              <Pressable key={item._id} onPress={() => router.push({ pathname: "/user/[id]", params: { id: item._id } })}>
                <SurfaceCard accent={rank === 1 ? webTheme.gold : undefined}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        rank === 1
                          ? "rgba(234,179,8,0.14)"
                          : rank === 2
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(251,146,60,0.12)",
                    }}
                  >
                    {rank === 1 ? (
                      <MaterialCommunityIcons name="crown-outline" size={18} color={webTheme.gold} />
                    ) : (
                      <Text style={{ ...type.black, color: webTheme.text, fontSize: 16 }}>{rank}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...type.extrabold, color: webTheme.text, fontSize: 16 }}>{item.name}</Text>
                    <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 4 }}>
                      @{item.username || item.name.toLowerCase().replace(/\s+/g, "_")}
                    </Text>
                  </View>
                  <Text style={{ ...type.black, color: webTheme.red, fontSize: 20 }}>{value.toLocaleString()}</Text>
                  </View>
                </SurfaceCard>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 20, gap: 12 }}>
          {rest.map((item, index) => {
            const rank = index + 4;
            const highlighted = item._id === currentUser?.id;
            const value =
              mode === "season"
                ? item.seasonXP || 0
                : sortBy === "coins"
                  ? item.coins || 0
                  : sortBy === "level"
                    ? item.level || Math.floor((item.xp || 0) / 500) + 1
                    : item.xp || 0;

            return (
              <Pressable key={item._id} onPress={() => router.push({ pathname: "/user/[id]", params: { id: item._id } })}>
                <SurfaceCard
                  style={{
                    backgroundColor: highlighted ? "#101010" : webTheme.surface,
                    borderColor: highlighted ? "rgba(214,60,71,0.26)" : webTheme.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 12 }}>#{rank}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...type.extrabold, color: webTheme.text, fontSize: 15 }}>{item.name}</Text>
                    <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 4 }}>
                      {mode === "season"
                        ? `${item.seasonTasksCompleted || 0} season tasks`
                        : `${Math.floor((item.xp || 0) / 500) + 1} level`}
                    </Text>
                  </View>
                  <Text style={{ ...type.black, color: webTheme.text, fontSize: 18 }}>{value.toLocaleString()}</Text>
                  </View>
                </SurfaceCard>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
