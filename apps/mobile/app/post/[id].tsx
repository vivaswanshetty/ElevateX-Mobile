import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppStackHeader } from "../../components/AppStackHeader";
import { SurfaceCard } from "../../components/SurfaceCard";
import { HapticPressable } from "../../components/HapticPressable";
import { api, getErrorMessage } from "../../lib/api";
import { formatTimeAgo, getImageUrl } from "../../lib/media";
import { type } from "../../lib/typography";
import { webTheme } from "../../lib/webTheme";
import { useAuthStore } from "../../stores/authStore";
import { notify } from "../../stores/toastStore";
import { UserAvatar } from "../../components/UserAvatar";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";

interface FeedUser {
  _id: string;
  name: string;
  avatar?: string;
  xp?: number;
}

interface FeedComment {
  _id?: string;
  user?: FeedUser;
  text: string;
  createdAt?: string;
}

interface FeedPost {
  _id: string;
  author?: FeedUser;
  content: string;
  image?: string;
  likes: string[];
  comments: FeedComment[];
  createdAt: string;
}

function getLevel(xp?: number) {
  return Math.floor((xp || 0) / 500) + 1;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [commentDraft, setCommentDraft] = useState("");
  const [showComments, setShowComments] = useState(true);

  const {
    data: post,
    isFetching,
    refetch,
    error,
  } = useQuery<FeedPost>({
    queryKey: ["post", id],
    queryFn: () => api.get(`/api/posts/${id}`),
    enabled: Boolean(id),
  });

  const likePost = useMutation({
    mutationFn: (postId: string) => api.put(`/api/posts/${postId}/like`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post", id] });
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const commentOnPost = useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) =>
      api.post(`/api/posts/${postId}/comment`, { text }),
    onSuccess: async () => {
      setCommentDraft("");
      await queryClient.invalidateQueries({ queryKey: ["post", id] });
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const isLiked = post?.likes?.includes(currentUser?.id || "");
  const likeCount = post?.likes?.length || 0;
  const commentCount = post?.comments?.length || 0;
  const image = post?.image ? getImageUrl(post.image) : null;
  const authorLevel = getLevel(post?.author?.xp);
  const isOwnPost = post?.author?._id === currentUser?.id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop accent={webTheme.red} secondaryAccent={webTheme.blue} />

      {/* Header with back button */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: webTheme.borderStrong,
            backgroundColor: webTheme.cardBg,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Feather name="arrow-left" size={18} color={webTheme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.label, color: webTheme.accent, fontSize: 10 }}>ELEVATEX</Text>
          <Text style={{ ...type.h2, color: webTheme.text, fontSize: 22, marginTop: 2 }}>
            Post
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={webTheme.red} />}
        showsVerticalScrollIndicator={false}
      >
        {isFetching && !post ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={webTheme.accent} />
            <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, marginTop: 16 }}>
              Loading post...
            </Text>
          </View>
        ) : error ? (
          <SurfaceCard>
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Feather name="alert-circle" size={32} color={webTheme.red} />
              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 16, marginTop: 12 }}>
                Post not found
              </Text>
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, marginTop: 8, textAlign: "center" }}>
                This post may have been deleted or is no longer available.
              </Text>
              <HapticPressable
                onPress={() => router.back()}
                style={{
                  marginTop: 20,
                  borderRadius: 999,
                  backgroundColor: webTheme.accent,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ ...type.bold, color: "#fff", fontSize: 13 }}>Go back</Text>
              </HapticPressable>
            </View>
          </SurfaceCard>
        ) : post ? (
          <SurfaceCard accent={webTheme.red}>
            {/* Author header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <HapticPressable
                onPress={() =>
                  post.author?._id
                    ? router.push({ pathname: "/user/[id]", params: { id: post.author._id } })
                    : null
                }
                style={{ flexDirection: "row", gap: 12, flex: 1 }}
              >
                <View style={{ position: "relative" }}>
                  <UserAvatar avatar={post.author?.avatar} size={48} />
                  <View
                    style={{
                      position: "absolute",
                      right: -4,
                      bottom: -4,
                      borderRadius: 999,
                      backgroundColor: webTheme.red,
                      paddingHorizontal: 5,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 9 }}>
                      L{authorLevel}
                    </Text>
                  </View>
                </View>

                <View style={{ flex: 1, justifyContent: "center" }}>
                  <Text style={{ ...type.bold, color: webTheme.text, fontSize: 17 }}>
                    {post.author?.name || "ElevateX user"}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 12 }}>
                      {formatTimeAgo(post.createdAt)}
                    </Text>
                    <Text style={{ ...type.regular, color: "rgba(255,255,255,0.20)", fontSize: 12 }}>
                      ·
                    </Text>
                    <Feather name="globe" size={11} color={webTheme.faint} />
                  </View>
                </View>
              </HapticPressable>
            </View>

            {/* Post content */}
            {post.content ? (
              <Text
                style={{
                  ...type.regular,
                  color: webTheme.text,
                  fontSize: 16,
                  lineHeight: 26,
                  marginTop: 18,
                }}
              >
                {post.content}
              </Text>
            ) : null}

            {/* Post image */}
            {image ? (
              <Image
                source={image}
                style={{
                  width: "100%",
                  height: 260,
                  borderRadius: 18,
                  marginTop: 16,
                  backgroundColor: "#111",
                }}
                contentFit="cover"
                transition={200}
              />
            ) : null}

            {/* Stats */}
            <View
              style={{
                marginTop: 18,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 13 }}>
                {likeCount > 0
                  ? `${likeCount} ${likeCount === 1 ? "like" : "likes"}`
                  : "Be the first to like"}
              </Text>
              <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 13 }}>
                {commentCount > 0
                  ? `${commentCount} comment${commentCount === 1 ? "" : "s"}`
                  : "No comments yet"}
              </Text>
            </View>

            {/* Action buttons */}
            <View
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.05)",
                flexDirection: "row",
                gap: 6,
              }}
            >
              {[
                {
                  key: "like",
                  icon: "heart",
                  label: "Like",
                  active: isLiked,
                  onPress: () => likePost.mutate(post._id),
                },
                {
                  key: "comment",
                  icon: "message-circle",
                  label: "Comment",
                  active: showComments,
                  onPress: () => setShowComments(!showComments),
                },
                {
                  key: "share",
                  icon: "send",
                  label: "Share",
                  active: false,
                  onPress: async () => {
                    await Share.share({
                      message: `Check this ElevateX post: ${post.content || "Community update"}`,
                    });
                  },
                },
              ].map((action) => (
                <Pressable
                  key={action.key}
                  onPress={action.onPress}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    paddingVertical: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                    backgroundColor: action.active
                      ? "rgba(214,60,71,0.10)"
                      : "transparent",
                  }}
                >
                  <Feather
                    name={action.icon as "heart" | "message-circle" | "send"}
                    size={16}
                    color={action.active ? webTheme.red : webTheme.faint}
                  />
                  <Text
                    style={{
                      ...type.semibold,
                      color: action.active ? webTheme.red : webTheme.faint,
                      fontSize: 13,
                    }}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Comments section */}
            {showComments ? (
              <View style={{ marginTop: 16, gap: 10 }}>
                {post.comments?.length > 0 ? (
                  post.comments.map((comment, index) => (
                    <View
                      key={comment._id || `${post._id}-${index}`}
                      style={{
                        borderRadius: 16,
                        backgroundColor: webTheme.cardBg,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <UserAvatar avatar={comment.user?.avatar} size={28} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                            {comment.user?.name || "Member"}
                          </Text>
                          {comment.createdAt ? (
                            <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 10 }}>
                              {formatTimeAgo(comment.createdAt)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Text
                        style={{
                          ...type.regular,
                          color: webTheme.muted,
                          fontSize: 14,
                          marginTop: 8,
                          lineHeight: 22,
                        }}
                      >
                        {comment.text}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text
                    style={{
                      ...type.regular,
                      color: webTheme.faint,
                      fontSize: 13,
                      textAlign: "center",
                      paddingVertical: 12,
                    }}
                  >
                    No comments yet. Be the first!
                  </Text>
                )}

                {/* Comment composer */}
                <View
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: webTheme.border,
                    backgroundColor: webTheme.inputBg,
                    padding: 12,
                  }}
                >
                  <TextInput
                    value={commentDraft}
                    onChangeText={setCommentDraft}
                    placeholder="Write a comment..."
                    placeholderTextColor={webTheme.muted}
                    multiline
                    style={{
                      ...type.regular,
                      color: webTheme.text,
                      fontSize: 14,
                      backgroundColor: "transparent",
                      minHeight: 40,
                    }}
                  />
                  <Pressable
                    onPress={() => {
                      const text = commentDraft.trim();
                      if (!text) return;
                      commentOnPost.mutate({ postId: post._id, text });
                    }}
                    disabled={!commentDraft.trim() || commentOnPost.isPending}
                    style={{
                      alignSelf: "flex-end",
                      marginTop: 10,
                      borderRadius: 999,
                      backgroundColor: !commentDraft.trim()
                        ? "rgba(214,60,71,0.35)"
                        : webTheme.red,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12 }}>
                      {commentOnPost.isPending ? "Posting..." : "Reply"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </SurfaceCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
