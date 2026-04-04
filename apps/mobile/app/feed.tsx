import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppStackHeader } from "../components/AppStackHeader";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ScreenBackdrop } from "../components/ScreenBackdrop";
import { SurfaceCard } from "../components/SurfaceCard";
import { api, getErrorMessage } from "../lib/api";
import { formatTimeAgo, getImageUrl, getInitials } from "../lib/media";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { useAuthStore } from "../stores/authStore";
import { notify } from "../stores/toastStore";

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

const MAX_CHARS = 500;

function getLevel(xp?: number) {
  return Math.floor((xp || 0) / 500) + 1;
}

export default function FeedScreen() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [mode, setMode] = useState<"all" | "following">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composer, setComposer] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const {
    data: posts = [],
    isFetching,
    refetch,
  } = useQuery<FeedPost[]>({
    queryKey: ["posts", mode],
    queryFn: () => api.get(mode === "following" ? "/api/posts/feed" : "/api/posts"),
  });

  const createPost = useMutation({
    mutationFn: () => {
      if (selectedImage) {
        const formData = new FormData();
        formData.append("content", composer.trim());
        
        formData.append("image", {
          uri: selectedImage.uri,
          name: "post_image.jpg",
          type: selectedImage.mimeType || "image/jpeg",
        } as any);

        return api.post("/api/posts", formData);
      }
      return api.post("/api/posts", { content: composer.trim() });
    },
    onSuccess: async () => {
      setComposer("");
      setSelectedImage(null);
      setComposerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const likePost = useMutation({
    mutationFn: (postId: string) => api.put(`/api/posts/${postId}/like`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const commentOnPost = useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) =>
      api.post(`/api/posts/${postId}/comment`, { text }),
    onSuccess: async (_data, variables) => {
      setCommentDrafts((current) => ({ ...current, [variables.postId]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const deletePost = useMutation({
    mutationFn: (postId: string) => api.delete(`/api/posts/${postId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop accent={webTheme.red} secondaryAccent={webTheme.blue} />
      <AppStackHeader title="Feed" detail="Community updates, wins, and public momentum." />
      <ConfirmDialog
        visible={Boolean(deletePostId)}
        title="Delete post?"
        detail="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onClose={() => setDeletePostId(null)}
        onConfirm={() => {
          if (!deletePostId) return;
          deletePost.mutate(deletePostId);
          setDeletePostId(null);
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={webTheme.red} />}
        showsVerticalScrollIndicator={false}
      >
        <SurfaceCard accent={webTheme.red}>
          {!composerOpen ? (
            <Pressable
              onPress={() => setComposerOpen(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  overflow: "hidden",
                  backgroundColor: "rgba(214,60,71,0.16)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {currentUser?.avatarUrl ? (
                  <Image source={{ uri: getImageUrl(currentUser.avatarUrl) || undefined }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
                    {getInitials(currentUser?.displayName || currentUser?.username)}
                  </Text>
                )}
              </View>
              <View
                style={{
                  flex: 1,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                }}
              >
                <Text style={{ ...type.regular, color: "rgba(255,255,255,0.40)", fontSize: 14 }}>
                  {"What's on your mind, "}{(currentUser?.displayName || "Member").split(" ")[0]}?
                </Text>
              </View>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(214,60,71,0.10)",
                }}
              >
                <Feather name="image" size={17} color={webTheme.red} />
              </View>
            </Pressable>
          ) : (
            <View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    overflow: "hidden",
                    backgroundColor: "rgba(214,60,71,0.16)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {currentUser?.avatarUrl ? (
                    <Image source={{ uri: getImageUrl(currentUser.avatarUrl) || undefined }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
                      {getInitials(currentUser?.displayName || currentUser?.username)}
                    </Text>
                  )}
                </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      autoFocus
                      multiline
                      value={composer}
                      onChangeText={setComposer}
                      placeholder="Share something with the community..."
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      maxLength={MAX_CHARS}
                      style={{
                        ...type.regular,
                        width: "100%",
                        minHeight: 80,
                        color: webTheme.text,
                        fontSize: 15,
                        lineHeight: 24,
                        textAlignVertical: "top",
                      }}
                    />
                    
                    {selectedImage && (
                      <View style={{ position: "relative", marginTop: 12, marginBottom: 4 }}>
                        <Image 
                          source={{ uri: selectedImage.uri }} 
                          style={{ width: "100%", height: 200, borderRadius: 12 }} 
                          resizeMode="cover" 
                        />
                        <Pressable 
                          onPress={() => setSelectedImage(null)}
                          style={{ 
                            position: "absolute", 
                            top: 8, 
                            right: 8, 
                            backgroundColor: "rgba(0,0,0,0.6)", 
                            borderRadius: 16, 
                            padding: 6 
                          }}
                        >
                          <Feather name="x" size={16} color="#fff" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>

                <View
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTopWidth: 1,
                    borderTopColor: "rgba(255,255,255,0.05)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Pressable
                    onPress={pickImage}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  >
                    <Feather name="image" size={16} color={webTheme.red} />
                    <Text style={{ ...type.semibold, color: webTheme.red, fontSize: 13 }}>
                      Photo
                    </Text>
                  </Pressable>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Text
                    style={{
                      ...type.medium,
                      color: composer.length > 420 ? webTheme.orange : webTheme.faint,
                      fontSize: 12,
                    }}
                  >
                    {MAX_CHARS - composer.length}
                  </Text>
                  <Pressable onPress={() => {
                    setComposer("");
                    setSelectedImage(null);
                    setComposerOpen(false);
                  }}>
                    <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 13 }}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!composer.trim() && !selectedImage) {
                        return;
                      }
                      createPost.mutate();
                    }}
                    disabled={createPost.isPending || (!composer.trim() && !selectedImage)}
                    style={{
                      borderRadius: 12,
                      backgroundColor: (!composer.trim() && !selectedImage) ? "rgba(214,60,71,0.35)" : webTheme.red,
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                      {createPost.isPending ? "Posting..." : "Post"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </SurfaceCard>

        <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
          {[
            { key: "all", label: "All posts" },
            { key: "following", label: "Following" },
          ].map((item) => {
            const active = mode === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setMode(item.key as typeof mode)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? "rgba(214,60,71,0.30)" : webTheme.border,
                  backgroundColor: active ? "rgba(214,60,71,0.14)" : "rgba(255,255,255,0.03)",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ ...type.bold, color: active ? webTheme.red : webTheme.muted, fontSize: 12 }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!isFetching && posts.length === 0 && (
          <EmptyState
            icon="message-square"
            title="It's quiet here"
            description="There are no posts to see right now. Be the first to start a conversation!"
            actionLabel="Create Post"
            onAction={() => setComposerOpen(true)}
          />
        )}

        <View style={{ marginTop: 18, gap: 14 }}>
          {posts.map((post) => {
            const isOwnPost = post.author?._id === currentUser?.id;
            const isLiked = post.likes?.includes(currentUser?.id || "");
            const avatar = getImageUrl(post.author?.avatar);
            const image = getImageUrl(post.image);
            const isExpanded = expandedPostId === post._id;
            const likeCount = post.likes?.length || 0;
            const commentCount = post.comments?.length || 0;
            const authorLevel = getLevel(post.author?.xp);

            return (
              <SurfaceCard key={post._id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <Pressable
                    onPress={() => post.author?._id ? router.push({ pathname: "/user/[id]", params: { id: post.author._id } }) : null}
                    style={{ flexDirection: "row", gap: 12, flex: 1 }}
                  >
                    <View style={{ position: "relative" }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 999,
                          overflow: "hidden",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(214,60,71,0.16)",
                        }}
                      >
                        {avatar ? (
                          <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} />
                        ) : (
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
                            {getInitials(post.author?.name)}
                          </Text>
                        )}
                      </View>
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

                    <View style={{ flex: 1 }}>
                      <Text style={{ ...type.bold, color: webTheme.text, fontSize: 16 }}>
                        {post.author?.name || "ElevateX user"}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 12 }}>
                          {formatTimeAgo(post.createdAt)}
                        </Text>
                        <Text style={{ ...type.regular, color: "rgba(255,255,255,0.20)", fontSize: 12 }}>
                          ·
                        </Text>
                        <Feather name="globe" size={11} color={webTheme.faint} />
                      </View>
                    </View>
                  </Pressable>

                  {isOwnPost ? (
                    <Pressable
                      onPress={() => setDeletePostId(post._id)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="trash-2" size={16} color={webTheme.faint} />
                    </Pressable>
                  ) : null}
                </View>

                {post.content ? (
                  <Text style={{ ...type.regular, color: webTheme.text, fontSize: 15, lineHeight: 24, marginTop: 16 }}>
                    {post.content}
                  </Text>
                ) : null}

                {image ? (
                  <Image
                    source={{ uri: image }}
                    style={{ width: "100%", height: 230, borderRadius: 18, marginTop: 14, backgroundColor: "#111" }}
                  />
                ) : null}

                <View
                  style={{
                    marginTop: 16,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 12 }}>
                    {likeCount > 0 ? `${likeCount} ${likeCount === 1 ? "like" : "likes"}` : "Be the first to like"}
                  </Text>
                  <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 12 }}>
                    {commentCount > 0 ? `${commentCount} comment${commentCount === 1 ? "" : "s"}` : "No comments yet"}
                  </Text>
                </View>

                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
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
                      active: isExpanded,
                      onPress: () => setExpandedPostId(isExpanded ? null : post._id),
                    },
                    {
                      key: "share",
                      icon: "send",
                      label: "Share",
                      active: false,
                      onPress: async () => {
                        await Share.share({ message: `Check this ElevateX post: ${post.content || "Community update"}` });
                      },
                    },
                    {
                      key: "save",
                      icon: "bookmark",
                      label: "Save",
                      active: Boolean(savedPosts[post._id]),
                      onPress: () =>
                        setSavedPosts((current) => ({
                          ...current,
                          [post._id]: !current[post._id],
                        })),
                    },
                  ].map((action) => (
                    <Pressable
                      key={action.key}
                      onPress={action.onPress}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        paddingVertical: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 6,
                        backgroundColor: action.active ? "rgba(214,60,71,0.10)" : "transparent",
                      }}
                    >
                      <Feather name={action.icon as "heart" | "message-circle" | "send" | "bookmark"} size={15} color={action.active ? webTheme.red : webTheme.faint} />
                      <Text style={{ ...type.semibold, color: action.active ? webTheme.red : webTheme.faint, fontSize: 12 }}>
                        {action.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {isExpanded ? (
                  <View style={{ marginTop: 14, gap: 10 }}>
                    {post.comments?.map((comment, index) => (
                      <View
                        key={comment._id || `${post._id}-${index}`}
                        style={{
                          borderRadius: 16,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        }}
                      >
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12 }}>
                          {comment.user?.name || "Member"}
                        </Text>
                        <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, marginTop: 6, lineHeight: 20 }}>
                          {comment.text}
                        </Text>
                      </View>
                    ))}

                    <View
                      style={{
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: webTheme.border,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        padding: 12,
                      }}
                    >
                      <TextInput
                        value={commentDrafts[post._id] || ""}
                        onChangeText={(value) =>
                          setCommentDrafts((current) => ({
                            ...current,
                            [post._id]: value,
                          }))
                        }
                        placeholder="Write a comment"
                        placeholderTextColor="rgba(255,255,255,0.24)"
                        style={{ ...type.regular, color: webTheme.text, fontSize: 14 }}
                      />
                      <Pressable
                        onPress={() => {
                          const text = commentDrafts[post._id]?.trim();
                          if (!text) return;
                          commentOnPost.mutate({ postId: post._id, text });
                        }}
                        style={{
                          alignSelf: "flex-end",
                          marginTop: 10,
                          borderRadius: 999,
                          backgroundColor: webTheme.red,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                        }}
                      >
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12 }}>
                          Reply
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </SurfaceCard>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
