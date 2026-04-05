import {
  Animated,
  Modal,
  Pressable,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef } from "react";
import { webTheme } from "../lib/webTheme";
import { type } from "../lib/typography";
import type { UpdateInfo } from "../lib/checkUpdates";

interface UpdatePromptProps {
  visible: boolean;
  updateInfo: UpdateInfo | null;
  isApplying: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdatePrompt({
  visible,
  updateInfo,
  isApplying,
  onUpdate,
  onDismiss,
}: UpdatePromptProps) {
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 280,
          mass: 0.9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Start ambient glow pulse after card appears
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowPulse, {
              toValue: 1,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(glowPulse, {
              toValue: 0,
              duration: 1800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 120,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
      glowPulse.stopAnimation();
      glowPulse.setValue(0);
    }
  }, [visible, translateY, opacity, glowPulse]);

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.28],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          paddingBottom: 24,
          paddingHorizontal: 16,
          backgroundColor: "rgba(0,0,0,0.65)",
          opacity,
        }}
      >
        {/* Card */}
        <Animated.View style={{ transform: [{ translateY }] }}>
          {/* Ambient glow behind card */}
          <Animated.View
            style={{
              position: "absolute",
              top: -40,
              left: 20,
              right: 20,
              height: 120,
              borderRadius: 60,
              backgroundColor: webTheme.accent,
              opacity: glowOpacity,
              filter: undefined,
            }}
          />

          <BlurView
            intensity={18}
            tint="dark"
            style={{
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: webTheme.accentBorder,
            }}
          >
            <LinearGradient
              colors={[webTheme.surfaceRaised, webTheme.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ padding: 24 }}
            >
              {/* Header row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                {/* Icon badge */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: webTheme.accentSoft,
                    borderWidth: 1,
                    borderColor: webTheme.accentBorder,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <Feather name="zap" size={20} color={webTheme.accent} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      type.label,
                      { color: webTheme.accent, marginBottom: 2 },
                    ]}
                  >
                    UPDATE AVAILABLE
                  </Text>
                  <Text style={[type.h3, { color: webTheme.text }]}>
                    ElevateX is better
                  </Text>
                </View>

                {/* Dismiss X */}
                <Pressable
                  onPress={onDismiss}
                  hitSlop={12}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: webTheme.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="x" size={16} color={webTheme.muted} />
                </Pressable>
              </View>

              {/* Version pill row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    backgroundColor: webTheme.surface,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Feather name="package" size={11} color={webTheme.muted} />
                  <Text
                    style={[
                      type.caption,
                      { color: webTheme.muted, fontWeight: "500" },
                    ]}
                  >
                    {updateInfo?.currentVersion ?? "—"}
                  </Text>
                </View>

                <Feather name="arrow-right" size={13} color={webTheme.faint} />

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    backgroundColor: webTheme.accentSoft,
                    borderWidth: 1,
                    borderColor: webTheme.accentBorder,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Feather name="package" size={11} color={webTheme.accent} />
                  <Text
                    style={[
                      type.caption,
                      { color: webTheme.accent, fontWeight: "600" },
                    ]}
                  >
                    {updateInfo?.newVersion ?? "latest"}
                  </Text>
                </View>
              </View>

              {/* Release notes */}
              {updateInfo?.releaseNotes ? (
                <View
                  style={{
                    backgroundColor: webTheme.bg,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    marginBottom: 20,
                  }}
                >
                  <Text
                    style={[
                      type.caption,
                      { color: webTheme.textSecondary, lineHeight: 18 },
                    ]}
                  >
                    {updateInfo.releaseNotes}
                  </Text>
                </View>
              ) : (
                <View style={{ marginBottom: 20 }}>
                  <Text style={[type.body, { color: webTheme.textSecondary }]}>
                    New improvements are ready to install. The update applies
                    instantly — no app store download required.
                  </Text>
                </View>
              )}

              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: webTheme.border,
                  marginBottom: 20,
                }}
              />

              {/* Action buttons */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                {/* Later */}
                <Pressable
                  onPress={onDismiss}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 13,
                    borderRadius: 14,
                    alignItems: "center",
                    backgroundColor: pressed
                      ? webTheme.surfaceAlt
                      : webTheme.surface,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    opacity: isApplying ? 0.4 : 1,
                  })}
                  disabled={isApplying}
                >
                  <Text
                    style={[type.buttonLabel, { color: webTheme.textSecondary }]}
                  >
                    Later
                  </Text>
                </Pressable>

                {/* Update Now */}
                <Pressable
                  onPress={onUpdate}
                  disabled={isApplying}
                  style={({ pressed }) => ({ flex: 2, borderRadius: 14, overflow: "hidden", opacity: pressed ? 0.88 : 1 })}
                >
                  <LinearGradient
                    colors={[webTheme.accent, webTheme.redDeep]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: 13,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    {isApplying ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text
                          style={[
                            type.buttonLabel,
                            { color: "#fff", fontWeight: "700" },
                          ]}
                        >
                          Installing…
                        </Text>
                      </>
                    ) : (
                      <>
                        <Feather name="zap" size={15} color="#fff" />
                        <Text
                          style={[
                            type.buttonLabel,
                            { color: "#fff", fontWeight: "700" },
                          ]}
                        >
                          Update Now
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Footer note */}
              <Text
                style={[
                  type.caption,
                  {
                    color: webTheme.faint,
                    textAlign: "center",
                    marginTop: 14,
                    letterSpacing: 0.2,
                  },
                ]}
              >
                Over-the-air update · No reinstall needed
              </Text>
            </LinearGradient>
          </BlurView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
