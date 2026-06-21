import { useState } from "react";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, ScrollView, Text, View, Share, Linking, Modal, Platform, Pressable, GestureResponderEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppStackHeader } from "../../components/AppStackHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { notify } from "../../stores/toastStore";
import { HapticPressable } from "../../components/HapticPressable";
import { useMuteStore } from "../../stores/muteStore";
import { SurfaceCard } from "../../components/SurfaceCard";
import { api, getErrorMessage } from "../../lib/api";
import { formatTimeAgo, getImageUrl, getInitials } from "../../lib/media";
import { type } from "../../lib/typography";
import { webTheme } from "../../lib/webTheme";
import { useAuthStore } from "../../stores/authStore";
import { UserAvatar } from "../../components/UserAvatar";

interface TaskDetail {
  _id: string;
  title: string;
  category: string;
  subcategory: string;
  rewardTier?: string;
  coins: number;
  description: string;
  deadline: string;
  status: "Open" | "In Progress" | "Completed" | "Cancelled";
  createdAt: string;
  createdBy?: {
    _id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  applicants?: Array<{
    user?: {
      _id: string;
      name: string;
      avatar?: string;
    };
    status?: string;
    appliedAt?: string;
  }>;
  attachments?: Array<{
    name?: string;
    type?: string;
  }>;
}

function getStatusAccent(status?: string) {
  switch (status) {
    case "Open":
    case "Completed":
      return webTheme.green;
    case "In Progress":
      return webTheme.blue;
    case "Cancelled":
      return webTheme.orange;
    default:
      return webTheme.red;
  }
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/tasks/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      notify.success("Task deleted and coins refunded.");
      router.back();
    },
    onError: (error) => {
      setShowDeleteConfirm(false);
      notify.error(getErrorMessage(error));
    },
  });

  const taskQuery = useQuery<TaskDetail>({
    queryKey: ["task", id],
    queryFn: () => api.get(`/api/tasks/${id}`),
    enabled: Boolean(id),
  });

  const applyMutation = useMutation({
    mutationFn: () => api.put(`/api/tasks/${id}/apply`),
    onSuccess: async () => {
      setShowApplyConfirm(false);
      await Promise.all([
        taskQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["activity"] }),
      ]);
      notify.success("Your application has been sent.");
    },
    onError: (error) => {
      setShowApplyConfirm(false);
      notify.error(getErrorMessage(error));
    },
  });

  const task = taskQuery.data;
  const mutedCreatorIds = useMuteStore((s) => s.mutedCreatorIds);
  const isCreatorMuted = task?.createdBy?._id ? Boolean(mutedCreatorIds[task.createdBy._id]) : false;
  const statusAccent = getStatusAccent(task?.status);
  const isOwner = task?.createdBy?._id === currentUser?.id;
  const hasApplied = Boolean(task?.applicants?.some((item) => item.user?._id === currentUser?.id));

  const taskXp = Math.floor(10 + (task?.coins || 0) / 10);

  const handleShareTask = async () => {
    if (!task) return;
    try {
      await Share.share({
        message: `Check out this ElevateX Task: "${task.title}" - Category: ${task.category}. Reward: ${task.coins} coins / ${taskXp} XP. Deadline: ${new Date(task.deadline).toLocaleDateString()}!`,
      });
    } catch (error) {
      notify.error("Failed to share task details.");
    }
  };

  const handleAddToCalendar = async () => {
    if (!task) return;
    try {
      const title = encodeURIComponent(`ElevateX Task: ${task.title}`);
      const details = encodeURIComponent(task.description);
      const deadlineDate = new Date(task.deadline);
      const isoString = deadlineDate.toISOString().replace(/-|:|\.\d\d\d/g, ""); // Format YYYYMMDDTHHMMSSZ
      const endDate = new Date(deadlineDate.getTime() + 60 * 60 * 1000);
      const isoEndString = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
      
      const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${isoString}/${isoEndString}&details=${details}`;
      
      const supported = await Linking.canOpenURL(calendarUrl);
      if (supported) {
        await Linking.openURL(calendarUrl);
        notify.success("Opening Google Calendar...");
      } else {
        notify.error("Could not open calendar application.");
      }
    } catch (error) {
      notify.error("Failed to add event to calendar.");
    }
  };

  const handleMuteCreator = () => {
    if (!task?.createdBy?._id || !task?.createdBy?.name) return;
    const creatorId = task.createdBy._id;
    if (isCreatorMuted) {
      useMuteStore.getState().unmuteCreator(creatorId);
      notify.success(`All future tasks from ${task.createdBy.name} have been unmuted.`);
    } else {
      useMuteStore.getState().muteCreator(creatorId);
      notify.success(`All future tasks from ${task.createdBy.name} have been muted.`);
    }
  };

  const handleReportTask = () => {
    setShowReportConfirm(true);
  };

  const handleShowOptions = () => {
    setShowOptionsSheet(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      {/* Custom Header Section */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 16,
        }}
      >
        <HapticPressable
          onPress={() => router.back()}
          hapticType="light"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: webTheme.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="arrow-left" size={18} color={webTheme.text} />
        </HapticPressable>

        <View style={{ alignItems: "center" }}>
          <Text style={{ ...type.bold, color: webTheme.accent, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>
            ElevateX
          </Text>
          <Text style={{ ...type.h3, color: webTheme.text, fontSize: 18, marginTop: 2 }}>
            Task View
          </Text>
        </View>

        <HapticPressable
          onPress={handleShowOptions}
          hapticType="light"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: webTheme.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="more-horizontal" size={18} color={webTheme.text} />
        </HapticPressable>
      </View>

      <ConfirmDialog
        visible={showApplyConfirm}
        title="Apply for task?"
        detail="Applications may cost coins depending on the backend rules for this task. Continue?"
        confirmLabel="Apply"
        onClose={() => setShowApplyConfirm(false)}
        onConfirm={() => applyMutation.mutate()}
      />
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete this task?"
        detail="Your escrowed coins will be refunded. This cannot be undone."
        confirmLabel="Delete"
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
      <ConfirmDialog
        visible={showReportConfirm}
        title="Report Task?"
        detail="Are you sure you want to report this task for inappropriate content or spam?"
        confirmLabel="Report"
        destructive
        onClose={() => setShowReportConfirm(false)}
        onConfirm={() => {
          setShowReportConfirm(false);
          notify.success("Thank you. This task has been reported and sent to moderators for review.");
        }}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {!task ? (
          <SurfaceCard>
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              {taskQuery.isFetching ? <ActivityIndicator color={webTheme.red} /> : null}
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, marginTop: 12 }}>
                {taskQuery.isFetching ? "Loading task..." : "Task not found."}
              </Text>
            </View>
          </SurfaceCard>
        ) : (
          <>
            {/* Main Task Context Card */}
            <SurfaceCard accent={statusAccent} style={{ marginTop: 6 }}>
              {/* aesthetic backlight blob */}
              <View style={{ position: "absolute", top: -80, right: -40, width: 200, height: 200, borderRadius: 999, backgroundColor: statusAccent, opacity: 0.08 }} />

              {/* Status & XP Badge Row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: `${statusAccent}15`,
                    borderWidth: 1,
                    borderColor: `${statusAccent}30`,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusAccent }} />
                  <Text style={{ ...type.bold, color: statusAccent, fontSize: 11 }}>
                    {task.status}
                  </Text>
                </View>

                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: "rgba(251,191,36,0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(251,191,36,0.18)",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <Feather name="star" size={12} color={webTheme.gold} />
                  <Text style={{ ...type.bold, color: webTheme.gold, fontSize: 11 }}>
                    {taskXp} XP
                  </Text>
                </View>
              </View>

              {/* Title & Description */}
              <Text style={{ ...type.black, color: webTheme.text, fontSize: 24, marginTop: 14 }}>
                {task.title}
              </Text>
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
                {task.description}
              </Text>

              {/* Category Pills Row */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                <View style={{ borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 12 }}>
                    {task.category}
                  </Text>
                </View>
                {task.subcategory ? (
                  <View style={{ borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 12 }}>
                      {task.subcategory}
                    </Text>
                  </View>
                ) : null}
                <View style={{ borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 12 }}>
                    {task.rewardTier || (task.coins >= 200 ? "High reward" : task.coins >= 50 ? "Medium reward" : "Standard reward")}
                  </Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginVertical: 18 }} />

              {/* Info Row: Deadline & Created */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Feather name="clock" size={14} color={webTheme.faint} />
                  <View>
                    <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase" }}>
                      Deadline
                    </Text>
                    <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13, marginTop: 2 }}>
                      {new Date(task.deadline).toLocaleString("en-US", { month: "short", day: "numeric" })} • {new Date(task.deadline).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
                  <Feather name="calendar" size={14} color={webTheme.faint} />
                  <View>
                    <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase" }}>
                      Posted
                    </Text>
                    <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13, marginTop: 2 }}>
                      {formatTimeAgo(task.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            </SurfaceCard>

            {/* Creator Profile Card */}
            <HapticPressable
              hapticType="light"
              onPress={() =>
                task.createdBy?._id
                  ? router.push({ pathname: "/user/[id]", params: { id: task.createdBy._id } })
                  : null
              }
              disabled={!task.createdBy?._id}
              style={{ marginTop: 14 }}
            >
              <SurfaceCard contentStyle={{ padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <UserAvatar
                    avatar={task.createdBy?.avatar}
                    size={44}
                    borderWidth={1}
                    borderColor="rgba(255,255,255,0.08)"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 15 }}>
                      {task.createdBy?.name || "Anonymous"}
                    </Text>
                    <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 2 }}>
                      Task creator • Tap to view profile
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={webTheme.faint} />
                </View>
              </SurfaceCard>
            </HapticPressable>

            {/* Applicants Card */}
            <SurfaceCard style={{ marginTop: 14 }} contentStyle={{ padding: 16 }}>
              {/* Title & Count Row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ ...type.bold, color: webTheme.text, fontSize: 16 }}>
                  Applicants
                </Text>
                <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13 }}>
                  {task.applicants?.length || 0} received
                </Text>
              </View>

              {/* Applicants List */}
              <View style={{ gap: 10 }}>
                {task.applicants && task.applicants.length > 0 ? (
                  task.applicants.map((item, index) => (
                    <View
                      key={item.user?._id || index}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "rgba(255,255,255,0.03)",
                        borderRadius: 16,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <UserAvatar
                          avatar={item.user?.avatar}
                          size={28}
                        />
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
                          {item.user?.name || "Applicant"}
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View
                          style={{
                            borderRadius: 999,
                            backgroundColor: item.status === "Accepted" ? "rgba(52,211,153,0.1)" : item.status === "Rejected" ? "rgba(239,68,68,0.1)" : "rgba(251,191,36,0.1)",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                          }}
                        >
                          <Text
                            style={{
                              ...type.bold,
                              color: item.status === "Accepted" ? webTheme.green : item.status === "Rejected" ? webTheme.red : webTheme.gold,
                              fontSize: 10,
                            }}
                          >
                            {item.status || "Pending"}
                          </Text>
                        </View>
                        <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12 }}>
                          {item.appliedAt ? formatTimeAgo(item.appliedAt) : "Recently"}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, textAlign: "center", paddingVertical: 12 }}>
                    No applications yet.
                  </Text>
                )}
              </View>
            </SurfaceCard>

            {/* Attachments Card (Conditional) */}
            {task.attachments?.length ? (
              <SurfaceCard style={{ marginTop: 14 }} contentStyle={{ padding: 16 }}>
                <Text style={{ ...type.black, color: webTheme.text, fontSize: 16, marginBottom: 12 }}>
                  Attachments
                </Text>
                <View style={{ gap: 10 }}>
                  {task.attachments.map((attachment, index) => (
                    <View
                      key={`${attachment.name || "attachment"}-${index}`}
                      style={{
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: webTheme.border,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Feather name="paperclip" size={14} color={webTheme.faint} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                          {attachment.name || "Attachment"}
                        </Text>
                        <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 2 }}>
                          {attachment.type || "File"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </SurfaceCard>
            ) : null}

            {/* Chat Helper Box */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: "rgba(255,255,255,0.02)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: 14,
                marginTop: 14,
              }}
            >
              <Feather name="message-square" size={16} color={webTheme.faint} />
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, flex: 1, lineHeight: 18 }}>
                Task chat opens once the creator accepts your application
              </Text>
            </View>

            {/* Owner Action Buttons: Edit/Delete */}
            {isOwner && task.status === "Open" ? (
              <View style={{ marginTop: 20, flexDirection: "row", gap: 12 }}>
                <HapticPressable
                  hapticType="light"
                  onPress={() => router.push({ pathname: "/task/edit", params: { id } })}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: webTheme.accentBorder,
                    backgroundColor: webTheme.accentSoft,
                    paddingVertical: 16,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Feather name="edit-2" size={14} color={webTheme.accent} />
                  <Text style={{ ...type.bold, color: webTheme.accent, fontSize: 14 }}>Edit Task</Text>
                </HapticPressable>
                <HapticPressable
                  hapticType="medium"
                  onPress={() => setShowDeleteConfirm(true)}
                  disabled={deleteMutation.isPending}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "rgba(214,60,71,0.3)",
                    backgroundColor: "rgba(214,60,71,0.1)",
                    paddingVertical: 16,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Feather name="trash-2" size={14} color={webTheme.red} />
                  <Text style={{ ...type.bold, color: webTheme.red, fontSize: 14 }}>
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Text>
                </HapticPressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Redesigned Bottom Action Bar (outside ScrollView to stick to bottom) */}
      {task && (
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 16,
            backgroundColor: webTheme.bg,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.03)",
            alignItems: "center",
          }}
        >
          <HapticPressable
            hapticType="medium"
            onPress={() => {
              if (isOwner) {
                notify.error("You cannot apply to your own task.");
                return;
              }
              if (hasApplied) {
                notify.info("You have already applied to this task.");
                return;
              }
              setShowApplyConfirm(true);
            }}
            disabled={applyMutation.isPending || task.status !== "Open" || isOwner || hasApplied}
            style={{
              flex: 1,
              height: 50,
              borderRadius: 16,
              backgroundColor: task.status !== "Open" ? "rgba(214,60,71,0.15)" : isOwner || hasApplied ? "rgba(255,255,255,0.04)" : webTheme.accentSoft,
              borderWidth: 1,
              borderColor: task.status !== "Open" ? "rgba(214,60,71,0.2)" : isOwner || hasApplied ? "rgba(255,255,255,0.08)" : webTheme.accentBorder,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {applyMutation.isPending ? (
              <ActivityIndicator size="small" color={webTheme.accent} />
            ) : hasApplied ? (
              <>
                <Feather name="check" size={16} color={webTheme.green} />
                <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 14 }}>
                  Application sent
                </Text>
              </>
            ) : (
              <Text style={{ ...type.bold, color: task.status !== "Open" ? webTheme.red : webTheme.accent, fontSize: 14 }}>
                {isOwner ? "Your task" : task.status === "Open" ? "Apply for task" : `Task ${task.status.toLowerCase()}`}
              </Text>
            )}
          </HapticPressable>

          <HapticPressable
            hapticType="light"
            onPress={() => router.back()}
            style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="x" size={18} color={webTheme.text} />
          </HapticPressable>
        </View>
      )}

      {/* Custom Bottom Options Sheet */}
      <Modal
        visible={showOptionsSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptionsSheet(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowOptionsSheet(false)}
        >
          {/* Sheet Content */}
          <Pressable
            style={{
              backgroundColor: webTheme.surfaceRaised,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 10,
              paddingHorizontal: 22,
              paddingBottom: Platform.OS === "ios" ? 40 : 24,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.05)",
            }}
            onPress={(e: GestureResponderEvent) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            {/* Drag Handle */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                alignSelf: "center",
                marginBottom: 16,
              }}
            />

            {/* Header */}
            <Text style={{ ...type.bold, color: webTheme.text, fontSize: 18 }}>
              Task Options
            </Text>
            <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, marginTop: 4, marginBottom: 20 }}>
              Choose an action for this task
            </Text>

            {/* Options List */}
            <View style={{ gap: 4 }}>
              {[
                {
                  label: "Share Task",
                  icon: "share-2",
                  color: webTheme.text,
                  bg: "rgba(255,255,255,0.05)",
                  onPress: () => {
                    setShowOptionsSheet(false);
                    setTimeout(handleShareTask, 300);
                  },
                },
                {
                  label: "Add to Calendar",
                  icon: "calendar",
                  color: webTheme.text,
                  bg: "rgba(255,255,255,0.05)",
                  onPress: () => {
                    setShowOptionsSheet(false);
                    setTimeout(handleAddToCalendar, 300);
                  },
                },
                {
                  label: isCreatorMuted ? "Unmute Creator" : "Mute Creator",
                  icon: isCreatorMuted ? "bell" : "bell-off",
                  color: webTheme.text,
                  bg: "rgba(255,255,255,0.05)",
                  onPress: () => {
                    setShowOptionsSheet(false);
                    setTimeout(handleMuteCreator, 300);
                  },
                },
                {
                  label: "Report Task",
                  icon: "alert-triangle",
                  color: webTheme.red,
                  bg: "rgba(239, 68, 68, 0.08)",
                  onPress: () => {
                    setShowOptionsSheet(false);
                    setTimeout(handleReportTask, 300);
                  },
                },
              ].map((option) => (
                <HapticPressable
                  key={option.label}
                  onPress={option.onPress}
                  hapticType="light"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingVertical: 14,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: option.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name={option.icon as any} size={16} color={option.color} />
                  </View>
                  <Text style={{ ...type.semibold, color: option.color, fontSize: 15, flex: 1 }}>
                    {option.label}
                  </Text>
                </HapticPressable>
              ))}
            </View>

            {/* Cancel Button */}
            <HapticPressable
              onPress={() => setShowOptionsSheet(false)}
              hapticType="light"
              style={{
                marginTop: 18,
                borderRadius: 16,
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 15 }}>
                Cancel
              </Text>
            </HapticPressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
