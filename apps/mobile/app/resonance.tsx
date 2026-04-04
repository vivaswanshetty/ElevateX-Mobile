import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Animated, Easing, Pressable, RefreshControl, ScrollView, Text, View, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppStackHeader } from "../components/AppStackHeader";
import { GradientText } from "../components/GradientText";
import { SurfaceCard } from "../components/SurfaceCard";
import { api } from "../lib/api";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";

interface ResonanceTask {
  _id: string;
  title: string;
  status?: string;
  createdAt?: string;
  createdBy?: {
    name?: string;
  };
}

interface ResonancePost {
  _id: string;
  content: string;
  createdAt: string;
  author?: {
    name?: string;
  };
}

interface ResonanceDuel {
  _id: string;
  status: "pending" | "active" | "completed" | "rejected" | "cancelled";
}

interface ResonanceEvent {
  id: string;
  actor: string;
  detail: string;
  createdAt: string;
  type: "task" | "post";
}

interface Particle {
  id: number;
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
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
    // Initialize particles once
    if (particlesRefs.current.length === 0) {
      for (let i = 0; i < 30; i++) {
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

    // Start animations for each particle
    particlesRefs.current.forEach((particle) => {
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 0.7,
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
            backgroundColor: webTheme.red,
            top: 0,
            left: 0,
            transform: [
              { translateX: particle.x },
              { translateY: particle.y },
              { scale: particle.scale },
            ],
            opacity: particle.opacity,
            shadowColor: webTheme.red,
            shadowOpacity: 0.4,
            shadowRadius: 4,
          }}
        />
      ))}
    </View>
  );
}

function ParticleEmitter({ trigger }: { trigger: Animated.Value }) {
  const particles: Particle[] = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      position: {
        x: Math.cos((i / 12) * Math.PI * 2) * 80,
        y: Math.sin((i / 12) * Math.PI * 2) * 80,
      },
      size: 2 + Math.random() * 3,
      duration: 800 + Math.random() * 400,
      delay: i * 30,
    }));
  }, []);

  return (
    <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
      {particles.map((particle) => {
        const anim = trigger.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        });

        return (
          <Animated.View
            key={particle.id}
            style={{
              position: "absolute",
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              backgroundColor: webTheme.red,
              opacity: anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1, 0],
              }),
              transform: [
                {
                  translateX: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, particle.position.x],
                  }),
                },
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, particle.position.y],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

function getRecentBursts(posts: ResonancePost[]) {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return posts.filter((item) => new Date(item.createdAt).getTime() >= dayAgo).length;
}

export default function ResonanceScreen() {
  const [waveEmissions, setWaveEmissions] = useState(0);
  const heroIn = useRef(new Animated.Value(0)).current;
  const statsIn = useRef(new Animated.Value(0)).current;
  const feedIn = useRef(new Animated.Value(0)).current;
  const snapshotIn = useRef(new Animated.Value(0)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;
  const livePulse = useRef(new Animated.Value(0)).current;
  const shimmerProgress = useRef(new Animated.Value(0)).current;
  const waveEmit = useRef(new Animated.Value(0)).current;
  const lightningScale = useRef(new Animated.Value(1)).current;

  const tasks = useQuery<ResonanceTask[]>({
    queryKey: ["resonanceTasks"],
    queryFn: () => api.get("/api/tasks"),
  });

  const liveDuels = useQuery<ResonanceDuel[]>({
    queryKey: ["resonanceLiveDuels"],
    queryFn: () => api.get("/api/duels/live"),
  });

  const posts = useQuery<ResonancePost[]>({
    queryKey: ["resonancePosts"],
    queryFn: () => api.get("/api/posts"),
  });

  const taskRows = tasks.data || [];
  const postRows = posts.data || [];
  const duelRows = liveDuels.data || [];

  const openTasks = taskRows.filter((item) => item.status === "Open").length;
  const completedTasks = taskRows.filter((item) => item.status === "Completed").length;
  const activeDuels = duelRows.filter((item) => item.status === "active").length;
  const recentBursts = getRecentBursts(postRows);

  const activeSouls = 120 + openTasks * 3 + activeDuels * 11 + Math.min(24, recentBursts * 2);
  const harmonyIndex = Math.min(98, 48 + openTasks * 2 + activeDuels * 7 + recentBursts * 2);

  const resonanceEvents = useMemo<ResonanceEvent[]>(() => {
    const taskEvents = taskRows.slice(0, 4).map((task) => ({
      id: `task-${task._id}`,
      actor: task.createdBy?.name || "Task creator",
      detail: task.title,
      createdAt: task.createdAt || new Date().toISOString(),
      type: "task" as const,
    }));

    const postEvents = postRows.slice(0, 4).map((post) => ({
      id: `post-${post._id}`,
      actor: post.author?.name || "Community member",
      detail: post.content,
      createdAt: post.createdAt,
      type: "post" as const,
    }));

    return [...taskEvents, ...postEvents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [postRows, taskRows]);

  const refreshing = tasks.isFetching || liveDuels.isFetching || posts.isFetching;
  const transition = {
    duration: 560,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true as const,
  };

  const emitWave = () => {
    setWaveEmissions(prev => prev + 1);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(lightningScale, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(lightningScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(waveEmit, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(waveEmit, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  useEffect(() => {
    const intro = Animated.stagger(100, [
      Animated.timing(heroIn, { ...transition, toValue: 1 }),
      Animated.timing(statsIn, { ...transition, toValue: 1 }),
      Animated.timing(feedIn, { ...transition, toValue: 1 }),
      Animated.timing(snapshotIn, { ...transition, toValue: 1 }),
    ]);
    intro.start();

    const blobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(blobPulse, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(blobPulse, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    blobLoop.start();

    const liveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    liveLoop.start();

    shimmerProgress.setValue(0);
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerProgress, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    shimmerLoop.start();

    return () => {
      intro.stop();
      blobLoop.stop();
      liveLoop.stop();
      shimmerLoop.stop();
    };
  }, []);

  const blobScale = blobPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.14],
  });
  const blobShiftX = blobPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14],
  });
  const blobShiftY = blobPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const reverseBlobScale = blobPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1.1, 1],
  });
  const reverseBlobShiftX = blobPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });
  const reverseBlobShiftY = blobPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });
  const livePingScale = livePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });
  const livePingOpacity = livePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });
  const shimmerX = shimmerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 320],
  });
  const waveScale = waveEmit.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3],
  });
  const waveOpacity = waveEmit.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });
  const heroY = heroIn.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const statsY = statsIn.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const feedY = feedIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const snapshotY = snapshotIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <BackgroundParticles />
      <AppStackHeader title="Resonance Chamber" detail="Tap to emit energy waves across the collective." />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              tasks.refetch();
              liveDuels.refetch();
              posts.refetch();
            }}
            tintColor={webTheme.red}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: heroIn, transform: [{ translateY: heroY }] }}>
          <View style={{ marginBottom: 32, paddingHorizontal: 0 }}>
            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(214,60,71,0.28)",
                backgroundColor: "rgba(214,60,71,0.10)",
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignSelf: "center",
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                marginBottom: 20,
              }}
            >
              <Feather name="radio" size={12} color={webTheme.red} />
              <View style={{ width: 8, height: 8, position: "relative", marginLeft: 2 }}>
                <Animated.View
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 999,
                    backgroundColor: webTheme.red,
                    opacity: livePingOpacity,
                    transform: [{ scale: livePingScale }],
                  }}
                />
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: webTheme.red,
                  }}
                />
              </View>
              <Text style={{ ...type.bold, color: webTheme.red, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase" }}>
                Collective Consciousness
              </Text>
              <Text style={{ ...type.bold, color: webTheme.red, fontSize: 10, marginLeft: 4 }}>
                LIVE
              </Text>
            </View>

            <Text style={{ ...type.black, color: webTheme.text, fontSize: 48, lineHeight: 52, letterSpacing: -2, textAlign: "center" }}>
              Resonance
            </Text>
            <View style={{ alignItems: "center", marginTop: -4 }}>
              <GradientText
                text="Chamber"
                colors={["#ef4444", "#f43f5e", "#a855f7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ ...type.black, fontSize: 48, lineHeight: 52, letterSpacing: -2 }}
              />
            </View>

            <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 15, lineHeight: 24, marginTop: 16, textAlign: "center" }}>
              Real-time synchronization of human effort. Tap anywhere to emit a resonance wave.
            </Text>
          </View>

          {/* Central Lightning Icon with Interactive Wave */}
          <Pressable onPress={emitWave} style={{ alignItems: "center", marginBottom: 40 }}>
            <View
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {/* Wave Rings */}
              <Animated.View
                style={{
                  position: "absolute",
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  borderWidth: 2,
                  borderColor: webTheme.red,
                  transform: [{ scale: waveScale }],
                  opacity: waveOpacity,
                }}
              />
              <Animated.View
                style={{
                  position: "absolute",
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  borderWidth: 1.5,
                  borderColor: webTheme.red,
                  transform: [{ scale: waveScale.interpolate({ inputRange: [1, 3], outputRange: [0.95, 2.7] }) }],
                  opacity: waveOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
                }}
              />

              {/* Background Circle */}
              <LinearGradient
                colors={["rgba(214,60,71,0.15)", "rgba(214,60,71,0.05)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 80,
                }}
              />

              {/* Lightning Icon */}
              <Animated.View style={{ transform: [{ scale: lightningScale }] }}>
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: "rgba(214,60,71,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(214,60,71,0.4)",
                  }}
                >
                  <Text style={{ fontSize: 50 }}>⚡</Text>
                </View>
              </Animated.View>

              {/* Particle Emitter */}
              <ParticleEmitter trigger={waveEmit} />
            </View>
            <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 12, marginTop: 16, letterSpacing: 1.2, textTransform: "uppercase" }}>
              Emit Wave ({waveEmissions})
            </Text>
          </Pressable>

          {/* Stat Cards Below */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Active Souls", value: `${activeSouls}`, icon: "users", accent: webTheme.red },
              { label: "Harmony", value: `${harmonyIndex}%`, icon: "activity", accent: webTheme.green },
              { label: "Resonated", value: `${completedTasks}`, icon: "target", accent: webTheme.purple },
            ].map((item) => (
              <Animated.View key={item.label} style={{ flex: 1, opacity: statsIn, transform: [{ translateY: statsY }] }}>
                <SurfaceCard>
                  <Feather name={item.icon as "users" | "activity" | "target"} size={16} color={item.accent} />
                  <Text style={{ ...type.black, color: webTheme.text, fontSize: 22, marginTop: 10 }}>
                    {item.value}
                  </Text>
                  <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 10, marginTop: 4, letterSpacing: 1.5, textTransform: "uppercase" }}>
                    {item.label}
                  </Text>
                </SurfaceCard>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={{ marginTop: 16, opacity: feedIn, transform: [{ translateY: feedY }] }}>
          <SurfaceCard>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ ...type.black, color: webTheme.text, fontSize: 20 }}>
              Latest Harmonizations
            </Text>
            <Pressable onPress={() => router.push("/feed")}>
              <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 12 }}>
                Open feed
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 14, gap: 10 }}>
            {resonanceEvents.length > 0 ? (
              resonanceEvents.map((event, index) => (
                <Animated.View
                  key={event.id}
                  style={{
                    opacity: feedIn,
                    transform: [
                      {
                        translateX: feedIn.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12 + index * 7, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <View
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: event.type === "task" ? "rgba(214,60,71,0.16)" : "rgba(59,130,246,0.14)",
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>
                        {event.type === "task" ? "⚡" : "💬"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                        {event.actor}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 4 }}
                      >
                        {event.detail}
                      </Text>
                    </View>
                    <Text style={{ ...type.medium, color: webTheme.faint, fontSize: 10 }}>
                      {formatTime(event.createdAt)}
                    </Text>
                  </View>
                </Animated.View>
              ))
            ) : (
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: webTheme.border,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  paddingHorizontal: 14,
                  paddingVertical: 16,
                }}
              >
                <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>
                  No live events yet
                </Text>
                <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 6, lineHeight: 20 }}>
                  Once tasks and posts are active, this room will stream the latest harmonizations.
                </Text>
              </View>
            )}
          </View>
          </SurfaceCard>
        </Animated.View>

        <Animated.View style={{ marginTop: 16, opacity: snapshotIn, transform: [{ translateY: snapshotY }] }}>
          <SurfaceCard accent={webTheme.orange}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 20 }}>
            Momentum Snapshot
          </Text>
          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, marginTop: 10, lineHeight: 22 }}>
            {openTasks} open tasks, {activeDuels} active duels, and {recentBursts} public updates in the last 24h.
          </Text>
          </SurfaceCard>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
