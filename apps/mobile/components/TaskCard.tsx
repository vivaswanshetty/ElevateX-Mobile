import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { Task } from "../lib/tasks";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { SurfaceCard } from "./SurfaceCard";

const difficultyStyles = {
  Easy: { color: webTheme.green, border: "rgba(52,211,153,0.22)", bg: "rgba(52,211,153,0.10)" },
  Medium: { color: webTheme.blue, border: "rgba(96,165,250,0.22)", bg: "rgba(96,165,250,0.10)" },
  Hard: { color: webTheme.gold, border: "rgba(251,191,36,0.22)", bg: "rgba(251,191,36,0.10)" },
} as const;

interface TaskCardProps {
  task: Task;
  onPress?: () => void;
}

function getTaskTone(task: Task) {
  return task.urgent ? "danger" : "default";
}

function getTaskAccessibilityLabel(task: Task) {
  return [
    task.title,
    task.category,
    `${task.difficulty} difficulty`,
    `${task.rewardCoins} coins`,
    `${task.rewardXp} XP`,
    `deadline ${task.eta}`,
    task.location,
  ].join(", ");
}

export function TaskCard({ task, onPress }: TaskCardProps) {
  const difficulty = difficultyStyles[task.difficulty];
  const categoryInitial = task.category.trim().charAt(0).toUpperCase() || "?";

  return (
    <SurfaceCard
      tone={getTaskTone(task)}
      onPress={onPress}
      accessibilityLabel={getTaskAccessibilityLabel(task)}
      accessibilityHint={onPress ? "Opens task details." : undefined}
      header={
        <View>
          {/* top row: category + difficulty */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1 }}>
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: webTheme.borderStrong,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    ...type.label,
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 10,
                    letterSpacing: 1.4,
                  }}
                >
                  {task.category}
                </Text>
              </View>

              {task.badgeLabel ? (
                <View
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: webTheme.accentBorder,
                    backgroundColor: webTheme.accentSoft,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      ...type.label,
                      color: webTheme.accent,
                      fontSize: 10,
                      letterSpacing: 1.5,
                    }}
                  >
                    {task.badgeLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: difficulty.border,
                backgroundColor: difficulty.bg,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <MaterialCommunityIcons name="star-four-points" size={12} color={difficulty.color} />
              <Text style={{ ...type.bold, color: difficulty.color, fontSize: 11 }}>{task.difficulty}</Text>
            </View>
          </View>

          {/* title */}
          <Text style={{ ...type.h3, color: webTheme.text }}>
            {task.title}
          </Text>

          {/* headline */}
          <View
            style={{
              marginTop: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <MaterialCommunityIcons name="lightning-bolt-outline" size={14} color={webTheme.accent} />
            <Text
              numberOfLines={2}
              style={{
                ...type.bodyMedium,
                color: webTheme.textSecondary,
                fontSize: 13,
                lineHeight: 18,
                flex: 1,
              }}
            >
              {task.headline}
            </Text>
          </View>

          {/* description */}
          <Text
            numberOfLines={3}
            style={{
              ...type.body,
              marginTop: 8,
              color: webTheme.muted,
              fontSize: 14,
            }}
          >
            {task.description}
          </Text>
        </View>
      }
      footer={
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* context */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: webTheme.borderStrong,
              }}
            >
              <Text style={{ ...type.black, color: webTheme.text, fontSize: 12 }}>
                {categoryInitial}
              </Text>
            </View>

            <View>
              <Text
                style={{
                  ...type.label,
                  color: webTheme.faint,
                  fontSize: 10,
                }}
              >
                Task context
              </Text>
              <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>{task.location}</Text>
            </View>
          </View>

          {/* XP badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: webTheme.violetBorder,
              backgroundColor: webTheme.violetSoft,
              paddingHorizontal: 10,
              paddingVertical: 7,
            }}
          >
            <Feather name="zap" size={13} color={webTheme.violet} />
            <Text style={{ ...type.bold, color: webTheme.violet, fontSize: 12 }}>
              +{task.rewardXp} XP
            </Text>
          </View>
        </View>
      }
    >
      {/* reward / deadline bar */}
      <View
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: webTheme.borderSoft,
          backgroundColor: "rgba(255,255,255,0.03)",
          padding: 14,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...type.label,
              color: webTheme.faint,
              fontSize: 10,
            }}
          >
            Reward
          </Text>
          <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialCommunityIcons name="cash-100" size={16} color={webTheme.gold} />
            <Text style={{ ...type.black, color: webTheme.text, fontSize: 18 }}>{task.rewardCoins}</Text>
            <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 12 }}>coins</Text>
          </View>
        </View>

        <View style={{ width: 1, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 14 }} />

        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text
            style={{
              ...type.label,
              color: webTheme.faint,
              fontSize: 10,
            }}
          >
            Deadline
          </Text>
          <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Feather name="clock" size={14} color={webTheme.muted} />
            <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>{task.eta}</Text>
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
}
