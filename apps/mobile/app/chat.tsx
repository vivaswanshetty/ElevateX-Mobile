import { useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppStackHeader } from "../components/AppStackHeader";
import { SurfaceCard } from "../components/SurfaceCard";
import { HapticPressable } from "../components/HapticPressable";
import { api } from "../lib/api";
import { formatConversationDate, formatTimeAgo, getImageUrl, getInitials } from "../lib/media";
import { socketService } from "../lib/socket";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { useAuthStore } from "../stores/authStore";

interface ChatUser {
  _id: string;
  name: string;
  avatar?: string;
}

interface Conversation {
  _id: string;
  user: ChatUser;
  lastMessage: string;
  timestamp: string;
  isUnread?: boolean;
}

interface MediaFile {
  url: string;
  type: 'image' | 'video' | 'document' | 'audio';
  filename?: string;
  size?: number;
  mimetype?: string;
}

interface Message {
  _id: string;
  sender?: ChatUser;
  recipient?: ChatUser;
  content: string;
  createdAt: string;
  read?: boolean;
  readAt?: string;
  edited?: boolean;
  editedAt?: string;
  deletedAt?: string;
  reactions?: { emoji: string; users: string[] }[];
  media?: MediaFile[];
}

export default function ChatScreen() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [attachedMedia, setAttachedMedia] = useState<MediaFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const markedAsReadRef = useRef(new Set<string>());

  const conversations = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get("/api/messages"),
  });

  // Fetch current user's following list
  const followingQuery = useQuery<{ following: string[] }>({
    queryKey: ["myFollowing"],
    queryFn: () => api.get("/api/users/profile"),
    select: (data) => ({ following: data.following || [] }),
  });

  const userSearch = useQuery<ChatUser[]>({
    queryKey: ["chatSearch", search],
    queryFn: () => api.get(`/api/users/search?q=${encodeURIComponent(search)}`),
    enabled: search.trim().length >= 2,
  });

  // Reset draft and attached media when switching chats
  useEffect(() => {
    setDraft("");
    setAttachedMedia([]);
    setEditingMessageId(null);
    setSelectedMessageForAction(null);
    setReactionPickerMessageId(null);
    markedAsReadRef.current.clear();
  }, [selectedChat?._id]);

  // Socket setup
  useEffect(() => {
    if (currentUser?.id) {
      socketService.connect(currentUser.id);

      socketService.socket?.on("new_message", (message: Message) => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        if (message.sender?._id || message.recipient?._id) {
          queryClient.invalidateQueries({ queryKey: ["conversation", message.sender?._id] });
          queryClient.invalidateQueries({ queryKey: ["conversation", message.recipient?._id] });
        }
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [currentUser?.id, queryClient]);

  const messages = useQuery<Message[]>({
    queryKey: ["conversation", selectedChat?._id],
    queryFn: async () => {
      const chatId = selectedChat?._id;
      console.log('🟦 MESSAGES QUERY RUNNING');
      console.log('🟦 selectedChat:', selectedChat);
      console.log('🟦 chatId:', chatId);
      
      if (!chatId) {
        console.error('❌ chatId is missing!');
        throw new Error('Chat ID is required');
      }
      
      const url = `/api/messages/${chatId}`;
      console.log('🟦 Making request to:', url);
      
      try {
        const data = await api.get(url);
        console.log('✅ Fetched messages count:', data?.length || 0);
        console.log('✅ Messages data:', data);
        return data || [];
      } catch (err) {
        console.error('❌ Raw error object:', err);
        console.error('❌ Error message:', err instanceof Error ? err.message : String(err));
        if (err instanceof Error) {
          console.error('❌ Error stack:', err.stack);
        }
        throw err;
      }
    },
    enabled: Boolean(selectedChat?._id),
  });

  useEffect(() => {
    console.log('=== MESSAGES STATE CHANGED ===');
    console.log('messages.status:', messages.status);
    console.log('messages.data:', messages.data);
    console.log('messages.error:', messages.error);
  }, [messages.data]);

  const uploadMediaFile = useMutation({
    mutationFn: async (file: { uri: string; name: string; type: string }) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      try {
        const formData = new FormData();
        formData.append('media', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);

        const response = await api.post('/api/messages/upload', formData);
        
        setUploadProgress(100);
        return response;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    onSuccess: (mediaData) => {
      setAttachedMedia([...attachedMedia, mediaData]);
      Alert.alert('Success', 'Image added to message');
    },
    onError: (error: any) => {
      console.error('Upload failed:', error);
      Alert.alert(
        'Upload Failed', 
        error?.message || 'Could not upload file. Make sure it\'s under 200MB and you\'re connected to the internet.'
      );
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedChat?._id || (!draft.trim() && attachedMedia.length === 0)) {
        throw new Error("Invalid message");
      }
      console.log('Sending message to:', selectedChat._id, 'Content:', draft);
      const response = await api.post("/api/messages", { 
        recipientId: selectedChat._id, 
        content: draft.trim(),
        media: attachedMedia.length > 0 ? attachedMedia : undefined
      });
      console.log('Message sent response:', response);
      return { data: response, chatId: selectedChat._id };
    },
    onMutate: async () => {
      // Optimistic update - add message to UI immediately
      console.log('🔵 onMutate - adding optimistic message for chat:', selectedChat?._id);
      await queryClient.cancelQueries({ queryKey: ["conversation", selectedChat?._id] });
      
      const previousMessages = queryClient.getQueryData<Message[]>(["conversation", selectedChat?._id]) || [];
      console.log('🔵 Previous messages (or empty):', previousMessages);
      
      if (selectedChat && currentUser?.id) {
        const optimisticMessage: Message = {
          _id: `temp-${Date.now()}`,
          sender: {
            _id: currentUser.id,
            name: currentUser.displayName || currentUser.username,
            avatar: currentUser.avatarUrl || undefined,
          },
          recipient: selectedChat,
          content: draft.trim(),
          createdAt: new Date().toISOString(),
          media: attachedMedia,
        };
        
        console.log('🔵 Adding optimistic message:', optimisticMessage);
        const updatedMessages = [...previousMessages, optimisticMessage];
        queryClient.setQueryData(["conversation", selectedChat._id], updatedMessages);
        console.log('🔵 Updated local messages, count:', updatedMessages.length);
      }
      
      return { previousMessages };
    },
    onSuccess: async (result) => {
      console.log('✅ onSuccess called with message:', result.data);
      setDraft("");
      setAttachedMedia([]);
      const chatId = result.chatId;
      
      // Use the returned message directly instead of refetching
      const sentMessage = result.data as Message;
      console.log('Updating cache with received message:', sentMessage);
      
      // Update the conversation messages with the real message
      const previousMessages = queryClient.getQueryData<Message[]>(["conversation", chatId]) || [];
      
      // Remove the optimistic message and add the real one
      const updatedMessages = previousMessages
        .filter(msg => !msg._id.startsWith('temp-'))
        .concat(sentMessage);
      
      queryClient.setQueryData(["conversation", chatId], updatedMessages);
      console.log('✅ Cache updated with real message. Total messages:', updatedMessages.length);
      
      // Also invalidate conversations list so it updates
      await queryClient.refetchQueries({ queryKey: ["conversations"] });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(["conversation", selectedChat?._id], context.previousMessages);
      }
      const errorMsg = error instanceof Error ? error.message : "Failed to send message";
      if (errorMsg.includes("follow")) {
        Alert.alert("Cannot Message", `You can only message people you follow. Follow ${selectedChat?.name} first.`);
      } else {
        Alert.alert("Error", errorMsg);
      }
    },
  });

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const emojis = ["👍", "❤️", "😂", "🔥", "😍", "🎉", "⚡", "👏"];

  const editMessage = useMutation({
    mutationFn: async (data: { messageId: string; content: string }) => {
      if (!data.content.trim()) throw new Error("Message cannot be empty");
      return api.put(`/api/messages/${data.messageId}`, { content: data.content });
    },
    onSuccess: async () => {
      setEditingMessageId(null);
      setEditingContent("");
      await queryClient.invalidateQueries({ queryKey: ["conversation", selectedChat?._id] });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : "Failed to edit message";
      Alert.alert("Error", errorMsg);
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      return api.delete(`/api/messages/${messageId}`);
    },
    onSuccess: async () => {
      setSelectedMessageForAction(null);
      await queryClient.invalidateQueries({ queryKey: ["conversation", selectedChat?._id] });
    },
  });

  const reactToMessage = useMutation({
    mutationFn: async (data: { messageId: string; emoji: string }) => {
      return api.post(`/api/messages/${data.messageId}/react`, { emoji: data.emoji });
    },
    onMutate: async (variables) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["conversation", selectedChat?._id] });
      
      const previousMessages = queryClient.getQueryData<Message[]>(["conversation", selectedChat?._id]);
      
      if (previousMessages) {
        const updatedMessages = previousMessages.map((msg) => {
          if (msg._id === variables.messageId) {
            const existingReaction = msg.reactions?.find((r) => r.emoji === variables.emoji);
            const userId = currentUser?.id || "";
            
            if (existingReaction && existingReaction.users) {
              // Toggle: if user already reacted, remove them; otherwise add them
              const userIndex = existingReaction.users.indexOf(userId);
              
              if (userIndex > -1) {
                // Remove user reaction
                const newUsers = [...existingReaction.users];
                newUsers.splice(userIndex, 1);
                
                // If no more reactions for this emoji, remove the reaction entry
                if (newUsers.length === 0) {
                  return {
                    ...msg,
                    reactions: (msg.reactions || []).filter((r) => r.emoji !== variables.emoji),
                  };
                }
                
                return {
                  ...msg,
                  reactions: (msg.reactions || []).map((r) =>
                    r.emoji === variables.emoji ? { ...r, users: newUsers } : r
                  ),
                };
              } else {
                // Add user reaction
                return {
                  ...msg,
                  reactions: (msg.reactions || []).map((r) =>
                    r.emoji === variables.emoji
                      ? { ...r, users: [...(r.users || []), userId] }
                      : r
                  ),
                };
              }
            } else {
              // No existing reaction with this emoji, create new one
              return {
                ...msg,
                reactions: [...(msg.reactions || []), { emoji: variables.emoji, users: [userId] }],
              };
            }
          }
          return msg;
        });
        queryClient.setQueryData(["conversation", selectedChat?._id], updatedMessages);
      }
      
      return { previousMessages };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversation", selectedChat?._id] });
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(["conversation", selectedChat?._id], context.previousMessages);
      }
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      return api.put(`/api/messages/${messageId}/read`);
    },
    onMutate: async (messageId) => {
      // Optimistic update - update local cache
      await queryClient.cancelQueries({ queryKey: ["conversation", selectedChat?._id] });
      
      const previousMessages = queryClient.getQueryData<Message[]>(["conversation", selectedChat?._id]);
      
      if (previousMessages) {
        const updatedMessages = previousMessages.map((msg) =>
          msg._id === messageId ? { ...msg, read: true } : msg
        );
        queryClient.setQueryData(["conversation", selectedChat?._id], updatedMessages);
      }
      
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(["conversation", selectedChat?._id], context.previousMessages);
      }
    },
  });

  const searchedUsers = (userSearch.data || []).filter(
    (item) => 
      item._id !== currentUser?.id && 
      followingQuery.data?.following.includes(item._id)
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.data && messages.data.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.data?.length]);

  // Mark unread messages as read when viewing conversation
  useEffect(() => {
    if (messages.data && selectedChat?._id && currentUser?.id) {
      const unreadMessages = messages.data.filter(
        (msg) => msg.sender?._id !== currentUser?.id && !msg.read && !markedAsReadRef.current.has(msg._id)
      );
      
      unreadMessages.forEach((msg) => {
        markedAsReadRef.current.add(msg._id);
        markAsRead.mutate(msg._id);
      });
    }
  }, [selectedChat?._id]);

  const handlePickImage = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'You need to allow access to your photos to share images and videos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        uploadMediaFile.mutate({
          uri: asset.uri,
          name: asset.fileName || `media-${Date.now()}`,
          type: asset.type === 'image' ? 'image/jpeg' : 'video/mp4',
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const getMessageDateLabel = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const messageDate = new Date(date);
    const isSameDay =
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear();

    const isYesterday =
      messageDate.getDate() === yesterday.getDate() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getFullYear() === yesterday.getFullYear();

    if (isSameDay) {
      return "Today";
    } else if (isYesterday) {
      return "Yesterday";
    } else if (messageDate.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000) {
      // If within the last 7 days
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return days[messageDate.getDay()];
    } else {
      // Older messages: show full date
      return messageDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: messageDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
    }
  };

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage: Message | undefined): boolean => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt);
    const previousDate = new Date(previousMessage.createdAt);
    
    return getMessageDateLabel(currentDate) !== getMessageDateLabel(previousDate);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {!selectedChat ? (
          <>
            <AppStackHeader title="Chat" detail="Connect with members and manage conversations." />
            <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: webTheme.border,
                backgroundColor: "rgba(255,255,255,0.03)",
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Feather name="search" size={16} color={webTheme.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search users..."
                placeholderTextColor="rgba(255,255,255,0.24)"
                style={{ ...type.regular, flex: 1, color: webTheme.text, fontSize: 14 }}
              />
            </View>

            {search.trim().length >= 2 ? (
              searchedUsers.length > 0 ? (
                <>
                  <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12 }}>Following</Text>
                  <ScrollView contentContainerStyle={{ gap: 10 }}>
                    {searchedUsers.map((item) => {
                      const avatar = getImageUrl(item.avatar);
                      return (
                        <Pressable
                          key={item._id}
                          onPress={() => setSelectedChat(item)}
                          style={{
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor: webTheme.border,
                            backgroundColor: webTheme.surface,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                              overflow: "hidden",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(214,60,71,0.16)",
                              flexShrink: 0,
                            }}
                          >
                            {avatar ? (
                              <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} />
                            ) : (
                              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                                {getInitials(item.name)}
                              </Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
                              {item.name}
                            </Text>
                            <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 12 }}>
                              Tap to start chat
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : (
                <View style={{ paddingVertical: 20, paddingHorizontal: 10 }}>
                  <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, textAlign: "center" }}>
                    No one in your following list matches "{search}"
                  </Text>
                  <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 12, textAlign: "center", marginTop: 8 }}>
                    You can only message people you follow
                  </Text>
                </View>
              )
            ) : null}

            <Text style={{ ...type.bold, color: webTheme.text, fontSize: 16 }}>Conversations</Text>
            <ScrollView
              refreshControl={
                <RefreshControl
                  refreshing={conversations.isFetching}
                  onRefresh={conversations.refetch}
                  tintColor={webTheme.red}
                />
              }
              contentContainerStyle={{ gap: 10 }}
            >
              {(conversations.data || []).length === 0 ? (
                <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, textAlign: "center", marginTop: 20 }}>
                  No conversations yet. Search to start chatting!
                </Text>
              ) : (
                (conversations.data || []).map((item) => {
                  const avatar = getImageUrl(item.user.avatar);
                  return (
                    <Pressable
                      key={item._id}
                      onPress={() => setSelectedChat(item.user)}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: webTheme.border,
                        backgroundColor: webTheme.surface,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          overflow: "hidden",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(214,60,71,0.16)",
                          flexShrink: 0,
                        }}
                      >
                        {avatar ? (
                          <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} />
                        ) : (
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                            {getInitials(item.user.name)}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
                          {item.user.name}
                        </Text>
                        <Text numberOfLines={1} style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 4 }}>
                          {item.lastMessage}
                        </Text>
                        <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 10, marginTop: 2 }}>
                          {formatConversationDate(item.timestamp)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
          </>
        ) : (
          <>
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 10,
                paddingBottom: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Pressable
                onPress={() => setSelectedChat(null)}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: webTheme.borderStrong,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Feather name="arrow-left" size={18} color={webTheme.text} />
              </Pressable>
              <HapticPressable 
                onPress={() => handleViewProfile(selectedChat?._id || '')}
                style={{ flex: 1 }}
              >
                <Text style={{ ...type.label, color: webTheme.accent, fontSize: 10 }}>ELEVATEX</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={{ ...type.h2, color: webTheme.text, fontSize: 26 }}>
                    {selectedChat.name}
                  </Text>
                  <Feather name="external-link" size={14} color={webTheme.muted} />
                </View>
              </HapticPressable>
            </View>
            
            <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
              {messages.error && (
                <View style={{ 
                  backgroundColor: "rgba(214,60,71,0.2)", 
                  borderRadius: 12, 
                  padding: 16, 
                  borderWidth: 1, 
                  borderColor: webTheme.red,
                  marginBottom: 10
                }}>
                  <Text style={{ ...type.bold, color: webTheme.red, marginBottom: 8 }}>
                    Error Loading Messages
                  </Text>
                  <Text style={{ ...type.regular, color: webTheme.text, fontSize: 12 }}>
                    {messages.error instanceof Error ? messages.error.message : String(messages.error)}
                  </Text>
                  <HapticPressable 
                    onPress={() => messages.refetch()}
                    style={{ marginTop: 12, paddingVertical: 8 }}
                  >
                    <Text style={{ ...type.bold, color: webTheme.red }}>Retry</Text>
                  </HapticPressable>
                </View>
              )}

            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
              refreshControl={
                <RefreshControl
                  refreshing={messages.isFetching}
                  onRefresh={messages.refetch}
                  tintColor={webTheme.red}
                />
              }
            >
              {(messages.data || []).length === 0 ? (
                <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, textAlign: "center", marginTop: 20 }}>
                  {messages.error ? (
                    <>
                      <Text style={{ color: webTheme.red, marginBottom: 8 }}>❌ Error loading messages</Text>
                      <Text style={{ fontSize: 12 }}>
                        {messages.error instanceof Error ? messages.error.message : String(messages.error)}
                      </Text>
                    </>
                  ) : messages.isLoading ? (
                    "Loading messages..."
                  ) : (
                    "No messages yet. Send one to start!"
                  )}
                </Text>
              ) : (
                (messages.data || []).map((message, idx) => {
                  const senderId = String(message.sender?._id || '');
                  const currentUserId = currentUser?.id || '';
                  const mine = senderId === currentUserId;
                  
                  console.log('Message:', {
                    id: message._id,
                    senderId,
                    currentUserId,
                    mine,
                    senderName: message.sender?.name
                  });
                  
                  const createdDate = new Date(message.createdAt);
                  const timeString = createdDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                  const dateLabel = getMessageDateLabel(createdDate);
                  const previousMessage = idx > 0 ? (messages.data as Message[])[idx - 1] : undefined;
                  const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
                  const canEdit = mine && !message.deletedAt && (Date.now() - new Date(message.createdAt).getTime()) < 30 * 60 * 1000;
                  const isEditing = editingMessageId === message._id;
                  
                  return (
                    <View key={message._id}>
                      {showDateSeparator && (
                        <View style={{ alignItems: "center", marginVertical: 12 }}>
                          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 11 }}>
                            {dateLabel}
                          </Text>
                        </View>
                      )}
                      
                      {message.deletedAt ? (
                        <View
                          style={{
                            alignSelf: mine ? "flex-end" : "flex-start",
                            maxWidth: "85%",
                          }}
                        >
                          <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 12, fontStyle: "italic" }}>
                            This message was deleted
                          </Text>
                        </View>
                      ) : (
                        <>
                          {isEditing ? (
                            <View
                              style={{
                                borderRadius: 18,
                                borderWidth: 1,
                                borderColor: webTheme.red,
                                backgroundColor: mine ? "rgba(214,60,71,0.16)" : "rgba(255,255,255,0.05)",
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                gap: 10,
                                alignSelf: mine ? "flex-end" : "flex-start",
                                width: "80%",
                              }}
                            >
                          <TextInput
                            value={editingContent}
                            onChangeText={setEditingContent}
                            placeholder="Edit message..."
                            placeholderTextColor="rgba(255,255,255,0.24)"
                            style={{ ...type.regular, color: webTheme.text, fontSize: 14, minHeight: 40 }}
                            multiline
                          />
                          <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                            <HapticPressable
                              onPress={() => {
                                editMessage.mutate({ messageId: message._id, content: editingContent });
                              }}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 8,
                                backgroundColor: webTheme.red,
                                alignItems: "center",
                              }}
                            >
                              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12 }}>Save</Text>
                            </HapticPressable>
                            <HapticPressable
                              onPress={() => setEditingMessageId(null)}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 8,
                                backgroundColor: "rgba(255,255,255,0.1)",
                                alignItems: "center",
                              }}
                            >
                              <Text style={{ ...type.regular, color: webTheme.text, fontSize: 12 }}>Cancel</Text>
                            </HapticPressable>
                          </View>
                        </View>
                      ) : (
                        <Pressable
                          onLongPress={() => {
                            setSelectedMessageForAction(message._id);
                          }}
                          onPress={() => {
                            if (selectedMessageForAction === message._id) {
                              setSelectedMessageForAction(null);
                            }
                          }}
                          style={{
                            borderRadius: 18,
                            backgroundColor: mine ? "rgba(214,60,71,0.16)" : "rgba(255,255,255,0.05)",
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            alignSelf: mine ? "flex-end" : "flex-start",
                            maxWidth: "85%",
                          }}
                        >
                          {message.content && (
                            <Text style={{ ...type.regular, color: webTheme.text, fontSize: 14, lineHeight: 22 }}>
                              {message.content}
                            </Text>
                          )}
                          
                          {message.media && message.media.length > 0 && (
                            <View style={{ gap: 8, marginTop: message.content ? 10 : 0 }}>
                              {message.media.map((file, idx) => {
                                if (file.type === 'image') {
                                  return (
                                    <Image
                                      key={idx}
                                      source={{ uri: file.url }}
                                      style={{ width: '100%', height: 200, borderRadius: 12 }}
                                    />
                                  );
                                } else if (file.type === 'video') {
                                  return (
                                    <View key={idx} style={{ width: '100%', height: 200, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                                      <Feather name="play-circle" size={48} color={webTheme.accent} />
                                      <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 11, marginTop: 8 }}>Video</Text>
                                    </View>
                                  );
                                } else {
                                  return (
                                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                      <Feather name="file" size={24} color={webTheme.accent} />
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ ...type.regular, color: webTheme.text, fontSize: 12 }} numberOfLines={1}>
                                          {file.filename || 'File'}
                                        </Text>
                                        {file.size && (
                                          <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 10, marginTop: 2 }}>
                                            {(file.size / 1024 / 1024).toFixed(1)} MB
                                          </Text>
                                        )}
                                      </View>
                                      <Feather name="download" size={16} color={webTheme.accent} />
                                    </View>
                                  );
                                }
                              })}
                            </View>
                          )}

                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: message.content || message.media ? 6 : 0 }}>
                            <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 10 }}>
                              {timeString}
                            </Text>
                            {message.edited && (
                              <Text style={{ ...type.regular, color: webTheme.faint, fontSize: 10 }}>(edited)</Text>
                            )}
                            {mine && (
                              <View style={{ flexDirection: "row", marginLeft: -1 }}>
                                <Feather name="check" size={9} color={message.read ? webTheme.accent : webTheme.faint} />
                                <Feather name="check" size={9} color={message.read ? webTheme.accent : webTheme.faint} style={{ marginLeft: -5 }} />
                              </View>
                            )}
                          </View>
                        </Pressable>
                      )}
                        </>
                      )}

                      {message.reactions && message.reactions.length > 0 && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8, paddingHorizontal: 4, alignSelf: mine ? "flex-end" : "flex-start" }}>
                          {message.reactions.filter(r => r.emoji && r.users && r.users.length > 0).map((reaction, idx) => {
                            const userReacted = Array.isArray(reaction.users) && currentUser?.id && reaction.users.includes(currentUser.id);
                            return (
                              <Pressable
                                key={idx}
                                onPress={() => reactToMessage.mutate({ messageId: message._id, emoji: reaction.emoji })}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 14,
                                  backgroundColor: userReacted ? webTheme.red : "rgba(255,255,255,0.1)",
                                  borderWidth: 1,
                                  borderColor: userReacted ? webTheme.red : "rgba(255,255,255,0.15)",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                <Text style={{ fontSize: 13 }}>{reaction.emoji}</Text>
                                <Text style={{ ...type.bold, color: userReacted ? "#fff" : webTheme.muted, fontSize: 11 }}>
                                  {reaction.users?.length || 0}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}

                      {selectedMessageForAction === message._id && mine && (
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            marginTop: 8,
                            paddingHorizontal: 4,
                            alignSelf: "flex-end",
                          }}
                        >
                          <HapticPressable
                            onPress={() => {
                              setEditingMessageId(message._id);
                              setEditingContent(message.content);
                            }}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: "rgba(255,255,255,0.08)",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Feather name="edit-2" size={12} color={webTheme.text} />
                            <Text style={{ ...type.regular, color: webTheme.text, fontSize: 11 }}>Edit</Text>
                          </HapticPressable>
                          <HapticPressable
                            onPress={() => {
                              Alert.alert(
                                "Delete Message",
                                "Are you sure you want to delete this message?",
                                [
                                  { text: "Cancel", onPress: () => {}, style: "cancel" },
                                  {
                                    text: "Delete",
                                    onPress: () => deleteMessage.mutate(message._id),
                                    style: "destructive",
                                  },
                                ]
                              );
                            }}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: "rgba(214,60,71,0.2)",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Feather name="trash-2" size={12} color={webTheme.red} />
                            <Text style={{ ...type.regular, color: webTheme.red, fontSize: 11 }}>Delete</Text>
                          </HapticPressable>
                          <HapticPressable
                            onPress={() => setReactionPickerMessageId(message._id)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: "rgba(255,255,255,0.08)",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Feather name="smile" size={12} color={webTheme.text} />
                            <Text style={{ ...type.regular, color: webTheme.text, fontSize: 11 }}>React</Text>
                          </HapticPressable>
                        </View>
                      )}

                      {reactionPickerMessageId === message._id && (
                        <View style={{ marginTop: 12, paddingHorizontal: 4, alignSelf: mine ? "flex-end" : "flex-start" }}>
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 8,
                              backgroundColor: "rgba(255,255,255,0.06)",
                              borderRadius: 12,
                              padding: 10,
                            }}
                          >
                            {emojis.map((emoji) => (
                              <Pressable
                                key={emoji}
                                onPress={() => {
                                  reactToMessage.mutate({ messageId: message._id, emoji });
                                  setReactionPickerMessageId(null);
                                }}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 8,
                                  borderRadius: 8,
                                  backgroundColor: "rgba(255,255,255,0.08)",
                                }}
                              >
                                <Text style={{ fontSize: 16 }}>{emoji}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {attachedMedia.length > 0 && (
              <View style={{ gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {attachedMedia.map((file, idx) => (
                    <View key={idx} style={{ position: 'relative', width: 80, height: 80 }}>
                      {file.type === 'image' ? (
                        <Image 
                          source={{ uri: file.url }} 
                          style={{ width: '100%', height: '100%', borderRadius: 8 }}
                        />
                      ) : (
                        <View style={{ width: '100%', height: '100%', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                          <Feather name="file" size={24} color={webTheme.accent} />
                        </View>
                      )}
                      <HapticPressable
                        onPress={() => setAttachedMedia(attachedMedia.filter((_, i) => i !== idx))}
                        style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: webTheme.red, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Feather name="x" size={16} color={webTheme.text} />
                      </HapticPressable>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {isUploading && (
              <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={webTheme.accent} />
                  <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: webTheme.accent }} />
                  </View>
                  <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 10 }}>{Math.round(uploadProgress)}%</Text>
                </View>
              </View>
            )}

            <View
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
              <HapticPressable
                onPress={handlePickImage}
                disabled={isUploading}
                style={{ opacity: isUploading ? 0.5 : 1 }}
              >
                <Feather name="image" size={18} color={webTheme.accent} />
              </HapticPressable>

              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255,255,255,0.24)"
                style={{ ...type.regular, flex: 1, color: webTheme.text, fontSize: 14 }}
                editable={!isUploading}
              />
              <HapticPressable
                onPress={() => sendMessage.mutate()}
                disabled={(!draft.trim() && attachedMedia.length === 0) || sendMessage.isPending || isUploading}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: ((!draft.trim() && attachedMedia.length === 0) || sendMessage.isPending || isUploading) ? "rgba(214,60,71,0.4)" : webTheme.red,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="send" size={16} color={webTheme.text} />
              </HapticPressable>
            </View>
          </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
