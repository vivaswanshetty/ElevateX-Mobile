import { useState, useEffect, useRef } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { HapticPressable } from "../components/HapticPressable";
import { Watermark } from "../components/Watermark";
import { api, getErrorMessage } from "../lib/api";
import { notify } from "../stores/toastStore";
import { type } from "../lib/typography";
import { webTheme, inputFieldStyle } from "../lib/webTheme";
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";

interface Message {
  role: "user" | "model";
  content: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  title: string;
  updatedAt: string;
  messageCount?: number;
  lastMessage?: string;
}

export default function AIAssistantScreen() {
  const { user } = useAuthStore();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [fetchingChats, setFetchingChats] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const [quotedMessage, setQuotedMessage] = useState<{ content: string; type: string } | null>(null);
  const [chatMode, setChatMode] = useState<'normal' | 'deepthink'>('normal');

  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when activeId changes
  useEffect(() => {
    if (activeId) {
      fetchMessages(activeId);
    } else {
      setMessages([]);
    }
  }, [activeId]);

  const fetchConversations = async () => {
    setFetchingChats(true);
    try {
      const res = await api.get("/api/assistant/conversations");
      setConversations(res || []);
      // Auto-select latest conversation if exists and none is selected
      if (res && res.length > 0 && !activeId) {
        setActiveId(res[0]._id);
      }
    } catch (err) {
      console.warn("Fetch conversations error:", err);
      notify.error("Failed to load chat history.");
    } finally {
      setFetchingChats(false);
    }
  };

  const fetchMessages = async (id: string) => {
    setFetchingMessages(true);
    try {
      const res = await api.get(`/api/assistant/conversations/${id}`);
      setMessages(res.messages || []);
      // Scroll to end after loading messages
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (err) {
      console.warn("Fetch messages error:", err);
      notify.error("Failed to load chat messages.");
    } finally {
      setFetchingMessages(false);
    }
  };

  const handleCreateChat = async (initialQuery: string | null = null) => {
    setLoading(true);
    try {
      const res = await api.post("/api/assistant/conversations");
      const newChat = res;

      // Add new chat to top of history
      setConversations((prev) => [
        {
          _id: newChat._id,
          title: newChat.title || "New Chat",
          updatedAt: newChat.updatedAt || new Date().toISOString(),
          messageCount: 0,
          lastMessage: "",
        },
        ...prev,
      ]);

      // Set active and reset state
      setActiveId(newChat._id);
      setMessages([]);
      setIsHistoryVisible(false);

      if (initialQuery) {
        await sendMessage(newChat._id, initialQuery);
      }
    } catch (err) {
      console.warn("Create chat error:", err);
      notify.error("Failed to start new chat session.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this chat session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/api/assistant/conversations/${id}`);
              setConversations((prev) => prev.filter((c) => c._id !== id));
              if (activeId === id) {
                const remaining = conversations.filter((c) => c._id !== id);
                if (remaining.length > 0) {
                  setActiveId(remaining[0]._id);
                } else {
                  setActiveId(null);
                }
              }
              notify.success("Chat deleted successfully.");
            } catch (err) {
              console.warn("Delete chat error:", err);
              notify.error("Failed to delete chat.");
            }
          },
        },
      ]
    );
  };

  const sendMessage = async (chatId: string, textToSend: string) => {
    const text = textToSend || inputText;
    if (!text || text.trim() === "") return;

    setInputText("");
    setLoading(true);

    let contentToSend = text;
    if (quotedMessage) {
      contentToSend = `Regarding your statement: "${quotedMessage.content}"\n\nQuestion: ${text}`;
      setQuotedMessage(null);
    }

    if (chatMode === "deepthink") {
      contentToSend = `[DeepThink] ${contentToSend}`;
    }

    // Optimistically add user message
    const tempUserMsg: Message = {
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await api.post(`/api/assistant/conversations/${chatId}/chat`, {
        content: contentToSend,
      });

      if (res && res.conversation) {
        setMessages(res.conversation.messages || []);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        // Update list properties
        setConversations((prev) =>
          prev
            .map((c) => {
              if (c._id === chatId) {
                return {
                  ...c,
                  title: res.conversation.title || c.title,
                  messageCount: res.conversation.messages.length,
                  lastMessage: res.reply || "",
                  updatedAt: new Date().toISOString(),
                };
              }
              return c;
            })
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
      }
    } catch (err) {
      console.warn("Send message error:", err);
      notify.error("Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = () => {
    if (!inputText.trim()) return;
    if (activeId) {
      sendMessage(activeId, inputText);
    } else {
      handleCreateChat(inputText);
    }
  };

  const handleSuggestionClick = (query: string) => {
    handleCreateChat(query);
  };

  const handleQuoteLine = (content: string, typeName: string) => {
    setQuotedMessage({
      content: content.trim(),
      type: typeName,
    });
  };

  // Helper date functions
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
    }
  };

  const shouldShowDateSep = (current: Message, prev?: Message) => {
    if (!prev) return true;
    const currDate = new Date(current.createdAt).toDateString();
    const prevDate = new Date(prev.createdAt).toDateString();
    return currDate !== prevDate;
  };

  // Custom parser rendering inline styles (`**bold**` and `` `code` ``)
  const renderInlineText = (text: string, isModel: boolean) => {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text key={index} style={{ ...type.bold, color: isDark ? "#FFF" : "#000" }}>
            {part.slice(2, -2)}
          </Text>
        );
      } else if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <Text
            key={index}
            style={{
              fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
              fontSize: 12,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              color: webTheme.accent,
              paddingHorizontal: 4,
            }}
          >
            {part.slice(1, -1)}
          </Text>
        );
      }
      return part;
    });
  };

  // Parse lines to support code blocks, bullets, and standard paragraphs
  const renderMessageMarkdown = (content: string, isModel: boolean) => {
    if (!content) return null;
    const blocks = content.split(/(```[\s\S]*?```)/g);

    return blocks.map((block, i) => {
      if (block.startsWith("```")) {
        const rawCode = block.slice(3, -3).trim();
        const lines = rawCode.split("\n");
        let lang = "";
        let code = rawCode;

        if (lines.length > 0 && !lines[0].includes(" ") && lines[0].length < 15) {
          lang = lines[0];
          code = lines.slice(1).join("\n");
        }

        return (
          <View
            key={i}
            style={{
              marginVertical: 8,
              backgroundColor: "rgba(0,0,0,0.45)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            {lang ? (
              <Text
                style={{
                  ...type.bold,
                  fontSize: 9,
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255,255,255,0.05)",
                  paddingBottom: 2,
                }}
              >
                {lang}
              </Text>
            ) : null}
            <Text
              style={{
                fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                fontSize: 11,
                color: "#ffcdd2",
                lineHeight: 16,
              }}
            >
              {code}
            </Text>
            {isModel && (
              <HapticPressable
                onPress={() => handleQuoteLine(code, "Code Block")}
                style={{
                  alignSelf: "flex-end",
                  marginTop: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Feather name="corner-up-left" size={10} color={webTheme.accent} />
                <Text style={{ ...type.bold, fontSize: 9, color: webTheme.accent }}>Ask Doubt</Text>
              </HapticPressable>
            )}
          </View>
        );
      } else {
        const lines = block.split("\n");
        return lines.map((line, j) => {
          if (line.trim() === "") return <View key={`${i}-${j}`} style={{ height: 4 }} />;

          const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
          let text = line;
          if (isBullet) {
            text = line.trim().replace(/^[\s]*[-*]\s+/, "");
          }

          if (isBullet) {
            return (
              <View
                key={`${i}-${j}`}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginVertical: 4,
                  paddingLeft: 4,
                }}
              >
                <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: webTheme.accent,
                      marginTop: 8,
                    }}
                  />
                  <Text style={{ ...type.regular, fontSize: 14, color: isDark ? "rgba(255,255,255,0.85)" : "#333", lineHeight: 20, flex: 1 }}>
                    {renderInlineText(text, isModel)}
                  </Text>
                </View>
                {isModel && (
                  <HapticPressable
                    onPress={() => handleQuoteLine(line, "Bullet Point")}
                    style={{ padding: 4, marginLeft: 8 }}
                  >
                    <Feather name="corner-up-left" size={11} color="rgba(255,255,255,0.3)" />
                  </HapticPressable>
                )}
              </View>
            );
          }

          return (
            <View
              key={`${i}-${j}`}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginVertical: 3,
              }}
            >
              <Text style={{ ...type.regular, fontSize: 14, color: isDark ? "rgba(255,255,255,0.85)" : "#333", lineHeight: 20, flex: 1 }}>
                {renderInlineText(text, isModel)}
              </Text>
              {isModel && (
                <HapticPressable
                  onPress={() => handleQuoteLine(line, "Line")}
                  style={{ padding: 4, marginLeft: 8 }}
                >
                  <Feather name="corner-up-left" size={11} color="rgba(255,255,255,0.3)" />
                </HapticPressable>
              )}
            </View>
          );
        });
      }
    });
  };

  const suggestions = [
    { title: "Recommend tasks", query: "Recommend open tasks matching my profile." },
    { title: "Understand Alchemy", query: "Explain the Focus Alchemy and Relics system." },
    { title: "Productivity Duels", query: "How do Productivity Duels work?" },
    { title: "Earn more Coins", query: "Suggest ways I can earn more coins." },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }} edges={["top", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          height: 60,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: webTheme.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <HapticPressable onPress={() => router.back()} style={{ padding: 6 }}>
          <Feather name="arrow-left" size={20} color={webTheme.text} />
        </HapticPressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: "rgba(229,54,75,0.12)",
              borderWidth: 1,
              borderColor: "rgba(229,54,75,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="robot" size={16} color={webTheme.accent} />
          </View>
          <View style={{ justifyContent: "center" }}>
            <Text style={{ ...type.bold, fontSize: 14, color: webTheme.text }}>Elev AI Assistant</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" }} />
              <Text style={{ ...type.regular, fontSize: 10, color: webTheme.muted }}>AI companion</Text>
            </View>
          </View>
        </View>

        <HapticPressable onPress={() => setIsHistoryVisible(true)} style={{ padding: 6 }}>
          <Feather name="clock" size={18} color={webTheme.text} />
        </HapticPressable>
      </View>

      {/* Main Panel wrapper */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, flexGrow: 1 }}
        >
          {/* Welcome / Suggestions State */}
          {!activeId || messages.length === 0 ? (
            <View style={{ flex: 1, justifyContent: "center", maxWidth: 500, alignSelf: "center", width: "100%" }}>
              <View style={{ alignItems: "center", marginBottom: 28 }}>
                <View
                  style={{
                    padding: 16,
                    backgroundColor: "rgba(229,54,75,0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(229,54,75,0.15)",
                    borderRadius: 20,
                    marginBottom: 16,
                  }}
                >
                  <Feather name="box" size={36} color={webTheme.accent} />
                </View>
                <Text style={{ ...type.extrabold, fontSize: 18, color: webTheme.text, textAlign: "center" }}>
                  Hey {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : "Member"}!
                </Text>
                <Text
                  style={{
                    ...type.regular,
                    fontSize: 12,
                    color: webTheme.muted,
                    textAlign: "center",
                    marginTop: 8,
                    lineHeight: 18,
                  }}
                >
                  I'm Elev AI, your guide. Ask me about matching tasks, relics, duels, or improving your productivity.
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                {suggestions.map((s, idx) => (
                  <HapticPressable
                    key={idx}
                    onPress={() => handleSuggestionClick(s.query)}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      backgroundColor: "rgba(255,255,255,0.01)",
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ ...type.bold, fontSize: 12, color: webTheme.text }}>{s.title}</Text>
                      <Feather name="chevron-right" size={13} color={webTheme.muted} />
                    </View>
                    <Text style={{ ...type.regular, fontSize: 10, color: webTheme.muted, marginTop: 4 }} numberOfLines={1}>
                      "{s.query}"
                    </Text>
                  </HapticPressable>
                ))}
              </View>
            </View>
          ) : (
            /* Message Thread */
            <View style={{ gap: 20 }}>
              {messages.map((m, idx) => {
                const prev = idx > 0 ? messages[idx - 1] : undefined;
                const showDate = shouldShowDateSep(m, prev);
                const mine = m.role === "user";

                return (
                  <View key={idx}>
                    {showDate && (
                      <View style={{ alignItems: "center", marginVertical: 14 }}>
                        <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 10, letterSpacing: 0.5 }}>
                          {getDateLabel(m.createdAt).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View
                      style={{
                        flexDirection: mine ? "row-reverse" : "row",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      {/* Avatar badge */}
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          backgroundColor: mine ? "rgba(229,54,75,0.12)" : "rgba(255,255,255,0.05)",
                          borderWidth: 1,
                          borderColor: mine ? "rgba(229,54,75,0.2)" : "rgba(255,255,255,0.1)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {mine ? (
                          <Feather name="user" size={13} color={webTheme.accent} />
                        ) : (
                          <MaterialCommunityIcons name="robot" size={13} color={webTheme.text} />
                        )}
                      </View>

                      {/* Content bubble */}
                      <View
                        style={{
                          flex: 1,
                          maxWidth: "85%",
                          padding: 12,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: mine ? "rgba(229,54,75,0.18)" : webTheme.border,
                          backgroundColor: mine ? "rgba(229,54,75,0.05)" : webTheme.surfaceRaised,
                          alignSelf: mine ? "flex-end" : "flex-start",
                        }}
                      >
                        {mine ? (
                          <Text style={{ ...type.regular, fontSize: 14, color: webTheme.text, lineHeight: 20 }}>
                            {m.content}
                          </Text>
                        ) : (
                          <View style={{ gap: 2 }}>{renderMessageMarkdown(m.content, true)}</View>
                        )}
                        <Text
                          style={{
                            ...type.regular,
                            fontSize: 8,
                            color: webTheme.faint,
                            textAlign: mine ? "right" : "left",
                            marginTop: 6,
                          }}
                        >
                          {formatTime(m.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Loader */}
              {loading && (
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: "rgba(255,255,255,0.05)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialCommunityIcons name="robot" size={13} color={webTheme.text} />
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor: webTheme.surfaceRaised,
                      borderWidth: 1,
                      borderColor: webTheme.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <ActivityIndicator size="small" color={webTheme.accent} />
                    <Text style={{ ...type.bold, fontSize: 11, color: webTheme.accent }}>Thinking...</Text>
                  </View>
                </View>
              )}
            </View>
          )}

        </ScrollView>

        {/* Input Dock */}
        <View
          style={{
            padding: 16,
            paddingBottom: Platform.OS === 'ios' ? 24 : 16,
            backgroundColor: webTheme.bg,
          }}
        >
          {/* Ambient Glows behind the input box */}
          <View
            style={{
              position: "absolute",
              left: 20,
              bottom: 20,
              width: 140,
              height: 70,
              borderRadius: 35,
              backgroundColor: "rgba(229, 54, 75, 0.12)", // Red/Orange glow
              shadowColor: "#E5364B",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 25,
              zIndex: -1,
            }}
          />
          <View
            style={{
              position: "absolute",
              right: 20,
              bottom: 20,
              width: 140,
              height: 70,
              borderRadius: 35,
              backgroundColor: "rgba(99, 102, 241, 0.12)", // Blue glow
              shadowColor: "#6366F1",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 25,
              zIndex: -1,
            }}
          />

          {quotedMessage && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 10,
                backgroundColor: "rgba(229,54,75,0.06)",
                borderWidth: 1,
                borderColor: "rgba(229,54,75,0.15)",
                borderRadius: 12,
                marginBottom: 10,
              }}
            >
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Feather name="corner-up-left" size={12} color={webTheme.accent} />
                <Text style={{ ...type.regular, fontSize: 11, color: webTheme.text }} numberOfLines={1}>
                  Doubt about: "{quotedMessage.content}"
                </Text>
              </View>
              <HapticPressable onPress={() => setQuotedMessage(null)} style={{ padding: 4 }}>
                <Feather name="x" size={13} color={webTheme.muted} />
              </HapticPressable>
            </View>
          )}

          {/* Premium Gradient Border Input Wrapper */}
          <LinearGradient
            colors={
              chatMode === "deepthink"
                ? ["#E5364B", "#6366F1"] // Red-Blue active theme gradient
                : ["#E5364B", "rgba(255, 255, 255, 0.25)"] // Red-Grey gradient for normal mode
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 20,
              padding: 1.5, // Consistent premium 1.5px border thickness
            }}
          >
            <View
              style={{
                backgroundColor: "#0A0A0F",
                borderRadius: 19,
                padding: 12,
              }}
            >
              {/* TextInput */}
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                editable={!loading}
                placeholder={
                  chatMode === "deepthink"
                    ? "Ask AI to think deeply..."
                    : "Ask anything..."
                }
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                multiline
                style={{
                  ...type.regular,
                  color: "#FFF",
                  fontSize: 14,
                  minHeight: 50,
                  maxHeight: 140,
                  textAlignVertical: "top",
                  paddingBottom: 8,
                }}
              />

              {/* Bottom Actions Row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                {/* Left Controls */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {/* Plus button */}
                  <HapticPressable
                    onPress={() => notify.info("Attachments coming soon!")}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="plus" size={14} color="#FFF" />
                  </HapticPressable>

                  {/* Normal pill */}
                  <HapticPressable
                    onPress={() => setChatMode("normal")}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: chatMode === "normal" ? "rgba(229, 54, 75, 0.4)" : "rgba(255, 255, 255, 0.08)",
                      backgroundColor: chatMode === "normal" ? "rgba(229, 54, 75, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <Feather name="feather" size={10} color={chatMode === "normal" ? "#E5364B" : "rgba(255,255,255,0.7)"} />
                    <Text style={{ ...type.bold, fontSize: 10, color: chatMode === "normal" ? "#FFF" : "rgba(255,255,255,0.7)" }}>
                      Normal
                    </Text>
                    <Feather name="chevron-down" size={9} color="rgba(255,255,255,0.4)" />
                  </HapticPressable>

                  {/* DeepThink pill */}
                  <HapticPressable
                    onPress={() => setChatMode("deepthink")}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: chatMode === "deepthink" ? "rgba(99, 102, 241, 0.5)" : "rgba(255, 255, 255, 0.08)",
                      backgroundColor: chatMode === "deepthink" ? "rgba(99, 102, 241, 0.18)" : "rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <MaterialCommunityIcons name="brain" size={11} color={chatMode === "deepthink" ? "#6366F1" : "rgba(255,255,255,0.7)"} />
                    <Text style={{ ...type.bold, fontSize: 10, color: chatMode === "deepthink" ? "#FFF" : "rgba(255,255,255,0.7)" }}>
                      DeepThink
                    </Text>
                    <Feather name="chevron-down" size={9} color="rgba(255,255,255,0.4)" />
                  </HapticPressable>
                </View>

                {/* Right Controls */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {/* Voice button */}
                  <HapticPressable
                    onPress={() => notify.info("Voice input coming soon!")}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.08)",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <MaterialCommunityIcons name="waveform" size={11} color="rgba(255,255,255,0.7)" />
                    <Text style={{ ...type.bold, fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
                      Voice
                    </Text>
                  </HapticPressable>

                  {/* Send button (Red-Blue Gradient circle) */}
                  <HapticPressable
                    testID="send-message-button"
                    onPress={handleFormSubmit}
                    disabled={loading || !inputText.trim()}
                    style={{ opacity: loading || !inputText.trim() ? 0.5 : 1 }}
                  >
                    <LinearGradient
                      colors={["#E5364B", "#6366F1"]} // Red-Blue gradient send button
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="send" size={12} color="#FFF" style={{ marginLeft: 1 }} />
                    </LinearGradient>
                  </HapticPressable>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>

      {/* Slide up History Modal */}
      <Modal
        visible={isHistoryVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsHistoryVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
          <HapticPressable style={{ flex: 1 }} onPress={() => setIsHistoryVisible(false)} />
          <BlurView
            intensity={95}
            tint={useThemeStore.getState().theme === "dark" ? "dark" : "light"}
            style={{
              maxHeight: "75%",
              backgroundColor: useThemeStore.getState().theme === "dark" ? "rgba(10, 10, 12, 0.94)" : "rgba(255, 255, 255, 0.95)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderColor: useThemeStore.getState().theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              padding: 20,
              overflow: "hidden",
            }}
          >
            {/* Modal Drag handle visual */}
            <View
              style={{
                width: 40,
                height: 5,
                borderRadius: 3,
                backgroundColor: webTheme.border,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />

            {/* Modal Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ ...type.h2, color: webTheme.text }}>Chat History</Text>
              <HapticPressable onPress={() => setIsHistoryVisible(false)} style={{ padding: 6 }}>
                <Feather name="x" size={18} color={webTheme.text} />
              </HapticPressable>
            </View>

            {/* New Session Button */}
            <HapticPressable
              onPress={() => {
                setActiveId(null);
                setMessages([]);
                setIsHistoryVisible(false);
              }}
              style={{
                height: 44,
                borderRadius: 14,
                backgroundColor: webTheme.accent,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <Feather name="plus" size={16} color="#FFF" />
              <Text style={{ ...type.bold, color: "#FFF", fontSize: 13 }}>New Chat Session</Text>
            </HapticPressable>

            {/* Chat History List */}
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
              refreshControl={
                <RefreshControl
                  refreshing={fetchingChats}
                  onRefresh={fetchConversations}
                  tintColor={webTheme.accent}
                />
              }
            >
              {fetchingChats ? (
                <ActivityIndicator size="small" color={webTheme.accent} style={{ marginVertical: 20 }} />
              ) : conversations.length === 0 ? (
                <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, textAlign: "center", marginVertical: 30 }}>
                  No previous chat sessions found.
                </Text>
              ) : (
                conversations.map((chat) => {
                  const active = activeId === chat._id;
                  return (
                    <HapticPressable
                      key={chat._id}
                      onPress={() => {
                        setActiveId(chat._id);
                        setIsHistoryVisible(false);
                      }}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: active ? webTheme.accentBorder : webTheme.border,
                        backgroundColor: active ? "rgba(229,54,75,0.06)" : "rgba(255,255,255,0.01)",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Feather name="message-square" size={16} color={active ? webTheme.accent : webTheme.muted} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text
                            style={{ ...type.bold, fontSize: 12, color: webTheme.text, flex: 1 }}
                            numberOfLines={1}
                          >
                            {chat.title}
                          </Text>
                          <Text style={{ ...type.regular, fontSize: 8, color: webTheme.faint, marginLeft: 8 }}>
                            {new Date(chat.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </Text>
                        </View>
                        <Text style={{ ...type.regular, fontSize: 10, color: webTheme.muted, marginTop: 2 }} numberOfLines={1}>
                          {chat.lastMessage || "Empty session"}
                        </Text>
                      </View>

                      <HapticPressable onPress={() => handleDeleteChat(chat._id)} style={{ padding: 6 }}>
                        <Feather name="trash-2" size={13} color="rgba(239, 68, 68, 0.6)" />
                      </HapticPressable>
                    </HapticPressable>
                  );
                })
              )}
            </ScrollView>
          </BlurView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


