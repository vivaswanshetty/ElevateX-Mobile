import React, { useState } from "react";
import { Modal, Pressable, Text, View, ScrollView, ActivityIndicator, TextInput, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { getImageUrl, getInitials } from "../lib/media";
import { useThemeStore } from "../stores/themeStore";
import { UserAvatar } from "./UserAvatar";

interface LightweightUser {
  _id: string;
  name: string;
  avatar?: string;
  xp?: number;
  followedAt?: string;
}

interface UserListModalProps {
  visible: boolean;
  title: string;
  users: LightweightUser[];
  isLoading: boolean;
  onClose: () => void;
  onRemoveUser?: (userId: string, userName: string) => void;
}

export function UserListModal({ visible, title, users, isLoading, onClose, onRemoveUser }: UserListModalProps) {
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  const filteredUsers = (users || []).filter((u) =>
    (u.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleUserPress = (userId: string) => {
    onClose();
    // Allow modal closing transition to clear
    setTimeout(() => {
      router.push({ pathname: "/user/[id]", params: { id: userId } });
    }, 100);
  };

  const blurTint = isDark ? "dark" : "light";
  const modalBg = isDark ? "rgba(10, 10, 12, 0.55)" : "rgba(255, 255, 255, 0.55)";
  const modalBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const handleBg = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const closeBtnBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const searchInputBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <BlurView
          intensity={isDark ? 45 : 65}
          tint={blurTint}
          style={{
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderWidth: 1,
            borderColor: modalBorder,
            backgroundColor: modalBg,
            maxHeight: "80%",
            paddingBottom: 34,
          }}
        >
          {/* Header handle */}
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: handleBg,
              }}
            />
          </View>

          {/* Title and Close */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 16 }}>
            <Text style={{ ...type.h2, color: webTheme.text, fontSize: 24 }}>
              {title}
            </Text>
            <Pressable onPress={onClose}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: closeBtnBg, alignItems: "center", justifyContent: "center" }}>
                <Feather name="x" size={16} color={webTheme.text} />
              </View>
            </Pressable>
          </View>

          {/* Search bar */}
          {!isLoading && users && users.length > 0 && (
            <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isFocused ? webTheme.accent : webTheme.border,
                  backgroundColor: webTheme.inputBg,
                  paddingHorizontal: 16,
                  height: 48,
                }}
              >
                <Feather name="search" size={16} color={webTheme.muted} style={{ marginRight: 8 }} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={`Search ${title.toLowerCase()}...`}
                  placeholderTextColor={webTheme.faint}
                  style={{ ...type.regular, color: webTheme.text, flex: 1, padding: 0, backgroundColor: "transparent" }}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch("")}>
                    <Feather name="x" size={14} color={webTheme.muted} />
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* User List */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator color={webTheme.accent} />
              </View>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((item) => {
                const avatar = getImageUrl(item.avatar);
                const userLevel = Math.floor((item.xp || 0) / 500) + 1;
                return (
                  <View
                    key={item._id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: webTheme.borderSoft,
                    }}
                  >
                    <Pressable
                      onPress={() => handleUserPress(item._id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      {/* Avatar */}
                      <UserAvatar
                        avatar={item.avatar}
                        size={44}
                        style={{ marginRight: 12 }}
                      />

                      {/* Name and Level */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 16 }} numberOfLines={1}>
                          {item.name || "ElevateX Member"}
                        </Text>
                        <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 2 }}>
                          Level {userLevel}
                        </Text>
                      </View>
                    </Pressable>

                    {onRemoveUser ? (
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Remove follower?",
                            `ElevateX won't tell ${item.name || "them"} they were removed from your followers.`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Remove",
                                style: "destructive",
                                onPress: () => onRemoveUser(item._id, item.name || "User"),
                              },
                            ]
                          );
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                          borderWidth: 1,
                          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                        }}
                      >
                        <Text style={{ ...type.bold, fontSize: 11, color: webTheme.text }}>
                          Remove
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => handleUserPress(item._id)} style={{ padding: 4 }}>
                        <Feather name="chevron-right" size={16} color={webTheme.faint} />
                      </Pressable>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Text style={{ ...type.regular, color: webTheme.muted }}>
                  {users && users.length === 0 ? `No ${title.toLowerCase()} yet.` : "No matches found."}
                </Text>
              </View>
            )}
          </ScrollView>
        </BlurView>
      </View>
    </Modal>
  );
}
