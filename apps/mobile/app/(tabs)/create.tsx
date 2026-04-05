import { useState } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Pressable, ScrollView, Text, TextInput, View, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { ScreenHeader } from "../../components/ScreenHeader";
import { ScreenBackdrop } from "../../components/ScreenBackdrop";
import { notify } from "../../stores/toastStore";
import { SurfaceCard } from "../../components/SurfaceCard";
import { FadeSlideIn } from "../../components/FadeSlideIn";
import { HapticPressable } from "../../components/HapticPressable";
import { useHaptic } from "../../lib/useHaptic";
import { api, getErrorMessage } from "../../lib/api";
import { type } from "../../lib/typography";
import { webTheme, inputFieldStyle } from "../../lib/webTheme";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";

const createCategories = [
  "Development",
  "Design",
  "Marketing",
  "Writing",
  "Data Science",
  "Video & Animation",
  "Music & Audio",
  "Business",
  "Lifestyle",
] as const;
const SUBCATEGORIES: Record<string, string[]> = {
  Development: ['Web Development', 'Mobile App', 'Debugging', 'API Integration', 'Automation', 'Desktop App', 'Database Design'],
  Design: ['UI/UX', 'Logo', 'Poster', 'Branding', 'Illustration', 'Print Design', '3D Design'],
  Marketing: ['SEO', 'Social Media', 'Content Strategy', 'Email Marketing', 'Influencer Marketing'],
  Writing: ['Blog Post', 'Copywriting', 'Technical Writing', 'Creative Writing', 'Editing'],
  'Data Science': ['Data Analysis', 'Machine Learning', 'Data Visualization', 'Statistical Modeling', 'Big Data'],
  'Video & Animation': ['Video Editing', '2D Animation', '3D Animation', 'Motion Graphics', 'Video Production'],
  'Music & Audio': ['Music Production', 'Audio Editing', 'Voice Over', 'Sound Design', 'Mixing & Mastering'],
  Business: ['Business Plan', 'Financial Analysis', 'Market Research', 'Consulting', 'Project Management'],
  Lifestyle: ['Fitness Coaching', 'Nutrition', 'Life Coaching', 'Travel Planning', 'Personal Shopping'],
};

const rewardTiers = [
  { id: "small", label: "Starter", coins: "20", xp: "12", color: webTheme.green, bg: webTheme.greenSoft, border: "rgba(52,211,153,0.3)" },
  { id: "medium", label: "Standard", coins: "50", xp: "15", color: webTheme.blue, bg: webTheme.blueSoft, border: "rgba(96,165,250,0.3)" },
  { id: "large", label: "Advanced", coins: "100", xp: "20", color: webTheme.purple, bg: webTheme.violetSoft, border: webTheme.violetBorder },
  { id: "premium", label: "Premium", coins: "200", xp: "30", color: webTheme.gold, bg: webTheme.goldSoft, border: "rgba(251,191,36,0.3)" },
] as const;
const steps = ["Basics", "Reward", "Details", "Review"] as const;

export default function CreateScreen() {
  const tabBarPadding = useTabBarPadding();
  const queryClient = useQueryClient();
  const triggerHaptic = useHaptic();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [rewardTier, setRewardTier] = useState<(typeof rewardTiers)[number]["id"]>("small");
  const [category, setCategory] = useState<(typeof createCategories)[number]>("Development");
  const [subcategory, setSubcategory] = useState("");
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const deadlineStr = deadlineDate ? deadlineDate.toISOString().slice(0, 10) : "";
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const selectedTier = rewardTiers.find((tier) => tier.id === rewardTier)!;

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !headline.trim() || !description.trim() || !subcategory.trim() || !deadlineDate) {
      triggerHaptic("error");
      notify.error("Add a title, headline, subcategory, deadline, and description before posting.");
      return;
    }

    try {
      const payload = {
        title,
        category,
        sub: subcategory,
        rewardId: rewardTier,
        coins: String(selectedTier.coins),
        desc: `${headline}\n\n${description}`,
        deadline: deadlineStr,
      };

      if (selectedImage) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => formData.append(k, v));
        formData.append("image", {
          uri: selectedImage.uri,
          name: selectedImage.fileName || "task_image.jpg",
          type: selectedImage.mimeType || "image/jpeg",
        } as any);
        await api.post("/api/tasks", formData);
      } else {
        await api.post("/api/tasks", payload);
      }

      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      triggerHaptic("success");
      notify.success(`"${title}" is now live in the marketplace.`);
      setTitle("");
      setHeadline("");
      setDescription("");
      setRewardTier("small");
      setCategory("Development");
      setSubcategory("");
      setDeadlineDate(null);
      setSelectedImage(null);
      setStep(0);
    } catch (error) {
      triggerHaptic("error");
      notify.error(getErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: tabBarPadding }}>
        <FadeSlideIn delay={50} distance={10} style={{ width: "100%" }}>
          <ScreenHeader
            eyebrow="New Task"
            title="Post a"
            badge="Task"
            description="Lock coins in escrow and get quality work from skilled freelancers."
          />
        </FadeSlideIn>

        {/* step indicator */}
        <FadeSlideIn delay={120} distance={14} style={{ width: "100%" }}>
          <View style={{ marginTop: 28, flexDirection: "row", alignItems: "center", gap: 8 }}>
            {steps.map((label, index) => (
              <View key={label} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: index <= step ? webTheme.accentSoft : "rgba(255,255,255,0.03)",
                    borderWidth: 1,
                    borderColor: index <= step ? webTheme.accentBorder : "rgba(255,255,255,0.06)",
                  }}
                >
                  <Text style={{ ...type.bold, color: index === step ? webTheme.accent : webTheme.faint, fontSize: 11 }}>
                    {index + 1}
                  </Text>
                </View>
                {index < steps.length - 1 ? (
                  <View style={{ flex: 1, height: 1, backgroundColor: index < step ? webTheme.accentBorder : "rgba(255,255,255,0.06)" }} />
                ) : null}
              </View>
            ))}
          </View>
        </FadeSlideIn>

        {/* step content */}
        <FadeSlideIn delay={200} distance={16} key={`step-${step}`} style={{ width: "100%" }}>
          <SurfaceCard style={{ marginTop: 22 }} accent={webTheme.accent}>
            {step === 0 ? (
              <View style={{ gap: 16 }}>
                <Text style={{ ...type.h3, color: webTheme.text }}>Task Basics</Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    style={{ ...type.regular, ...inputFieldStyle, paddingRight: 36 }}
                    placeholder="e.g. Design a modern landing page"
                    placeholderTextColor={webTheme.faint}
                    value={title}
                    onChangeText={setTitle}
                  />
                  <Text style={{ position: "absolute", top: 16, right: 16, color: webTheme.red, fontSize: 16, ...type.bold }}>*</Text>
                </View>
                <View style={{ position: "relative" }}>
                  <TextInput
                    style={{ ...type.regular, ...inputFieldStyle, paddingRight: 36 }}
                    placeholder="One line that explains the outcome"
                    placeholderTextColor={webTheme.faint}
                    value={headline}
                    onChangeText={setHeadline}
                  />
                  <Text style={{ position: "absolute", top: 16, right: 16, color: webTheme.red, fontSize: 16, ...type.bold }}>*</Text>
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 12 }}>CATEGORY</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    {createCategories.map((item) => {
                      const active = item === category;
                      return (
                        <HapticPressable
                          key={item}
                          hapticType="selection"
                          onPress={() => {
                            setCategory(item);
                            setSubcategory("");
                          }}
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
                </View>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                    <Text style={{ ...type.bold, color: webTheme.muted, fontSize: 12 }}>SUBCATEGORY</Text>
                    <Text style={{ color: webTheme.red, fontSize: 14, ...type.bold }}>*</Text>
                  </View>
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
                </View>
              </View>
            ) : null}

            {step === 1 ? (
              <View style={{ gap: 16 }}>
                <Text style={{ ...type.h3, color: webTheme.text }}>Set Reward</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {rewardTiers.map((tier) => {
                    const active = tier.id === rewardTier;
                    return (
                      <HapticPressable
                        key={tier.id}
                        hapticType="selection"
                        onPress={() => setRewardTier(tier.id as any)}
                        style={{
                          width: "47%",
                          borderRadius: 22,
                          borderWidth: 1,
                          borderColor: active ? tier.border : webTheme.borderSoft,
                          backgroundColor: active ? tier.bg : "rgba(255,255,255,0.02)",
                          padding: 18,
                        }}
                      >
                        <Text style={{ ...type.label, color: active ? tier.color : webTheme.faint, fontSize: 10 }}>
                          {tier.label.toUpperCase()}
                        </Text>
                        <Text style={{ ...type.black, marginTop: 8, color: webTheme.text, fontSize: 28 }}>
                          {tier.coins}
                        </Text>
                        <Text style={{ ...type.caption, color: webTheme.muted }}>coins</Text>
                        <Text style={{ ...type.bold, marginTop: 10, color: active ? tier.color : webTheme.faint, fontSize: 11 }}>
                          +{tier.xp} XP
                        </Text>
                      </HapticPressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {step === 2 ? (
              <View style={{ gap: 16 }}>
                <Text style={{ ...type.h3, color: webTheme.text }}>Task Details</Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    style={{
                      ...type.regular,
                      ...inputFieldStyle,
                      minHeight: 150,
                      textAlignVertical: "top",
                      paddingRight: 36,
                    }}
                    placeholder="Define scope, completion criteria, and constraints."
                    placeholderTextColor={webTheme.faint}
                    multiline
                    value={description}
                    onChangeText={setDescription}
                  />
                  <Text style={{ position: "absolute", top: 16, right: 16, color: webTheme.red, fontSize: 16, ...type.bold }}>*</Text>
                </View>
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
                      <Pressable
                        hitSlop={10}
                        onPress={() => setDeadlineDate(null)}
                      >
                        <Feather name="x" size={14} color={webTheme.faint} />
                      </Pressable>
                    ) : null}
                    <Feather name="calendar" size={16} color={webTheme.accent} />
                    <Text style={{ color: webTheme.red, fontSize: 14, ...type.bold }}>*</Text>
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
                
                <View style={{ marginTop: 10 }}>
                  <Text style={{ ...type.bold, color: webTheme.text, marginBottom: 10 }}>Attachment (Optional)</Text>
                  {selectedImage ? (
                    <View style={{ position: "relative", width: "100%", height: 180, borderRadius: 12, overflow: "hidden" }}>
                      <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: "100%" }} />
                      <Pressable
                        onPress={() => setSelectedImage(null)}
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="x" size={16} color="#FFF" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handlePickImage}
                      style={{
                        padding: 20,
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: webTheme.border,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <Feather name="image" size={24} color={webTheme.muted} />
                      <Text style={{ ...type.regular, color: webTheme.muted }}>Tap to add an image</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : null}

            {step === 3 ? (
              <View style={{ gap: 14 }}>
                <Text style={{ ...type.h3, color: webTheme.text }}>Review</Text>
                <Text style={{ ...type.h2, color: webTheme.text }}>
                  {title || "Your task title"}
                </Text>
                <Text style={{ ...type.body, color: webTheme.muted }}>
                  {headline || "A crisp headline makes the task easier to pick up."}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
                  {[category, subcategory || "Subcategory", `${selectedTier.coins} coins`, deadlineStr || "No deadline"].map((item) => (
                    <View
                      key={item}
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: webTheme.border,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12 }}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </SurfaceCard>
        </FadeSlideIn>

        {/* nav buttons */}
        <FadeSlideIn delay={300} distance={18} style={{ width: "100%" }}>
          <View style={{ marginTop: 20, flexDirection: "row", gap: 12 }}>
            {step > 0 ? (
              <Pressable onPress={() => setStep((current) => current - 1)} style={{ flex: 1 }}>
                <View style={{ borderRadius: 999, borderWidth: 1, borderColor: webTheme.border, backgroundColor: "rgba(255,255,255,0.04)", paddingVertical: 16, alignItems: "center" }}>
                  <Text style={{ ...type.buttonLabel, color: webTheme.muted }}>Back</Text>
                </View>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                if (step === 0) {
                  if (!title.trim() || !headline.trim() || !subcategory.trim()) {
                    triggerHaptic("error");
                    notify.error("Please add a title, headline, and subcategory.");
                    return;
                  }
                } else if (step === 2) {
                  if (!description.trim() || !deadlineDate) {
                    triggerHaptic("error");
                    notify.error("Please enter a description and a deadline.");
                    return;
                  }
                }

                if (step < steps.length - 1) {
                  setStep((current) => current + 1);
                  return;
                }
                handleSubmit();
              }}
              style={{ flex: 1 }}
            >
              <View style={{ borderRadius: 999, backgroundColor: webTheme.accent, paddingVertical: 16, alignItems: "center" }}>
                <Text style={{ ...type.buttonLabel, color: "#fff" }}>
                  {step < steps.length - 1 ? "Continue" : "Post Task"}
                </Text>
              </View>
            </Pressable>
          </View>
        </FadeSlideIn>
      </ScrollView>
    </SafeAreaView>
  );
}
