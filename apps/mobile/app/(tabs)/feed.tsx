import { useState, useEffect, useRef, useCallback } from "react";
import { Feather, AntDesign, FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
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
import { AppStackHeader } from "../../components/AppStackHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";
import { SurfaceCard } from "../../components/SurfaceCard";
import { api, getErrorMessage } from "../../lib/api";
import { formatTimeAgo, getImageUrl, getInitials, formatPostTime } from "../../lib/media";
import { type } from "../../lib/typography";
import { webTheme } from "../../lib/webTheme";
import { useAuthStore } from "../../stores/authStore";
import { notify } from "../../stores/toastStore";
import { useThemeStore } from "../../stores/themeStore";
import { UserAvatar } from "../../components/UserAvatar";
import { useSavedPostsStore } from "../../stores/savedPostsStore";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";
import { useMutedUsersStore } from "../../stores/mutedUsersStore";

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
  const theme = useThemeStore((s) => s.theme);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [mode, setMode] = useState<"latest" | "trending" | "following">("latest");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composer, setComposer] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const { savedPostIds, toggleSavePost } = useSavedPostsStore();
  const { mutedUserIds, muteUser } = useMutedUsersStore();
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [muteConfirmUser, setMuteConfirmUser] = useState<FeedUser | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const params = useLocalSearchParams<{ postId?: string; from?: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const postLayoutsRef = useRef<Record<string, number>>({});
  const targetPostIdRef = useRef<string | null>(null);
  const hasScrolledRef = useRef(false);

  // Track the target post ID from params
  useEffect(() => {
    if (params.postId) {
      targetPostIdRef.current = params.postId;
      hasScrolledRef.current = false;
      setExpandedPostId(params.postId);
      // Clean params but don't lose postId reference
      router.replace("/feed");
    }
  }, [params.postId]);

  // Handle back navigation to return to profile if "from" param present
  const handleBackToProfile = useCallback(() => {
    if (params.from === "userProfile") {
      router.back();
    }
  }, [params.from]);

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
    queryFn: () => {
      if (mode === "following") return api.get("/api/posts/feed");
      if (mode === "trending") return api.get("/api/posts?sort=trending");
      return api.get("/api/posts?sort=latest");
    },
  });

  const { data: suggestedPosts = [] } = useQuery<FeedPost[]>({
    queryKey: ["suggested-posts"],
    queryFn: () => api.get("/api/posts/suggested"),
    enabled: !!currentUser,
  });

  const visiblePosts = posts.filter(
    (post) => !post.author?._id || !mutedUserIds.includes(post.author._id)
  );

  const visibleSuggested = suggestedPosts.filter(
    (post) => !post.author?._id || !mutedUserIds.includes(post.author._id)
  );

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

  const tabBarPadding = useTabBarPadding();

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
      <ConfirmDialog
        visible={Boolean(muteConfirmUser)}
        title={muteConfirmUser ? `Mute ${muteConfirmUser.name}?` : "Mute user?"}
        detail="You will no longer see posts from this user in your feed."
        confirmLabel="Mute"
        destructive
        onClose={() => setMuteConfirmUser(null)}
        onConfirm={() => {
          if (!muteConfirmUser) return;
          muteUser(muteConfirmUser._id);
          notify.success(`Muted @${muteConfirmUser.name}`);
          setMuteConfirmUser(null);
        }}
      />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBarPadding }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={webTheme.red} />}
        showsVerticalScrollIndicator={false}
      >
        <SurfaceCard accent={webTheme.red}>
          {!composerOpen ? (
            <Pressable
              onPress={() => setComposerOpen(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <UserAvatar avatar={currentUser?.avatarUrl} size={42} />
              <View
                style={{
                  flex: 1,
                  borderRadius: 999,
                  backgroundColor: webTheme.inputBg,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                }}
              >
                <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14 }}>
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
                <UserAvatar avatar={currentUser?.avatarUrl} size={42} />
                  <View style={{ flex: 1 }}>
                    <TextInput
                      autoFocus
                      multiline
                      value={composer}
                      onChangeText={setComposer}
                      placeholder="Share something with the community..."
                      placeholderTextColor={webTheme.muted}
                      maxLength={MAX_CHARS}
                      style={{
                        ...type.regular,
                        width: "100%",
                        minHeight: 80,
                        color: webTheme.text,
                        fontSize: 15,
                        lineHeight: 24,
                        textAlignVertical: "top",
                        backgroundColor: "transparent",
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
                    borderTopColor: webTheme.borderSoft,
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

        {visibleSuggested.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Feather name="compass" size={15} color={webTheme.accent} />
              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
                Suggested for You
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {visibleSuggested.map((post) => {
                const authorLevel = getLevel(post.author?.xp);
                return (
                  <Pressable
                    key={`suggested-${post._id}`}
                    onPress={() => {
                      const inCurrentFeed = posts.some(p => p._id === post._id);
                      if (!inCurrentFeed) {
                        setMode("latest");
                        targetPostIdRef.current = post._id;
                        hasScrolledRef.current = false;
                        setExpandedPostId(post._id);
                      } else {
                        setExpandedPostId(post._id);
                        if (postLayoutsRef.current[post._id] !== undefined) {
                          scrollViewRef.current?.scrollTo({
                            y: postLayoutsRef.current[post._id] + 160,
                            animated: true,
                          });
                        } else {
                          targetPostIdRef.current = post._id;
                          hasScrolledRef.current = false;
                        }
                      }
                    }}
                    style={{
                      width: 240,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.08)",
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                        <UserAvatar avatar={post.author?.avatar} size={28} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }} numberOfLines={1}>
                            {post.author?.name || "ElevateX user"}
                          </Text>
                          <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 10 }}>
                            L{authorLevel}
                          </Text>
                        </View>
                      </View>
                      {post.author?._id && post.author._id !== currentUser?.id && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setMuteConfirmUser(post.author || null);
                          }}
                          style={{ padding: 4 }}
                        >
                          <Feather name="user-x" size={14} color={webTheme.faint} />
                        </Pressable>
                      )}
                    </View>
                    <Text style={{ ...type.regular, color: webTheme.textSecondary, fontSize: 12, marginTop: 10, lineHeight: 18 }} numberOfLines={3}>
                      {post.content || "Image post"}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <AntDesign name="heart" size={11} color={webTheme.accent} />
                        <Text style={{ ...type.medium, color: webTheme.faint, fontSize: 10 }}>
                          {post.likes?.length || 0}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Feather name="message-circle" size={11} color={webTheme.faint} />
                        <Text style={{ ...type.medium, color: webTheme.faint, fontSize: 10 }}>
                          {post.comments?.length || 0}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ marginTop: 20, flexDirection: "row", gap: 10 }}>
          {[
            { key: "latest", label: "Latest" },
            { key: "trending", label: "Trending" },
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
                  borderColor: active ? "rgba(229,54,75,0.30)" : webTheme.border,
                  backgroundColor: active ? "rgba(229,54,75,0.12)" : webTheme.cardBg,
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

        {!isFetching && visiblePosts.length === 0 && (
          <EmptyState
            icon="message-square"
            title="It's quiet here"
            description="There are no posts to see right now. Be the first to start a conversation!"
            actionLabel="Create Post"
            onAction={() => setComposerOpen(true)}
          />
        )}

        <View style={{ marginTop: 18, gap: 14 }}>
          {visiblePosts.map((post) => {
            const isOwnPost = post.author?._id === currentUser?.id;
            const isLiked = post.likes?.includes(currentUser?.id || "");
            const image = getImageUrl(post.image);
            const isExpanded = expandedPostId === post._id;
            const likeCount = post.likes?.length || 0;
            const commentCount = post.comments?.length || 0;
            const authorLevel = getLevel(post.author?.xp);

            return (
              <SurfaceCard
                key={post._id}
                style={targetPostIdRef.current === post._id ? { borderColor: webTheme.accent, borderWidth: 1.5 } : undefined}
                onLayout={(e: any) => {
                  postLayoutsRef.current[post._id] = e.nativeEvent.layout.y;
                  // Auto-scroll to target post once its layout is measured
                  if (
                    targetPostIdRef.current === post._id &&
                    !hasScrolledRef.current
                  ) {
                    hasScrolledRef.current = true;
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({
                        y: e.nativeEvent.layout.y + 160, // offset for header + composer
                        animated: true,
                      });
                      // Clear highlight after 3s
                      setTimeout(() => {
                        targetPostIdRef.current = null;
                      }, 3000);
                    }, 300);
                  }
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <Pressable
                    onPress={() => post.author?._id ? router.push({ pathname: "/user/[id]", params: { id: post.author._id } }) : null}
                    style={{ flexDirection: "row", gap: 12, flex: 1 }}
                  >
                    <View style={{ position: "relative" }}>
                      <UserAvatar avatar={post.author?.avatar} size={44} />
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
                        <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 12 }}>
                          {formatPostTime(post.createdAt)}
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
                  ) : post.author ? (
                    <Pressable
                      onPress={() => setMuteConfirmUser(post.author || null)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="user-x" size={16} color={webTheme.faint} />
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
                    borderTopColor: webTheme.borderSoft,
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
                      active: Boolean(savedPostIds[post._id]),
                      onPress: () => toggleSavePost(post._id),
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
                        backgroundColor: action.active
                          ? action.key === "save"
                            ? "rgba(255,255,255,0.10)"
                            : "rgba(214,60,71,0.10)"
                          : "transparent",
                      }}
                    >
                      {action.key === "like" ? (
                        <AntDesign name={action.active ? "heart" : "hearto"} size={15} color={action.active ? webTheme.red : webTheme.faint} />
                      ) : action.key === "save" ? (
                        <FontAwesome name={action.active ? "bookmark" : "bookmark-o"} size={15} color={action.active ? "#ffffff" : webTheme.faint} />
                      ) : (
                        <Feather name={action.icon as any} size={15} color={action.active ? webTheme.red : webTheme.faint} />
                      )}
                      <Text
                        style={{
                          ...type.semibold,
                          color: action.active
                            ? action.key === "save"
                              ? "#ffffff"
                              : webTheme.red
                            : webTheme.faint,
                          fontSize: 12,
                        }}
                      >
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
                          backgroundColor: webTheme.cardBg,
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
                        backgroundColor: webTheme.inputBg,
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
                        placeholderTextColor={webTheme.muted}
                        style={{ ...type.regular, color: webTheme.text, fontSize: 14, backgroundColor: "transparent" }}
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
