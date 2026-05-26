import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, View, Modal, Pressable } from "react-native";
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
import { UserListModal } from "../../components/UserListModal";
import { UserAvatar } from "../../components/UserAvatar";
import { useThemeStore } from "../../stores/themeStore";

interface UserProfile {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  xp?: number;
  coins?: number;
  isPrivate?: boolean;
  followRequests?: string[];
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
  const [userListModalVisible, setUserListModalVisible] = useState(false);
  const [userListTitle, setUserListTitle] = useState<"Followers" | "Following">("Followers");
  const [showEnlargedAvatar, setShowEnlargedAvatar] = useState(false);

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

  const profile = userQuery.data;
  const isCurrentUser = currentUser?.id === id;
  const isFollowing = Boolean((currentFollowingQuery.data || []).some((item) => item._id === id));

  const isRequested = useMemo(() => {
    if (!profile || !currentUser) return false;
    return Boolean(
      profile.followRequests?.some((reqId: any) => {
        const idStr = typeof reqId === "object" ? reqId._id || reqId.id : reqId;
        return String(idStr) === String(currentUser.id);
      })
    );
  }, [profile, currentUser]);

  const ownTasks = useMemo(
    () =>
      (tasksQuery.data || []).filter((task) => {
        const creatorId = typeof task.createdBy === "string" ? task.createdBy : task.createdBy?._id;
        return String(creatorId || "") === String(id);
      }),
    [id, tasksQuery.data],
  );

  const followMutation = useMutation({
    mutationFn: () => api.put(`/api/users/${id}/${(isFollowing || isRequested) ? "unfollow" : "follow"}`),
    onSuccess: async () => {
      await Promise.all([
        userQuery.refetch(),
        followersQuery.refetch(),
        followingQuery.refetch(),
        currentFollowingQuery.refetch(),
      ]);
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });
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
                <Pressable onPress={() => setShowEnlargedAvatar(true)}>
                  <UserAvatar
                    avatar={profile.avatar}
                    size={90}
                    borderWidth={2}
                    borderColor="rgba(255,255,255,0.1)"
                  />
                </Pressable>
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
                      {!isFollowing && !isRequested && (
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
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          backgroundColor: "rgba(255,255,255,0.05)",
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: webTheme.border
                        }}>
                          <Feather name="user-check" size={14} color={webTheme.text} />
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                            {followMutation.isPending ? "Updating..." : "Following"}
                          </Text>
                        </View>
                      ) : isRequested ? (
                        <View style={{ 
                          paddingVertical: 14, 
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          backgroundColor: "rgba(255,255,255,0.05)",
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: webTheme.border
                        }}>
                          <Feather name="clock" size={14} color={webTheme.gold} />
                          <Text style={{ ...type.bold, color: webTheme.gold, fontSize: 13 }}>
                            {followMutation.isPending ? "Updating..." : "Requested"}
                          </Text>
                        </View>
                      ) : (
                        <LinearGradient
                          colors={[webTheme.accent, "#B02A38"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            borderRadius: 999,
                            paddingVertical: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <Feather name="user-plus" size={14} color="#FFF" />
                          <Text style={{ ...type.bold, color: "#FFF", fontSize: 13 }}>
                            {followMutation.isPending ? "Updating..." : "Follow"}
                          </Text>
                        </LinearGradient>
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
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Feather name="mail" size={14} color={webTheme.text} />
                      <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>
                        Message
                      </Text>
                    </HapticPressable>
                  </View>
                ) : null}
              </View>
            </SurfaceCard>

            <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
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
                const isPressable = item.label === "Followers" || item.label === "Following";
                const handlePress = () => {
                  if (item.label === "Followers") {
                    setUserListTitle("Followers");
                    setUserListModalVisible(true);
                  } else if (item.label === "Following") {
                    setUserListTitle("Following");
                    setUserListModalVisible(true);
                  }
                };

                const cardContent = (
                  <View
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      backgroundColor: useThemeStore.getState().theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                      padding: 12,
                      minHeight: 76,
                      justifyContent: "space-between"
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text
                        style={{
                          ...type.bold,
                          color: webTheme.faint,
                          fontSize: 9,
                          letterSpacing: 1.2,
                          textTransform: "uppercase"
                        }}
                      >
                        {item.label}
                      </Text>
                      <Feather name={item.icon as any} size={13} color={item.color} />
                    </View>
                    <View style={{ marginTop: 4 }}>
                      <Text style={{ ...type.extrabold, color: webTheme.text, fontSize: 18 }}>
                        {item.value}
                      </Text>
                    </View>
                  </View>
                );

                return (
                  <View key={item.label} style={{ width: "48%", marginBottom: 12 }}>
                    {isPressable ? (
                      <HapticPressable hapticType="light" onPress={handlePress}>
                        {cardContent}
                      </HapticPressable>
                    ) : (
                      cardContent
                    )}
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

      <UserListModal
        visible={userListModalVisible}
        title={userListTitle}
        users={userListTitle === "Followers" ? (followersQuery.data || []) : (followingQuery.data || [])}
        isLoading={userListTitle === "Followers" ? followersQuery.isFetching : followingQuery.isFetching}
        onClose={() => setUserListModalVisible(false)}
      />

      {/* Enlarged Avatar Modal */}
      <Modal
        visible={showEnlargedAvatar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEnlargedAvatar(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => setShowEnlargedAvatar(false)}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{
                width: "85%",
                height: "60%",
                borderRadius: 20,
                resizeMode: "contain",
              }}
            />
          ) : (
            <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 16 }}>No profile photo</Text>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
