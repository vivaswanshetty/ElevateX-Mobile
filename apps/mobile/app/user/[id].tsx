import { useMemo } from "react";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { AppStackHeader } from "../../components/AppStackHeader";
import { notify } from "../../stores/toastStore";
import { HapticPressable } from "../../components/HapticPressable";
import { SurfaceCard } from "../../components/SurfaceCard";
import { TaskCard } from "../../components/TaskCard";
import { api, getErrorMessage } from "../../lib/api";
import { getImageUrl, getInitials } from "../../lib/media";
import { mapTaskToCard, type TaskCardSource } from "../../lib/tasks";
import { type } from "../../lib/typography";
import { webTheme } from "../../lib/webTheme";
import { useAuthStore } from "../../stores/authStore";

interface UserProfile {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  xp?: number;
  coins?: number;
  socials?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
}

interface LightweightUser {
  _id: string;
  name: string;
  avatar?: string;
  xp?: number;
}

interface PostItem {
  _id: string;
  content: string;
  image?: string;
  likes: string[];
  comments: Array<{ _id?: string; text: string }>;
}

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const userQuery = useQuery<UserProfile>({
    queryKey: ["user", id],
    queryFn: () => api.get(`/api/users/${id}`),
    enabled: Boolean(id),
  });

  const followersQuery = useQuery<LightweightUser[]>({
    queryKey: ["userFollowers", id],
    queryFn: () => api.get(`/api/users/${id}/followers`),
    enabled: Boolean(id),
  });

  const followingQuery = useQuery<LightweightUser[]>({
    queryKey: ["userFollowing", id],
    queryFn: () => api.get(`/api/users/${id}/following`),
    enabled: Boolean(id),
  });

  const currentFollowingQuery = useQuery<LightweightUser[]>({
    queryKey: ["currentUserFollowing", currentUser?.id],
    queryFn: () => api.get(`/api/users/${currentUser?.id}/following`),
    enabled: Boolean(currentUser?.id),
  });

  const postsQuery = useQuery<PostItem[]>({
    queryKey: ["userPosts", id],
    queryFn: () => api.get(`/api/posts/user/${id}`),
    enabled: Boolean(id),
  });

  const tasksQuery = useQuery<TaskCardSource[]>({
    queryKey: ["userTasks"],
    queryFn: () => api.get("/api/tasks"),
  });

  const isCurrentUser = currentUser?.id === id;
  const isFollowing = Boolean((currentFollowingQuery.data || []).some((item) => item._id === id));

  const ownTasks = useMemo(
    () =>
      (tasksQuery.data || []).filter((task) => {
        const creatorId = typeof task.createdBy === "string" ? task.createdBy : task.createdBy?._id;
        return String(creatorId || "") === String(id);
      }),
    [id, tasksQuery.data],
  );

  const followMutation = useMutation({
    mutationFn: () => api.put(`/api/users/${id}/${isFollowing ? "unfollow" : "follow"}`),
    onSuccess: async () => {
      await Promise.all([
        followersQuery.refetch(),
        followingQuery.refetch(),
        currentFollowingQuery.refetch(),
      ]);
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const profile = userQuery.data;
  const avatarUrl = getImageUrl(profile?.avatar);
  const level = Math.floor((profile?.xp || 0) / 500) + 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <AppStackHeader title="User Profile" detail="Public profile view, posts, and social graph." />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={userQuery.isFetching || followersQuery.isFetching || followingQuery.isFetching}
            onRefresh={() => {
              userQuery.refetch();
              followersQuery.refetch();
              followingQuery.refetch();
              postsQuery.refetch();
              tasksQuery.refetch();
            }}
            tintColor={webTheme.red}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {!profile ? (
          <SurfaceCard>
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              {userQuery.isFetching ? <ActivityIndicator color={webTheme.red} /> : null}
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, marginTop: 12 }}>
                {userQuery.isFetching ? "Loading profile..." : "User not found."}
              </Text>
            </View>
          </SurfaceCard>
        ) : (
          <>
            <SurfaceCard>
              <View style={{ position: "absolute", top: -100, right: -50, width: 250, height: 250, borderRadius: 999, backgroundColor: webTheme.accent, opacity: 0.12 }} />
              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 999,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 2,
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <Text style={{ ...type.black, color: webTheme.text, fontSize: 28 }}>
                      {getInitials(profile.name)}
                    </Text>
                  )}
                </View>
                <Text style={{ ...type.black, color: webTheme.text, fontSize: 30, marginTop: 16 }}>
                  {profile.name}
                </Text>
                
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                  <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12 }}>Level {level}</Text>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)" }} />
                  <Feather name="star" size={12} color={webTheme.gold} />
                  <Text style={{ ...type.bold, color: webTheme.gold, fontSize: 12 }}>{(profile.coins || 0).toLocaleString()} coins</Text>
                </View>

                <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 14 }}>
                  {profile.bio || "No public bio yet."}
                </Text>

                {!isCurrentUser ? (
                  <View style={{ marginTop: 24, flexDirection: "row", gap: 10, width: "100%" }}>
                    <HapticPressable
                      hapticType="medium"
                      onPress={() => followMutation.mutate()}
                      style={{
                        flex: 1,
                        borderRadius: 999,
                        padding: 1,
                        overflow: "hidden",
                      }}
                    >
                      {!isFollowing && (
                        <LinearGradient
                          colors={[webTheme.accent, "rgba(255,255,255,0.1)"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                        />
                      )}
                      {isFollowing ? (
                        <View style={{ 
                          paddingVertical: 14, 
                          alignItems: "center", 
                          backgroundColor: "rgba(255,255,255,0.05)",
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: webTheme.border
                        }}>
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                            {followMutation.isPending ? "Updating..." : "Following"}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ 
                          paddingVertical: 14, 
                          alignItems: "center", 
                          backgroundColor: webTheme.surfaceRaised,
                          borderRadius: 999
                        }}>
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                            {followMutation.isPending ? "Updating..." : "Follow"}
                          </Text>
                        </View>
                      )}
                    </HapticPressable>
                    <HapticPressable
                      hapticType="light"
                      onPress={() => router.push("/chat")}
                      style={{
                        flex: 1,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: webTheme.border,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        paddingVertical: 14,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 13 }}>
                        Message
                      </Text>
                    </HapticPressable>
                  </View>
                ) : null}
              </View>
            </SurfaceCard>

            <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {[
                { 
                  label: "Followers", 
                  value: followersQuery.data?.length || 0,
                  icon: "users",
                  color: "#06b6d4",
                  bg: "rgba(6,182,212,0.12)",
                },
                { 
                  label: "Following", 
                  value: followingQuery.data?.length || 0,
                  icon: "user-plus",
                  color: "#d946ef",
                  bg: "rgba(217,70,239,0.12)",
                },
                { 
                  label: "Posts", 
                  value: postsQuery.data?.length || 0,
                  icon: "message-square",
                  color: "#10b981",
                  bg: "rgba(16,185,129,0.12)",
                },
                { 
                  label: "Tasks", 
                  value: ownTasks.length,
                  icon: "briefcase",
                  color: "#f59e0b",
                  bg: "rgba(245,158,11,0.12)",
                },
              ].map((item) => {
                return (
                  <View key={item.label} style={{ width: "47%" }}>
                    <SurfaceCard style={{ padding: 16, position: "relative", overflow: "hidden" }}>
                      <LinearGradient
                        colors={[item.bg, "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 }}
                      />
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: item.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
                          <Feather name={item.icon as any} size={18} color={item.color} />
                        </View>
                      </View>
                      <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" }}>
                        {item.label}
                      </Text>
                      <Text style={{ ...type.black, color: webTheme.text, fontSize: 28, marginTop: 4 }}>
                        {item.value}
                      </Text>
                    </SurfaceCard>
                  </View>
                );
              })}
            </View>

            <SurfaceCard style={{ marginTop: 16 }}>
              <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
                Social Links
              </Text>
              <View style={{ marginTop: 14, gap: 10 }}>
                {[
                  { label: "Twitter", value: profile.socials?.twitter, icon: "twitter" },
                  { label: "LinkedIn", value: profile.socials?.linkedin, icon: "linkedin" },
                  { label: "GitHub", value: profile.socials?.github, icon: "github" },
                  { label: "Website", value: profile.socials?.website, icon: "globe" },
                ].map((item) => (
                  <View
                    key={item.label}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Feather name={item.icon as "twitter" | "linkedin" | "github" | "globe"} size={16} color={webTheme.red} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>{item.label}</Text>
                      <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 4 }}>
                        {item.value || "Not set"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </SurfaceCard>

            <View style={{ marginTop: 18, gap: 14 }}>
              <Text style={{ ...type.black, color: webTheme.text, fontSize: 26 }}>
                Recent Tasks
              </Text>
              {ownTasks.slice(0, 3).map((task) => (
                <TaskCard
                  key={task._id}
                  task={mapTaskToCard(task)}
                  onPress={() => router.push({ pathname: "/task/[id]", params: { id: task._id } })}
                />
              ))}
            </View>

            <SurfaceCard style={{ marginTop: 18 }}>
              <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
                Recent Posts
              </Text>
              <View style={{ marginTop: 14, gap: 10 }}>
                {(postsQuery.data || []).slice(0, 3).map((post) => (
                  <View
                    key={post._id}
                    style={{
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      padding: 14,
                    }}
                  >
                    <Text style={{ ...type.regular, color: webTheme.text, fontSize: 14, lineHeight: 22 }}>
                      {post.content || "Media post"}
                    </Text>
                    <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 10 }}>
                      {post.likes?.length || 0} likes • {post.comments?.length || 0} comments
                    </Text>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
