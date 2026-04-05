import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { AppStackHeader } from "../components/AppStackHeader";
import { ScreenBackdrop } from "../components/ScreenBackdrop";
import { notify } from "../stores/toastStore";
import { SurfaceCard } from "../components/SurfaceCard";
import { api, getErrorMessage } from "../lib/api";
import { getImageUrl, getInitials } from "../lib/media";
import { type } from "../lib/typography";
import { normalizeUserPayload } from "../lib/user";
import { webTheme } from "../lib/webTheme";
import { useAuthStore } from "../stores/authStore";

interface WorkItem {
  id: number;
  role?: string;
  company?: string;
  duration?: string;
  desc?: string;
}

interface EducationItem {
  id: number;
  degree?: string;
  school?: string;
  year?: string;
}

interface ProfileResponse {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  xp?: number;
  coins?: number;
  isPrivate?: boolean;
  socials?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  subscription?: {
    plan?: "free" | "pro" | "elite";
    isActive?: boolean;
  };
  seasonXP?: number;
  seasonCoins?: number;
  seasonTasksCompleted?: number;
  work?: WorkItem[];
  education?: EducationItem[];
  chatSettings?: {
    readReceipts?: boolean;
    chatWallpaper?: string;
    messageNotifications?: boolean;
  };
}

export default function EditProfileScreen() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const maxBioLength = 160;
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    name: "",
    bio: "",
    avatar: "",
    twitter: "",
    linkedin: "",
    github: "",
    website: "",
    work: [] as WorkItem[],
    education: [] as EducationItem[],
  });

  const { data: profile, isFetching, refetch } = useQuery<ProfileResponse>({
    queryKey: ["profile"],
    queryFn: () => api.get("/api/users/profile"),
  });

  useEffect(() => {
    if (!profile) return;

    setForm({
      username: user?.username || "",
      name: profile.name || "",
      bio: profile.bio || "",
      avatar: profile.avatar || "",
      twitter: profile.socials?.twitter || "",
      linkedin: profile.socials?.linkedin || "",
      github: profile.socials?.github || "",
      website: profile.socials?.website || "",
      work: profile.work || [],
      education: profile.education || [],
    });
  }, [profile]);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      notify.error("Please grant photo library access to change your avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalAvatarUri(result.assets[0].uri);
    }
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      const trimmedUsername = form.username.trim().replace(/^@/, "");
      if (trimmedUsername) {
        body.append("username", trimmedUsername);
      }
      body.append("name", form.name.trim());
      body.append("bio", form.bio.trim().slice(0, maxBioLength));
      body.append("socials", JSON.stringify({
        twitter: form.twitter.trim(),
        linkedin: form.linkedin.trim(),
        github: form.github.trim(),
        website: form.website.trim(),
      }));
      body.append("work", JSON.stringify(form.work.map((item) => ({
        id: item.id,
        role: item.role?.trim() || "",
        company: item.company?.trim() || "",
        duration: item.duration?.trim() || "",
        desc: item.desc?.trim() || "",
      }))));
      body.append("education", JSON.stringify(form.education.map((item) => ({
        id: item.id,
        degree: item.degree?.trim() || "",
        school: item.school?.trim() || "",
        year: item.year?.trim() || "",
      }))));

      if (localAvatarUri) {
        const filename = localAvatarUri.split("/").pop() || "avatar.jpg";
        const match = /\.([\w]+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : "jpeg";
        const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
        
        // React Native FormData expects file object with uri, name, and type
        body.append("avatar", {
          uri: localAvatarUri,
          name: filename,
          type: mimeType,
        } as any);
      } else if (form.avatar) {
        body.append("avatar", form.avatar.trim());
      }

      return api.put("/api/users/profile", body);
    },
    onSuccess: async (nextProfile: ProfileResponse) => {
      console.log('[EditProfile] Save success, response:', JSON.stringify(nextProfile));
      queryClient.setQueryData(["profile"], nextProfile);
      setUser(
        normalizeUserPayload({
          _id: nextProfile._id,
          username: (nextProfile as any).username || form.username.replace(/^@/, "") || user?.username,
          name: nextProfile.name,
          email: nextProfile.email,
          avatar: nextProfile.avatar,
          bio: nextProfile.bio,
          xp: nextProfile.xp,
          coins: nextProfile.coins,
          isPrivate: nextProfile.isPrivate,
          socials: nextProfile.socials,
          subscription: nextProfile.subscription ?? user?.subscription,
          chatSettings: nextProfile.chatSettings ?? user?.chatSettings,
          seasonXP: nextProfile.seasonXP ?? user?.seasonXP,
          seasonCoins: nextProfile.seasonCoins ?? user?.seasonCoins,
          seasonTasksCompleted: nextProfile.seasonTasksCompleted ?? user?.seasonTasksCompleted,
        }),
      );
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const addWorkItem = () => {
    setForm((current) => ({
      ...current,
      work: [...current.work, { id: Date.now(), role: "", company: "", duration: "", desc: "" }],
    }));
  };

  const updateWorkItem = (id: number, field: keyof WorkItem, value: string) => {
    setForm((current) => ({
      ...current,
      work: current.work.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeWorkItem = (id: number) => {
    setForm((current) => ({
      ...current,
      work: current.work.filter((item) => item.id !== id),
    }));
  };

  const addEducationItem = () => {
    setForm((current) => ({
      ...current,
      education: [...current.education, { id: Date.now(), degree: "", school: "", year: "" }],
    }));
  };

  const updateEducationItem = (id: number, field: keyof EducationItem, value: string) => {
    setForm((current) => ({
      ...current,
      education: current.education.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeEducationItem = (id: number) => {
    setForm((current) => ({
      ...current,
      education: current.education.filter((item) => item.id !== id),
    }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop />
      <AppStackHeader title="Edit Profile" detail="Update your public profile, work history, and links." />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={webTheme.red} />}
        showsVerticalScrollIndicator={false}
      >
        {/* avatar picker */}
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Pressable onPress={pickAvatar}>
            <View
              style={{
                width: 110,
                height: 110,
                borderRadius: 999,
                backgroundColor: webTheme.surfaceRaised,
                borderWidth: 3,
                borderColor: webTheme.accentBorder,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {localAvatarUri ? (
                <Image source={{ uri: localAvatarUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : getImageUrl(form.avatar) ? (
                <Image
                  source={{ uri: getImageUrl(form.avatar)! }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                  onError={() => setLocalAvatarUri(null)}
                />
              ) : (
                <Text style={{ ...type.black, color: webTheme.accent, fontSize: 32 }}>
                  {getInitials(form.name)}
                </Text>
              )}
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 34,
                height: 34,
                borderRadius: 999,
                backgroundColor: webTheme.accent,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: webTheme.bg,
              }}
            >
              <Feather name="camera" size={14} color="#fff" />
            </View>
          </Pressable>
          <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 12, marginTop: 10 }}>
            Tap to change photo
          </Text>
        </View>

        <SurfaceCard>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
            Basic information
          </Text>
          <View style={{ marginTop: 16, gap: 12 }}>
            {[
              { key: "username", label: "Username", placeholder: "@username", prefix: "@" },
              { key: "name", label: "Name", placeholder: "Your name" },
              { key: "bio", label: "Bio", placeholder: "What do you do on ElevateX?", multiline: true },
              { key: "twitter", label: "Twitter", placeholder: "@handle" },
              { key: "linkedin", label: "LinkedIn", placeholder: "Profile URL" },
              { key: "github", label: "GitHub", placeholder: "Username or URL" },
              { key: "website", label: "Website", placeholder: "https://..." },
            ].map((field) => (
              <View key={field.key}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 11 }}>
                    {field.label}
                  </Text>
                  {field.key === "bio" ? (
                    <Text style={{ ...type.medium, color: webTheme.faint, fontSize: 11 }}>
                      {form.bio.length}/{maxBioLength}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {(field as any).prefix ? (
                    <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 15, marginRight: 4 }}>
                      {(field as any).prefix}
                    </Text>
                  ) : null}
                  <TextInput
                    multiline={field.multiline}
                    value={form[field.key as keyof typeof form] as string}
                    onChangeText={(value) => {
                      let cleaned = value;
                      if (field.key === "username") cleaned = value.replace(/^@/, "").replace(/[^a-zA-Z0-9_.-]/g, "");
                      if (field.key === "bio") cleaned = value.slice(0, maxBioLength);
                      setForm((current) => ({ ...current, [field.key]: cleaned }));
                    }}
                    placeholder={field.placeholder}
                    placeholderTextColor="rgba(255,255,255,0.22)"
                    autoCapitalize={field.key === "username" ? "none" : undefined}
                    autoCorrect={field.key === "username" ? false : undefined}
                  style={{
                    ...type.regular,
                    flex: 1,
                    minHeight: field.multiline ? 96 : undefined,
                    textAlignVertical: field.multiline ? "top" : "center",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    color: webTheme.text,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}
                />
                </View>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard style={{ marginTop: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
              Work experience
            </Text>
            <Pressable
              onPress={addWorkItem}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: webTheme.border,
                backgroundColor: "rgba(255,255,255,0.03)",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12 }}>
                Add role
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 12, gap: 12 }}>
            {form.work.length > 0 ? (
              form.work.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    padding: 13,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2 }}>
                      Role {index + 1}
                    </Text>
                    <Pressable onPress={() => removeWorkItem(item.id)}>
                      <Text style={{ ...type.bold, color: webTheme.red, fontSize: 12 }}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>

                  {[
                    { label: "Role", value: item.role || "", field: "role", placeholder: "Role / Title" },
                    { label: "Company", value: item.company || "", field: "company", placeholder: "Company" },
                    { label: "Duration", value: item.duration || "", field: "duration", placeholder: "Jan 2023 - Present" },
                    { label: "Description", value: item.desc || "", field: "desc", placeholder: "What did you do there?", multiline: true },
                  ].map((field) => (
                    <View key={field.field}>
                      <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 11, marginBottom: 8 }}>
                        {field.label}
                      </Text>
                      <TextInput
                        multiline={field.multiline}
                        value={field.value}
                        onChangeText={(value) => updateWorkItem(item.id, field.field as keyof WorkItem, value)}
                        placeholder={field.placeholder}
                        placeholderTextColor="rgba(255,255,255,0.22)"
                        style={{
                          ...type.regular,
                          minHeight: field.multiline ? 80 : undefined,
                          textAlignVertical: field.multiline ? "top" : "center",
                          backgroundColor: "rgba(255,255,255,0.04)",
                          borderWidth: 1,
                          borderColor: webTheme.border,
                          color: webTheme.text,
                          borderRadius: 14,
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                        }}
                      />
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: webTheme.border,
                  padding: 18,
                }}
              >
                <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 14 }}>
                  No work experience added yet.
                </Text>
              </View>
            )}
          </View>
        </SurfaceCard>

        <SurfaceCard style={{ marginTop: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
              Education
            </Text>
            <Pressable
              onPress={addEducationItem}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: webTheme.border,
                backgroundColor: "rgba(255,255,255,0.03)",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12 }}>
                Add education
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 12, gap: 12 }}>
            {form.education.length > 0 ? (
              form.education.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    padding: 13,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2 }}>
                      Education {index + 1}
                    </Text>
                    <Pressable onPress={() => removeEducationItem(item.id)}>
                      <Text style={{ ...type.bold, color: webTheme.red, fontSize: 12 }}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>

                  {[
                    { label: "Degree", value: item.degree || "", field: "degree", placeholder: "Degree" },
                    { label: "School", value: item.school || "", field: "school", placeholder: "School / University" },
                    { label: "Year", value: item.year || "", field: "year", placeholder: "2024" },
                  ].map((field) => (
                    <View key={field.field}>
                      <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 11, marginBottom: 8 }}>
                        {field.label}
                      </Text>
                      <TextInput
                        value={field.value}
                        onChangeText={(value) => updateEducationItem(item.id, field.field as keyof EducationItem, value)}
                        placeholder={field.placeholder}
                        placeholderTextColor="rgba(255,255,255,0.22)"
                        style={{
                          ...type.regular,
                          backgroundColor: "rgba(255,255,255,0.04)",
                          borderWidth: 1,
                          borderColor: webTheme.border,
                          color: webTheme.text,
                          borderRadius: 14,
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                        }}
                      />
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: webTheme.border,
                  padding: 18,
                }}
              >
                <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 14 }}>
                  No education details added yet.
                </Text>
              </View>
            )}
          </View>
        </SurfaceCard>

        <Pressable
          onPress={() => saveProfile.mutate()}
          disabled={saveProfile.isPending}
          style={{
            marginTop: 16,
            borderRadius: 999,
            backgroundColor: webTheme.red,
            paddingVertical: 15,
            alignItems: "center",
          }}
        >
          {saveProfile.isPending ? (
            <ActivityIndicator color={webTheme.text} />
          ) : (
            <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
              Save profile
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
