import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ScreenHeader } from "../../components/ScreenHeader";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";
import { SurfaceCard } from "../../components/SurfaceCard";
import { FadeSlideIn } from "../../components/FadeSlideIn";
import { AnimatedList } from "../../components/AnimatedList";
import { HapticPressable } from "../../components/HapticPressable";
import { Skeleton } from "../../components/Skeleton";
import { api } from "../../lib/api";
import { type } from "../../lib/typography";
import { webTheme } from "../../lib/webTheme";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";
import { TabTransitionView } from "../../components/TabTransitionView";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { UserAvatar } from "../../components/UserAvatar";


const activityAccent = {
  reward: webTheme.green,
  comment: webTheme.blue,
  match: webTheme.orange,
  system: webTheme.accent,
} as const;

function ActivitySkeleton() {
  return (
    <SurfaceCard>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
        <Skeleton width={44} height={44} borderRadius={16} />
        <View style={{ flex: 1, paddingTop: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Skeleton width="60%" height={16} borderRadius={6} />
            <Skeleton width={40} height={12} borderRadius={4} />
          </View>
          <Skeleton width="85%" height={14} borderRadius={5} style={{ marginTop: 10 }} />
        </View>
      </View>
    </SurfaceCard>
  );
}

export default function ActivityScreen() {
  const tabBarPadding = useTabBarPadding();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: activities = [], isFetching } = useQuery<any[]>({
    queryKey: ["activities"],
    queryFn: () => api.get("/api/activities"),
  });

  const markReadMutation = useMutation({
    mutationFn: (activityId: string) => api.put(`/api/activities/${activityId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put("/api/activities/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => api.delete("/api/activities/clear-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requesterId: string) => api.put(`/api/users/${requesterId}/accept-request`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (requesterId: string) => api.put(`/api/users/${requesterId}/reject-request`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });

  useEffect(() => {
    const hasUnread = activities.some((a: any) => !a.read);
    if (hasUnread) {
      markAllReadMutation.mutate();
    }
  }, [activities]);

  const mappedActivities = activities.map((item) => ({
    id: item._id,
    originalType: item.type,
    post: item.post,
    task: item.task,
    actor: item.actor,
    type:
      item.type === "task_apply" || item.type === "task_assign" || item.type === "task_complete"
        ? "match"
        : item.type === "comment" || item.type === "mention"
          ? "comment"
          : item.type === "follow" || item.type === "follow_request" || item.type === "follow_accept" || item.type === "follow_reject"
            ? "system"
            : item.type === "like" || item.type === "post_like"
              ? "reward"
              : item.type === "duel_challenge" || item.type === "duel_result"
                ? "match"
                : "reward",
    title: item.actor?.name || "Someone",
    detail:
      item.type === "task_apply"
        ? `applied for your task${item.task?.title ? ` "${item.task.title}"` : ""}.`
        : item.type === "task_assign"
          ? `assigned you to${item.task?.title ? ` "${item.task.title}"` : " a task"}.`
          : item.type === "task_complete"
            ? `completed${item.task?.title ? ` "${item.task.title}"` : " your task"}.`
            : item.type === "comment"
              ? `commented${item.comment ? `: "${item.comment}"` : " on your post"}.`
              : item.type === "like" || item.type === "post_like"
                ? "liked your post."
                : item.type === "follow"
                  ? "started following you."
                  : item.type === "follow_request"
                    ? "has requested to follow you."
                    : item.type === "follow_accept"
                      ? "accepted your follow request."
                      : item.type === "follow_reject"
                        ? "declined your follow request."
                        : item.type === "mention"
                          ? "mentioned you in a post."
                          : item.type === "xp" || item.type === "xp_reward"
                            ? `You earned${item.amount ? ` ${item.amount}` : ""} XP!`
                            : item.type === "coin" || item.type === "coin_reward"
                              ? `You earned${item.amount ? ` ${item.amount}` : ""} coins!`
                              : item.type === "badge"
                                ? `You unlocked a new badge${item.badge ? `: "${item.badge}"` : ""}!`
                                : item.type === "level_up"
                                  ? "You leveled up!"
                                  : item.type === "message"
                                    ? "sent you a message."
                                    : item.type === "duel_challenge"
                                      ? "challenged you to a duel."
                                      : item.type === "duel_result"
                                        ? "Your duel has ended."
                                        : "interacted with your profile.",
    time: new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    unread: !item.read,
  }));

  const filteredItems = mappedActivities.filter((item) => {
    if (filter === "unread") return item.unread;
    if (filter === "read") return !item.unread;
    return true;
  });

  const followRequests = mappedActivities.filter(
    (item) => item.originalType === "follow_request"
  );

  const notifications = filteredItems.filter(
    (item) => item.originalType !== "follow_request"
  );

  const handlePressActivity = (item: (typeof mappedActivities)[number]) => {
    if (item.unread) {
      markReadMutation.mutate(item.id);
    }

    const type = item.originalType;
    if (type === "comment" || type === "mention" || type === "like" || type === "post_like") {
      const postId = item.post?._id || (typeof item.post === "string" ? item.post : null);
      if (postId) {
        router.push({ pathname: "/post/[id]", params: { id: postId } });
      }
    } else if (
      type === "follow" ||
      type === "follow_request" ||
      type === "follow_accept" ||
      type === "follow_reject"
    ) {
      const userId = item.actor?._id || (typeof item.actor === "string" ? item.actor : null);
      if (userId) {
        router.push({ pathname: "/user/[id]", params: { id: userId } });
      }
    } else if (type === "task_apply" || type === "task_assign" || type === "task_complete") {
      const taskId = item.task?._id || (typeof item.task === "string" ? item.task : null);
      if (taskId) {
        router.push({ pathname: "/task/[id]", params: { id: taskId } });
      }
    } else if (type === "duel_challenge" || type === "duel_result") {
      router.push("/duels");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <TabTransitionView index={3}>
        <ScreenBackdrop accent={webTheme.orange} secondaryAccent={webTheme.accent} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: tabBarPadding }}>
          <FadeSlideIn delay={50} distance={10}>
            <ScreenHeader
              showBackButton={true}
              eyebrow="Notifications"
              title="Activity"
              description="Track rewards, feedback, and new task matches without leaving the app flow."
              accent={webTheme.orange}
            />
          </FadeSlideIn>

          {/* filter pills and actions */}
          <FadeSlideIn delay={100} distance={14}>
            <View style={{ marginTop: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[
                  { key: "all", label: "All" },
                  { key: "unread", label: "Unread" },
                  { key: "read", label: "Read" },
                ].map((option) => {
                  const active = filter === option.key;
                  return (
                    <HapticPressable
                      key={option.key}
                      hapticType="selection"
                      onPress={() => setFilter(option.key as typeof filter)}
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? "rgba(251,146,60,0.28)" : webTheme.border,
                        backgroundColor: active ? webTheme.orangeSoft : "rgba(255,255,255,0.03)",
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ ...type.bold, color: active ? webTheme.orange : webTheme.muted, fontSize: 13 }}>
                        {option.label}
                      </Text>
                    </HapticPressable>
                  );
                })}
              </View>

              {activities.length > 0 ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {activities.some((a: any) => !a.read) ? (
                    <HapticPressable
                      hapticType="light"
                      onPress={() => markAllReadMutation.mutate()}
                      disabled={markAllReadMutation.isPending}
                      accessibilityLabel="Mark all as read"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: webTheme.border,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: markAllReadMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      <Feather name="check-square" size={16} color={webTheme.muted} />
                    </HapticPressable>
                  ) : null}
                  <HapticPressable
                    hapticType="light"
                    onPress={() => setShowClearConfirm(true)}
                    disabled={clearAllMutation.isPending}
                    accessibilityLabel="Clear all activities"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: clearAllMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    <Feather name="trash-2" size={16} color={webTheme.red} />
                  </HapticPressable>
                </View>
              ) : null}
            </View>
          </FadeSlideIn>

          {/* activity list */}
          <View style={{ marginTop: 20, gap: 14 }}>
            {isFetching && activities.length === 0 ? (
              <AnimatedList itemStyle={{ width: "100%" }}>
                <ActivitySkeleton />
                <ActivitySkeleton />
                <ActivitySkeleton />
                <ActivitySkeleton />
              </AnimatedList>
            ) : (followRequests.length > 0 && filter !== "read") || notifications.length > 0 ? (
              <View style={{ gap: 20 }}>
                {/* Follow Requests Section */}
                {filter !== "read" && followRequests.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    <Text style={{ ...type.bold, color: webTheme.orange, fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" }}>
                      Follow Requests ({followRequests.length})
                    </Text>
                    <AnimatedList baseDelay={100} stagger={60} distance={12} itemStyle={{ width: "100%" }}>
                      {followRequests.map((item) => (
                        <SurfaceCard
                          key={item.id}
                          style={{
                            borderColor: webTheme.border,
                            backgroundColor: webTheme.surface,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <UserAvatar avatar={item.actor?.avatar} size={40} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 15 }}>
                                {item.actor?.name || "Someone"}
                              </Text>
                              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, marginTop: 2 }}>
                                requested to follow you
                              </Text>
                            </View>
                            <Text style={{ ...type.caption, color: webTheme.faint }}>{item.time}</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
                            <HapticPressable
                              onPress={() => acceptRequestMutation.mutate(item.actor?._id)}
                              disabled={acceptRequestMutation.isPending || rejectRequestMutation.isPending}
                              style={{
                                flex: 1,
                                borderRadius: 10,
                                backgroundColor: webTheme.orange,
                                paddingVertical: 8,
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: acceptRequestMutation.isPending ? 0.6 : 1,
                              }}
                            >
                              <Text style={{ ...type.bold, color: "#fff", fontSize: 13 }}>Accept</Text>
                            </HapticPressable>
                            <HapticPressable
                              onPress={() => rejectRequestMutation.mutate(item.actor?._id)}
                              disabled={acceptRequestMutation.isPending || rejectRequestMutation.isPending}
                              style={{
                                flex: 1,
                                borderRadius: 10,
                                backgroundColor: "rgba(255,255,255,0.03)",
                                borderWidth: 1,
                                borderColor: webTheme.border,
                                paddingVertical: 8,
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: rejectRequestMutation.isPending ? 0.6 : 1,
                              }}
                            >
                              <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 13 }}>Decline</Text>
                            </HapticPressable>
                          </View>
                        </SurfaceCard>
                      ))}
                    </AnimatedList>
                    
                    {notifications.length > 0 ? (
                      <View style={{ height: 1, backgroundColor: webTheme.borderSoft, marginVertical: 8 }} />
                    ) : null}
                  </View>
                ) : null}

                {/* General Notifications Section */}
                {notifications.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {filter !== "read" && followRequests.length > 0 ? (
                      <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" }}>
                        Recent Activity
                      </Text>
                    ) : null}
                    <AnimatedList baseDelay={180} stagger={60} distance={16} itemStyle={{ width: "100%" }}>
                      {notifications.map((item: (typeof mappedActivities)[number]) => (
                        <SurfaceCard
                          key={item.id}
                          onPress={() => handlePressActivity(item)}
                          style={{
                            borderColor: item.unread ? "rgba(251,146,60,0.18)" : webTheme.border,
                            backgroundColor: item.unread ? webTheme.surfaceRaised : webTheme.surface,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
                            <View
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 16,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "rgba(255,255,255,0.04)",
                                borderWidth: 1,
                                borderColor: webTheme.border,
                              }}
                            >
                              <Feather
                                name={
                                  item.type === "reward"
                                    ? "award"
                                    : item.type === "comment"
                                      ? "message-circle"
                                      : item.type === "match"
                                        ? "briefcase"
                                        : "bell"
                                }
                                size={17}
                                color={activityAccent[item.type as keyof typeof activityAccent]}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                                <Text style={{ ...type.h3, color: webTheme.text, fontSize: 17 }}>{item.title}</Text>
                                <Text style={{ ...type.caption, color: webTheme.faint }}>{item.time}</Text>
                              </View>
                              <Text style={{ ...type.body, marginTop: 6, color: webTheme.muted, fontSize: 14 }}>
                                {item.detail}
                              </Text>
                            </View>
                          </View>
                        </SurfaceCard>
                      ))}
                    </AnimatedList>
                  </View>
                ) : null}
              </View>
            ) : (
              <FadeSlideIn delay={150}>
                <Text style={{ ...type.body, color: webTheme.muted, textAlign: "center", marginTop: 20 }}>
                  No activity to show.
                </Text>
              </FadeSlideIn>
            )}
          </View>
        </ScrollView>
      </TabTransitionView>
      <ConfirmDialog
        visible={showClearConfirm}
        title="Clear Activity"
        detail="Are you sure you want to clear all activities? This action cannot be undone."
        confirmLabel="Clear"
        cancelLabel="Cancel"
        destructive={true}
        onConfirm={() => {
          clearAllMutation.mutate();
          setShowClearConfirm(false);
        }}
        onClose={() => setShowClearConfirm(false)}
      />
    </SafeAreaView>
  );
}

