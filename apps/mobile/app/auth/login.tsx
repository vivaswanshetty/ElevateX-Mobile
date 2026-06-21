import { Feather } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api, getErrorMessage } from "../../lib/api";
import { saveAuthToken } from "../../lib/authSession";
import { useAuthStore } from "../../stores/authStore";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";
import { SurfaceCard } from "../../components/SurfaceCard";
import { FadeSlideIn } from "../../components/FadeSlideIn";
import { HapticPressable } from "../../components/HapticPressable";
import { type } from "../../lib/typography";
import { normalizeUserPayload } from "../../lib/user";
import { webTheme, inputFieldStyle } from "../../lib/webTheme";
import { notify } from "../../stores/toastStore";
import { useThemeStore } from "../../stores/themeStore";
import { Watermark } from "../../components/Watermark";

const schema = z.object({
  email: z.string().min(3, "Email or username must be at least 3 characters long"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { setAuthError, setUser } = useAuthStore();
  const theme = useThemeStore((s) => s.theme);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  // Load saved credentials on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedEmail = await SecureStore.getItemAsync("remembered_email");
        const savedPassword = await SecureStore.getItemAsync("remembered_password");
        
        if (savedEmail && savedPassword) {
          setValue("email", savedEmail);
          setValue("password", savedPassword);
          setRememberMe(true);
        }
      } catch (error) {
        console.error("Error loading saved credentials:", error);
      } finally {
        setIsLoadingCredentials(false);
      }
    };

    loadSavedCredentials();
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      const response = await api.post("/api/auth/login", data);
      await saveAuthToken(response.token);
      setUser(normalizeUserPayload(response));
      setAuthError(null);

      // Save credentials if "Remember me" is checked
      if (rememberMe) {
        try {
          await SecureStore.setItemAsync("remembered_email", data.email);
          await SecureStore.setItemAsync("remembered_password", data.password);
        } catch (error) {
          console.error("Error saving credentials:", error);
        }
      } else {
        // Clear saved credentials if "Remember me" is unchecked
        try {
          await SecureStore.deleteItemAsync("remembered_email");
          await SecureStore.deleteItemAsync("remembered_password");
        } catch (error) {
          console.error("Error clearing credentials:", error);
        }
      }

      router.replace("/");
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop />
      {/* Background glow points */}
      <View
        style={{
          position: "absolute",
          top: 100,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: theme === "dark" ? "rgba(139, 92, 246, 0.08)" : "rgba(139, 92, 246, 0.04)",
          pointerEvents: "none",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 120,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: theme === "dark" ? "rgba(229, 54, 75, 0.08)" : "rgba(229, 54, 75, 0.04)",
          pointerEvents: "none",
        }}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingVertical: 24, flexGrow: 1, justifyContent: "center" }}>
        <FadeSlideIn distance={20} style={{ width: "100%" }}>
          <SurfaceCard accent={webTheme.accent}>
          {/* brand area */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                shadowColor: webTheme.accent,
                shadowOpacity: 0.35,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["#E5364B", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
              />
              <Feather name="zap" size={32} color="#FFF" />
            </View>
            <Text style={{ ...type.h1, color: webTheme.text, fontSize: 28 }}>
              Welcome Back
            </Text>
            <Text style={{ ...type.body, color: webTheme.muted, marginTop: 8, textAlign: "center" }}>
              Sign in to continue where you left off
            </Text>
          </View>

          {/* sign in / sign up tabs */}
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              padding: 4,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
              marginBottom: 22,
            }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: 12,
                backgroundColor: webTheme.accentSoft,
                paddingVertical: 10,
              }}
            >
              <Text style={{ ...type.bold, textAlign: "center", color: webTheme.accent, fontSize: 13 }}>
                Sign In
              </Text>
            </View>
            <HapticPressable
              style={{ flex: 1, justifyContent: "center", borderRadius: 12 }}
              onPress={() => router.push("/auth/register")}
              hapticType="light"
            >
              <Text style={{ ...type.bold, textAlign: "center", color: webTheme.faint, fontSize: 13 }}>
                Sign Up
              </Text>
            </HapticPressable>
          </View>

          {/* form */}
          {[
            { name: "email", placeholder: "Email or username", secure: false },
            { name: "password", placeholder: "Password", secure: true },
          ].map((field) => (
            <View key={field.name}>
              <Controller
                control={control}
                name={field.name as keyof FormData}
                render={({ field: { onChange, value } }) => (
                  <View style={{ position: "relative" }}>
                    <TextInput
                      testID={`${field.name}-input`}
                      style={{
                        ...type.regular,
                        ...inputFieldStyle,
                        backgroundColor: focusedField === field.name 
                          ? (theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)")
                          : inputFieldStyle.backgroundColor,
                        borderColor: focusedField === field.name 
                          ? webTheme.accent 
                          : inputFieldStyle.borderColor,
                        paddingRight: field.secure ? 50 : 18,
                        marginBottom: 10,
                      }}
                      placeholder={field.placeholder}
                      placeholderTextColor={webTheme.faint}
                      autoCapitalize="none"
                      keyboardType={field.name === "email" ? "email-address" : "default"}
                      secureTextEntry={field.secure && !showPassword}
                      value={value}
                      onChangeText={onChange}
                      onFocus={() => setFocusedField(field.name)}
                      onBlur={() => setFocusedField(null)}
                    />
                    {field.secure && (
                      <Pressable
                        onPress={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: 16,
                          top: 15,
                          height: 24,
                          justifyContent: "center",
                        }}
                      >
                        <Feather
                          name={showPassword ? "eye" : "eye-off"}
                          size={18}
                          color={webTheme.muted}
                        />
                      </Pressable>
                    )}
                  </View>
                )}
              />
              {errors[field.name as keyof FormData] ? (
                <Text style={{ ...type.caption, color: "#f87171", marginBottom: 10 }}>
                  {errors[field.name as keyof FormData]?.message}
                </Text>
              ) : null}
            </View>
          ))}

          {/* Remember me checkbox */}
          <HapticPressable
            onPress={() => setRememberMe(!rememberMe)}
            hapticType="light"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: rememberMe ? webTheme.accent : webTheme.border,
                backgroundColor: rememberMe ? webTheme.accent : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {rememberMe && (
                <Feather name="check" size={14} color="#fff" />
              )}
            </View>
            <Text style={{ ...type.regular, color: webTheme.text, fontSize: 13 }}>
              Remember me
            </Text>
          </HapticPressable>

          {/* submit button */}
          <HapticPressable
            testID="sign-in-button"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            hapticType="medium"
            style={{ marginTop: 8 }}
          >
            <View
              style={{
                borderRadius: 999,
                overflow: "hidden",
                opacity: isSubmitting ? 0.88 : 1,
              }}
            >
              <LinearGradient
                colors={["#E5364B", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ ...type.buttonLabel, color: "#fff", fontSize: 15, letterSpacing: 0.4 }}>
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Text>
              </LinearGradient>
            </View>
          </HapticPressable>

          <Text style={{ ...type.body, color: webTheme.muted, textAlign: "center", marginTop: 22, fontSize: 13 }}>
            Don't have an account?{" "}
            <Link href="/auth/register" style={{ color: webTheme.accent, fontFamily: type.bold.fontFamily }}>
              Sign up
            </Link>
          </Text>
        </SurfaceCard>
        </FadeSlideIn>
      </ScrollView>
    </SafeAreaView>
  );
}
