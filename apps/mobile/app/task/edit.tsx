import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { AppStackHeader } from "../../components/AppStackHeader";
import { SurfaceCard } from "../../components/SurfaceCard";
import { HapticPressable } from "../../components/HapticPressable";
import { notify } from "../../stores/toastStore";
import { api, getErrorMessage } from "../../lib/api";
import { useHaptic } from "../../lib/useHaptic";
import { type } from "../../lib/typography";
import { webTheme, inputFieldStyle } from "../../lib/webTheme";

const CATEGORIES = [
  "Development", "Design", "Marketing", "Writing",
  "Data Science", "Video & Animation", "Music & Audio", "Business", "Lifestyle",
] as const;

const SUBCATEGORIES: Record<string, string[]> = {
  Development: ["Web Development", "Mobile App", "Debugging", "API Integration", "Automation", "Desktop App", "Database Design"],
  Design: ["UI/UX", "Logo", "Poster", "Branding", "Illustration", "Print Design", "3D Design"],
  Marketing: ["SEO", "Social Media", "Content Strategy", "Email Marketing", "Influencer Marketing"],
  Writing: ["Blog Post", "Copywriting", "Technical Writing", "Creative Writing", "Editing"],
  "Data Science": ["Data Analysis", "Machine Learning", "Data Visualization", "Statistical Modeling", "Big Data"],
  "Video & Animation": ["Video Editing", "2D Animation", "3D Animation", "Motion Graphics", "Video Production"],
  "Music & Audio": ["Music Production", "Audio Editing", "Voice Over", "Sound Design", "Mixing & Mastering"],
  Business: ["Business Plan", "Financial Analysis", "Market Research", "Consulting", "Project Management"],
  Lifestyle: ["Fitness Coaching", "Nutrition", "Life Coaching", "Travel Planning", "Personal Shopping"],
};

const REWARD_TIERS = [
  { id: "small",   label: "Starter",  coins: 20,  color: webTheme.green,  bg: webTheme.greenSoft,  border: "rgba(52,211,153,0.3)" },
  { id: "medium",  label: "Standard", coins: 50,  color: webTheme.blue,   bg: webTheme.blueSoft,   border: "rgba(96,165,250,0.3)" },
  { id: "large",   label: "Advanced", coins: 100, color: webTheme.purple, bg: webTheme.violetSoft, border: webTheme.violetBorder },
  { id: "premium", label: "Premium",  coins: 200, color: webTheme.gold,   bg: webTheme.goldSoft,   border: "rgba(251,191,36,0.3)" },
] as const;

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const triggerHaptic = useHaptic();

  const [title, setTitle]       = useState("");
  const [category, setCategory] = useState<string>("Development");
  const [subcategory, setSubcategory] = useState("");
  const [rewardTier, setRewardTier]   = useState<string>("small");
  const [headline, setHeadline]       = useState("");
  const [description, setDescription] = useState("");
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ready, setReady] = useState(false);

  const deadlineStr = deadlineDate ? deadlineDate.toISOString().slice(0, 10) : "";

  // Fetch existing task data
  const taskQuery = useQuery({
    queryKey: ["task", id],
    queryFn: () => api.get(`/api/tasks/${id}`),
    enabled: Boolean(id),
  });

  // Pre-fill form once loaded
  useEffect(() => {
    const t = taskQuery.data;
    if (!t || ready) return;
    setTitle(t.title ?? "");
    setCategory(t.category ?? "Development");
    setSubcategory(t.subcategory ?? "");
    setRewardTier(t.rewardTier ?? "small");
    // Split desc back into headline + body
    const parts = (t.description ?? "").split("\n\n");
    setHeadline(parts[0] ?? "");
    setDescription(parts.slice(1).join("\n\n"));
    if (t.deadline) setDeadlineDate(new Date(t.deadline));
    setReady(true);
  }, [taskQuery.data, ready]);

  const updateMutation = useMutation({
    mutationFn: (payload: object) => api.put(`/api/tasks/${id}`, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["task", id] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
      triggerHaptic("success");
      notify.success("Task updated.");
      router.back();
    },
    onError: (error) => {
      triggerHaptic("error");
      notify.error(getErrorMessage(error));
    },
  });

  const handleSave = () => {
    if (!title.trim() || !subcategory || !description.trim() || !deadlineDate) {
      triggerHaptic("error");
      notify.error("Fill in all required fields.");
      return;
    }
    const tier = REWARD_TIERS.find((r) => r.id === rewardTier);
    updateMutation.mutate({
      title: title.trim(),
      category,
      sub: subcategory,
      rewardId: rewardTier,
      coins: tier?.coins,
      desc: headline.trim() ? `${headline.trim()}\n\n${description.trim()}` : description.trim(),
      deadline: deadlineStr,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <AppStackHeader title="Edit Task" detail="Update your task details." />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {taskQuery.isLoading ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <ActivityIndicator color={webTheme.accent} />
          </View>
        ) : (
          <>
            {/* ── Title ── */}
            <SurfaceCard style={{ marginTop: 12 }} accent={webTheme.accent}>
              <Text style={{ ...type.h3, color: webTheme.text, marginBottom: 14 }}>Task Basics</Text>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 11, letterSpacing: 1.2, marginBottom: 8 }}>TITLE *</Text>
                <TextInput
                  style={{ ...type.regular, ...inputFieldStyle }}
                  placeholder="e.g. Design a modern landing page"
                  placeholderTextColor={webTheme.faint}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 11, letterSpacing: 1.2, marginBottom: 8 }}>HEADLINE</Text>
                <TextInput
                  style={{ ...type.regular, ...inputFieldStyle }}
                  placeholder="One line that explains the outcome"
                  placeholderTextColor={webTheme.faint}
                  value={headline}
                  onChangeText={setHeadline}
                />
              </View>

              <View style={{ marginBottom: 4 }}>
                <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 11, letterSpacing: 1.2, marginBottom: 8 }}>DESCRIPTION *</Text>
                <TextInput
                  style={{ ...type.regular, ...inputFieldStyle, minHeight: 120, textAlignVertical: "top" }}
                  placeholder="Scope, criteria, and constraints."
                  placeholderTextColor={webTheme.faint}
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </SurfaceCard>

            {/* ── Category ── */}
            <SurfaceCard style={{ marginTop: 12 }}>
              <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 11, letterSpacing: 1.2, marginBottom: 10 }}>CATEGORY</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map((item) => {
                  const active = item === category;
                  return (
                    <HapticPressable
                      key={item}
                      hapticType="selection"
                      onPress={() => { setCategory(item); setSubcategory(""); }}
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? webTheme.accentBorder : webTheme.border,
                        backgroundColor: active ? webTheme.accentSoft : "rgba(255,255,255,0.03)",
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ ...type.bold, color: active ? webTheme.accent : webTheme.muted, fontSize: 13 }}>
                        {item}
                      </Text>
                    </HapticPressable>
                  );
                })}
              </View>

              <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 11, letterSpacing: 1.2, marginTop: 18, marginBottom: 10 }}>
                SUBCATEGORY *
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(SUBCATEGORIES[category] ?? []).map((sub) => {
                  const active = sub === subcategory;
                  return (
                    <HapticPressable
                      key={sub}
                      hapticType="selection"
                      onPress={() => setSubcategory(sub)}
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? webTheme.accentBorder : webTheme.borderSoft,
                        backgroundColor: active ? webTheme.accentSoft : "rgba(255,255,255,0.02)",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ ...type.bold, color: active ? webTheme.accent : webTheme.faint, fontSize: 12 }}>
                        {sub}
                      </Text>
                    </HapticPressable>
                  );
                })}
              </View>
            </SurfaceCard>

            {/* ── Reward ── */}
            <SurfaceCard style={{ marginTop: 12 }}>
              <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 11, letterSpacing: 1.2, marginBottom: 12 }}>REWARD TIER</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {REWARD_TIERS.map((tier) => {
                  const active = tier.id === rewardTier;
                  return (
                    <HapticPressable
                      key={tier.id}
                      hapticType="selection"
                      onPress={() => setRewardTier(tier.id)}
                      style={{
                        width: "47%",
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: active ? tier.border : webTheme.borderSoft,
                        backgroundColor: active ? tier.bg : "rgba(255,255,255,0.02)",
                        padding: 16,
                      }}
                    >
                      <Text style={{ ...type.bold, color: active ? tier.color : webTheme.faint, fontSize: 10, letterSpacing: 1.2 }}>
                        {tier.label.toUpperCase()}
                      </Text>
                      <Text style={{ ...type.black, color: webTheme.text, fontSize: 26, marginTop: 6 }}>
                        {tier.coins}
                      </Text>
                      <Text style={{ ...type.caption, color: webTheme.muted }}>coins</Text>
                    </HapticPressable>
                  );
                })}
              </View>
            </SurfaceCard>

            {/* ── Deadline ── */}
            <SurfaceCard style={{ marginTop: 12 }}>
              <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 11, letterSpacing: 1.2, marginBottom: 10 }}>
                DEADLINE *
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={{
                  ...inputFieldStyle,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ ...type.regular, color: deadlineDate ? webTheme.text : webTheme.faint }}>
                  {deadlineDate
                    ? deadlineDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                    : "Select deadline"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {deadlineDate ? (
                    <Pressable hitSlop={10} onPress={() => setDeadlineDate(null)}>
                      <Feather name="x" size={14} color={webTheme.faint} />
                    </Pressable>
                  ) : null}
                  <Feather name="calendar" size={16} color={webTheme.accent} />
                </View>
              </Pressable>
              {showDatePicker ? (
                <DateTimePicker
                  value={deadlineDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  minimumDate={new Date()}
                  themeVariant="dark"
                  accentColor={webTheme.accent}
                  onChange={(_, date) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (date) setDeadlineDate(date);
                  }}
                />
              ) : null}
            </SurfaceCard>

            {/* ── Save button ── */}
            <Pressable
              onPress={handleSave}
              disabled={updateMutation.isPending}
              style={{
                marginTop: 24,
                borderRadius: 999,
                backgroundColor: updateMutation.isPending ? "rgba(99,102,241,0.4)" : webTheme.accent,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ ...type.bold, color: "#fff", fontSize: 15 }}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
