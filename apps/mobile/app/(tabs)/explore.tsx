import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Feather, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { ScrollView, Text, TextInput, View, Pressable, Animated, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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

const categoryConfig: Record<string, { icon: string; color: string; desc: string }> = {
  Development: { icon: "code", color: "#60A5FA", desc: "Apps, sites, APIs, integrations" },
  Design: { icon: "feather", color: "#8B5CF6", desc: "UI/UX, branding, graphic design" },
  Marketing: { icon: "trending-up", color: "#FB923C", desc: "Growth, social media, ads, SEO" },
  Writing: { icon: "edit-3", color: "#34D399", desc: "Copy, technical docs, translations" },
  "Data Science": { icon: "database", color: "#A78BFA", desc: "Analytics, models, data pipelines" },
  "Video & Animation": { icon: "video", color: "#E5364B", desc: "Editing, animation, motion design" },
  "Music & Audio": { icon: "music", color: "#FBBF24", desc: "Sound design, voiceovers, mixing" },
  Business: { icon: "briefcase", color: "#34D399", desc: "Consulting, sheets, strategies" },
  Lifestyle: { icon: "heart", color: "#FB923C", desc: "Fitness, advice, coaching, personal" },
};

const trendingSearches = ["Next.js", "Figma", "UI/UX", "Copywriting", "AI Agent", "SEO"];

export default function ExploreScreen() {
  const theme = useThemeStore((s) => s.theme);
  const tabBarPadding = useTabBarPadding();
  const params = useLocalSearchParams<{ focus?: string; category?: string; q?: string }>();

  const [searchMode, setSearchMode] = useState<"tasks" | "members">("tasks");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<(typeof taskCategories)[number]>("All");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

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

  // Handle route params redirection from Home screen
  useEffect(() => {
    if (params.q) {
      setQuery(params.q);
    }
    if (params.category && taskCategories.includes(params.category as any)) {
      setSelectedCategory(params.category as any);
      setSearchMode("tasks");
    }
    if (params.focus === "true") {
      setSearchMode("tasks");
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [params.q, params.category, params.focus]);

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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mappedTasks.forEach((task) => {
      if (task.category) {
        counts[task.category] = (counts[task.category] || 0) + 1;
      }
    });
    return counts;
  }, [mappedTasks]);

  const isBrowsingEmptyState = query.trim() === "" && selectedCategory === "All";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <TabTransitionView index={1}>
        <ScreenBackdrop accent={webTheme.green} secondaryAccent={webTheme.accent} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: tabBarPadding }}>
          <FadeSlideIn delay={50} distance={10} style={{ width: "100%" }}>
            <ScreenHeader
              showBackButton={true}
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
                onPress={() => { setQuery(""); setSearchMode("tasks"); setSelectedCategory("All"); }}
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

          {/* Search input bar */}
          <FadeSlideIn delay={110} distance={14} style={{ width: "100%" }}>
            <View
              style={{
                marginTop: 22,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: isFocused ? webTheme.accent : webTheme.border,
                backgroundColor: isFocused ? "rgba(255,255,255,0.02)" : webTheme.inputBg,
                paddingHorizontal: 16,
                height: 52,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                shadowColor: isFocused ? webTheme.accent : "transparent",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <Feather name="search" size={18} color={isFocused ? webTheme.accent : webTheme.muted} />
              <TextInput
                ref={inputRef}
                style={{
                  ...type.regular,
                  flex: 1,
                  color: webTheme.text,
                  fontSize: 15,
                  backgroundColor: "transparent",
                  height: "100%",
                  paddingVertical: 0,
                  paddingHorizontal: 0,
                }}
                multiline={false}
                placeholder={searchMode === "tasks" ? "Search tasks, technologies, or keywords..." : "Search members..."}
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

          {/* Trending keywords tags */}
          {searchMode === "tasks" && (
            <FadeSlideIn delay={130} distance={10} style={{ width: "100%" }}>
              <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 11, marginRight: 2 }}>Trending:</Text>
                {trendingSearches.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setQuery(item);
                    }}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ ...type.semibold, color: webTheme.textSecondary, fontSize: 11 }}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </FadeSlideIn>
          )}

          {/* TASK SEARCH MODE */}
          {searchMode === "tasks" && (
            <>
              {/* Category Pills (Visible when actively filtering/searching) */}
              {!isBrowsingEmptyState && (
                <FadeSlideIn delay={150} distance={10}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 20 }}
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

              {/* BROWSING EMPTY STATE (No query, category "All") */}
              {isBrowsingEmptyState && (
                <>
                  {/* Featured Bounty Showcase */}
                  {featuredTask ? (
                    <FadeSlideIn delay={170} distance={14} style={{ width: "100%" }}>
                      <Animated.View style={{ opacity: featuredOpacity }}>
                        <HapticPressable hapticType="selection" onPress={() => router.push({ pathname: "/task/[id]", params: { id: featuredTask.id } })}>
                          <View style={{ marginTop: 24, borderRadius: 20, padding: 1, overflow: "hidden" }}>
                            <LinearGradient
                              colors={["rgba(229,54,75,0.7)", "rgba(139,92,246,0.5)", "rgba(20,20,25,0)"]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                            />
                            <View style={{ backgroundColor: "rgba(13, 13, 16, 0.95)", borderRadius: 19, padding: 22, overflow: "hidden" }}>
                              {/* Glowing Backdrop Gradients */}
                              <LinearGradient
                                colors={["rgba(229,54,75,0.18)", "rgba(139,92,246,0.12)", "transparent"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                              />
                              <LinearGradient
                                colors={["rgba(0,240,255,0.06)", "transparent"]}
                                start={{ x: 1, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={{ position: "absolute", top: 0, right: 0, width: 180, height: 180, borderRadius: 19 }}
                              />
                              
                              <View style={{ gap: 14 }}>
                                {/* Top Badges Row */}
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <View
                                      style={{
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: "rgba(229,54,75,0.45)",
                                        backgroundColor: "rgba(229,54,75,0.14)",
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 5,
                                        shadowColor: "#E5364B",
                                        shadowOpacity: 0.3,
                                        shadowRadius: 6,
                                      }}
                                    >
                                      <Feather name="zap" size={10} color={webTheme.accent} />
                                      <Text
                                        style={{
                                          fontFamily: "Outfit_700Bold",
                                          color: webTheme.accent,
                                          fontSize: 9,
                                          letterSpacing: 1.4,
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        Featured Bounty
                                      </Text>
                                    </View>

                                    {/* Category tag */}
                                    <View
                                      style={{
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: "rgba(139,92,246,0.3)",
                                        backgroundColor: "rgba(139,92,246,0.08)",
                                        paddingHorizontal: 10,
                                        paddingVertical: 5,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontFamily: "Outfit_600SemiBold",
                                          color: webTheme.purple,
                                          fontSize: 9,
                                          letterSpacing: 0.8,
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        {featuredTask.category}
                                      </Text>
                                    </View>
                                  </View>

                                  {/* Difficulty Badge */}
                                  {(() => {
                                    const diff = (featuredTask.difficulty || "").toLowerCase().trim();
                                    let diffColor = webTheme.text;
                                    let diffBorder = webTheme.border;
                                    let diffBg = "rgba(255,255,255,0.03)";

                                    if (diff === "easy") {
                                      diffColor = webTheme.green;
                                      diffBorder = "rgba(52,211,153,0.25)";
                                      diffBg = "rgba(52,211,153,0.08)";
                                    } else if (diff === "medium") {
                                      diffColor = webTheme.orange;
                                      diffBorder = "rgba(251,146,60,0.25)";
                                      diffBg = "rgba(251,146,60,0.08)";
                                    } else if (diff === "hard" || diff === "expert") {
                                      diffColor = webTheme.accent;
                                      diffBorder = "rgba(229,54,75,0.25)";
                                      diffBg = "rgba(229,54,75,0.08)";
                                    }

                                    return (
                                      <View
                                        style={{
                                          borderRadius: 10,
                                          borderWidth: 1,
                                          borderColor: diffBorder,
                                          backgroundColor: diffBg,
                                          paddingHorizontal: 8,
                                          paddingVertical: 4,
                                        }}
                                      >
                                        <Text style={{ fontFamily: "Outfit_700Bold", color: diffColor, fontSize: 9, textTransform: "uppercase" }}>
                                          {featuredTask.difficulty}
                                        </Text>
                                      </View>
                                    );
                                  })()}
                                </View>

                                {/* Title & Description */}
                                <View style={{ gap: 6 }}>
                                  <Text style={{ fontFamily: "Outfit_700Bold", color: webTheme.text, fontSize: 24, lineHeight: 30 }}>
                                    {featuredTask.title}
                                  </Text>
                                  <Text style={{ ...type.body, color: webTheme.muted, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
                                    {featuredTask.description}
                                  </Text>
                                </View>

                                {/* Divider line */}
                                <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 4 }} />

                                {/* Reward Capsules Row */}
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                  {/* Coins */}
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 6,
                                      borderRadius: 12,
                                      borderWidth: 1,
                                      borderColor: "rgba(251,191,36,0.25)",
                                      backgroundColor: "rgba(251,191,36,0.08)",
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                    }}
                                  >
                                    <FontAwesome5 name="coins" size={11} color={webTheme.gold} />
                                    <Text style={{ fontFamily: "Outfit_700Bold", color: webTheme.gold, fontSize: 12 }}>
                                      {featuredTask.rewardCoins} Coins
                                    </Text>
                                  </View>

                                  {/* XP */}
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 6,
                                      borderRadius: 12,
                                      borderWidth: 1,
                                      borderColor: "rgba(139,92,246,0.25)",
                                      backgroundColor: "rgba(139,92,246,0.08)",
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                    }}
                                  >
                                    <Feather name="zap" size={11} color={webTheme.violet} />
                                    <Text style={{ fontFamily: "Outfit_700Bold", color: webTheme.violet, fontSize: 12 }}>
                                      +{featuredTask.rewardXp} XP
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          </View>
                        </HapticPressable>
                      </Animated.View>
                      {mappedTasks.length > 1 ? (
                        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 14 }}>
                          <HapticPressable
                            hapticType="light"
                            onPress={() => setFeaturedIndex((prev) => (prev - 1 + mappedTasks.length) % mappedTasks.length)}
                            style={{ padding: 8 }}
                            hitSlop={12}
                          >
                            <Feather name="chevron-left" size={20} color={webTheme.muted} />
                          </HapticPressable>

                          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                            {mappedTasks.map((_, i) => (
                              <Pressable key={i} onPress={() => setFeaturedIndex(i)} hitSlop={10}>
                                <View
                                  style={{
                                    width: i === featuredIndex ? 18 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: i === featuredIndex ? webTheme.accent : webTheme.border,
                                  }}
                                />
                              </Pressable>
                            ))}
                          </View>

                          <HapticPressable
                            hapticType="light"
                            onPress={() => setFeaturedIndex((prev) => (prev + 1) % mappedTasks.length)}
                            style={{ padding: 8 }}
                            hitSlop={12}
                          >
                            <Feather name="chevron-right" size={20} color={webTheme.muted} />
                          </HapticPressable>
                        </View>
                      ) : null}
                    </FadeSlideIn>
                  ) : null}

                  {/* Active Statistics Bar */}
                  <FadeSlideIn delay={190} distance={14} style={{ width: "100%" }}>
                    <SurfaceCard
                      style={{ marginTop: 24 }}
                      contentStyle={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingHorizontal: 12,
                        paddingVertical: 14,
                      }}
                    >
                      {[
                        { val: `${mappedTasks.length}`, label: "Active Opportunities", color: webTheme.text },
                        { val: `${premiumTasks.length}`, label: "Premium Gigs", color: webTheme.gold },
                        { val: `${beginnerTasks.length}`, label: "Starter Tasks", color: webTheme.green },
                      ].map((stat) => (
                        <View key={stat.label} style={{ alignItems: "center", flex: 1 }}>
                          <Text style={{ ...type.black, color: stat.color, fontSize: 22 }}>{stat.val}</Text>
                          <Text style={{ ...type.caption, color: webTheme.muted, fontSize: 10, marginTop: 2 }}>{stat.label}</Text>
                        </View>
                      ))}
                    </SurfaceCard>
                  </FadeSlideIn>

                  {/* Category Grid */}
                  <FadeSlideIn delay={220} distance={14} style={{ width: "100%", marginTop: 28 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <Text style={{ ...type.h2, color: webTheme.text, fontSize: 18 }}>Browse Categories</Text>
                      <Text style={{ ...type.caption, color: webTheme.muted }}>Find by field of expertise</Text>
                    </View>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                      {taskCategories.filter(cat => cat !== "All").map((cat) => {
                        const config = categoryConfig[cat] || { icon: "grid", color: webTheme.muted, desc: "" };
                        const activeCount = categoryCounts[cat] || 0;

                        return (
                          <HapticPressable
                            key={cat}
                            hapticType="selection"
                            onPress={() => setSelectedCategory(cat)}
                            style={{
                              width: "48%",
                              borderRadius: 18,
                              borderWidth: 1,
                              borderColor: webTheme.border,
                              backgroundColor: "rgba(255,255,255,0.02)",
                              padding: 16,
                              marginBottom: 16,
                              minHeight: 124,
                              justifyContent: "space-between",
                              overflow: "hidden",
                            }}
                          >
                            <LinearGradient
                              colors={[config.color + "08", "transparent"]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                            />

                            <View style={{
                              width: 36,
                              height: 36,
                              borderRadius: 12,
                              backgroundColor: config.color + "12",
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderColor: config.color + "25",
                            }}>
                              <Feather name={config.icon as any} size={18} color={config.color} />
                            </View>

                            <View style={{ marginTop: 12 }}>
                              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 15 }}>{cat}</Text>
                              <Text style={{ ...type.semibold, color: config.color, fontSize: 11, marginTop: 4 }}>
                                {activeCount} {activeCount === 1 ? "task" : "tasks"}
                              </Text>
                            </View>
                          </HapticPressable>
                        );
                      })}
                    </View>
                  </FadeSlideIn>
                </>
              )}

              {/* SEARCH RESULTS VIEW (Active Query or Preselected Category) */}
              {!isBrowsingEmptyState && (
                <>
                  <FadeSlideIn delay={200} distance={14}>
                    <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ ...type.h2, color: webTheme.text, fontSize: 20 }}>
                        {selectedCategory !== "All" ? `${selectedCategory} Results` : "Search Results"}
                      </Text>
                      <Text style={{ ...type.caption, color: webTheme.muted }}>{filteredTasks.length} found</Text>
                    </View>
                  </FadeSlideIn>

                  <View style={{ marginTop: 16, gap: 14 }}>
                    {isFetching && tasks.length === 0 ? (
                      <AnimatedList itemStyle={{ width: "100%" }}>
                        <TaskCardSkeleton />
                        <TaskCardSkeleton />
                        <TaskCardSkeleton />
                      </AnimatedList>
                    ) : filteredTasks.length > 0 ? (
                      <AnimatedList baseDelay={100} stagger={60} distance={20} itemStyle={{ width: "100%" }}>
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
                          <Text style={{ ...type.h3, color: webTheme.text }}>No Exact Matches</Text>
                          <Text style={{ ...type.body, marginTop: 8, color: webTheme.muted }}>
                            Adjust the search term or switch categories to broaden your results.
                          </Text>
                        </SurfaceCard>
                      </FadeSlideIn>
                    )}
                  </View>
                </>
              )}
            </>
          )}

          {/* MEMBER SEARCH MODE */}
          {searchMode === "members" && (
            <View style={{ marginTop: 24, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ ...type.h2, color: webTheme.text, fontSize: 20 }}>Members</Text>
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
                        <SurfaceCard contentStyle={{ padding: 14 }}>
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
                    <Text style={{ ...type.h3, color: webTheme.text }}>No Members Found</Text>
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
