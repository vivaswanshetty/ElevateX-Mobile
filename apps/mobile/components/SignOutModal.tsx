import { Modal, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";

interface SignOutModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SignOutModal({ visible, onConfirm, onCancel }: SignOutModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          paddingHorizontal: 24,
          alignItems: "center",
        }}
      >
        <Pressable style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} onPress={onCancel} />

        <BlurView
          intensity={100}
          tint="dark"
          style={{
            borderRadius: 32,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            backgroundColor: "rgba(20, 20, 24, 0.75)",
            overflow: "hidden",
            width: "100%",
            maxWidth: 320,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255,255,255,0.06)", "transparent"]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
          />

          <View style={{ padding: 32, alignItems: "center" }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "rgba(229,54,75,0.1)",
                borderWidth: 1,
                borderColor: "rgba(229,54,75,0.3)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Feather name="power" size={26} color={webTheme.red} />
            </View>

            <Text
              style={{
                ...type.h2,
                color: webTheme.text,
                marginBottom: 12,
                textAlign: "center",
                fontStyle: "italic",
                fontWeight: "300",
                letterSpacing: 0.5,
              }}
            >
              Sign Out
            </Text>

            <Text
              style={{
                ...type.body,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 22,
                textAlign: "center",
                marginBottom: 28,
                fontStyle: "italic",
                fontWeight: "300",
              }}
            >
              Are you sure you want to sign out? You'll need to sign back in next time.
            </Text>

            <View style={{ width: "100%", gap: 12 }}>
              <Pressable
                onPress={onConfirm}
                style={({ pressed }) => ({
                  backgroundColor: webTheme.red,
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    ...type.buttonLabel,
                    color: "#FFFFFF",
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  Sign Out
                </Text>
              </Pressable>

              <Pressable
                onPress={onCancel}
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    ...type.buttonLabel,
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}
