import React, { useEffect, useState } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { Feather, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGamificationStore } from "../stores/gamificationStore";
import { useAuthStore } from "../stores/authStore";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { useThemeStore } from "../stores/themeStore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PARTICLE_COUNT = 16;

interface ParticleProps {
  index: number;
  isCoin: boolean;
}

function Particle({ index, isCoin }: ParticleProps) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Distribute particles in a circle
  const angle = (index * 2 * Math.PI) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.3;
  const targetDistance = 100 + Math.random() * 80;
  const targetX = Math.cos(angle) * targetDistance;
  const targetY = Math.sin(angle) * targetDistance - 30; // slightly upward bias

  useEffect(() => {
    progress.value = withSpring(1, {
      damping: 15,
      stiffness: 90,
      mass: 0.8,
    });
    opacity.value = withDelay(1200, withTiming(0, { duration: 500 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = progress.value * (0.6 + Math.random() * 0.5);
    return {
      transform: [
        { translateX: progress.value * targetX },
        { translateY: progress.value * targetY },
        { scale },
        { rotate: `${progress.value * 360}deg` },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.particle, animatedStyle]}>
      {isCoin ? (
        <FontAwesome5 name="coins" size={14} color={webTheme.gold} />
      ) : (
        <Feather name="star" size={16} color="#c084fc" />
      )}
    </Animated.View>
  );
}

export function GamificationOverlay() {
  const { pendingXP, pendingCoins, showXPAnimation, clearPendingXP } = useGamificationStore();
  const { user } = useAuthStore();
  const [active, setActive] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  // Card entering / exiting animations
  const scale = useSharedValue(0.3);
  const cardOpacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  const overlayOpacity = useSharedValue(0);

  // XP/Coin diff tracking
  const [lastXP, setLastXP] = useState<number | null>(null);
  const [lastCoins, setLastCoins] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setLastXP(null);
      setLastCoins(null);
      return;
    }

    // Skip triggering on hydration (when last values are null)
    if (lastXP !== null && user.xp > lastXP) {
      const diff = user.xp - lastXP;
      useGamificationStore.getState().addPendingXP(diff);
    }
    if (lastCoins !== null && user.tokenBalance > lastCoins) {
      const diff = user.tokenBalance - lastCoins;
      useGamificationStore.getState().addPendingCoins(diff);
    }

    setLastXP(user.xp);
    setLastCoins(user.tokenBalance);
  }, [user?.xp, user?.tokenBalance]);

  useEffect(() => {
    if (showXPAnimation && (pendingXP > 0 || pendingCoins > 0)) {
      setActive(true);
      
      // Trigger success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Fade in overlay backdrop
      overlayOpacity.value = withTiming(1, { duration: 250 });

      // Animate card entry
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
      cardOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 12, stiffness: 100 });

      // Auto dismiss sequence
      const timer = setTimeout(() => {
        overlayOpacity.value = withTiming(0, { duration: 300 });
        cardOpacity.value = withTiming(0, { duration: 250 });
        translateY.value = withTiming(30, { duration: 250 });
        scale.value = withTiming(0.8, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(handleAnimationEnd)();
          }
        });
      }, 2400);

      return () => clearTimeout(timer);
    }
  }, [showXPAnimation, pendingXP, pendingCoins]);

  const handleAnimationEnd = () => {
    setActive(false);
    clearPendingXP();
  };

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: cardOpacity.value,
  }));

  if (!active) return null;

  return (
    <Animated.View style={[styles.container, overlayAnimatedStyle]} pointerEvents="none">
      {/* Translucent Backdrop */}
      <View style={[styles.backdrop, { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)" }]} />

      {/* Explosion Center */}
      <View style={styles.explosionCenter}>
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <Particle key={i} index={i} isCoin={i % 2 === 0 && pendingCoins > 0} />
        ))}
      </View>

      {/* Reward Card */}
      <Animated.View
        style={[
          styles.card,
          cardAnimatedStyle,
          {
            backgroundColor: isDark ? "rgba(22, 22, 26, 0.95)" : "rgba(255, 255, 255, 0.95)",
            borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
            shadowColor: isDark ? "#000" : "#000",
          },
        ]}
      >
        <View style={styles.badgeIconContainer}>
          <LinearGradientWrapper isCoin={pendingCoins > 0 && pendingXP === 0}>
            <View style={styles.iconCircle}>
              {pendingCoins > 0 && pendingXP === 0 ? (
                <FontAwesome5 name="coins" size={26} color={webTheme.gold} />
              ) : (
                <Feather name="award" size={32} color={webTheme.accent} />
              )}
            </View>
          </LinearGradientWrapper>
        </View>

        <Text style={[styles.title, { color: isDark ? "#FFF" : "#000" }]}>
          Reward Earned!
        </Text>
        <Text style={[styles.subtitle, { color: webTheme.muted }]}>
          Your effort is locked in. Progress logged.
        </Text>

        <View style={styles.rewardsRow}>
          {pendingXP > 0 && (
            <View style={[styles.rewardBadge, { backgroundColor: "rgba(139, 92, 246, 0.1)", borderColor: "rgba(139, 92, 246, 0.2)" }]}>
              <Feather name="zap" size={14} color="#8B5CF6" />
              <Text style={[styles.rewardText, { color: "#A78BFA" }]}>+{pendingXP} XP</Text>
            </View>
          )}
          {pendingCoins > 0 && (
            <View style={[styles.rewardBadge, { backgroundColor: "rgba(234, 179, 8, 0.1)", borderColor: "rgba(234, 179, 8, 0.2)" }]}>
              <FontAwesome5 name="coins" size={12} color={webTheme.gold} style={{ marginRight: 2 }} />
              <Text style={[styles.rewardText, { color: webTheme.gold }]}>+{pendingCoins} coins</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// Simple layout fallback instead of full dependency wrapper if linear gradient isn't in scope
function LinearGradientWrapper({ children, isCoin }: { children: React.ReactNode; isCoin: boolean }) {
  try {
    const { LinearGradient } = require("expo-linear-gradient");
    return (
      <LinearGradient
        colors={isCoin ? [webTheme.gold, "#CA8A04"] : [webTheme.accent, "#F43F5E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        {children}
      </LinearGradient>
    );
  } catch (e) {
    return <View style={[styles.gradientBorder, { backgroundColor: webTheme.accent }]}>{children}</View>;
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  explosionCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: SCREEN_WIDTH * 0.82,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  badgeIconContainer: {
    width: 74,
    height: 74,
    marginBottom: 16,
  },
  gradientBorder: {
    width: "100%",
    height: "100%",
    borderRadius: 37,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 35,
    backgroundColor: "#16161a",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...type.black,
    fontSize: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    ...type.regular,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  rewardsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  rewardText: {
    ...type.bold,
    fontSize: 13,
  },
});
