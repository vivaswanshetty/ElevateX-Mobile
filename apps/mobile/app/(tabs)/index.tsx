import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientText } from "../../components/GradientText";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";
import { SectionRule, SurfaceCard } from "../../components/SurfaceCard";
import { TaskCard } from "../../components/TaskCard";
import { AnimatedList } from "../../components/AnimatedList";
import { FadeSlideIn } from "../../components/FadeSlideIn";
import { HapticPressable } from "../../components/HapticPressable";
import { TaskCardSkeleton } from "../../components/TaskCardSkeleton";
import { api } from "../../lib/api";
import { mapTaskToCard, type TaskCardSource } from "../../lib/tasks";
import { type } from "../../lib/typography";
import { webTheme } from "../../lib/webTheme";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";

function HeroButton({
  label,
  icon,
  onPress,
  primary = false,
}: {
  label: string;
  icon: "arrow-right" | "arrow-up-right";
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <HapticPressable hapticType={primary ? "medium" : "light"} onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          borderRadius: 999,
          borderWidth: primary ? 0 : 1,
          borderColor: primary ? "transparent" : webTheme.borderStrong,
          backgroundColor: primary ? "transparent" : "rgba(255,255,255,0.04)",
          paddingHorizontal: 16,
          paddingVertical: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          overflow: "hidden",
        }}
      >
        {primary && (
          <LinearGradient
            colors={["#E5364B", "#F43F5E", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", inset: 0 }}
          />
        )}
        <Text style={{ ...type.buttonLabel, color: primary ? "#fff" : webTheme.text, zIndex: 1, fontSize: 13, letterSpacing: 0.3 }}>
          {label}
        </Text>
        <Feather name={icon} size={15} color={primary ? "#fff" : webTheme.muted} style={{ zIndex: 1 }} />
      </View>
    </HapticPressable>
  );
}

export default function HomeScreen() {
  const tabBarPadding = useTabBarPadding();
  const { data: tasks = [], isFetching } = useQuery<TaskCardSource[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/api/tasks"),
  });

  const recentTasks = tasks.slice(0, 3).map(mapTaskToCard);
  const stats = [
    { value: "100+", label: "Members Earned", icon: "users", color: webTheme.blue },
    { value: "98%", label: "Success Rate", icon: "activity", color: webTheme.green },
    { value: "500", label: "Tasks Done", icon: "check-circle", color: webTheme.gold },
  ] as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop />
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── hero section ── */}
        <View
          style={{
            minHeight: 700,
            overflow: "hidden",
            paddingHorizontal: 22,
            paddingTop: 20,
            paddingBottom: 40,
          }}
        >
          {/* background blobs */}
          <View style={{ position: "absolute", inset: 0, opacity: 0.6, pointerEvents: "none" }}>
            <View style={{ position: "absolute", top: -80, left: -40, width: 280, height: 280, backgroundColor: "rgba(229,54,75,0.12)", borderRadius: 999 }} />
            <View style={{ position: "absolute", top: 120, right: -100, width: 250, height: 250, backgroundColor: "rgba(139,92,246,0.12)", borderRadius: 999 }} />
          </View>

          {/* top edge highlight */}
          <View
            style={{
              position: "absolute",
              inset: 0,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.06)",
            }}
          />

          <View style={{ alignItems: "center", marginTop: 20 }}>
            {/* status pill */}
            <FadeSlideIn delay={100} distance={10}>
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: webTheme.border,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: webTheme.accent,
                    shadowColor: webTheme.accent,
                    shadowOpacity: 0.6,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                />
                <Text
                  style={{
                    ...type.label,
                    color: webTheme.faint,
                    fontSize: 10,
                  }}
                >
                  The Future of Skill Exchange
                </Text>
              </View>
            </FadeSlideIn>

            {/* hero text */}
            <FadeSlideIn delay={180}>
              <View style={{ marginTop: 40, alignItems: "center" }}>
                <Text
                  style={{
                    ...type.hero,
                    color: webTheme.text,
                    textAlign: "center",
                  }}
                >
                  Elevate
                </Text>
                <View style={{ marginTop: 4 }}>
                  <GradientText
                    text="Your Skills."
                    colors={["#E5364B", "#F43F5E", "#8B5CF6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      ...type.hero,
                      textAlign: "center",
                    }}
                  />
                </View>
              </View>
            </FadeSlideIn>

            {/* subtitle */}
            <FadeSlideIn delay={260} distance={12}>
              <Text
                style={{
                  ...type.body,
                  color: webTheme.faint,
                  textAlign: "center",
                  maxWidth: 300,
                  marginTop: 26,
                  lineHeight: 26,
                }}
              >
                A gamified micro-task marketplace. Post tasks, complete gigs, and earn real rewards all in one place.
              </Text>
            </FadeSlideIn>

            {/* CTAs */}
            <View style={{ marginTop: 32, flexDirection: "row", gap: 12, width: "100%" }}>
              <HeroButton label="Explore Tasks" icon="arrow-right" onPress={() => router.push("/explore")} primary />
              <HeroButton label="Post a Task" icon="arrow-up-right" onPress={() => router.push("/create")} />
            </View>

            {/* workspace link */}
            <FadeSlideIn delay={420} distance={8}>
              <HapticPressable hapticType="medium" onPress={() => router.push("/hub")}>
                <View
                  style={{
                    marginTop: 16,
                    borderRadius: 999,
                    padding: 1,
                    overflow: "hidden",
                  }}
                >
                  <LinearGradient
                    colors={["rgba(229,54,75,0.5)", "rgba(139,92,246,0.5)", "rgba(229,54,75,0.2)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: "absolute", inset: 0 }}
                  />
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: "rgba(13,10,12,0.95)",
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Feather name="hexagon" size={15} color={webTheme.accent} />
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13, letterSpacing: 0.3 }}>
                      Open workspace
                    </Text>
                    <Feather name="arrow-right" size={14} color={webTheme.faint} />
                  </View>
                </View>
              </HapticPressable>
            </FadeSlideIn>

            <FadeSlideIn delay={500}>
              <SectionRule />
            </FadeSlideIn>

            {/* stat cards */}
            <View style={{ marginTop: 40, width: "100%", flexDirection: "row", gap: 10 }}>
              <AnimatedList baseDelay={580} stagger={60} distance={10} itemStyle={{ flex: 1 }}>
                {stats.map((item) => (
                  <View
                    key={item.label}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.06)",
                      backgroundColor: "rgba(255,255,255,0.02)",
                      paddingVertical: 20,
                      paddingHorizontal: 8,
                    }}
                  >
                    <Feather name={item.icon as "users" | "activity" | "check-circle"} size={16} color={item.color} style={{ marginBottom: 12, opacity: 0.8 }} />
                    <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
                      {item.value}
                    </Text>
                    <Text
                      style={{
                        ...type.semibold,
                        color: webTheme.muted,
                        fontSize: 10,
                        marginTop: 6,
                        textAlign: "center"
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </AnimatedList>
            </View>
          </View>
        </View>

        {/* ── recent tasks section ── */}
        <View style={{ paddingHorizontal: 22, marginTop: 6 }}>
          <SectionRule />
          <FadeSlideIn delay={400} distance={16}>
            <View
              style={{
                marginTop: 32,
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <View>
                <Text
                  style={{
                    ...type.label,
                    color: webTheme.accentBorder,
                    fontSize: 10,
                  }}
                >
                  Live Now
                </Text>
                <Text style={{ ...type.h1, color: webTheme.text, marginTop: 10 }}>
                  Open{"\n"}Opportunities
                </Text>
              </View>
              <HapticPressable onPress={() => router.push("/explore")} hapticType="selection">
                <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 13 }}>
                  View all tasks
                </Text>
              </HapticPressable>
            </View>
          </FadeSlideIn>

          <View style={{ marginTop: 20, gap: 14 }}>
            {isFetching && tasks.length === 0 ? (
              <AnimatedList>
                <TaskCardSkeleton />
                <TaskCardSkeleton />
                <TaskCardSkeleton />
              </AnimatedList>
            ) : recentTasks.length > 0 ? (
              <AnimatedList baseDelay={100} stagger={100} distance={20}>
                {recentTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onPress={() => router.push({ pathname: "/task/[id]", params: { id: task.id } })}
                  />
                ))}
              </AnimatedList>
            ) : (
              <FadeSlideIn delay={100} distance={16}>
                <SurfaceCard>
                  <Text style={{ ...type.h3, color: webTheme.text }}>
                    No live tasks yet
                  </Text>
                  <Text style={{ ...type.body, color: webTheme.muted, marginTop: 8 }}>
                    Start by posting the first task or refresh once the backend has seeded tasks.
                  </Text>
                </SurfaceCard>
              </FadeSlideIn>
            )}
          </View>
        </View>

        {/* ── CTA card ── */}
        <View style={{ paddingHorizontal: 22, marginTop: 30 }}>
          <FadeSlideIn delay={300} distance={20}>
            <SurfaceCard accent={webTheme.accent}>
              <Text
                style={{
                  ...type.label,
                  color: webTheme.muted,
                  fontSize: 10,
                }}
              >
                Get Started
              </Text>
              <Text style={{ ...type.h1, color: webTheme.text, marginTop: 14, fontSize: 30 }}>
                Ready to Elevate?
              </Text>
              <Text style={{ ...type.body, color: webTheme.muted, marginTop: 10 }}>
                Join a growing community of skilled individuals earning real rewards and building public momentum.
              </Text>
              <View style={{ marginTop: 22, gap: 12 }}>
                <HeroButton label="Post Your First Task" icon="arrow-right" onPress={() => router.push("/create")} primary />
                <HeroButton label="Open Workspace" icon="arrow-up-right" onPress={() => router.push("/hub")} />
              </View>
            </SurfaceCard>
          </FadeSlideIn>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}