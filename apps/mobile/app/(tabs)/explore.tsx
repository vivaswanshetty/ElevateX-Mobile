import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, Text, TextInput, View, Pressable, Animated, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ScreenHeader";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";
import { SurfaceCard } from "../../components/SurfaceCard";
import { TaskCard } from "../../components/TaskCard";
import { FadeSlideIn } from "../../components/FadeSlideIn";
import { AnimatedList } from "../../components/AnimatedList";
import { HapticPressable } from "../../components/HapticPressable";
import { TaskCardSkeleton } from "../../components/TaskCardSkeleton";
import { api } from "../../lib/api";
import { mapTaskToCard, type TaskCardSource } from "../../lib/tasks";
import { type } from "../../lib/typography";
import { webTheme } from "../../lib/webTheme";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";
import { TabTransitionView } from "../../components/TabTransitionView";
import { getImageUrl, getInitials } from "../../lib/media";
import { useThemeStore } from "../../stores/themeStore";
import { UserAvatar } from "../../components/UserAvatar";

const taskCategories = [
  "All",
  "Development",
  "Design",
  "Marketing",
  "Writing",
  "Data Science",
  "Video & Animation",
  "Music & Audio",
  "Business",
  "Lifestyle",
] as const;

export default function ExploreScreen() {
  const theme = useThemeStore((s) => s.theme);
  const tabBarPadding = useTabBarPadding();
  const [searchMode, setSearchMode] = useState<"tasks" | "members">("tasks");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<(typeof taskCategories)[number]>("All");
  const [isFocused, setIsFocused] = useState(false);
  
  const { data: tasks = [], isFetching } = useQuery<TaskCardSource[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/api/tasks"),
  });

  const { data: searchedUsers = [], isFetching: isFetchingUsers } = useQuery<any[]>({
    queryKey: ["searchedUsers", query, searchMode],
    queryFn: () => {
      const trimmed = query.trim();
      if (trimmed.length > 0) {
        return api.get(`/api/users/search?q=${trimmed}`);
      } else {
        return api.get("/api/users");
      }
    },
    enabled: searchMode === "members",
  });

  const mappedTasks = tasks.map(mapTaskToCard);

  const premiumTasks = mappedTasks.filter((task) => task.rewardCoins >= 45);
  const beginnerTasks = mappedTasks.filter((task) => task.rewardCoins < 45);

  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featuredOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (mappedTasks.length <= 1) return;
    const interval = setInterval(() => {
      Animated.timing(featuredOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setFeaturedIndex((prev) => (prev + 1) % mappedTasks.length);
        Animated.timing(featuredOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [mappedTasks.length]);

  const featuredTask = mappedTasks[featuredIndex] ?? mappedTasks[0];

  const filteredTasks = useMemo(() => {
    return mappedTasks.filter((task) => {
      const matchesCategory = selectedCategory === "All" || task.category === selectedCategory;
      const needle = query.trim().toLowerCase();
      const matchesQuery =
        needle.length === 0 ||
        task.title.toLowerCase().includes(needle) ||
        task.headline.toLowerCase().includes(needle) ||
        task.description.toLowerCase().includes(needle);

      return matchesCategory && matchesQuery;
    });
  }, [mappedTasks, query, selectedCategory]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <TabTransitionView index={1}>
        <ScreenBackdrop accent={webTheme.green} secondaryAccent={webTheme.accent} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: tabBarPadding }}>
        <FadeSlideIn delay={50} distance={10} style={{ width: "100%" }}>
          <ScreenHeader
            eyebrow="Live Market"
            title="Explore"
            badge={searchMode === "tasks" ? "Tasks" : "Members"}
            description={
              searchMode === "tasks"
                ? "Find the perfect gig. Earn coins, gain XP, and level up with work that fits your edge."
                : "Search and connect with other contributors, designers, developers, and creators."
            }
            accent={webTheme.green}
          />
        </FadeSlideIn>

        {/* Segmented Switcher */}
        <FadeSlideIn delay={80} distance={10} style={{ width: "100%" }}>
          <View style={{ 
            flexDirection: "row", 
            backgroundColor: "rgba(255,255,255,0.03)", 
            borderRadius: 16, 
            padding: 4, 
            marginTop: 20,
            borderWidth: 1,
            borderColor: webTheme.border
          }}>
            <Pressable 
              onPress={() => { setQuery(""); setSearchMode("tasks"); }}
              style={{ 
                flex: 1, 
                paddingVertical: 10, 
                alignItems: "center", 
                borderRadius: 12,
                backgroundColor: searchMode === "tasks" ? webTheme.surfaceRaised : "transparent",
                borderWidth: searchMode === "tasks" ? 1 : 0,
                borderColor: searchMode === "tasks" ? webTheme.border : "transparent"
              }}
            >
              <Text style={{ ...type.bold, color: searchMode === "tasks" ? webTheme.text : webTheme.muted, fontSize: 14 }}>
                Tasks
              </Text>
            </Pressable>
            <Pressable 
              onPress={() => { setQuery(""); setSearchMode("members"); }}
              style={{ 
                flex: 1, 
                paddingVertical: 10, 
                alignItems: "center", 
                borderRadius: 12,
                backgroundColor: searchMode === "members" ? webTheme.surfaceRaised : "transparent",
                borderWidth: searchMode === "members" ? 1 : 0,
                borderColor: searchMode === "members" ? webTheme.border : "transparent"
              }}
            >
              <Text style={{ ...type.bold, color: searchMode === "members" ? webTheme.text : webTheme.muted, fontSize: 14 }}>
                Members
              </Text>
            </Pressable>
          </View>
        </FadeSlideIn>

        {/* stat bar */}
        {searchMode === "tasks" && (
          <FadeSlideIn delay={100} distance={14} style={{ width: "100%" }}>
            <SurfaceCard
              style={{ marginTop: 24 }}
              contentStyle={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              {[
                { val: `${mappedTasks.length}`, label: "Active", color: webTheme.text },
                { val: `${premiumTasks.length}`, label: "Premium", color: webTheme.gold },
                { val: `${beginnerTasks.length}`, label: "Starter", color: webTheme.green },
              ].map((stat) => (
                <View key={stat.label} style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ ...type.black, color: stat.color, fontSize: 24 }}>{stat.val}</Text>
                  <Text style={{ ...type.caption, color: webTheme.muted, fontSize: 11 }}>{stat.label}</Text>
                </View>
              ))}
            </SurfaceCard>
          </FadeSlideIn>
        )}

        {/* featured task card */}
        {searchMode === "tasks" && featuredTask ? (
          <FadeSlideIn delay={180} distance={14} style={{ width: "100%" }}>
            <Animated.View style={{ opacity: featuredOpacity }}>
            <HapticPressable hapticType="selection" onPress={() => router.push({ pathname: "/task/[id]", params: { id: featuredTask.id } })}>
              <View style={{ marginTop: 22, borderRadius: 28, padding: 1, overflow: "hidden" }}>
                <LinearGradient
                  colors={["rgba(229,54,75,0.8)", "rgba(139,92,246,0.6)", "rgba(20,20,25,0)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                />
                <View style={{ backgroundColor: webTheme.surface, borderRadius: 27, padding: 22, overflow: "hidden" }}>
                  <LinearGradient
                    colors={theme === "dark" ? ["rgba(139,92,246,0.06)", "transparent"] : ["rgba(139,92,246,0.04)", "transparent"]}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{ position: "absolute", top: 0, right: 0, width: 150, height: 150, borderRadius: 27 }}
                  />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          alignSelf: "flex-start",
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: "rgba(229,54,75,0.4)",
                          backgroundColor: "rgba(229,54,75,0.1)",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          marginBottom: 14,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Feather name="zap" size={10} color={webTheme.accent} />
                        <Text
                          style={{
                            ...type.bold,
                            color: webTheme.accent,
                            fontSize: 10,
                            letterSpacing: 1.4,
                            textTransform: "uppercase",
                          }}
                        >
                          Featured Bounty
                        </Text>
                      </View>
                      <Text style={{ ...type.h2, color: webTheme.text, fontSize: 24, lineHeight: 30 }}>
                        {featuredTask.title}
                      </Text>
                      <Text style={{ ...type.body, marginTop: 10, color: webTheme.muted, fontSize: 13, lineHeight: 20 }} numberOfLines={2}>
                        {featuredTask.description}
                      </Text>
                      
                      <View style={{ marginTop: 18, flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <MaterialCommunityIcons name="star-four-points" size={14} color={webTheme.gold} />
                          <Text style={{ ...type.bold, color: webTheme.gold, fontSize: 12 }}>{featuredTask.rewardCoins} Coins</Text>
                        </View>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: webTheme.border }} />
                        <Text style={{ ...type.semibold, color: webTheme.faint, fontSize: 12 }}>{featuredTask.rewardXp} XP</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </HapticPressable>
            </Animated.View>
            {mappedTasks.length > 1 ? (
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 12 }}>
                {mappedTasks.map((_, i) => (
                  <Pressable key={i} onPress={() => setFeaturedIndex(i)}>
                    <View
                      style={{
                        width: i === featuredIndex ? 18 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: i === featuredIndex ? webTheme.accent : webTheme.border,
                      }}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </FadeSlideIn>
        ) : null}

        {/* search bar */}
        <FadeSlideIn delay={260} distance={14} style={{ width: "100%" }}>
          <View
            style={{
              marginTop: 22,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: isFocused ? webTheme.accent : webTheme.border,
              backgroundColor: webTheme.inputBg,
              paddingHorizontal: 16,
              height: 50,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Feather name="search" size={18} color={isFocused ? webTheme.accent : webTheme.muted} />
            <TextInput
              style={{ ...type.regular, flex: 1, color: webTheme.text, fontSize: 16, backgroundColor: "transparent", padding: 0 }}
              placeholder={searchMode === "tasks" ? "Search tasks..." : "Search members..."}
              placeholderTextColor={webTheme.faint}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")}>
                <Feather name="x-circle" size={18} color={webTheme.muted} />
              </Pressable>
            )}
          </View>
        </FadeSlideIn>

        {/* category pills */}
        {searchMode === "tasks" && (
          <FadeSlideIn delay={340} distance={14}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 16 }}
              contentContainerStyle={{ gap: 10, paddingRight: 16 }}
            >
              {taskCategories.map((category) => {
                const active = category === selectedCategory;
                return (
                  <HapticPressable
                    key={category}
                    hapticType="selection"
                    onPress={() => setSelectedCategory(category)}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? webTheme.accentBorder : webTheme.border,
                      backgroundColor: active ? webTheme.accentSoft : "rgba(255,255,255,0.03)",
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ ...type.bold, color: active ? webTheme.accent : webTheme.muted, fontSize: 13 }}>
                      {category}
                    </Text>
                  </HapticPressable>
                );
              })}
            </ScrollView>
          </FadeSlideIn>
        )}

        {/* results header */}
        {searchMode === "tasks" && (
          <FadeSlideIn delay={400} distance={14}>
            <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ ...type.h2, color: webTheme.text, fontSize: 22 }}>Results</Text>
              <Text style={{ ...type.caption, color: webTheme.muted }}>{filteredTasks.length} tasks</Text>
            </View>
          </FadeSlideIn>
        )}

        {/* task list */}
        {searchMode === "tasks" && (
          <View style={{ marginTop: 16, gap: 14 }}>
            {isFetching && tasks.length === 0 ? (
              <AnimatedList itemStyle={{ width: "100%" }}>
                <TaskCardSkeleton />
                <TaskCardSkeleton />
                <TaskCardSkeleton />
              </AnimatedList>
            ) : filteredTasks.length > 0 ? (
              <AnimatedList baseDelay={250} stagger={60} distance={20} itemStyle={{ width: "100%" }}>
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onPress={() => router.push({ pathname: "/task/[id]", params: { id: task.id } })}
                  />
                ))}
              </AnimatedList>
            ) : (
              <FadeSlideIn delay={150}>
                <SurfaceCard style={{ borderStyle: "dashed" }}>
                  <Text style={{ ...type.h3, color: webTheme.text }}>No exact matches</Text>
                  <Text style={{ ...type.body, marginTop: 8, color: webTheme.muted }}>
                    Adjust the search term or switch the category filter to widen the task pool.
                  </Text>
                </SurfaceCard>
              </FadeSlideIn>
            )}
          </View>
        )}

        {/* members list */}
        {searchMode === "members" && (
          <View style={{ marginTop: 24, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ ...type.h2, color: webTheme.text, fontSize: 22 }}>Members</Text>
              <Text style={{ ...type.caption, color: webTheme.muted }}>{searchedUsers.length} found</Text>
            </View>

            <View style={{ gap: 12 }}>
              {isFetchingUsers ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <ActivityIndicator color={webTheme.accent} />
                </View>
              ) : searchedUsers.length > 0 ? (
                searchedUsers.map((item: any) => {
                  const userLevel = Math.floor((item.xp || 0) / 500) + 1;
                  return (
                    <HapticPressable
                      key={item._id}
                      hapticType="light"
                      onPress={() => router.push({ pathname: "/user/[id]", params: { id: item._id } })}
                    >
                      <SurfaceCard style={{ padding: 14 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <UserAvatar avatar={item.avatar} size={48} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 16 }}>
                              {item.name}
                            </Text>
                            <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, marginTop: 2 }}>
                              @{item.username || "member"} • Level {userLevel}
                            </Text>
                          </View>
                          <Feather name="chevron-right" size={16} color={webTheme.faint} />
                        </View>
                      </SurfaceCard>
                    </HapticPressable>
                  );
                })
              ) : (
                <SurfaceCard style={{ borderStyle: "dashed" }}>
                  <Text style={{ ...type.h3, color: webTheme.text }}>No members found</Text>
                  <Text style={{ ...type.body, marginTop: 8, color: webTheme.muted }}>
                    Try searching for another name or username handle.
                  </Text>
                </SurfaceCard>
              )}
            </View>
          </View>
        )}
      </ScrollView>
      </TabTransitionView>
    </SafeAreaView>
  );
}
