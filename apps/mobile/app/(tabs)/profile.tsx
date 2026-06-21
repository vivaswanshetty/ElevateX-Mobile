import { useEffect, useMemo, useState } from "react";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SurfaceCard } from "../../components/SurfaceCard";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";
import { TaskCard } from "../../components/TaskCard";
import { FadeSlideIn } from "../../components/FadeSlideIn";
import { AnimatedList } from "../../components/AnimatedList";
import { notify } from "../../stores/toastStore";
import { HapticPressable } from "../../components/HapticPressable";
import { TaskCardSkeleton } from "../../components/TaskCardSkeleton";
import { Watermark } from "../../components/Watermark";
import { getImageUrl, getInitials } from "../../lib/media";
import { mapTaskToCard, type TaskCardSource } from "../../lib/tasks";
import { type } from "../../lib/typography";
import { normalizeUserPayload } from "../../lib/user";
import { webTheme, inputFieldStyle } from "../../lib/webTheme";
import { api, getErrorMessage } from "../../lib/api";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";
import { useAuthStore } from "../../stores/authStore";
import { TabTransitionView } from "../../components/TabTransitionView";
import { UserListModal } from "../../components/UserListModal";
import { useThemeStore } from "../../stores/themeStore";
import { UserAvatar } from "../../components/UserAvatar";
import { useSavedPostsStore } from "../../stores/savedPostsStore";
import { SignOutModal } from "../../components/SignOutModal";

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

interface FeedUser {
  _id: string;
  name: string;
  avatar?: string;
  username?: string;
}

interface FeedPost {
  _id: string;
  author?: FeedUser;
  content: string;
  image?: string;
  likes: string[];
  comments: Array<{ _id?: string; text: string }>;
  createdAt: string;
}

function getLevelTitle(level: number) {
  if (level < 5) return "Newcomer";
  if (level < 10) return "Explorer";
  if (level < 20) return "Achiever";
  if (level < 35) return "Expert";
  if (level < 50) return "Master";
  return "Legend";
}

export default function ProfileScreen() {
  const tabBarPadding = useTabBarPadding();
  const queryClient = useQueryClient();
  const theme = useThemeStore((s) => s.theme);
  const { user, setUser, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "posts" | "saved">("overview");
  const [avatarError, setAvatarError] = useState(false);
  const [showEnlargedAvatar, setShowEnlargedAvatar] = useState(false);
  const [userListModalVisible, setUserListModalVisible] = useState(false);
  const [userListTitle, setUserListTitle] = useState<"Followers" | "Following">("Followers");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const {
    data: profile,
    isFetching,
    refetch,
  } = useQuery<ProfileResponse>({
    queryKey: ["profile"],
    queryFn: () => api.get("/api/users/profile"),
  });

  const { data: tasks = [], isFetching: isFetchingTasks } = useQuery<TaskCardSource[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/api/tasks"),
  });

  const { data: posts = [], isFetching: isFetchingPosts } = useQuery<FeedPost[]>({
    queryKey: ["posts", "profile"],
    queryFn: () => api.get("/api/posts"),
  });

  const followersQuery = useQuery<any[]>({
    queryKey: ["userFollowers", user?.id],
    queryFn: () => api.get(`/api/users/${user?.id}/followers`),
    enabled: Boolean(user?.id),
  });

  const followingQuery = useQuery<any[]>({
    queryKey: ["userFollowing", user?.id],
    queryFn: () => api.get(`/api/users/${user?.id}/following`),
    enabled: Boolean(user?.id),
  });

  const handleRemoveFollower = async (userId: string, userName: string) => {
    try {
      await api.put(`/api/users/${userId}/remove-follower`);
      notify.success(`${userName} has been removed from your followers.`);
      followersQuery.refetch();
      refetch();
    } catch (error) {
      console.error("Error removing follower:", error);
      notify.error("Failed to remove follower. Please try again.");
    }
  };

  useEffect(() => {
    if (!profile) return;
    setAvatarError(false);
  }, [profile]);





  const displayProfile: ProfileResponse = {
    _id: user?.id || "",
    name: user?.displayName || "ElevateX Member",
    email: user?.email || "",
    bio: user?.bio || "",
    avatar: user?.avatarUrl || "",
    xp: user?.xp || 0,
    coins: user?.tokenBalance || 0,
    subscription: user?.subscription,
    seasonXP: user?.seasonXP || 0,
    seasonCoins: user?.seasonCoins || 0,
    seasonTasksCompleted: user?.seasonTasksCompleted || 0,
    socials: user?.socials || {},
    isPrivate: user?.isPrivate || false,
    work: [],
    education: [],
    chatSettings: user?.chatSettings || {},
    ...(profile || {}),
  };

  const avatarUrl = getImageUrl(displayProfile.avatar);
  const showAvatar = avatarUrl && !avatarError;
  const level = Math.floor((displayProfile.xp || 0) / 500) + 1;
  const levelTitle = getLevelTitle(level);
  const planLabel = displayProfile.subscription?.plan?.toUpperCase() || "FREE";
  const xpInLevel = (displayProfile.xp || 0) % 500;
  const xpProgress = Math.min(100, Math.max(0, (xpInLevel / 500) * 100));
  const handle = user?.username || displayProfile.email.split("@")[0] || "member";
  const hasBio = Boolean(displayProfile.bio?.trim());
  const workItems = displayProfile.work || [];
  const educationItems = displayProfile.education || [];

  const ownTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const creatorId =
          typeof task.createdBy === "string" ? task.createdBy : task.createdBy?._id;
        return String(creatorId || "") === String(displayProfile._id);
      }),
    [displayProfile._id, tasks],
  );

  const ownPosts = useMemo(
    () => posts.filter((post) => String(post.author?._id || "") === String(displayProfile._id)),
    [displayProfile._id, posts],
  );

  const { savedPostIds } = useSavedPostsStore();
  const savedPostsList = useMemo(
    () => posts.filter((post) => Boolean(savedPostIds[post._id])),
    [posts, savedPostIds],
  );

  const statCards: any[] = [
    { label: "Level", value: `${level}`, sub: levelTitle, icon: "award", accent: webTheme.gold, bg: "rgba(251,191,36,0.12)", route: "/leaderboard?from=profile" },
    { label: "Tasks Posted", value: `${ownTasks.length}`, sub: "All time", icon: "layers", accent: webTheme.blue, bg: "rgba(96,165,250,0.12)", action: () => setActiveTab("tasks") },
    { label: "Coins", value: `${displayProfile.coins || 0}`, sub: "Balance", icon: "credit-card", accent: webTheme.green, bg: "rgba(52,211,153,0.12)", route: "/wallet?from=profile" },
    { label: "Plan", value: planLabel, sub: "Subscription", icon: "star", accent: webTheme.accent, bg: "rgba(229,54,75,0.12)", route: "/subscription?from=profile" },
  ];

  const socials = [
    { key: "twitter", label: "Twitter", value: displayProfile.socials?.twitter, icon: "twitter" },
    { key: "linkedin", label: "LinkedIn", value: displayProfile.socials?.linkedin, icon: "linkedin" },
    { key: "github", label: "GitHub", value: displayProfile.socials?.github, icon: "github" },
    { key: "website", label: "Website", value: displayProfile.socials?.website, icon: "globe" },
  ] as const;



  const handleSignOut = () => {
    setShowSignOutConfirm(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <TabTransitionView index={4}>
        <ScreenBackdrop />
        <ScrollView
          contentContainerStyle={{ paddingBottom: tabBarPadding }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching || followersQuery.isFetching || followingQuery.isFetching}
              onRefresh={() => {
                refetch();
                followersQuery.refetch();
                followingQuery.refetch();
              }}
              tintColor={webTheme.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ── header backdrop (technical blueprint grid) ── */}
          <View style={{ height: 150, overflow: "hidden", backgroundColor: webTheme.bg }}>
            <LinearGradient
              colors={
                theme === "dark"
                  ? ["#120809", "#080404", "#000000"]
                  : ["#FFEBEF", "#F8E6E8", webTheme.bg]
              }
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <LinearGradient
              colors={["transparent", webTheme.bg]}
              start={{ x: 0.5, y: 0.55 }}
              end={{ x: 0.5, y: 1 }}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 80 }}
            />

            {/* Technical Blueprint Grid Graphic */}
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", opacity: 0.55 }}>
              {/* Horizontal Grid Lines */}
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={`h-grid-${i}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: i * 30,
                    height: 1,
                    backgroundColor: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                  }}
                />
              ))}
              {/* Vertical Grid Lines */}
              {Array.from({ length: 15 }).map((_, i) => (
                <View
                  key={`v-grid-${i}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: i * 30,
                    width: 1,
                    backgroundColor: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                  }}
                />
              ))}
              {/* Technical Layout Dots / Crosshairs */}
              <Text
                style={{
                  position: "absolute",
                  left: 12,
                  top: 75,
                  color: theme === "dark" ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)",
                  fontSize: 8,
                  fontFamily: "monospace",
                }}
              >
                [SYS.ALIGN_00]
              </Text>
              <Text
                style={{
                  position: "absolute",
                  right: 12,
                  top: 75,
                  color: theme === "dark" ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)",
                  fontSize: 8,
                  fontFamily: "monospace",
                  textAlign: "right",
                }}
              >
                [SYS.LOC_PRFL]
              </Text>
              {/* Diagonal Tech Accents */}
              <View
                style={{
                  position: "absolute",
                  right: 60,
                  top: -20,
                  width: 120,
                  height: 120,
                  borderWidth: 1,
                  borderColor: theme === "dark" ? "rgba(229,54,75,0.16)" : "rgba(229,54,75,0.08)",
                  transform: [{ rotate: "45deg" }],
                }}
              />
              <View
                style={{
                  position: "absolute",
                  right: 90,
                  top: 10,
                  width: 60,
                  height: 60,
                  borderWidth: 1,
                  borderColor: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                  transform: [{ rotate: "45deg" }],
                }}
              />
            </View>

            {/* Floating settings gear and header title overlay */}
            <View
              style={{
                position: "absolute",
                top: 15,
                left: 22,
                right: 22,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <Text style={{ ...type.h2, color: theme === "dark" ? "#ffffff" : webTheme.text, fontSize: 22 }}>My Profile</Text>
              <HapticPressable
                onPress={() => router.push("/manage-account")}
                hapticType="light"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.05)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.08)",
                }}
              >
                <Feather name="settings" size={20} color={theme === "dark" ? "#ffffff" : webTheme.text} />
              </HapticPressable>
            </View>
          </View>

          {/* Breathable horizontal gutter wrapper for all body sections */}
          <View style={{ paddingHorizontal: 22, width: "100%", marginTop: -32 }}>
            {/* ── profile card ── */}
            <FadeSlideIn delay={100} distance={20} style={{ width: "100%" }}>
              <View>
                <View style={{ alignItems: "center" }}>
                  {/* avatar */}
                  <Pressable onPress={() => setShowEnlargedAvatar(true)} style={{ zIndex: 10 }}>
                    <UserAvatar
                      avatar={displayProfile.avatar}
                      size={116}
                      borderWidth={4}
                      borderColor={showAvatar ? webTheme.bg : webTheme.accentBorder}
                    />
                  </Pressable>

                  {/* info card */}
                  <SurfaceCard style={{ width: "100%", marginTop: -22 }} contentStyle={{ paddingTop: 44 }}>
                    <Text style={{ position: "absolute", right: 12, top: 12, fontFamily: "monospace", fontSize: 8, color: webTheme.faint }}>
                      [ID_CARD.E-X]
                    </Text>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ ...type.h1, color: webTheme.text, fontSize: 28 }}>
                        {displayProfile.name}
                      </Text>
                      <Text style={{ ...type.body, color: webTheme.muted, fontSize: 14, marginTop: 6 }}>
                        @{handle}
                      </Text>

                      {/* level badge */}
                      <View
                        style={{
                          marginTop: 14,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: webTheme.accentBorder,
                          backgroundColor: webTheme.accentSoft,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <Feather name="award" size={13} color={webTheme.accent} />
                        <Text style={{ ...type.bold, color: webTheme.accent, fontSize: 12 }}>
                          Level {level} • {levelTitle} • {planLabel}
                        </Text>
                      </View>

                      {/* bio */}
                      <Text
                        style={{
                          ...type.body,
                          color: hasBio ? webTheme.muted : webTheme.faint,
                          textAlign: "center",
                          marginTop: 14,
                          fontSize: 14,
                        }}
                      >
                        {displayProfile.bio || "Add a short bio so your profile feels deliberate, not empty."}
                      </Text>

                      {/* Followers, Following, Posts counts */}
                      <View style={{ flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 18, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: webTheme.border }}>
                        <Pressable onPress={() => { setUserListTitle("Followers"); setUserListModalVisible(true); }} style={{ alignItems: "center", flex: 1 }}>
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 18 }}>{followersQuery.data?.length || 0}</Text>
                          <Text style={{ ...type.caption, color: webTheme.muted, fontSize: 12, marginTop: 2 }}>Followers</Text>
                        </Pressable>
                        <View style={{ width: 1, backgroundColor: webTheme.border }} />
                        <Pressable onPress={() => { setUserListTitle("Following"); setUserListModalVisible(true); }} style={{ alignItems: "center", flex: 1 }}>
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 18 }}>{followingQuery.data?.length || 0}</Text>
                          <Text style={{ ...type.caption, color: webTheme.muted, fontSize: 12, marginTop: 2 }}>Following</Text>
                        </Pressable>
                        <View style={{ width: 1, backgroundColor: webTheme.border }} />
                        <Pressable onPress={() => setActiveTab("posts")} style={{ alignItems: "center", flex: 1 }}>
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 18 }}>{ownPosts.length}</Text>
                          <Text style={{ ...type.caption, color: webTheme.muted, fontSize: 12, marginTop: 2 }}>Posts</Text>
                        </Pressable>
                      </View>

                      {/* Segmented XP progress */}
                      <View style={{ marginTop: 20, width: "100%" }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={{ ...type.label, color: webTheme.faint, fontSize: 9, fontFamily: "monospace" }}>
                            SYS.LVL_PROGRESS // {Math.round(xpProgress)}%
                          </Text>
                          <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 11, fontFamily: "monospace" }}>
                            {xpInLevel} / 500 XP
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 4,
                            marginTop: 8,
                            height: 8,
                            width: "100%",
                          }}
                        >
                          {Array.from({ length: 10 }).map((_, idx) => {
                            const isActive = xpProgress >= (idx + 1) * 10;
                            return (
                              <View
                                key={`xp-seg-${idx}`}
                                style={{
                                  flex: 1,
                                  height: "100%",
                                  borderRadius: 1,
                                  backgroundColor: isActive
                                    ? webTheme.accent
                                    : theme === "dark"
                                      ? "rgba(255,255,255,0.06)"
                                      : "rgba(0,0,0,0.06)",
                                }}
                              />
                            );
                          })}
                        </View>
                      </View>

                      {/* action buttons */}
                      <View style={{ marginTop: 20, width: "100%" }}>
                        <HapticPressable 
                          onPress={() => router.push("/edit-profile")}
                          hapticType="light"
                          style={{ width: "100%" }}
                        >
                          <View style={{ borderRadius: 9999, backgroundColor: webTheme.accent, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", minHeight: 52 }}>
                            <Text style={{ ...type.buttonLabel, color: "#fff" }}>Edit Profile</Text>
                          </View>
                        </HapticPressable>
                      </View>
                    </View>
                  </SurfaceCard>
                </View>
              </View>
            </FadeSlideIn>

            {/* ── stat cards (metallic shimmer) ── */}
            <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              <AnimatedList baseDelay={220} stagger={60} distance={10} itemStyle={{ width: "48%", marginBottom: 12 }}>
                {statCards.map((stat) => {
                  return (
                    <SurfaceCard
                      key={stat.label}
                      shimmer={true}
                      onPress={() => {
                        if (stat.action) stat.action();
                        else if (stat.route) router.navigate(stat.route as any);
                      }}
                      style={{
                        width: "100%",
                        borderRadius: 16,
                      }}
                      contentStyle={{
                        padding: 12,
                        minHeight: 76,
                        justifyContent: "space-between",
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
                          {stat.label}
                        </Text>
                        <Feather name={stat.icon as any} size={13} color={stat.accent} />
                      </View>
                      <View style={{ marginTop: 4 }}>
                        <Text style={{ ...type.extrabold, color: webTheme.text, fontSize: 18 }}>
                          {stat.value}
                        </Text>
                        {stat.sub ? (
                          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 9, marginTop: 1 }} numberOfLines={1}>
                            {stat.sub}
                          </Text>
                        ) : null}
                      </View>
                    </SurfaceCard>
                  );
                })}
              </AnimatedList>
            </View>

            {/* ── tab switcher (unified segmented control console) ── */}
            <FadeSlideIn delay={220} distance={14}>
              <View
                style={{
                  marginTop: 18,
                  flexDirection: "row",
                  borderWidth: 1,
                  borderColor: webTheme.border,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.02)",
                  padding: 4,
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                {[
                  { id: "overview", label: "Overview" },
                  { id: "tasks", label: "Tasks" },
                  { id: "posts", label: "Posts" },
                  { id: "saved", label: "Saved" },
                ].map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <HapticPressable
                      key={tab.id}
                      hapticType="selection"
                      onPress={() => setActiveTab(tab.id as typeof activeTab)}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        backgroundColor: active ? "rgba(255,255,255,0.05)" : "transparent",
                        borderWidth: 1,
                        borderColor: active ? webTheme.border : "transparent",
                        paddingVertical: 8,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ ...type.bold, color: active ? webTheme.text : webTheme.muted, fontSize: 12 }}>
                        {tab.label}
                      </Text>
                    </HapticPressable>
                  );
                })}
              </View>
            </FadeSlideIn>

            {/* ── active tab content ── */}
            <FadeSlideIn delay={300} distance={16} key={activeTab}>

              {/* ── overview tab ── */}
              {activeTab === "overview" ? (
                <View style={{ marginTop: 18, gap: 14 }}>
                  {/* social links */}
                  <SurfaceCard shimmer={true}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <Text style={{ ...type.h2, color: webTheme.text }}>
                        Social Links
                      </Text>
                      <Text style={{ fontFamily: "monospace", fontSize: 9, color: webTheme.faint }}>
                        [REG.SOCIAL_LINKS]
                      </Text>
                    </View>
                    <View style={{ gap: 10 }}>
                      {socials.map((social) => (
                        <View
                          key={social.key}
                          style={{
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: webTheme.border,
                            backgroundColor: "rgba(255,255,255,0.015)",
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <Feather name={social.icon as "twitter" | "linkedin" | "github" | "globe"} size={15} color={webTheme.accent} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                                {social.label}
                              </Text>
                              <Text style={{ fontFamily: "monospace", fontSize: 8, color: webTheme.faint }}>
                                {social.key.toUpperCase()}
                              </Text>
                            </View>
                            <Text style={{ ...type.caption, color: social.value ? webTheme.textSecondary : webTheme.faint, fontSize: 12, marginTop: 4 }}>
                              {social.value || "NOT_CONFIGURED"}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </SurfaceCard>

                  {/* work experience */}
                  <SurfaceCard>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <Text style={{ ...type.h2, color: webTheme.text }}>
                        Work Experience
                      </Text>
                    </View>
                    <View style={{ marginTop: 4, gap: 12 }}>
                      {workItems.length > 0 ? (
                        workItems.map((item) => (
                          <View
                            key={item.id}
                            style={{
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: webTheme.border,
                              backgroundColor: "rgba(255,255,255,0.015)",
                              padding: 16,
                            }}
                          >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 15 }}>
                                  {item.role || "Untitled role"}
                                </Text>
                                <Text style={{ ...type.semibold, color: webTheme.accent, fontSize: 13, marginTop: 4 }}>
                                  {item.company || "Company not set"}
                                </Text>
                              </View>
                              <View
                                style={{
                                  borderRadius: 4,
                                  borderWidth: 1,
                                  borderColor: "rgba(52,211,153,0.3)",
                                  backgroundColor: "rgba(52,211,153,0.08)",
                                  paddingHorizontal: 6,
                                  paddingVertical: 3,
                                }}
                              >
                                <Text style={{ fontFamily: "monospace", fontSize: 8, color: webTheme.green }}>
                                  RECORDED
                                </Text>
                              </View>
                            </View>
                            <Text style={{ ...type.caption, color: webTheme.faint, marginTop: 8, fontSize: 11 }}>
                              PERIOD // {item.duration || "N/A"}
                            </Text>
                            {item.desc ? (
                              <Text style={{ ...type.body, color: webTheme.muted, fontSize: 13, marginTop: 8 }}>
                                {item.desc}
                              </Text>
                            ) : null}
                          </View>
                        ))
                      ) : (
                        <View
                          style={{
                            borderRadius: 8,
                            borderWidth: 1,
                            borderStyle: "dashed",
                            borderColor: webTheme.border,
                            padding: 18,
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 14 }}>
                            NO_WORK_RECORDS_FOUND
                          </Text>
                        </View>
                      )}
                    </View>
                  </SurfaceCard>

                  {/* education */}
                  <SurfaceCard>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <Text style={{ ...type.h2, color: webTheme.text }}>
                        Education
                      </Text>
                    </View>
                    <View style={{ marginTop: 4, gap: 12 }}>
                      {educationItems.length > 0 ? (
                        educationItems.map((item) => (
                          <View
                            key={item.id}
                            style={{
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: webTheme.border,
                              backgroundColor: "rgba(255,255,255,0.015)",
                              padding: 16,
                            }}
                          >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 15 }}>
                                  {item.degree || "Untitled degree"}
                                </Text>
                                <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 13, marginTop: 4 }}>
                                  {item.school || "School not set"}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ ...type.caption, color: webTheme.faint, marginTop: 8, fontSize: 11 }}>
                              GRADUATION // {item.year || "N/A"}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <View
                          style={{
                            borderRadius: 8,
                            borderWidth: 1,
                            borderStyle: "dashed",
                            borderColor: webTheme.border,
                            padding: 18,
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 14 }}>
                            NO_EDU_RECORDS_FOUND
                          </Text>
                        </View>
                      )}
                    </View>
                  </SurfaceCard>

                  {/* season momentum */}
                  <SurfaceCard>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <Text style={{ ...type.h2, color: webTheme.text }}>
                        Season Momentum
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {[
                        { label: "XP", value: `${displayProfile.seasonXP || 0}`, code: "XP_VAL" },
                        { label: "Coins", value: `${displayProfile.seasonCoins || 0}`, code: "CNS_VAL" },
                        { label: "Tasks", value: `${displayProfile.seasonTasksCompleted || 0}`, code: "TSK_COMP" },
                      ].map((item) => (
                        <View key={item.label} style={{ flex: 1 }}>
                          <View
                            style={{
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: webTheme.border,
                              backgroundColor: "rgba(255,255,255,0.015)",
                              padding: 12,
                              minHeight: 74,
                              justifyContent: "space-between",
                            }}
                          >
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                              <Text style={{ ...type.label, color: webTheme.faint, fontSize: 8 }}>
                                {item.label}
                              </Text>
                            </View>
                            <View style={{ marginTop: 6 }}>
                              <Text style={{ ...type.black, color: webTheme.text, fontSize: 20 }}>
                                {item.value}
                              </Text>
                              <Text style={{ fontFamily: "monospace", fontSize: 7, color: webTheme.faint, marginTop: 2 }}>
                                {item.code}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </SurfaceCard>

                </View>
              ) : null}

          {/* ── tasks tab ── */}
          {activeTab === "tasks" ? (
            <View style={{ marginTop: 18, gap: 14 }}>
              {isFetchingTasks && ownTasks.length === 0 ? (
                <AnimatedList itemStyle={{ width: "100%" }}>
                  <TaskCardSkeleton />
                  <TaskCardSkeleton />
                </AnimatedList>
              ) : ownTasks.length > 0 ? (
                <AnimatedList stagger={60} itemStyle={{ width: "100%" }}>
                  {ownTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={mapTaskToCard(task)}
                      onPress={() => router.push({ pathname: "/task/[id]", params: { id: task._id } })}
                    />
                  ))}
                </AnimatedList>
              ) : (
                <SurfaceCard>
                  <Text style={{ ...type.h3, color: webTheme.text }}>
                    No Tasks Posted Yet
                  </Text>
                  <Text style={{ ...type.body, color: webTheme.muted, marginTop: 8 }}>
                    Your posted opportunities will appear here once you create them from the app or web.
                  </Text>
                </SurfaceCard>
              )}
            </View>
          ) : null}

          {/* ── posts tab ── */}
          {activeTab === "posts" ? (
            <View style={{ marginTop: 18, gap: 14 }}>
              {ownPosts.length > 0 ? (
                ownPosts.map((post) => (
                  <SurfaceCard key={post._id} onPress={() => router.push({ pathname: "/post/[id]", params: { id: post._id } })}>
                    <Text style={{ ...type.body, color: webTheme.text }}>
                      {post.content || "Media post"}
                    </Text>
                    {post.image ? (
                      <Image
                        source={{ uri: getImageUrl(post.image) || undefined }}
                        style={{ width: "100%", height: 220, borderRadius: 20, marginTop: 14, backgroundColor: webTheme.surface }}
                      />
                    ) : null}
                    <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", gap: 14 }}>
                        <Text style={{ ...type.caption, color: webTheme.faint }}>
                          {post.likes?.length || 0} likes
                        </Text>
                        <Text style={{ ...type.caption, color: webTheme.faint }}>
                          {post.comments?.length || 0} comments
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={14} color={webTheme.faint} />
                    </View>
                  </SurfaceCard>
                ))
              ) : (
                <SurfaceCard>
                  <Text style={{ ...type.h3, color: webTheme.text }}>
                    No Posts Yet
                  </Text>
                  <Text style={{ ...type.body, color: webTheme.muted, marginTop: 8 }}>
                    Share progress in the feed and your posts will show up here just like the web profile.
                  </Text>
                  <HapticPressable onPress={() => router.navigate("/feed?from=profile")}>
                    <View style={{ marginTop: 16, alignSelf: "flex-start", borderRadius: 999, backgroundColor: webTheme.accent, paddingHorizontal: 16, paddingVertical: 12 }}>
                      <Text style={{ ...type.buttonLabel, color: "#fff" }}>Open feed</Text>
                    </View>
                  </HapticPressable>
                </SurfaceCard>
              )}
            </View>
          ) : null}

          {/* ── saved tab ── */}
          {activeTab === "saved" ? (
            <View style={{ marginTop: 18, gap: 14 }}>
              {savedPostsList.length > 0 ? (
                savedPostsList.map((post) => (
                  <SurfaceCard 
                    key={post._id} 
                    onPress={() => router.push({ pathname: "/post/[id]", params: { id: post._id } })}
                  >
                    {/* Author Header */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <UserAvatar avatar={post.author?.avatar} size={32} />
                        <View>
                          <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>
                            {post.author?.name || "ElevateX user"}
                          </Text>
                          <Text style={{ ...type.caption, color: webTheme.muted, fontSize: 10 }}>
                            @{post.author?.username || "user"}
                          </Text>
                        </View>
                      </View>
                      <Feather name="chevron-right" size={14} color={webTheme.faint} />
                    </View>

                    <Text style={{ ...type.body, color: webTheme.text, fontSize: 14, lineHeight: 20 }}>
                      {post.content || "Media post"}
                    </Text>
                    {post.image ? (
                      <Image
                        source={{ uri: getImageUrl(post.image) || undefined }}
                        style={{ width: "100%", height: 180, borderRadius: 16, marginTop: 12, backgroundColor: webTheme.surface }}
                      />
                    ) : null}
                    
                    {/* Card Footer */}
                    <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", gap: 14 }}>
                        <Text style={{ ...type.caption, color: webTheme.faint, fontSize: 11 }}>
                          {post.likes?.length || 0} likes
                        </Text>
                        <Text style={{ ...type.caption, color: webTheme.faint, fontSize: 11 }}>
                          {post.comments?.length || 0} comments
                        </Text>
                      </View>
                      
                      {/* Saved badge icon */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <FontAwesome name="bookmark" size={12} color={webTheme.accent} />
                        <Text style={{ ...type.caption, color: webTheme.accent, fontSize: 11 }}>Saved</Text>
                      </View>
                    </View>
                  </SurfaceCard>
                ))
              ) : (
                <SurfaceCard>
                  <Text style={{ ...type.h3, color: webTheme.text }}>
                    No Saved Posts
                  </Text>
                  <Text style={{ ...type.body, color: webTheme.muted, marginTop: 8 }}>
                    Explore the feed and bookmark posts to read or follow up later.
                  </Text>
                  <HapticPressable onPress={() => router.navigate("/feed?from=profile")}>
                    <View style={{ marginTop: 16, alignSelf: "flex-start", borderRadius: 999, backgroundColor: webTheme.accent, paddingHorizontal: 16, paddingVertical: 12 }}>
                      <Text style={{ ...type.buttonLabel, color: "#fff" }}>Explore Feed</Text>
                    </View>
                  </HapticPressable>
                </SurfaceCard>
              )}
            </View>
          ) : null}
          </FadeSlideIn>

          <Watermark />
          </View>
        </ScrollView>
      </TabTransitionView>

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
          {showAvatar ? (
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

      <UserListModal
        visible={userListModalVisible}
        title={userListTitle}
        users={userListTitle === "Followers" ? (followersQuery.data || []) : (followingQuery.data || [])}
        isLoading={userListTitle === "Followers" ? followersQuery.isFetching : followingQuery.isFetching}
        onClose={() => setUserListModalVisible(false)}
        onRemoveUser={userListTitle === "Followers" ? handleRemoveFollower : undefined}
      />

      <SignOutModal
        visible={showSignOutConfirm}
        onConfirm={() => {
          setShowSignOutConfirm(false);
          queryClient.clear();
          signOut().finally(() => {
            router.replace("/auth/login");
          });
        }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </SafeAreaView>
  );
}
