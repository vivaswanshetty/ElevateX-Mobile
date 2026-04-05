import { Modal, Pressable, Text, View, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef } from "react";

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  detail: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  icon,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 300,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.9);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  const primaryColor = destructive ? webTheme.accent : "#FFF";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Pressable style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} onPress={onClose} />

        <Animated.View style={{ transform: [{ scale }], opacity, borderRadius: 32, overflow: "hidden" }}>
          <BlurView
            intensity={100}
            tint="dark"
            style={{
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "rgba(20, 20, 24, 0.75)",
              shadowColor: "#000",
              shadowOpacity: 0.5,
              shadowRadius: 32,
              shadowOffset: { width: 0, height: 16 },
              elevation: 20,
            }}
          >
            {/* glass highlight */}
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0.06)", "transparent"]}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
            />

            <View style={{ padding: 32, alignItems: "center" }}>
              {icon && (
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 24,
                  }}
                >
                  <LinearGradient
                    colors={[primaryColor, "transparent"]}
                    style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, opacity: 0.1, borderRadius: 32 }}
                  />
                  <Feather name={icon} size={28} color={primaryColor} />
                </View>
              )}

              <Text style={{ ...type.h2, color: webTheme.text, marginBottom: 12, textAlign: "center", fontStyle: "italic", fontWeight: "300", letterSpacing: 0.5 }}>
                {title}
              </Text>
              <Text style={{ ...type.body, color: "rgba(255,255,255,0.6)", lineHeight: 22, textAlign: "center", marginBottom: 32, fontStyle: "italic", fontWeight: "300" }}>
                {detail}
              </Text>

              <View style={{ width: "100%", gap: 12, flexDirection: "column" }}>
                <Pressable
                  onPress={onConfirm}
                  style={{
                    width: "100%",
                    borderRadius: 16,
                    backgroundColor: primaryColor,
                    paddingVertical: 18,
                    alignItems: "center",
                    shadowColor: primaryColor,
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                  }}
                >
                  <Text
                    style={{
                      ...type.buttonLabel,
                      color: destructive ? "#FFFFFF" : "#000000",
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    {confirmLabel}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onClose}
                  style={{
                    width: "100%",
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ ...type.buttonLabel, color: "rgba(255,255,255,0.5)", fontWeight: "600" }}>
                    {cancelLabel}
                  </Text>
                </Pressable>
              </View>
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}
