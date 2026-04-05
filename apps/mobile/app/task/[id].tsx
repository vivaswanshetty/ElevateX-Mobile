import { useState } from "react";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppStackHeader } from "../../components/AppStackHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { notify } from "../../stores/toastStore";
import { HapticPressable } from "../../components/HapticPressable";
import { SurfaceCard } from "../../components/SurfaceCard";
import { api, getErrorMessage } from "../../lib/api";
import { formatTimeAgo, getImageUrl, getInitials } from "../../lib/media";
import { type } from "../../lib/typography";
import { webTheme } from "../../lib/webTheme";
import { useAuthStore } from "../../stores/authStore";

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
  const statusAccent = getStatusAccent(task?.status);
  const isOwner = task?.createdBy?._id === currentUser?.id;
  const hasApplied = Boolean(task?.applicants?.some((item) => item.user?._id === currentUser?.id));
  const creatorAvatar = getImageUrl(task?.createdBy?.avatar);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <AppStackHeader title="Task View" detail="Deep task context, creator info, and apply flow." />
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
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
            <SurfaceCard accent={statusAccent} style={{ marginTop: 6 }}>
              {/* aesthetic backlight blob */}
              <View style={{ position: "absolute", top: -80, right: -40, width: 200, height: 200, borderRadius: 999, backgroundColor: statusAccent, opacity: 0.08 }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: `${statusAccent}44`,
                      backgroundColor: `${statusAccent}18`,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusAccent }} />
                    <Text style={{ ...type.bold, color: statusAccent, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" }}>
                      {task.status}
                    </Text>
                  </View>
                  <Text style={{ ...type.black, color: webTheme.text, fontSize: 32, lineHeight: 36, marginTop: 18 }}>
                    {task.title}
                  </Text>
                  <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 16, lineHeight: 26, marginTop: 16 }}>
                    {task.description}
                  </Text>
                </View>
                <View
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "rgba(234,179,8,0.25)",
                    backgroundColor: "rgba(234,179,8,0.12)",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    alignItems: "center",
                    minWidth: 70,
                  }}
                >
                  <MaterialCommunityIcons name="star-four-points" size={20} color={webTheme.gold} />
                  <Text style={{ ...type.black, color: webTheme.gold, fontSize: 15, marginTop: 6 }}>
                    {task.coins}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 24, flexDirection: "row", gap: 12 }}>
                {[
                  { label: "Category", value: task.category },
                  { label: "Subcategory", value: task.subcategory },
                  { label: "Reward Tier", value: task.rewardTier || "Standard" },
                ].map((item) => (
                  <View key={item.label} style={{ flex: 1 }}>
                    <View
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: webTheme.border,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        paddingVertical: 16,
                        paddingHorizontal: 12,
                        alignItems: "center"
                      }}
                    >
                      <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", textAlign: "center" }}>
                        {item.label}
                      </Text>
                      <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13, marginTop: 8, textAlign: "center" }}>
                        {item.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="clock" size={14} color={webTheme.faint} />
                  <View>
                    <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase" }}>
                      Deadline
                    </Text>
                    <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13, marginTop: 4 }}>
                      {new Date(task.deadline).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="calendar" size={14} color={webTheme.faint} />
                  <View>
                    <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", textAlign: "right" }}>
                      Created
                    </Text>
                    <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13, marginTop: 4, textAlign: "right" }}>
                      {formatTimeAgo(task.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            </SurfaceCard>

            <HapticPressable
              hapticType="light"
              onPress={() =>
                task.createdBy?._id
                  ? router.push({ pathname: "/user/[id]", params: { id: task.createdBy._id } })
                  : null
              }
              disabled={!task.createdBy?._id}
              style={{ marginTop: 16 }}
            >
              <View style={{ borderRadius: 24, padding: 1, overflow: "hidden" }}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                />
                <View style={{ backgroundColor: webTheme.surfaceRaised, borderRadius: 23, padding: 20 }}>
                  <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" }}>
                    Creator Profile
                  </Text>
                  <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 16 }}>
                    <View
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 999,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 2,
                        borderColor: "rgba(255,255,255,0.1)",
                        backgroundColor: "rgba(255,255,255,0.05)",
                      }}
                    >
                      {creatorAvatar ? (
                        <Image source={{ uri: creatorAvatar }} style={{ width: "100%", height: "100%" }} />
                      ) : (
                        <Text style={{ ...type.black, color: webTheme.text, fontSize: 20 }}>
                          {getInitials(task.createdBy?.name)}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...type.black, color: webTheme.text, fontSize: 18 }}>
                        {task.createdBy?.name || "Anonymous"}
                      </Text>
                      <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, marginTop: 4 }}>
                        Tap to open public profile
                      </Text>
                    </View>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="arrow-up-right" size={16} color={webTheme.text} />
                    </View>
                  </View>
                </View>
              </View>
            </HapticPressable>

            <SurfaceCard style={{ marginTop: 16 }}>
              <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
                Applicants
              </Text>
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, marginTop: 8 }}>
                {task.applicants?.length || 0} applications on this task.
              </Text>
              <View style={{ marginTop: 14, gap: 10 }}>
                {(task.applicants || []).slice(0, 4).map((item, index) => (
                  <View
                    key={item.user?._id || index}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                    }}
                  >
                    <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
                      {item.user?.name || "Applicant"}
                    </Text>
                    <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 4 }}>
                      {item.status || "Pending"} • {item.appliedAt ? formatTimeAgo(item.appliedAt) : "Recently"}
                    </Text>
                  </View>
                ))}
              </View>
            </SurfaceCard>

            {task.attachments?.length ? (
              <SurfaceCard style={{ marginTop: 16 }}>
                <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
                  Attachments
                </Text>
                <View style={{ marginTop: 14, gap: 10 }}>
                  {task.attachments.map((attachment, index) => (
                    <View
                      key={`${attachment.name || "attachment"}-${index}`}
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
                      <Feather name="paperclip" size={16} color={webTheme.faint} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                          {attachment.name || "Attachment"}
                        </Text>
                        <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 4 }}>
                          {attachment.type || "File"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </SurfaceCard>
            ) : null}

            <SurfaceCard style={{ marginTop: 16 }} accent={webTheme.blue}>
              <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
                Resonance
              </Text>
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, lineHeight: 22, marginTop: 10 }}>
                Task chat, completion energy, and shared momentum for this opportunity will build here as people apply and collaborate.
              </Text>
            </SurfaceCard>

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
              disabled={applyMutation.isPending || task.status !== "Open"}
              style={{
                marginTop: 20,
                borderRadius: 999,
                backgroundColor: task.status !== "Open" ? "rgba(214,60,71,0.30)" : webTheme.red,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
                {applyMutation.isPending
                  ? "Applying..."
                  : isOwner
                    ? "Your task"
                    : hasApplied
                      ? "Application sent"
                      : task.status === "Open"
                        ? "Apply for task"
                        : `Task ${task.status.toLowerCase()}`}
              </Text>
            </HapticPressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
