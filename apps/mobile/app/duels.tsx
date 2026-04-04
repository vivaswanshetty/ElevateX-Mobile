import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppStackHeader } from "../components/AppStackHeader";
import { EmptyState } from "../components/EmptyState";
import { SurfaceCard } from "../components/SurfaceCard";
import { notify } from "../stores/toastStore";
import { api, getErrorMessage } from "../lib/api";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { useAuthStore } from "../stores/authStore";

type DuelType = "task-sprint" | "habit-streak" | "study-duel";

interface DuelUser {
  _id: string;
  name: string;
  avatar?: string;
}

interface Duel {
  _id: string;
  type: DuelType;
  status: "pending" | "active" | "completed" | "rejected" | "cancelled";
  target: number;
  message?: string;
  isShadow?: boolean;
  challengerProgress?: number;
  opponentProgress?: number;
  challenger?: DuelUser;
  opponent?: DuelUser;
}

interface SearchUser {
  _id: string;
  name: string;
  xp?: number;
}

const duelTypes: Array<{ value: DuelType; label: string; target: number }> = [
  { value: "task-sprint", label: "Task Sprint", target: 5 },
  { value: "habit-streak", label: "Habit Streak", target: 7 },
  { value: "study-duel", label: "Study Duel", target: 10 },
];

function prettyDuelType(type: DuelType) {
  return type.replace("-", " ");
}

function DuelCard({
  duel,
  currentUserId,
  onAccept,
  onReject,
  onProgress,
}: {
  duel: Duel;
  currentUserId?: string;
  onAccept?: () => void;
  onReject?: () => void;
  onProgress?: () => void;
}) {
  const mine = duel.challenger?._id === currentUserId;
  const myProgress = mine ? duel.challengerProgress || 0 : duel.opponentProgress || 0;
  const opponentProgress = mine ? duel.opponentProgress || 0 : duel.challengerProgress || 0;
  const opponent = mine ? duel.opponent : duel.challenger;
  const progressPct = Math.min((myProgress / Math.max(duel.target, 1)) * 100, 100);
  const opponentPct = Math.min((opponentProgress / Math.max(duel.target, 1)) * 100, 100);
  const canRespond = duel.status === "pending" && duel.opponent?._id === currentUserId && !duel.isShadow;
  const canProgress = duel.status === "active";

  return (
    <SurfaceCard accent={duel.status === "active" ? webTheme.red : duel.status === "pending" ? webTheme.orange : webTheme.borderStrong}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 22, textTransform: "capitalize" }}>
            {prettyDuelType(duel.type)}
          </Text>
          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 13, marginTop: 8, lineHeight: 21 }}>
            {duel.message || (duel.isShadow ? "Shadow duel against your best recorded run." : `Facing ${opponent?.name || "another player"}.`)}
          </Text>
        </View>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: duel.status === "active" ? "rgba(214,60,71,0.24)" : duel.status === "pending" ? "rgba(251,146,60,0.24)" : webTheme.border,
            backgroundColor: duel.status === "active" ? "rgba(214,60,71,0.12)" : duel.status === "pending" ? "rgba(251,146,60,0.12)" : "rgba(255,255,255,0.03)",
            paddingHorizontal: 10,
            paddingVertical: 6,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ ...type.bold, color: duel.status === "active" ? webTheme.red : duel.status === "pending" ? webTheme.orange : webTheme.muted, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" }}>
            {duel.status}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 16, gap: 12 }}>
        {[
          { label: "You", value: myProgress, pct: progressPct, color: webTheme.red },
          { label: duel.isShadow ? "Shadow" : opponent?.name || "Opponent", value: opponentProgress, pct: opponentPct, color: webTheme.blue },
        ].map((row) => (
          <View key={row.label}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>{row.label}</Text>
              <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 12 }}>
                {row.value}/{duel.target}
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <View style={{ width: `${row.pct}%`, height: "100%", borderRadius: 999, backgroundColor: row.color }} />
            </View>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
        {canRespond ? (
          <>
            <Pressable
              onPress={onAccept}
              style={{
                flex: 1,
                borderRadius: 999,
                backgroundColor: webTheme.red,
                paddingVertical: 13,
                alignItems: "center",
              }}
            >
              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>Accept</Text>
            </Pressable>
            <Pressable
              onPress={onReject}
              style={{
                flex: 1,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: webTheme.border,
                backgroundColor: "rgba(255,255,255,0.03)",
                paddingVertical: 13,
                alignItems: "center",
              }}
            >
              <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 13 }}>Reject</Text>
            </Pressable>
          </>
        ) : null}

        {canProgress ? (
          <Pressable
            onPress={onProgress}
            style={{
              flex: 1,
              borderRadius: 999,
              backgroundColor: webTheme.red,
              paddingVertical: 13,
              alignItems: "center",
            }}
          >
            <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>Log progress</Text>
          </Pressable>
        ) : null}

        {!canRespond && !canProgress ? (
          <View
            style={{
              flex: 1,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: webTheme.border,
              backgroundColor: "rgba(255,255,255,0.03)",
              paddingVertical: 13,
              alignItems: "center",
            }}
          >
            <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 13 }}>
              {duel.isShadow ? "Shadow active" : "Waiting"}
            </Text>
          </View>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

export default function DuelsScreen() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [mode, setMode] = useState<"my" | "live" | "create">("my");
  const [search, setSearch] = useState("");
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);
  const [duelType, setDuelType] = useState<DuelType>("task-sprint");
  const [target, setTarget] = useState("5");
  const [message, setMessage] = useState("");

  const myDuels = useQuery<Duel[]>({
    queryKey: ["duels", "my"],
    queryFn: () => api.get("/api/duels/my"),
  });

  const liveDuels = useQuery<Duel[]>({
    queryKey: ["duels", "live"],
    queryFn: () => api.get("/api/duels/live"),
  });

  const userSearch = useQuery<SearchUser[]>({
    queryKey: ["duelSearch", search],
    queryFn: () => api.get(`/api/users/search?q=${encodeURIComponent(search)}`),
    enabled: search.trim().length >= 2,
  });

  const createDuel = useMutation({
    mutationFn: (payload: { opponentId?: string; type: DuelType; target: number; message?: string; isShadow?: boolean }) =>
      api.post("/api/duels", payload),
    onSuccess: async () => {
      setSelectedOpponentId(null);
      setMessage("");
      setSearch("");
      await Promise.all([
        myDuels.refetch(),
        liveDuels.refetch(),
        queryClient.invalidateQueries({ queryKey: ["activity"] }),
      ]);
      setMode("my");
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const respondDuel = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "reject" }) =>
      api.put(`/api/duels/${id}/respond`, { action }),
    onSuccess: async () => {
      await Promise.all([myDuels.refetch(), liveDuels.refetch()]);
    },
    onError: (error) => notify.error(getErrorMessage(error)),
  });

  const updateProgress = useMutation({
    mutationFn: ({ id, progress }: { id: string; progress: number }) =>
      api.put(`/api/duels/${id}/progress`, { progress }),
    onSuccess: async () => {
      await Promise.all([myDuels.refetch(), liveDuels.refetch()]);
    },
    onError: (error) => notify.error(getErrorMessage(error)),
  });

  const selectedType = duelTypes.find((item) => item.value === duelType)!;
  const pending = (myDuels.data || []).filter((item) => item.status === "pending");
  const active = (myDuels.data || []).filter((item) => item.status === "active");
  const live = liveDuels.data || [];
  const searchedUsers = (userSearch.data || []).filter((item) => item._id !== currentUser?.id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <AppStackHeader title="Duels" detail="Challenges, live races, shadow runs, and active competition." />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={myDuels.isFetching || liveDuels.isFetching}
            onRefresh={() => {
              myDuels.refetch();
              liveDuels.refetch();
            }}
            tintColor={webTheme.red}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { key: "my", label: "My Duels" },
            { key: "live", label: "Live Arena" },
            { key: "create", label: "Create" },
          ].map((item) => {
            const activeTab = mode === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setMode(item.key as typeof mode)}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: activeTab ? "rgba(214,60,71,0.28)" : webTheme.border,
                  backgroundColor: activeTab ? "rgba(214,60,71,0.12)" : "rgba(255,255,255,0.03)",
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ ...type.bold, color: activeTab ? webTheme.red : webTheme.text, fontSize: 12 }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
          {[
            { label: "Pending", value: pending.length },
            { label: "Active", value: active.length },
            { label: "Live", value: live.length },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1 }}>
              <SurfaceCard>
                <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase" }}>
                  {item.label}
                </Text>
                <Text style={{ ...type.black, color: webTheme.text, fontSize: 24, marginTop: 8 }}>
                  {item.value}
                </Text>
              </SurfaceCard>
            </View>
          ))}
        </View>

        {mode === "my" ? (
          <View style={{ marginTop: 18, gap: 14 }}>
            {(myDuels.data || []).length > 0 ? (
              (myDuels.data || []).map((duel) => (
                <DuelCard
                  key={duel._id}
                  duel={duel}
                  currentUserId={currentUser?.id}
                  onAccept={() => respondDuel.mutate({ id: duel._id, action: "accept" })}
                  onReject={() => respondDuel.mutate({ id: duel._id, action: "reject" })}
                  onProgress={() => {
                    const mine = duel.challenger?._id === currentUser?.id;
                    const currentProgress = mine ? duel.challengerProgress || 0 : duel.opponentProgress || 0;
                    updateProgress.mutate({ id: duel._id, progress: currentProgress + 1 });
                  }}
                />
              ))
            ) : (
              <EmptyState 
                icon="crosshair" 
                title="No duels yet" 
                description="Create a challenge or launch a shadow duel against your own best pace."
                actionLabel="Create Challenge"
                onAction={() => setMode("create")} 
              />
            )}
          </View>
        ) : null}

        {mode === "live" ? (
          <View style={{ marginTop: 18, gap: 14 }}>
            {live.length > 0 ? (
              live.map((duel) => (
                <DuelCard key={duel._id} duel={duel} currentUserId={currentUser?.id} />
              ))
            ) : (
              <EmptyState 
                icon="activity" 
                title="Arena is quiet" 
                description="No live public duels are running right now. Be the first to start a live duel!"
              />
            )}
          </View>
        ) : null}

        {mode === "create" ? (
          <View style={{ marginTop: 18, gap: 16 }}>
            <SurfaceCard accent={webTheme.red}>
              <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
                Start a Duel
              </Text>
              <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, lineHeight: 22, marginTop: 8 }}>
                Challenge another user or create a shadow duel against your own previous best.
              </Text>

              <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
                {duelTypes.map((item) => {
                  const activeType = duelType === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => {
                        setDuelType(item.value);
                        setTarget(String(item.target));
                      }}
                      style={{
                        flex: 1,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: activeType ? "rgba(214,60,71,0.28)" : webTheme.border,
                        backgroundColor: activeType ? "rgba(214,60,71,0.10)" : "rgba(255,255,255,0.03)",
                        paddingVertical: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ ...type.bold, color: activeType ? webTheme.red : webTheme.text, fontSize: 12 }}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View
                style={{
                  marginTop: 16,
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
                <Feather name="search" size={16} color={webTheme.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search opponent by name"
                  placeholderTextColor="rgba(255,255,255,0.24)"
                  style={{ ...type.regular, flex: 1, color: webTheme.text, fontSize: 14 }}
                />
              </View>

              {search.trim().length >= 2 ? (
                <View style={{ marginTop: 12, gap: 10 }}>
                  {searchedUsers.slice(0, 4).map((user) => {
                    const selected = selectedOpponentId === user._id;
                    return (
                      <Pressable
                        key={user._id}
                        onPress={() => setSelectedOpponentId(selected ? null : user._id)}
                        onLongPress={() => router.push({ pathname: "/user/[id]", params: { id: user._id } })}
                        style={{
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: selected ? "rgba(214,60,71,0.28)" : webTheme.border,
                          backgroundColor: selected ? "rgba(214,60,71,0.10)" : "rgba(255,255,255,0.03)",
                          paddingHorizontal: 14,
                          paddingVertical: 14,
                        }}
                      >
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>{user.name}</Text>
                        <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 4 }}>
                          Level {Math.floor((user.xp || 0) / 500) + 1}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <View style={{ marginTop: 14, flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 11, marginBottom: 8 }}>
                    Target
                  </Text>
                  <TextInput
                    value={target}
                    onChangeText={setTarget}
                    keyboardType="numeric"
                    style={{
                      ...type.regular,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      color: webTheme.text,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                    }}
                  />
                </View>
              </View>

              <Text style={{ ...type.bold, color: webTheme.faint, fontSize: 11, marginTop: 14, marginBottom: 8 }}>
                Message
              </Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                multiline
                placeholder={`Challenge copy for ${selectedType.label}`}
                placeholderTextColor="rgba(255,255,255,0.24)"
                style={{
                  ...type.regular,
                  minHeight: 96,
                  textAlignVertical: "top",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: webTheme.border,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  color: webTheme.text,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              />

              <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => {
                    const parsedTarget = Number(target);
                    if (!parsedTarget || parsedTarget <= 0) {
                      notify.error("Enter a valid target.");
                      return;
                    }
                    createDuel.mutate({
                      opponentId: selectedOpponentId || undefined,
                      type: duelType,
                      target: parsedTarget,
                      message: message.trim() || undefined,
                      isShadow: !selectedOpponentId,
                    });
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    backgroundColor: webTheme.red,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                    {createDuel.isPending ? "Launching..." : selectedOpponentId ? "Send challenge" : "Start shadow duel"}
                  </Text>
                </Pressable>
              </View>
            </SurfaceCard>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
