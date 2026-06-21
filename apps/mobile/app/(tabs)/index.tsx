import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View, RefreshControl, Image } from "react-native";
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
import { useStreakStore } from "../../stores/streakStore";

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

  // Apply flows state
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [applyingTaskId, setApplyingTaskId] = useState<string | null>(null);
  const [applyingTaskTitle, setApplyingTaskTitle] = useState("");

  const streakCount = useStreakStore((s) => s.streakCount);
  const initializeDefaultStreak = useStreakStore((s) => s.initializeDefaultStreak);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const todayStr = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  useEffect(() => {
    initializeDefaultStreak(todayStr);
  }, [initializeDefaultStreak, todayStr]);

  const { data: tasks = [], isFetching, refetch } = useQuery<DashboardTask[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/api/tasks"),
  });

  const { data: activities = [] } = useQuery<any[]>({
    queryKey: ["activities"],
    queryFn: () => api.get("/api/activities"),
  });

  const unreadCount = useMemo(() => {
    return activities.filter((a: any) => !a.read).length;
  }, [activities]);

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

  const trendingTasks = useMemo(() => {
    return tasks.slice(0, 4);
  }, [tasks]);

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
              <UserAvatar avatar={user?.avatarUrl} size={44} borderWidth={2} borderColor={webTheme.accentBorder} />
            </HapticPressable>
            <View>
              <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 12 }}>
                {greeting},
              </Text>
              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 18, marginTop: 1 }}>
                {user?.displayName || user?.username || "Member"}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {/* AI Assistant Button */}
            <HapticPressable
              onPress={() => router.push("/assistant?from=home" as any)}
              hapticType="medium"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(229, 54, 75, 0.08)",
                borderWidth: 1.5,
                borderColor: "rgba(229, 54, 75, 0.22)",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: webTheme.accent,
                shadowOpacity: 0.1,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <MaterialCommunityIcons name="robot" size={18} color={webTheme.accent} />
            </HapticPressable>

            {/* Notification Bell Button */}
            <HapticPressable
              onPress={() => router.navigate("/activity")}
              hapticType="light"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderWidth: 1.5,
                borderColor: webTheme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="bell" size={17} color={webTheme.text} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: webTheme.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                    borderWidth: 1.5,
                    borderColor: webTheme.bg,
                  }}
                >
                  <Text
                    style={{
                      ...type.bold,
                      color: "#FFF",
                      fontSize: 9,
                      textAlign: "center",
                      lineHeight: 11,
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </HapticPressable>

            {/* Control Center Grid Button */}
            <HapticPressable
              onPress={() => useControlCenterStore.getState().open()}
              hapticType="medium"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderWidth: 1.5,
                borderColor: webTheme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                source={require("../../assets/lobby-icon.png")}
                style={{ width: 18, height: 18, tintColor: webTheme.text }}
                resizeMode="contain"
              />
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
            <View
              style={{
                marginTop: 8,
                borderRadius: 16,
                backgroundColor: "rgba(229, 54, 75, 0.14)", // ambient red background glow
                shadowColor: "#E5364B",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1.0,
                shadowRadius: 22,
                elevation: 12,
              }}
            >
              <SurfaceCard
                shimmer={true}
                style={{ borderColor: "rgba(229, 54, 75, 0.45)", borderWidth: 1.5 }}
                contentStyle={{
                  flexDirection: "row",
                  paddingVertical: 16,
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
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(251, 191, 36, 0.07)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(251, 191, 36, 0.22)",
                    marginBottom: 8,
                  }}
                >
                  <MaterialCommunityIcons name="star-four-points" size={15} color={webTheme.gold} />
                </View>
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 16 }}>
                  {user?.tokenBalance ?? 0}
                </Text>
                <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 }}>
                  Coins
                </Text>
              </HapticPressable>

              <View style={{ width: 1, height: 32, backgroundColor: webTheme.borderStrong }} />

              {/* Streak */}
              <HapticPressable
                hapticType="light"
                onPress={() => router.push("/streak" as any)}
                style={{ flex: 1, alignItems: "center" }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(251, 146, 60, 0.07)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(251, 146, 60, 0.22)",
                    marginBottom: 8,
                  }}
                >
                  <MaterialCommunityIcons name="fire" size={17} color={webTheme.orange} />
                </View>
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 16 }}>
                  {streakCount} {streakCount === 1 ? "Day" : "Days"}
                </Text>
                <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 }}>
                  Streak
                </Text>
              </HapticPressable>

              <View style={{ width: 1, height: 32, backgroundColor: webTheme.borderStrong }} />

              {/* XP / Level */}
              <HapticPressable
                hapticType="light"
                onPress={() => router.navigate("/leaderboard")}
                style={{ flex: 1, alignItems: "center" }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(139, 92, 246, 0.07)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(139, 92, 246, 0.22)",
                    marginBottom: 8,
                  }}
                >
                  <Feather name="award" size={15} color={webTheme.violet} />
                </View>
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 16 }}>
                  Lvl {user?.level ?? 1}
                </Text>
                <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 }}>
                  {user?.xp ?? 0} XP
                </Text>
              </HapticPressable>
            </SurfaceCard>
            </View>
          </FadeSlideIn>

          {/* Search Bar Redirect */}
          <FadeSlideIn delay={140} distance={12} style={{ paddingHorizontal: 22, marginTop: 18 }}>
            <HapticPressable
              hapticType="light"
              onPress={() => router.push({ pathname: "/explore", params: { focus: "true" } })}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: webTheme.border,
                backgroundColor: webTheme.inputBg,
                paddingHorizontal: 16,
                height: 52,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Feather name="search" size={18} color={webTheme.muted} />
              <Text style={{ ...type.regular, flex: 1, color: webTheme.faint, fontSize: 15 }}>
                Search active opportunities...
              </Text>
            </HapticPressable>
          </FadeSlideIn>

          {/* Category Chips Redirect */}
          <FadeSlideIn delay={200} distance={10}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 16 }}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 22 }}
            >
              {taskCategories.map((category) => {
                return (
                  <HapticPressable
                    key={category}
                    hapticType="selection"
                    onPress={() => {
                      if (category === "All") {
                        router.push("/explore");
                      } else {
                        router.push({ pathname: "/explore", params: { category } });
                      }
                    }}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 13 }}>
                      {category}
                    </Text>
                  </HapticPressable>
                );
              })}
            </ScrollView>
          </FadeSlideIn>

          <FadeSlideIn delay={230} distance={10}>
            <View style={{ paddingHorizontal: 22, marginTop: 26, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ ...type.h2, color: webTheme.text, fontSize: 18 }}>Trending Opportunities</Text>
                
                {/* Classic green '.live' button/indicator */}
                <HapticPressable 
                  onPress={() => {
                    refetch();
                    notify.success("Refreshing live opportunities...");
                  }}
                  hapticType="selection"
                  style={{ 
                    flexDirection: "row", 
                    alignItems: "center", 
                    backgroundColor: "rgba(52, 199, 89, 0.15)", // iOS SystemGreen transparent
                    borderWidth: 1,
                    borderColor: "rgba(52, 199, 89, 0.3)",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 20,
                    gap: 5
                  }}
                >
                  <View 
                    style={{ 
                      width: 6, 
                      height: 6, 
                      borderRadius: 3, 
                      backgroundColor: "#34C759" // iOS SystemGreen solid
                    }} 
                  />
                  <Text 
                    style={{ 
                      ...type.bold,
                      fontSize: 10, 
                      color: "#34C759", 
                      textTransform: "uppercase", 
                      letterSpacing: 0.3,
                    }}
                  >
                    .live
                  </Text>
                </HapticPressable>
              </View>
              <HapticPressable onPress={() => router.push("/explore")} hapticType="light">
                <Text style={{ ...type.semibold, color: webTheme.accent, fontSize: 13 }}>View All</Text>
              </HapticPressable>
            </View>
          </FadeSlideIn>

          {/* Curated Task Feed */}
          <View style={{ paddingHorizontal: 22, marginTop: 16, gap: 14 }}>
            {isFetching && tasks.length === 0 ? (
              <AnimatedList itemStyle={{ width: "100%" }}>
                <TaskCardSkeleton />
                <TaskCardSkeleton />
                <TaskCardSkeleton />
              </AnimatedList>
            ) : trendingTasks.length > 0 ? (
              <>
                <AnimatedList baseDelay={250} stagger={80} distance={16} itemStyle={{ width: "100%", marginBottom: 14 }}>
                  {trendingTasks.map((taskSource) => {
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

                {/* Explore All opportunities CTA button */}
                <FadeSlideIn delay={300} distance={10}>
                  <HapticPressable
                    hapticType="medium"
                    onPress={() => router.push("/explore")}
                    style={{
                      borderRadius: 16,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      paddingVertical: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ ...type.bold, color: webTheme.textSecondary, fontSize: 14 }}>
                      Explore All Opportunities
                    </Text>
                    <Feather name="arrow-right" size={16} color={webTheme.textSecondary} />
                  </HapticPressable>
                </FadeSlideIn>
              </>
            ) : (
              <FadeSlideIn delay={150}>
                <SurfaceCard style={{ borderStyle: "dashed" }}>
                  <Text style={{ ...type.h3, color: webTheme.text }}>
                    No Opportunities Found
                  </Text>
                  <Text style={{ ...type.body, marginTop: 8, color: webTheme.muted }}>
                    Try checking back later or exploring other sections.
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