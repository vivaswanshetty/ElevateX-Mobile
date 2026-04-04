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

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { setAuthError, setUser } = useAuthStore();
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingVertical: 24, flexGrow: 1, justifyContent: "center" }}>
        <FadeSlideIn distance={20} style={{ width: "100%" }}>
          <SurfaceCard accent={webTheme.accent}>
          {/* brand area */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: webTheme.accentSoft,
                borderWidth: 1,
                borderColor: webTheme.accentBorder,
                marginBottom: 20,
                shadowColor: webTheme.accent,
                shadowOpacity: 0.18,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.05)", "transparent"]}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={{ position: "absolute", inset: 0 }}
              />
              <Feather name="zap" size={30} color={webTheme.accent} />
            </View>
            <Text style={{ ...type.h1, color: webTheme.text, fontSize: 28 }}>
              Welcome back
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
            <Pressable
              style={{ flex: 1, justifyContent: "center", borderRadius: 12 }}
              onPress={() => router.push("/auth/register")}
            >
              <Text style={{ ...type.bold, textAlign: "center", color: webTheme.faint, fontSize: 13 }}>
                Sign Up
              </Text>
            </Pressable>
          </View>

          {/* form */}
          {[
            { name: "email", placeholder: "you@example.com", secure: false },
            { name: "password", placeholder: "Password", secure: true },
          ].map((field) => (
            <View key={field.name}>
              <Controller
                control={control}
                name={field.name as keyof FormData}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={{
                      ...type.regular,
                      ...inputFieldStyle,
                      marginBottom: 10,
                    }}
                    placeholder={field.placeholder}
                    placeholderTextColor={webTheme.faint}
                    autoCapitalize="none"
                    keyboardType={field.name === "email" ? "email-address" : "default"}
                    secureTextEntry={field.secure}
                    value={value}
                    onChangeText={onChange}
                  />
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
          <Pressable
            onPress={() => setRememberMe(!rememberMe)}
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
          </Pressable>

          {/* submit button */}
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <View
              style={{
                borderRadius: 999,
                backgroundColor: webTheme.accent,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 8,
                opacity: isSubmitting ? 0.88 : 1,
              }}
            >
              <Text style={{ ...type.buttonLabel, color: "#fff", fontSize: 15 }}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Text>
            </View>
          </Pressable>

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
