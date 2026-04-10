import { useMemo, useState, useRef, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppStackHeader } from "../components/AppStackHeader";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { notify } from "../stores/toastStore";
import { SurfaceCard } from "../components/SurfaceCard";
import { api, getErrorMessage } from "../lib/api";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";

interface Relic {
  id: string;
  name: string;
  tier: string;
  bonus: string;
  recipe: {
    focus: number;
    creativity: number;
    discipline: number;
  };
}

interface ProfileResponse {
  essences?: {
    focus?: number;
    creativity?: number;
    discipline?: number;
  };
  relics?: Array<{
    id: string;
    name: string;
    tier: string;
    bonus: string;
  }>;
}

const essenceLabels = [
  { key: "focus", label: "Focus", accent: webTheme.blue },
  { key: "creativity", label: "Creativity", accent: webTheme.red },
  { key: "discipline", label: "Discipline", accent: webTheme.gold },
] as const;

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
      for (let i = 0; i < 20; i++) {
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
            toValue: 0.4,
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
            backgroundColor: webTheme.purple,
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

export default function AlchemyScreen() {
  const queryClient = useQueryClient();
  const [selectedRelic, setSelectedRelic] = useState<Relic | null>(null);
  const [transmuteFrom, setTransmuteFrom] = useState<"focus" | "creativity" | "discipline">("focus");
  const [transmuteTo, setTransmuteTo] = useState<"focus" | "creativity" | "discipline">("creativity");

  const essencesIn = useRef(new Animated.Value(0)).current;
  const relicsIn = useRef(new Animated.Value(0)).current;
  const contentIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(essencesIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(relicsIn, {
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
  }, [essencesIn, relicsIn, contentIn]);

  const essencesOpacity = essencesIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const essencesScale = essencesIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });
  const relicsOpacity = relicsIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const contentOpacity = contentIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const profile = useQuery<ProfileResponse>({
    queryKey: ["alchemyProfile"],
    queryFn: () => api.get("/api/users/profile"),
  });

  const relics = useQuery<Relic[]>({
    queryKey: ["alchemyRelics"],
    queryFn: () => api.get("/api/alchemy/relics"),
    retry: false,
  });

  const craftMutation = useMutation({
    mutationFn: (relicId: string) => api.post("/api/alchemy/craft", { relicId }),
    onSuccess: async () => {
      setSelectedRelic(null);
      await Promise.all([
        profile.refetch(),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const transmuteMutation = useMutation({
    mutationFn: () => api.post("/api/alchemy/transmute", { from: transmuteFrom, to: transmuteTo }),
    onSuccess: async () => {
      await Promise.all([
        profile.refetch(),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const ownedRelicIds = useMemo(
    () => new Set((profile.data?.relics || []).map((item) => item.id)),
    [profile.data?.relics],
  );

  const canCraft = (relic: Relic) => {
    const essences = profile.data?.essences || {};
    return (
      (essences.focus || 0) >= relic.recipe.focus &&
      (essences.creativity || 0) >= relic.recipe.creativity &&
      (essences.discipline || 0) >= relic.recipe.discipline
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <BackgroundParticles />
      <AppStackHeader title="Alchemy Lab" detail="Essences, relic crafting, and transmutation." />
      <ConfirmDialog
        visible={Boolean(selectedRelic)}
        title={selectedRelic ? `Craft ${selectedRelic.name}?` : "Craft relic?"}
        detail={selectedRelic ? selectedRelic.bonus : ""}
        confirmLabel="Craft"
        onClose={() => setSelectedRelic(null)}
        onConfirm={() => {
          if (!selectedRelic) return;
          craftMutation.mutate(selectedRelic.id);
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={profile.isFetching || relics.isFetching} onRefresh={() => {
          profile.refetch();
          relics.refetch();
        }} tintColor={webTheme.red} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: essencesOpacity,
            transform: [{ scale: essencesScale }],
          }}
        >
          <View style={{ flexDirection: "row", gap: 12 }}>
            {essenceLabels.map((item) => (
              <View key={item.key} style={{ flex: 1 }}>
                <SurfaceCard>
                  <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase" }}>
                    {item.label}
                  </Text>
                  <Text style={{ ...type.black, color: item.accent, fontSize: 28, marginTop: 10 }}>
                    {profile.data?.essences?.[item.key] || 0}
                  </Text>
                </SurfaceCard>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: relicsOpacity }}>
          <SurfaceCard style={{ marginTop: 18 }} accent={webTheme.purple}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
            Owned Relics
          </Text>
          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, lineHeight: 22, marginTop: 8 }}>
            {profile.data?.relics?.length || 0} crafted relics active in your inventory.
          </Text>
          <View style={{ marginTop: 14, gap: 10 }}>
            {(profile.data?.relics || []).slice(0, 4).map((relic) => (
              <View
                key={relic.id}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: webTheme.border,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>{relic.name}</Text>
                <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 6 }}>
                  {relic.tier} • {relic.bonus}
                </Text>
              </View>
            ))}
          </View>
        </SurfaceCard>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity }}>
        <SurfaceCard style={{ marginTop: 18 }} accent={webTheme.red}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
            Transmute Essences
          </Text>
          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, lineHeight: 22, marginTop: 8 }}>
            Exchange `3` of one essence into `1` of another.
          </Text>

          <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
            {["focus", "creativity", "discipline"].map((item) => {
              const active = transmuteFrom === item;
              return (
                <Pressable
                  key={`from-${item}`}
                  onPress={() => {
                    const next = item as typeof transmuteFrom;
                    setTransmuteFrom(next);
                    if (next === transmuteTo) {
                      setTransmuteTo(next === "focus" ? "creativity" : "focus");
                    }
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: active ? "rgba(214,60,71,0.28)" : webTheme.border,
                    backgroundColor: active ? "rgba(214,60,71,0.10)" : "rgba(255,255,255,0.03)",
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ ...type.bold, color: active ? webTheme.red : webTheme.text, fontSize: 12 }}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 10, flexDirection: "row", gap: 12 }}>
            {["focus", "creativity", "discipline"].map((item) => {
              const disabled = item === transmuteFrom;
              const active = transmuteTo === item;
              return (
                <Pressable
                  key={`to-${item}`}
                  disabled={disabled}
                  onPress={() => setTransmuteTo(item as typeof transmuteTo)}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: active ? "rgba(168,85,247,0.28)" : webTheme.border,
                    backgroundColor: active ? "rgba(168,85,247,0.10)" : "rgba(255,255,255,0.03)",
                    paddingVertical: 12,
                    alignItems: "center",
                    opacity: disabled ? 0.35 : 1,
                  }}
                >
                  <Text style={{ ...type.bold, color: active ? webTheme.purple : webTheme.text, fontSize: 12 }}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => transmuteMutation.mutate()}
            disabled={transmuteMutation.isPending}
            style={{
              marginTop: 16,
              borderRadius: 999,
              backgroundColor: webTheme.red,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
              {transmuteMutation.isPending ? "Transmuting..." : `Transmute ${transmuteFrom} to ${transmuteTo}`}
            </Text>
          </Pressable>
        </SurfaceCard>

        <View style={{ marginTop: 20, gap: 14 }}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 26 }}>
            Craftable Relics
          </Text>
          {(relics.data || []).map((relic) => {
            const owned = ownedRelicIds.has(relic.id);
            const available = canCraft(relic);
            return (
              <SurfaceCard key={relic.id} accent={owned ? webTheme.purple : available ? webTheme.red : undefined}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...type.extrabold, color: webTheme.text, fontSize: 18 }}>
                      {relic.name}
                    </Text>
                    <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, marginTop: 6 }}>
                      {relic.tier} • {relic.bonus}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: owned ? "rgba(168,85,247,0.28)" : available ? "rgba(214,60,71,0.28)" : webTheme.border,
                      backgroundColor: owned ? "rgba(168,85,247,0.10)" : available ? "rgba(214,60,71,0.10)" : "rgba(255,255,255,0.03)",
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text style={{ ...type.bold, color: owned ? webTheme.purple : available ? webTheme.red : webTheme.muted, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" }}>
                      {owned ? "Owned" : available ? "Craftable" : "Locked"}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
                  {essenceLabels.map((essence) => (
                    <View key={essence.key} style={{ flex: 1 }}>
                      <View
                        style={{
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: webTheme.border,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          padding: 12,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ ...type.bold, color: essence.accent, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>
                          {essence.label}
                        </Text>
                        <Text style={{ ...type.black, color: webTheme.text, fontSize: 18, marginTop: 8 }}>
                          {relic.recipe[essence.key]}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {!owned ? (
                  <Pressable
                    onPress={() => setSelectedRelic(relic)}
                    disabled={!available || craftMutation.isPending}
                    style={{
                      marginTop: 16,
                      borderRadius: 999,
                      backgroundColor: available ? webTheme.red : "rgba(255,255,255,0.08)",
                      paddingVertical: 14,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                      {craftMutation.isPending && selectedRelic?.id === relic.id ? "Crafting..." : available ? "Craft relic" : "Need more essences"}
                    </Text>
                  </Pressable>
                ) : null}
              </SurfaceCard>
            );
          })}
        </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
