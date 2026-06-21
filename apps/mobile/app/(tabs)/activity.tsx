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
              badge="Movement"
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
                    onPress={() => clearAllMutation.mutate()}
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
            ) : filteredItems.length > 0 ? (
              <AnimatedList baseDelay={180} stagger={60} distance={16} itemStyle={{ width: "100%" }}>
                {filteredItems.map((item: (typeof mappedActivities)[number]) => (
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
    </SafeAreaView>
  );
}

