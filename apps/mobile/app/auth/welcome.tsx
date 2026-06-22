import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, Text, View, Dimensions, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useRef, useEffect } from "react";
import { GradientText } from "../../components/GradientText";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";
import { HapticPressable } from "../../components/HapticPressable";
import { type } from "../../lib/typography";
import { webTheme } from "../../lib/webTheme";
import { useThemeStore } from "../../stores/themeStore";
import { useHaptic } from "../../lib/useHaptic";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withRepeat, 
  withSequence 
} from "react-native-reanimated";

const onboardingSlides = [
  {
    icon: "zap",
    color: webTheme.accent,
    bgGlow: "rgba(229, 54, 75, 0.16)",
    titleLine1: "Gamified",
    titleLine2: "Work & Quests.",
    gradientColors: ["#E5364B", "#F43F5E", "#8B5CF6"] as const,
    subtitle: "Post developer quests, complete gigs, and earn real rewards. Turn your daily tasks into an epic, gamified questline with XP & coins!",
  },
  {
    icon: "shield",
    color: webTheme.gold,
    bgGlow: "rgba(234, 179, 8, 0.16)",
    titleLine1: "Secure",
    titleLine2: "Escrow & Chat.",
    gradientColors: ["#FBBF24", "#F59E0B", "#D97706"] as const,
    subtitle: "Collaborate with real-time direct messaging and transact securely. Funds are safely locked in smart escrows until the work is verified.",
  },
  {
    icon: "cpu",
    color: webTheme.violet,
    bgGlow: "rgba(139, 92, 246, 0.16)",
    titleLine1: "AI Match &",
    titleLine2: "Social Feed.",
    gradientColors: ["#A78BFA", "#8B5CF6", "#6D28D9"] as const,
    subtitle: "Stay on top of public momentum with our community feed, and let our intelligent AI assistant match you with the perfect tasks instantly!",
  },
] as const;

const bgGradients = {
  dark: [
    ["rgba(229, 54, 75, 0.12)", "rgba(139, 92, 246, 0.04)", "transparent"],
    ["rgba(234, 179, 8, 0.12)", "rgba(249, 115, 22, 0.04)", "transparent"],
    ["rgba(139, 92, 246, 0.12)", "rgba(109, 40, 217, 0.04)", "transparent"],
  ],
  light: [
    ["rgba(229, 54, 75, 0.05)", "rgba(139, 92, 246, 0.02)", "transparent"],
    ["rgba(234, 179, 8, 0.05)", "rgba(249, 115, 22, 0.02)", "transparent"],
    ["rgba(139, 92, 246, 0.05)", "rgba(109, 40, 217, 0.02)", "transparent"],
  ],
} as const;

export default function WelcomeScreen() {
  const theme = useThemeStore((s) => s.theme);
  const triggerHaptic = useHaptic();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Soft floating animation for slide icons
  const floatAnim = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withSpring(6, { damping: 4, stiffness: 20 }),
        withSpring(-6, { damping: 4, stiffness: 20 })
      ),
      -1,
      true
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }],
  }));

  const handleAuthRedirect = () => {
    triggerHaptic("medium");
    router.push("/auth/login");
  };

  const handleNextSlide = () => {
    if (activeSlide < onboardingSlides.length - 1) {
      triggerHaptic("light");
      scrollViewRef.current?.scrollTo({
        x: (activeSlide + 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop />
      
      {/* Background Gradient Accent Wash */}
      <LinearGradient
        colors={bgGradients[theme === "dark" ? "dark" : "light"][activeSlide]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.85, pointerEvents: "none" }}
      />

      {/* Top Header Bar */}
      <View 
        style={{ 
          width: "100%", 
          flexDirection: "row", 
          justifyContent: "space-between", 
          alignItems: "center",
          paddingHorizontal: 24, 
          paddingTop: Platform.OS === "android" ? 12 : 6,
          height: 60,
          zIndex: 100 
        }}
      >
        <Text style={{ ...type.extrabold, color: webTheme.text, fontSize: 20, letterSpacing: 0.5 }}>
          Elevate<Text style={{ color: webTheme.accent }}>X</Text>
        </Text>
        
        <HapticPressable onPress={handleAuthRedirect} hapticType="light">
          <View style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            backgroundColor: "rgba(255,255,255,0.04)",
            paddingHorizontal: 16,
            paddingVertical: 8
          }}>
            <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>
              Sign In
            </Text>
          </View>
        </HapticPressable>
      </View>

      {/* Full-Screen Horizontal Walkthrough ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const index = Math.round(x / SCREEN_WIDTH);
          if (index !== activeSlide) {
            setActiveSlide(index);
            triggerHaptic("selection");
          }
        }}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {onboardingSlides.map((slide, idx) => (
          <View
            key={idx}
            style={{
              width: SCREEN_WIDTH,
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 30,
              paddingBottom: 80, // Leave breathing room for bottom controls
            }}
          >
            {/* Animated Glowing Icon Badge */}
            <Animated.View style={[{ position: "relative", marginBottom: 36, alignItems: "center", justifyContent: "center" }, floatStyle]}>
              {/* Outer Glow Wash */}
              <View
                style={{
                  position: "absolute",
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  backgroundColor: slide.bgGlow,
                  opacity: 0.9,
                  shadowColor: slide.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 30,
                }}
              />
              
              {/* Glassmorphic Border Circle */}
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  borderWidth: 1.5,
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: slide.color,
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.4,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                {/* Inner Gradient Glow */}
                <LinearGradient
                  colors={[`${slide.color}00`, `${slide.color}25`]}
                  style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 45,
                  }}
                />
                <Feather name={slide.icon as any} size={36} color={slide.color} />
              </View>

              {/* Decorative Particle Accents */}
              <View
                style={{
                  position: "absolute",
                  top: -8,
                  right: -10,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: slide.color,
                  opacity: 0.7,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: -6,
                  left: -12,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: slide.color,
                  opacity: 0.5,
                }}
              />
            </Animated.View>

            {/* Title Line 1 */}
            <Text
              style={{
                ...type.hero,
                color: webTheme.text,
                textAlign: "center",
                fontSize: 38,
                lineHeight: 46,
              }}
            >
              {slide.titleLine1}
            </Text>
            
            {/* Title Line 2 (Vibrant Gradient Text) */}
            <View style={{ marginTop: 2 }}>
              <GradientText
                text={slide.titleLine2}
                colors={slide.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  ...type.hero,
                  textAlign: "center",
                  fontSize: 38,
                  lineHeight: 46,
                }}
              />
            </View>

            {/* Description Text */}
            <Text
              style={{
                ...type.body,
                color: webTheme.faint,
                textAlign: "center",
                maxWidth: 300,
                marginTop: 20,
                lineHeight: 24,
                fontSize: 14.5,
              }}
            >
              {slide.subtitle}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Walkthrough Control Panel */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: Math.max(insets.bottom, 20),
          paddingHorizontal: 24,
          alignItems: "center",
          zIndex: 100,
        }}
      >
        {/* Expanding Pagination Indicators */}
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 24 }}>
          {onboardingSlides.map((_, idx) => {
            const isActive = idx === activeSlide;
            return (
              <View
                key={idx}
                style={{
                  height: 6,
                  width: isActive ? 22 : 6,
                  borderRadius: 3,
                  backgroundColor: isActive ? onboardingSlides[idx].color : "rgba(255, 255, 255, 0.16)",
                }}
              />
            );
          })}
        </View>

        {/* Action Row */}
        {activeSlide < onboardingSlides.length - 1 ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", height: 56 }}>
            {/* Skip Option */}
            <HapticPressable onPress={handleAuthRedirect} hapticType="light">
              <View style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
                <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 14 }}>
                  Skip
                </Text>
              </View>
            </HapticPressable>

            {/* Next Button */}
            <HapticPressable onPress={handleNextSlide} hapticType="light">
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
                  Next
                </Text>
                <Feather name="arrow-right" size={16} color={onboardingSlides[activeSlide].color} />
              </View>
            </HapticPressable>
          </View>
        ) : (
          /* "Get Started" Primary Gradient Button (Slide 3 Only) */
          <HapticPressable onPress={handleAuthRedirect} hapticType="medium" style={{ width: "100%" }}>
            <View style={{ borderRadius: 999, overflow: "hidden", width: "100%" }}>
              <LinearGradient
                colors={["#E5364B", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                <Text style={{ ...type.bold, color: "#FFFFFF", fontSize: 16, letterSpacing: 0.5 }}>
                  Get Started
                </Text>
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </HapticPressable>
        )}
      </View>
    </SafeAreaView>
  );
}
