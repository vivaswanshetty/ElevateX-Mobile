import { Feather } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { api, getErrorMessage } from "../../lib/api";
import { saveAuthToken } from "../../lib/authSession";
import { useAuthStore } from "../../stores/authStore";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";
import { SurfaceCard } from "../../components/SurfaceCard";
import { FadeSlideIn } from "../../components/FadeSlideIn";
import { HapticPressable } from "../../components/HapticPressable";
import { normalizeUserPayload } from "../../lib/user";
import { webTheme, inputFieldStyle } from "../../lib/webTheme";
import { Watermark } from "../../components/Watermark";
import { notify } from "../../stores/toastStore";
import { type as Typography } from "../../lib/typography";

const schema = z
  .object({
    displayName: z
      .string()
      .min(2, "Name must be between 2 and 50 characters")
      .max(50, "Name must be between 2 and 50 characters")
      .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
    username: z
      .string()
      .min(3, "Min 3 characters")
      .max(20, "Max 20 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers, or underscores"),
    email: z.string().email("Invalid email"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        "Password must contain an uppercase letter, a lowercase letter, and a number",
      ),
    confirmPassword: z.string().min(6, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { setAuthError, setUser } = useAuthStore();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async ({ confirmPassword: _confirmPassword, ...data }: FormData) => {
    try {
      const response = await api.post("/api/auth/register", {
        name: data.displayName,
        email: data.email,
        password: data.password,
        termsAccepted: true,
      });

      await saveAuthToken(response.token);
      setUser(normalizeUserPayload(response));
      setAuthError(null);
      router.replace("/");
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingVertical: 24 }}>
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
                style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
              />
              <Feather name="zap" size={30} color={webTheme.accent} />
            </View>
            <Text style={{ ...Typography.h1, color: webTheme.text, fontSize: 28 }}>
              Join ElevateX
            </Text>
            <Text style={{ ...Typography.body, color: webTheme.muted, marginTop: 8, textAlign: "center" }}>
              Start your journey on the ultimate task platform
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
            <Pressable
              style={{ flex: 1, justifyContent: "center", borderRadius: 12 }}
              onPress={() => router.push("/auth/login")}
            >
              <Text style={{ ...Typography.bold, textAlign: "center", color: webTheme.faint, fontSize: 13 }}>
                Sign In
              </Text>
            </Pressable>
            <View
              style={{
                flex: 1,
                borderRadius: 12,
                backgroundColor: webTheme.accentSoft,
                paddingVertical: 10,
              }}
            >
              <Text style={{ ...Typography.bold, textAlign: "center", color: webTheme.accent, fontSize: 13 }}>
                Sign Up
              </Text>
            </View>
          </View>

          {/* form */}
          {[
            { name: "displayName", placeholder: "Full name", secure: false },
            { name: "username", placeholder: "Username", secure: false },
            { name: "email", placeholder: "you@example.com", secure: false },
            { name: "password", placeholder: "Password", secure: true },
            { name: "confirmPassword", placeholder: "Confirm password", secure: true },
          ].map((field) => (
            <View key={field.name}>
              <Controller
                control={control}
                name={field.name as keyof FormData}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={{
                      ...Typography.regular,
                      ...inputFieldStyle,
                      marginBottom: 10,
                    }}
                    placeholder={field.placeholder}
                    placeholderTextColor={webTheme.faint}
                    autoCapitalize={field.name === "username" || field.name === "email" ? "none" : "sentences"}
                    keyboardType={field.name === "email" ? "email-address" : "default"}
                    secureTextEntry={field.secure}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors[field.name as keyof FormData] ? (
                <Text style={{ ...Typography.caption, color: "#f87171", marginBottom: 10 }}>
                  {errors[field.name as keyof FormData]?.message}
                </Text>
              ) : null}
            </View>
          ))}

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
              <Text style={{ ...Typography.buttonLabel, color: "#fff", fontSize: 15 }}>
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Text>
            </View>
          </Pressable>

          <Text style={{ ...Typography.body, color: webTheme.muted, textAlign: "center", marginTop: 22, fontSize: 13 }}>
            Already have an account?{" "}
            <Link href="/auth/login" style={{ color: webTheme.accent, fontFamily: Typography.bold.fontFamily }}>
              Sign in
            </Link>
          </Text>
        </SurfaceCard>
        </FadeSlideIn>
        <Watermark />
      </ScrollView>
    </SafeAreaView>
  );
}
