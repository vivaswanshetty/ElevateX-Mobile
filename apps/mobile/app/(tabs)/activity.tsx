import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const { data: activities = [], isFetching } = useQuery<any[]>({
    queryKey: ["activities"],
    queryFn: () => api.get("/api/activities"),
  });

  const mappedActivities = activities.map((item) => ({
    id: item._id,
    type:
      item.type === "task_apply" || item.type === "task_assign" || item.type === "task_complete"
        ? "match"
        : item.type === "comment"
          ? "comment"
          : item.type === "follow" || item.type === "follow_request" || item.type === "follow_accept"
            ? "system"
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
              : item.type === "follow_request"
                ? "requested to follow you."
                : item.type === "follow_accept"
                  ? "accepted your follow request."
                  : "interacted with you.",
    time: new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    unread: !item.read,
  }));

  const filteredItems = mappedActivities.filter((item) => {
    if (filter === "unread") return item.unread;
    if (filter === "read") return !item.unread;
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop accent={webTheme.orange} secondaryAccent={webTheme.accent} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: tabBarPadding }}>
        <FadeSlideIn delay={50} distance={10}>
          <ScreenHeader
            eyebrow="Activity"
            title="Recent"
            badge="Movement"
            description="Track rewards, feedback, and new task matches without leaving the app flow."
            accent={webTheme.orange}
          />
        </FadeSlideIn>

        {/* filter pills */}
        <FadeSlideIn delay={100} distance={14}>
          <View style={{ marginTop: 22, flexDirection: "row", gap: 10 }}>
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
    </SafeAreaView>
  );
}
