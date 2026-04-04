import { useMemo, useRef, useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, View, Animated, Dimensions, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppStackHeader } from "../components/AppStackHeader";
import { SurfaceCard } from "../components/SurfaceCard";
import { api } from "../lib/api";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";

interface AnalyticsResponse {
  posted: {
    total: number;
    completed: number;
    inProgress: number;
    open: number;
    cancelled: number;
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
  xp: number;
  fulfilled: {
    total: number;
    coinsEarned: number;
  };
  categoryBreakdown: Array<{
    name: string;
    count: number;
  }>;
  monthlyTimeline: Array<{
    label: string;
    posted: number;
    completed: number;
  }>;
  recentTasks: Array<{
    _id: string;
    title: string;
    status: string;
    coins: number;
    applicants: number;
    createdAt: string;
  }>;
}

function BackgroundParticles() {
  const { width, height } = Dimensions.get("window");
  
  const particlesRefs = useRef<Array<{
    x: Animated.Value;
    y: Animated.Value;
    opacity: Animated.Value;
    scale: Animated.Value;
    size: number;
    startX: number;
    startY: number;
    duration: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    if (particlesRefs.current.length === 0) {
      for (let i = 0; i < 25; i++) {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        const duration = 5000 + Math.random() * 7000;
        const delay = Math.random() * 3000;

        particlesRefs.current.push({
          x: new Animated.Value(startX),
          y: new Animated.Value(startY),
          opacity: new Animated.Value(0),
          scale: new Animated.Value(0),
          size: 1.5 + Math.random() * 2.5,
          startX,
          startY,
          duration,
          delay,
        });
      }
    }

    particlesRefs.current.forEach((particle) => {
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(particle.y, {
                toValue: particle.startY - height,
                duration: particle.duration,
                easing: Easing.linear,
                useNativeDriver: true,
              }),
              Animated.timing(particle.y, {
                toValue: height + 100,
                duration: 0,
                useNativeDriver: true,
              }),
            ])
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(particle.scale, {
                toValue: 1,
                duration: particle.duration / 2,
                easing: Easing.linear,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 0,
                duration: particle.duration / 2,
                easing: Easing.linear,
                useNativeDriver: true,
              }),
            ])
          ),
        ]),
      ]).start();
    });

    return () => {};
  }, [width, height]);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {particlesRefs.current.map((particle, idx) => (
        <Animated.View
          key={idx}
          style={{
            position: "absolute",
            width: particle.size,
            height: particle.size,
            borderRadius: particle.size / 2,
            backgroundColor: webTheme.orange,
            top: 0,
            left: 0,
            transform: [
              { translateX: particle.x },
              { translateY: particle.y },
              { scale: particle.scale },
            ],
            opacity: particle.opacity,
          }}
        />
      ))}
    </View>
  );
}

export default function AnalyticsScreen() {
  const analytics = useQuery<AnalyticsResponse>({
    queryKey: ["analyticsScreen"],
    queryFn: () => api.get("/api/analytics/tasks"),
  });

  const maxMonthly = useMemo(() => {
    const rows = analytics.data?.monthlyTimeline || [];
    return Math.max(1, ...rows.map((item) => Math.max(item.posted, item.completed)));
  }, [analytics.data?.monthlyTimeline]);

  const metricsIn = useRef(new Animated.Value(0)).current;
  const statsIn = useRef(new Animated.Value(0)).current;
  const contentIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(metricsIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(statsIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [metricsIn, statsIn, contentIn]);

  const metricsOpacity = metricsIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const metricsScale = metricsIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });
  const statsOpacity = statsIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const contentOpacity = contentIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <BackgroundParticles />
      <AppStackHeader title="Analytics" detail="Posted work, applicants, completion, and coin performance." />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={analytics.isFetching} onRefresh={analytics.refetch} tintColor={webTheme.red} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: metricsOpacity,
            transform: [{ scale: metricsScale }],
          }}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {[
              { label: "Posted", value: analytics.data?.posted.total ?? 0, accent: webTheme.text },
              { label: "Completion", value: `${analytics.data?.posted.completionRate ?? 0}%`, accent: webTheme.red },
              { label: "Applicants", value: analytics.data?.applicants.total ?? 0, accent: webTheme.blue },
              { label: "Balance", value: analytics.data?.coins.balance ?? 0, accent: webTheme.gold },
            ].map((item) => (
              <View key={item.label} style={{ width: "47%" }}>
                <SurfaceCard>
                  <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase" }}>
                    {item.label}
                  </Text>
                  <Text style={{ ...type.black, color: item.accent, fontSize: 28, marginTop: 10 }}>
                    {item.value}
                  </Text>
                </SurfaceCard>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: statsOpacity }}>
          <SurfaceCard style={{ marginTop: 18 }} accent={webTheme.orange}>
            <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
              Output Breakdown
            </Text>
            <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {[
              { label: "Open", value: analytics.data?.posted.open ?? 0 },
              { label: "In Progress", value: analytics.data?.posted.inProgress ?? 0 },
              { label: "Completed", value: analytics.data?.posted.completed ?? 0 },
              { label: "Cancelled", value: analytics.data?.posted.cancelled ?? 0 },
            ].map((item) => (
              <View key={item.label} style={{ width: "48%" }}>
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    padding: 14,
                  }}
                >
                  <Text 
                    style={{ ...type.bold, color: webTheme.faint, fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    {item.label}
                  </Text>
                  <Text style={{ ...type.black, color: webTheme.text, fontSize: 22, marginTop: 8 }}>
                    {item.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard style={{ marginTop: 18 }}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
            Coin Flow
          </Text>
          <View style={{ marginTop: 16, gap: 12 }}>
            {[
              { label: "Total Posted", value: analytics.data?.coins.totalPosted ?? 0, accent: webTheme.text },
              { label: "Income", value: analytics.data?.coins.income ?? 0, accent: webTheme.green },
              { label: "Spending", value: analytics.data?.coins.spending ?? 0, accent: webTheme.red },
              { label: "Earned", value: analytics.data?.coins.coinsEarned ?? 0, accent: webTheme.gold },
            ].map((item) => (
              <View key={item.label}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>{item.label}</Text>
                  <Text style={{ ...type.bold, color: item.accent, fontSize: 13 }}>{item.value}</Text>
                </View>
                <View style={{ height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <View
                    style={{
                      width: `${Math.min(((item.value || 0) / Math.max(analytics.data?.coins.totalPosted || 1, 1)) * 100, 100)}%`,
                      height: "100%",
                      borderRadius: 999,
                      backgroundColor: item.accent,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard style={{ marginTop: 18 }} accent={webTheme.red}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
            Monthly Timeline
          </Text>
          <View style={{ marginTop: 16, gap: 14 }}>
            {(analytics.data?.monthlyTimeline || []).map((item) => (
              <View key={item.label}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>{item.label}</Text>
                  <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12 }}>
                    {item.posted} posted • {item.completed} completed
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <View style={{ width: `${(item.posted / maxMonthly) * 100}%`, height: "100%", borderRadius: 999, backgroundColor: webTheme.red }} />
                  </View>
                  <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <View style={{ width: `${(item.completed / maxMonthly) * 100}%`, height: "100%", borderRadius: 999, backgroundColor: webTheme.green }} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard style={{ marginTop: 18 }}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
            Category Spread
          </Text>
          <View style={{ marginTop: 16, gap: 12 }}>
            {(analytics.data?.categoryBreakdown || []).map((item) => {
              const max = Math.max(1, ...(analytics.data?.categoryBreakdown || []).map((row) => row.count));
              return (
                <View key={item.name}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>{item.name}</Text>
                    <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 12 }}>{item.count}</Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <View style={{ width: `${(item.count / max) * 100}%`, height: "100%", borderRadius: 999, backgroundColor: webTheme.orange }} />
                  </View>
                </View>
              );
            })}
          </View>
        </SurfaceCard>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity }}>
        <View style={{ marginTop: 20, gap: 12 }}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 26 }}>
            Recent Tasks
          </Text>
          {(analytics.data?.recentTasks || []).map((task) => (
            <Pressable key={task._id} onPress={() => router.push({ pathname: "/task/[id]", params: { id: task._id } })}>
              <SurfaceCard>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...type.extrabold, color: webTheme.text, fontSize: 16 }}>
                      {task.title}
                    </Text>
                    <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 6 }}>
                      {task.applicants} applicants • {task.coins} coins
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase" }}>
                      {task.status}
                    </Text>
                  </View>
                </View>
              </SurfaceCard>
            </Pressable>
          ))}
        </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
