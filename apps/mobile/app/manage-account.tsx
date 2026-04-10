import { useState, useEffect } from "react";
import { Alert, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { AppStackHeader } from "../components/AppStackHeader";
import { ScreenBackdrop } from "../components/ScreenBackdrop";
import { SurfaceCard } from "../components/SurfaceCard";
import { HapticPressable } from "../components/HapticPressable";
import { Watermark } from "../components/Watermark";
import { notify } from "../stores/toastStore";
import { api, getErrorMessage } from "../lib/api";
import { type } from "../lib/typography";
import { webTheme, inputFieldStyle } from "../lib/webTheme";
import { useAuthStore } from "../stores/authStore";
import { normalizeUserPayload } from "../lib/user";

interface ProfileResponse {
  _id: string;
  name: string;
  email: string;
  isPrivate?: boolean;
}

export default function ManageAccountScreen() {
  const queryClient = useQueryClient();
  const { user, setUser, signOut } = useAuthStore();
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { data: profile, isFetching, refetch } = useQuery<ProfileResponse>({
    queryKey: ["profile"],
    queryFn: () => api.get("/api/users/profile"),
  });

  useEffect(() => {
    if (profile) {
      setEmailDraft(profile.email || "");
    }
  }, [profile]);

  const updateAccount = useMutation({
    mutationFn: (payload: { email?: string; isPrivate?: boolean }) =>
      api.put("/api/users/profile", payload),
    onSuccess: async (nextProfile: any) => {
      queryClient.setQueryData(["profile"], nextProfile);
      setUser(normalizeUserPayload({ ...user, ...nextProfile }));
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditingEmail(false);
      notify.success("Account updated successfully.");
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const changePassword = useMutation({
    mutationFn: () =>
      api.put("/api/users/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      notify.success("Password updated successfully.");
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => api.delete("/api/users/account"),
    onSuccess: async () => {
      queryClient.clear();
      await signOut();
      router.replace("/auth/login");
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const handleSaveEmail = () => {
    const trimmed = emailDraft.trim();
    if (!trimmed || trimmed === profile?.email) {
      setIsEditingEmail(false);
      return;
    }
    updateAccount.mutate({ email: trimmed });
  };

  const handlePrivacyToggle = (nextValue: boolean) => {
    Alert.alert(
      nextValue ? "Make account private?" : "Make account public?",
      nextValue
        ? "Only approved followers will be able to see your profile details."
        : "Anyone will be able to view your profile details.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextValue ? "Make private" : "Make public",
          onPress: () => updateAccount.mutate({ isPrivate: nextValue }),
        },
      ]
    );
  };

  const handlePasswordSubmit = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      notify.error("Fill in all password fields.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      notify.error("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify.error("Passwords do not match.");
      return;
    }
    changePassword.mutate();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account and data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => deleteAccount.mutate(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop />
      <AppStackHeader title="Account Settings" detail="Manage your email, privacy, and security." />
      
      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 16 }}>
          {/* Email section */}
          <SurfaceCard>
            <Text style={{ ...type.h3, color: webTheme.text, marginBottom: 4 }}>Email Address</Text>
            <Text style={{ ...type.caption, color: webTheme.muted, marginBottom: 16 }}>
              Your primary email for account recovery and notifications.
            </Text>
            
            {isEditingEmail ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={emailDraft}
                  onChangeText={setEmailDraft}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={{ ...type.regular, ...inputFieldStyle }}
                  placeholder="name@example.com"
                  placeholderTextColor={webTheme.faint}
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <HapticPressable onPress={handleSaveEmail} style={{ flex: 1 }}>
                    <View style={{ backgroundColor: webTheme.accent, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
                      <Text style={{ ...type.bold, color: "#fff", fontSize: 13 }}>Save</Text>
                    </View>
                  </HapticPressable>
                  <HapticPressable onPress={() => { setIsEditingEmail(false); setEmailDraft(profile?.email || ""); }} style={{ flex: 1 }}>
                    <View style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: webTheme.border }}>
                      <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 13 }}>Cancel</Text>
                    </View>
                  </HapticPressable>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 15 }}>{profile?.email || user?.email}</Text>
                <HapticPressable onPress={() => setIsEditingEmail(true)}>
                  <Text style={{ ...type.bold, color: webTheme.accent, fontSize: 13 }}>Change</Text>
                </HapticPressable>
              </View>
            )}
          </SurfaceCard>

          {/* Privacy section */}
          <SurfaceCard>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={{ ...type.h3, color: webTheme.text, marginBottom: 4 }}>Private Profile</Text>
                <Text style={{ ...type.caption, color: webTheme.muted }}>
                  Hide your activity and details from users who aren't following you.
                </Text>
              </View>
              <Switch
                value={Boolean(profile?.isPrivate)}
                onValueChange={handlePrivacyToggle}
                thumbColor={profile?.isPrivate ? webTheme.accent : "#f4f4f5"}
                trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(229,54,75,0.3)" }}
              />
            </View>
          </SurfaceCard>

          {/* Password section */}
          <SurfaceCard>
            <Text style={{ ...type.h3, color: webTheme.text, marginBottom: 16 }}>Change Password</Text>
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ ...type.label, color: webTheme.faint, fontSize: 10, marginBottom: 6 }}>Current Password</Text>
                <TextInput
                  secureTextEntry
                  value={passwordForm.currentPassword}
                  onChangeText={(v) => setPasswordForm(f => ({ ...f, currentPassword: v }))}
                  style={{ ...type.regular, ...inputFieldStyle }}
                  placeholder="Enter current password"
                  placeholderTextColor={webTheme.faint}
                />
              </View>
              <View>
                <Text style={{ ...type.label, color: webTheme.faint, fontSize: 10, marginBottom: 6 }}>New Password</Text>
                <TextInput
                  secureTextEntry
                  value={passwordForm.newPassword}
                  onChangeText={(v) => setPasswordForm(f => ({ ...f, newPassword: v }))}
                  style={{ ...type.regular, ...inputFieldStyle }}
                  placeholder="At least 8 characters"
                  placeholderTextColor={webTheme.faint}
                />
              </View>
              <View>
                <Text style={{ ...type.label, color: webTheme.faint, fontSize: 10, marginBottom: 6 }}>Confirm New Password</Text>
                <TextInput
                  secureTextEntry
                  value={passwordForm.confirmPassword}
                  onChangeText={(v) => setPasswordForm(f => ({ ...f, confirmPassword: v }))}
                  style={{ ...type.regular, ...inputFieldStyle }}
                  placeholder="Repeat new password"
                  placeholderTextColor={webTheme.faint}
                />
              </View>
              <HapticPressable onPress={handlePasswordSubmit} disabled={changePassword.isPending}>
                <View style={{ backgroundColor: webTheme.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4, opacity: changePassword.isPending ? 0.7 : 1 }}>
                  <Text style={{ ...type.bold, color: "#fff" }}>
                    {changePassword.isPending ? "Updating..." : "Update Password"}
                  </Text>
                </View>
              </HapticPressable>
            </View>
          </SurfaceCard>

          {/* Danger zone */}
          <View style={{ marginTop: 8 }}>
            <Text style={{ ...type.label, color: webTheme.red, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginLeft: 4 }}>
              Danger Zone
            </Text>
            <SurfaceCard style={{ borderColor: "rgba(239, 68, 68, 0.2)", borderWidth: 1 }}>
              <Text style={{ ...type.h3, color: webTheme.red, marginBottom: 4 }}>Delete Account</Text>
              <Text style={{ ...type.body, color: webTheme.muted, fontSize: 13, marginBottom: 16 }}>
                Once you delete your account, there is no going back. Please be certain.
              </Text>
              <HapticPressable onPress={handleDeleteAccount}>
                <View style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.3)" }}>
                  <Text style={{ ...type.bold, color: webTheme.red }}>Permanently Delete Account</Text>
                </View>
              </HapticPressable>
            </SurfaceCard>
          </View>
        </View>
        <Watermark />
      </ScrollView>
    </SafeAreaView>
  );
}
