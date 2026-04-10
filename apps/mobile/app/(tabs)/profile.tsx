import { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  Alert,
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
  const { user, setUser, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "posts" | "activity">("overview");
  const [avatarError, setAvatarError] = useState(false);

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

  const statCards: any[] = [
    { label: "Level", value: `${level}`, sub: levelTitle, icon: "award", accent: webTheme.gold, bg: "rgba(251,191,36,0.12)", route: "/leaderboard" },
    { label: "Tasks Posted", value: `${ownTasks.length}`, sub: "All time", icon: "layers", accent: webTheme.blue, bg: "rgba(96,165,250,0.12)", action: () => setActiveTab("tasks") },
    { label: "Coins", value: `${displayProfile.coins || 0}`, sub: "Balance", icon: "credit-card", accent: webTheme.green, bg: "rgba(52,211,153,0.12)", route: "/wallet" },
    { label: "Plan", value: planLabel, sub: "Subscription", icon: "star", accent: webTheme.accent, bg: "rgba(229,54,75,0.12)", route: "/subscription" },
  ];

  const socials = [
    { key: "twitter", label: "Twitter", value: displayProfile.socials?.twitter, icon: "twitter" },
    { key: "linkedin", label: "LinkedIn", value: displayProfile.socials?.linkedin, icon: "linkedin" },
    { key: "github", label: "GitHub", value: displayProfile.socials?.github, icon: "github" },
    { key: "website", label: "Website", value: displayProfile.socials?.website, icon: "globe" },
  ] as const;



  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? You'll need to sign back in next time.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            queryClient.clear();
            signOut().finally(() => {
              router.replace("/auth/login");
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop />
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={webTheme.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── header backdrop ── */}
        <View style={{ height: 200, overflow: "hidden", backgroundColor: webTheme.bg }}>
          <LinearGradient
            colors={["#1A1015", "#120D10", webTheme.bg]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View
            style={{
              position: "absolute",
              top: 0, right: 0, bottom: 0, left: 0,
              backgroundColor: "rgba(229,54,75,0.03)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: -52,
              right: -54,
              width: 260,
              height: 260,
              borderRadius: 999,
              backgroundColor: "rgba(229,54,75,0.10)",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -112,
              left: -72,
              width: 220,
              height: 220,
              borderRadius: 999,
              backgroundColor: "rgba(139,92,246,0.05)",
            }}
          />
          <LinearGradient
            colors={["transparent", webTheme.bg]}
            start={{ x: 0.5, y: 0.55 }}
            end={{ x: 0.5, y: 1 }}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 112 }}
          />
        </View>

        {/* ── profile card ── */}
        <FadeSlideIn delay={100} distance={20} style={{ width: "100%" }}>
          <View style={{ paddingHorizontal: 22, marginTop: -28 }}>
            <View style={{ alignItems: "center" }}>
            {/* avatar */}
            <View
              style={{
                width: 116,
                height: 116,
                borderRadius: 999,
                backgroundColor: showAvatar ? webTheme.bg : webTheme.surfaceRaised,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 4,
                borderColor: showAvatar ? webTheme.bg : webTheme.accentBorder,
                overflow: "hidden",
                zIndex: 2,
              }}
            >
              {showAvatar ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <Text style={{ ...type.black, color: webTheme.accent, fontSize: 34 }}>
                  {getInitials(displayProfile.name)}
                </Text>
              )}
            </View>

            {/* info card */}
            <SurfaceCard style={{ width: "100%", marginTop: -22 }} contentStyle={{ paddingTop: 44 }}>
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

                {/* XP progress */}
                <View style={{ marginTop: 20, width: "100%" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ ...type.label, color: webTheme.faint, fontSize: 10 }}>
                      XP Progress
                    </Text>
                    <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 12 }}>
                      {xpInLevel}/500 XP
                    </Text>
                  </View>
                  <View
                    style={{
                      marginTop: 8,
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <LinearGradient
                      colors={["#E5364B", "#F43F5E"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        width: `${xpProgress}%`,
                        height: "100%",
                        borderRadius: 999,
                      }}
                    />
                  </View>
                </View>

                {/* action buttons */}
                <View style={{ marginTop: 20, flexDirection: "row", gap: 10, width: "100%" }}>
                  <HapticPressable 
                    onPress={() => router.push("/edit-profile")}
                    hapticType="light"
                    style={{ flex: 1 }}
                  >
                    <View style={{ borderRadius: 999, backgroundColor: webTheme.accent, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", minHeight: 52 }}>
                      <Text style={{ ...type.buttonLabel, color: "#fff" }}>Edit</Text>
                    </View>
                  </HapticPressable>
                  <HapticPressable 
                    onPress={handleSignOut}
                    hapticType="light"
                    style={{ flex: 1 }}
                  >
                    <View style={{ borderRadius: 999, borderWidth: 1, borderColor: webTheme.red, backgroundColor: "rgba(229,54,75,0.1)", paddingVertical: 14, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", minHeight: 52 }}>
                      <Text style={{ ...type.buttonLabel, color: webTheme.red, fontWeight: "600" }}>Sign out</Text>
                    </View>
                  </HapticPressable>
                </View>
              </View>
            </SurfaceCard>
          </View>
          </View>
        </FadeSlideIn>

          {/* ── stat cards ── */}
          <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <AnimatedList baseDelay={220} stagger={60} distance={10} itemStyle={{ width: "47%" }}>
              {statCards.map((stat) => {
                return (
                  <View key={stat.label}>
                    <HapticPressable
                      hapticType="light"
                      onPress={() => {
                        if (stat.action) stat.action();
                        else if (stat.route) router.push(stat.route);
                      }}
                    >
                      <SurfaceCard contentStyle={{ padding: 18, position: "relative", overflow: "hidden" }}>
                        <LinearGradient
                          colors={[stat.bg, "transparent"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 }}
                        />
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: stat.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
                            <Feather name={stat.icon as any} size={18} color={stat.accent} />
                          </View>
                        </View>
                        <Text
                          style={{
                            ...type.label,
                            color: webTheme.faint,
                            fontSize: 10,
                            letterSpacing: 1.6,
                            textTransform: "uppercase"
                          }}
                        >
                          {stat.label}
                        </Text>
                        <Text style={{ ...type.black, marginTop: 4, color: webTheme.text, fontSize: 24 }}>
                          {stat.value}
                        </Text>
                        <Text style={{ ...type.caption, marginTop: 2, color: webTheme.muted }}>
                          {stat.sub}
                        </Text>
                      </SurfaceCard>
                    </HapticPressable>
                  </View>
                );
              })}
            </AnimatedList>
          </View>

          {/* ── tab switcher ── */}
          <FadeSlideIn delay={220} distance={14}>
            <View style={{ marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[
                { id: "overview", label: "Overview" },
                { id: "tasks", label: "Tasks" },
                { id: "posts", label: "Posts" },
                { id: "activity", label: "Activity" },
              ].map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <HapticPressable
                    key={tab.id}
                    hapticType="selection"
                    onPress={() => setActiveTab(tab.id as typeof activeTab)}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? webTheme.accentBorder : webTheme.border,
                      backgroundColor: active ? webTheme.accentSoft : "rgba(255,255,255,0.03)",
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ ...type.bold, color: active ? webTheme.accent : webTheme.muted, fontSize: 12 }}>
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
              <SurfaceCard>
                <Text style={{ ...type.h2, color: webTheme.text }}>
                  Social links
                </Text>
                <View style={{ marginTop: 16, gap: 10 }}>
                  {socials.map((social) => (
                    <View
                      key={social.key}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: webTheme.border,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Feather name={social.icon as "twitter" | "linkedin" | "github" | "globe"} size={16} color={webTheme.accent} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>
                          {social.label}
                        </Text>
                        <Text style={{ ...type.caption, color: webTheme.muted, marginTop: 4 }}>
                          {social.value || "Not set"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </SurfaceCard>

              {/* work experience */}
              <SurfaceCard>
                <Text style={{ ...type.h2, color: webTheme.text }}>
                  Work experience
                </Text>
                <View style={{ marginTop: 16, gap: 12 }}>
                  {workItems.length > 0 ? (
                    workItems.map((item) => (
                      <View
                        key={item.id}
                        style={{
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: webTheme.border,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          padding: 16,
                        }}
                      >
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 16 }}>
                          {item.role || "Untitled role"}
                        </Text>
                        <Text style={{ ...type.semibold, color: webTheme.accent, fontSize: 13, marginTop: 6 }}>
                          {item.company || "Company not set"}
                        </Text>
                        <Text style={{ ...type.caption, color: webTheme.faint, marginTop: 6 }}>
                          {item.duration || "Duration not set"}
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
                        borderRadius: 20,
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

              {/* education */}
              <SurfaceCard>
                <Text style={{ ...type.h2, color: webTheme.text }}>
                  Education
                </Text>
                <View style={{ marginTop: 16, gap: 12 }}>
                  {educationItems.length > 0 ? (
                    educationItems.map((item) => (
                      <View
                        key={item.id}
                        style={{
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: webTheme.border,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          padding: 16,
                        }}
                      >
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 16 }}>
                          {item.degree || "Untitled degree"}
                        </Text>
                        <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 13, marginTop: 6 }}>
                          {item.school || "School not set"}
                        </Text>
                        <Text style={{ ...type.caption, color: webTheme.faint, marginTop: 6 }}>
                          {item.year || "Year not set"}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View
                      style={{
                        borderRadius: 20,
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

              {/* season momentum */}
              <SurfaceCard>
                <Text style={{ ...type.h2, color: webTheme.text }}>
                  Season momentum
                </Text>
                <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
                  {[
                    { label: "Season XP", value: `${displayProfile.seasonXP || 0}` },
                    { label: "Season Coins", value: `${displayProfile.seasonCoins || 0}` },
                    { label: "Tasks Done", value: `${displayProfile.seasonTasksCompleted || 0}` },
                  ].map((item) => (
                    <View key={item.label} style={{ flex: 1 }}>
                      <View
                        style={{
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: webTheme.border,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          padding: 14,
                        }}
                      >
                        <Text style={{ ...type.label, color: webTheme.faint, fontSize: 9 }}>
                          {item.label}
                        </Text>
                        <Text style={{ ...type.black, color: webTheme.text, fontSize: 22, marginTop: 6 }}>
                          {item.value}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </SurfaceCard>

              {/* manage account link */}
              <HapticPressable onPress={() => router.push("/manage-account")}>
                <SurfaceCard tone="muted">
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...type.h2, color: webTheme.text }}>
                        Manage Account
                      </Text>
                      <Text style={{ ...type.body, color: webTheme.muted, fontSize: 13, marginTop: 4 }}>
                        Privacy, password, and account controls.
                      </Text>
                    </View>
                    <View 
                      style={{ 
                        width: 44, 
                        height: 44, 
                        borderRadius: 22, 
                        backgroundColor: "rgba(255,255,255,0.05)", 
                        alignItems: "center", 
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.1)"
                      }}
                    >
                      <Feather name="settings" size={20} color={webTheme.accent} />
                    </View>
                  </View>
                </SurfaceCard>
              </HapticPressable>
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
                    No tasks posted yet
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
                  <SurfaceCard key={post._id}>
                    <Text style={{ ...type.body, color: webTheme.text }}>
                      {post.content || "Media post"}
                    </Text>
                    {post.image ? (
                      <Image
                        source={{ uri: getImageUrl(post.image) || undefined }}
                        style={{ width: "100%", height: 220, borderRadius: 20, marginTop: 14, backgroundColor: webTheme.surface }}
                      />
                    ) : null}
                    <View style={{ marginTop: 14, flexDirection: "row", gap: 14 }}>
                      <Text style={{ ...type.caption, color: webTheme.faint }}>
                        {post.likes?.length || 0} likes
                      </Text>
                      <Text style={{ ...type.caption, color: webTheme.faint }}>
                        {post.comments?.length || 0} comments
                      </Text>
                    </View>
                  </SurfaceCard>
                ))
              ) : (
                <SurfaceCard>
                  <Text style={{ ...type.h3, color: webTheme.text }}>
                    No posts yet
                  </Text>
                  <Text style={{ ...type.body, color: webTheme.muted, marginTop: 8 }}>
                    Share progress in the feed and your posts will show up here just like the web profile.
                  </Text>
                  <HapticPressable onPress={() => router.push("/feed")}>
                    <View style={{ marginTop: 16, alignSelf: "flex-start", borderRadius: 999, backgroundColor: webTheme.accent, paddingHorizontal: 16, paddingVertical: 12 }}>
                      <Text style={{ ...type.buttonLabel, color: "#fff" }}>Open feed</Text>
                    </View>
                  </HapticPressable>
                </SurfaceCard>
              )}
            </View>
          ) : null}

          {/* ── activity tab ── */}
          {activeTab === "activity" ? (
            <View style={{ marginTop: 18, gap: 14 }}>
              <SurfaceCard>
                <Text style={{ ...type.h2, color: webTheme.text }}>
                  Quick access
                </Text>
                <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {[
                    { label: "Feed", route: "/feed", icon: "layout" },
                    { label: "Wallet", route: "/wallet", icon: "credit-card" },
                    { label: "Leaderboard", route: "/leaderboard", icon: "award" },
                    { label: "Chat", route: "/chat", icon: "message-circle" },
                    { label: "Workspace", route: "/hub", icon: "grid" },
                  ].map((item) => (
                    <Pressable
                      key={item.label}
                      onPress={() => router.push(item.route as "/feed" | "/wallet" | "/leaderboard" | "/chat" | "/hub")}
                      style={({ pressed }) => ({
                        width: "47%",
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: webTheme.border,
                        backgroundColor: pressed ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
                        padding: 18,
                      })}
                    >
                      <Feather
                        name={item.icon as "layout" | "credit-card" | "award" | "message-circle"}
                        size={18}
                        color={webTheme.accent}
                      />
                      <Text style={{ ...type.h3, color: webTheme.text, fontSize: 16, marginTop: 12 }}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </SurfaceCard>

              <SurfaceCard>
                <Text style={{ ...type.h2, color: webTheme.text }}>
                  Account visibility
                </Text>
                <Text style={{ ...type.body, color: webTheme.muted, fontSize: 14, marginTop: 10 }}>
                  Your profile is currently {displayProfile.isPrivate ? "private" : "public"}. Manage privacy from the account section whenever you want to control who sees your details.
                </Text>
              </SurfaceCard>
            </View>
          ) : null}
          </FadeSlideIn>

          <Watermark />
      </ScrollView>
    </SafeAreaView>
  );
}
