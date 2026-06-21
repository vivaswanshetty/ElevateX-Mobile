import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useMemo } from "react";
import { Pressable, ScrollView, Text, TextInput, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";
import { SurfaceCard } from "../../components/SurfaceCard";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { UserAvatar } from "../../components/UserAvatar";
import { FadeSlideIn } from "../../components/FadeSlideIn";
import { AnimatedList } from "../../components/AnimatedList";
import { HapticPressable } from "../../components/HapticPressable";
import { TaskCardSkeleton } from "../../components/TaskCardSkeleton";
import { api, getErrorMessage } from "../../lib/api";
import { mapTaskToCard, type TaskCardSource } from "../../lib/tasks";
import { formatTimeAgo } from "../../lib/media";
import { type } from "../../lib/typography";
import { webTheme } from "../../lib/webTheme";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";
import { TabTransitionView } from "../../components/TabTransitionView";
import { useAuthStore } from "../../stores/authStore";
import { notify } from "../../stores/toastStore";
import { useControlCenterStore } from "../../stores/controlCenterStore";

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

interface DashboardTask extends TaskCardSource {
  createdAt?: string;
  applicants?: Array<{
    user?: {
      _id: string;
      name: string;
    } | string;
    status?: string;
  }>;
}

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const tabBarPadding = useTabBarPadding();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<(typeof taskCategories)[number]>("All");
  const [isFocused, setIsFocused] = useState(false);
  
  // Apply flows state
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [applyingTaskId, setApplyingTaskId] = useState<string | null>(null);
  const [applyingTaskTitle, setApplyingTaskTitle] = useState("");

  const { data: tasks = [], isFetching, refetch } = useQuery<DashboardTask[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/api/tasks"),
  });

  const applyMutation = useMutation({
    mutationFn: (taskId: string) => api.put(`/api/tasks/${taskId}/apply`),
    onSuccess: async () => {
      setShowApplyConfirm(false);
      setApplyingTaskId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["activity"] }),
      ]);
      notify.success("Your application has been sent.");
    },
    onError: (error) => {
      setShowApplyConfirm(false);
      notify.error(getErrorMessage(error));
    },
  });

  const handleApplyPress = (taskId: string, title: string) => {
    setApplyingTaskId(taskId);
    setApplyingTaskTitle(title);
    setShowApplyConfirm(true);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Find matches for category
      const matchesCategory = selectedCategory === "All" || task.category === selectedCategory;
      // Find matches for search query
      const needle = searchQuery.trim().toLowerCase();
      const subcategoryOrCategory = task.subcategory || task.category;
      const matchesQuery =
        needle.length === 0 ||
        task.title.toLowerCase().includes(needle) ||
        subcategoryOrCategory.toLowerCase().includes(needle) ||
        task.description.toLowerCase().includes(needle);

      return matchesCategory && matchesQuery;
    });
  }, [tasks, searchQuery, selectedCategory]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <TabTransitionView index={0}>
        <ScreenBackdrop />
        
        {/* Header Section */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 22,
            paddingTop: 16,
            paddingBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <HapticPressable onPress={() => router.navigate("/profile")} hapticType="light">
              <UserAvatar avatar={user?.avatarUrl} size={42} borderWidth={2} borderColor={webTheme.accentBorder} />
            </HapticPressable>
            <View>
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13 }}>
                Hello,
              </Text>
              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 16, marginTop: 2 }}>
                {user?.displayName || user?.username || "ElevateX Member"}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Create Task Button */}
            <HapticPressable
              onPress={() => router.push("/create" as any)}
              hapticType="medium"
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderWidth: 1,
                borderColor: webTheme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="plus" size={17} color={webTheme.text} />
            </HapticPressable>

            {/* AI Assistant Button */}
            <HapticPressable
              onPress={() => router.push("/assistant?from=home" as any)}
              hapticType="medium"
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "rgba(229, 54, 75, 0.08)",
                borderWidth: 1,
                borderColor: "rgba(229, 54, 75, 0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="robot" size={17} color={webTheme.accent} />
            </HapticPressable>

            {/* Notification Bell Button */}
            <HapticPressable
              onPress={() => router.navigate("/activity")}
              hapticType="light"
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderWidth: 1,
                borderColor: webTheme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="bell" size={16} color={webTheme.text} />
            </HapticPressable>

            {/* Control Center Grid Button */}
            <HapticPressable
              onPress={() => useControlCenterStore.getState().open()}
              hapticType="medium"
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderWidth: 1,
                borderColor: webTheme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="grid" size={17} color={webTheme.text} />
            </HapticPressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: tabBarPadding + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && tasks.length > 0}
              onRefresh={refetch}
              tintColor={webTheme.accent}
            />
          }
        >
          {/* Stats Strip */}
          <FadeSlideIn delay={80} distance={10} style={{ paddingHorizontal: 22 }}>
            <SurfaceCard
              style={{ marginTop: 8 }}
              contentStyle={{
                flexDirection: "row",
                paddingVertical: 14,
                paddingHorizontal: 8,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* Wallet/Coins */}
              <HapticPressable
                hapticType="light"
                onPress={() => router.navigate("/wallet")}
                style={{ flex: 1, alignItems: "center" }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "rgba(251, 191, 36, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(251, 191, 36, 0.18)",
                    marginBottom: 6,
                  }}
                >
                  <MaterialCommunityIcons name="star-four-points" size={14} color={webTheme.gold} />
                </View>
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 15 }}>
                  {user?.tokenBalance ?? 0}
                </Text>
                <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>
                  Coins
                </Text>
              </HapticPressable>

              <View style={{ width: 1, height: 32, backgroundColor: webTheme.borderSoft }} />

              {/* Streak */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "rgba(251, 146, 60, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(251, 146, 60, 0.18)",
                    marginBottom: 6,
                  }}
                >
                  <MaterialCommunityIcons name="fire" size={16} color={webTheme.orange} />
                </View>
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 15 }}>
                  7 Days
                </Text>
                <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>
                  Streak
                </Text>
              </View>

              <View style={{ width: 1, height: 32, backgroundColor: webTheme.borderSoft }} />

              {/* XP / Level */}
              <HapticPressable
                hapticType="light"
                onPress={() => router.navigate("/leaderboard")}
                style={{ flex: 1, alignItems: "center" }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "rgba(139, 92, 246, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(139, 92, 246, 0.18)",
                    marginBottom: 6,
                  }}
                >
                  <Feather name="award" size={14} color={webTheme.violet} />
                </View>
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 15 }}>
                  Lvl {user?.level ?? 1}
                </Text>
                <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>
                  {user?.xp ?? 0} XP
                </Text>
              </HapticPressable>
            </SurfaceCard>
          </FadeSlideIn>

          {/* Search Bar */}
          <FadeSlideIn delay={140} distance={12} style={{ paddingHorizontal: 22, marginTop: 18 }}>
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: isFocused ? webTheme.accent : webTheme.border,
                backgroundColor: webTheme.inputBg,
                paddingHorizontal: 16,
                height: 52,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Feather name="search" size={18} color={isFocused ? webTheme.accent : webTheme.muted} />
              <TextInput
                style={{ ...type.regular, flex: 1, color: webTheme.text, fontSize: 15, backgroundColor: "transparent", padding: 0 }}
                placeholder="Search active opportunities..."
                placeholderTextColor={webTheme.faint}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Feather name="x-circle" size={18} color={webTheme.muted} />
                </Pressable>
              )}
            </View>
          </FadeSlideIn>

          {/* Category Chips */}
          <FadeSlideIn delay={200} distance={10}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 16 }}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 22 }}
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

          {/* Task Feed */}
          <View style={{ paddingHorizontal: 22, marginTop: 20 }}>
            {isFetching && tasks.length === 0 ? (
              <AnimatedList itemStyle={{ width: "100%" }}>
                <TaskCardSkeleton />
                <TaskCardSkeleton />
                <TaskCardSkeleton />
              </AnimatedList>
            ) : filteredTasks.length > 0 ? (
              <AnimatedList baseDelay={250} stagger={80} distance={16} itemStyle={{ width: "100%", marginBottom: 16 }}>
                {filteredTasks.map((taskSource) => {
                  const task = mapTaskToCard(taskSource);
                  const creatorId = typeof taskSource.createdBy === "string" ? taskSource.createdBy : taskSource.createdBy?._id;
                  const isOwner = creatorId === user?.id;

                  // Safely check hasApplied
                  const hasApplied = Boolean(
                    taskSource.applicants?.some((applicant: any) => {
                      const applicantId = typeof applicant === 'string'
                        ? applicant
                        : (typeof applicant.user === 'string' ? applicant.user : applicant.user?._id);
                      return applicantId === user?.id;
                    })
                  );

                  // Safely format posted time
                  const postedTime = taskSource.createdAt ? formatTimeAgo(taskSource.createdAt) : "";

                  // Safely get applicant count
                  const applicantsList = taskSource.applicants;
                  const applicantCount = Array.isArray(applicantsList)
                    ? applicantsList.length
                    : typeof applicantsList === "number"
                      ? applicantsList
                      : 0;

                  return (
                    <SurfaceCard
                      key={task.id}
                      onPress={() => router.push({ pathname: "/task/[id]", params: { id: task.id } })}
                    >
                      <View style={{ gap: 12 }}>
                        {/* Title & Category Row */}
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ ...type.bold, color: webTheme.textSecondary, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 }}>
                              {task.category}
                            </Text>
                            <Text style={{ ...type.h3, color: webTheme.text, marginTop: 4 }}>
                              {task.title}
                            </Text>
                          </View>

                          <View
                            style={{
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: webTheme.border,
                              backgroundColor: "rgba(255,255,255,0.03)",
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            }}
                          >
                            <Text style={{ ...type.bold, color: webTheme.text, fontSize: 11 }}>
                              {task.difficulty}
                            </Text>
                          </View>
                        </View>

                        {/* Description */}
                        <Text style={{ ...type.body, color: webTheme.muted, fontSize: 13 }} numberOfLines={2}>
                          {task.description}
                        </Text>

                        {/* Metadata Row */}
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.05)", paddingTop: 12 }}>
                          <View style={{ gap: 3 }}>
                            <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8 }}>
                              {postedTime ? `Posted ${postedTime}` : "Active"}
                            </Text>
                            <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 12 }}>
                              {applicantCount} {applicantCount === 1 ? "applicant" : "applicants"}
                            </Text>
                          </View>

                          <View style={{ gap: 3, alignItems: "flex-end" }}>
                            <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8 }}>
                              Reward
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <MaterialCommunityIcons name="star-four-points" size={12} color={webTheme.gold} />
                              <Text style={{ ...type.bold, color: webTheme.gold, fontSize: 13 }}>
                                {task.rewardCoins}
                              </Text>
                              <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 11 }}>
                                / +{task.rewardXp} XP
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Apply Action Button */}
                        <HapticPressable
                          hapticType="medium"
                          disabled={isOwner || hasApplied}
                          onPress={() => handleApplyPress(task.id, task.title)}
                          style={{
                            borderRadius: 16,
                            backgroundColor: isOwner || hasApplied ? "rgba(255,255,255,0.05)" : webTheme.accentSoft,
                            borderWidth: 1,
                            borderColor: isOwner || hasApplied ? webTheme.border : webTheme.accentBorder,
                            paddingVertical: 12,
                            alignItems: "center",
                            marginTop: 4,
                          }}
                        >
                          <Text
                            style={{
                              ...type.bold,
                              color: isOwner || hasApplied ? webTheme.muted : webTheme.accent,
                              fontSize: 13,
                            }}
                          >
                            {isOwner ? "Your Task" : hasApplied ? "Application Sent" : "Apply Now"}
                          </Text>
                        </HapticPressable>
                      </View>
                    </SurfaceCard>
                  );
                })}
              </AnimatedList>
            ) : (
              <FadeSlideIn delay={150}>
                <SurfaceCard style={{ borderStyle: "dashed" }}>
                  <Text style={{ ...type.h3, color: webTheme.text }}>
                    No opportunities found
                  </Text>
                  <Text style={{ ...type.body, marginTop: 8, color: webTheme.muted }}>
                    Try widening your search terms or selecting a different category filter.
                  </Text>
                </SurfaceCard>
              </FadeSlideIn>
            )}
          </View>
        </ScrollView>


        {/* Apply Confirmation Dialog */}
        <ConfirmDialog
          visible={showApplyConfirm}
          title="Apply for task?"
          detail={`Would you like to send your application for "${applyingTaskTitle}"? Applications may cost coins depending on backend rules.`}
          confirmLabel="Apply"
          onClose={() => setShowApplyConfirm(false)}
          onConfirm={() => {
            if (applyingTaskId) {
              applyMutation.mutate(applyingTaskId);
            }
          }}
        />

      </TabTransitionView>
    </SafeAreaView>
  );
}