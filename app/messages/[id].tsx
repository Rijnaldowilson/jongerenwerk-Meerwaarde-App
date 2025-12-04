// app/messages/[id].tsx
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../auth/context";
import { supabase } from "../../lib/supabase";

const MW = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  bubbleMe: "#DCFCE7",
  bubbleOther: "#F1F5F9",
  border: "rgba(0,0,0,0.06)",
  text: "#0A0A0A",
  sub: "#64748B",
  subtle: "#94A3B8",
  accent: "#65B10A",
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  deleted_at: string | null;
};

export default function MessageThreadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth() as any;

  const params = useLocalSearchParams<{ id?: string; title?: string }>();
  const conversationId = params.id as string | undefined;
  const conversationTitle = params.title as string | undefined;

  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [input, setInput] = React.useState("");

  React.useEffect(() => {
    if (!conversationId) {
      Alert.alert("Fout", "Geen gesprek gevonden.");
      router.back();
    }
  }, [conversationId, router]);

  // ========== LOAD ==========
  const loadMessages = React.useCallback(
    async (silent = false) => {
      if (!conversationId) return;
      if (!silent) setLoading(true);

      try {
        const { data, error } = await supabase
          .from("messages")
          .select(
            "id, conversation_id, sender_id, body, created_at, deleted_at"
          )
          .eq("conversation_id", conversationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setMessages((data || []) as any);
      } catch (e: any) {
        console.log("load messages error", e);
        Alert.alert("Fout", e?.message || "Kon de berichten niet laden.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [conversationId]
  );

  React.useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // ========== REALTIME ==========
  React.useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-conv-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadMessages(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages]);

  // ========== SEND ==========
  const handleSend = async () => {
    if (!conversationId || !user?.id) return;
    const text = input.trim();
    if (!text) return;

    try {
      setSending(true);

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: text,
      });

      if (error) throw error;

      setInput("");
    } catch (e: any) {
      console.log("send message error", e);
      Alert.alert("Fout", e?.message || "Bericht versturen mislukt.");
    } finally {
      setSending(false);
    }
  };

  // ========== DELETE (soft) ==========
  const handleDelete = async (msg: MessageRow) => {
    if (msg.sender_id !== user?.id) return;

    Alert.alert(
      "Bericht verwijderen",
      "Weet je zeker dat je dit bericht wil verwijderen?",
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijderen",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("messages")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", msg.id);

              if (error) throw error;
              loadMessages(true);
            } catch (e: any) {
              console.log("delete message error", e);
              Alert.alert(
                "Fout",
                e?.message || "Kon het bericht niet verwijderen."
              );
            }
          },
        },
      ]
    );
  };

  // ========== RENDER ==========
  const renderMessage = ({ item }: { item: MessageRow }) => {
    const isMine = item.sender_id === user?.id;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={() => {
          if (isMine) handleDelete(item);
        }}
        style={[
          styles.msgRow,
          { justifyContent: isMine ? "flex-end" : "flex-start" },
        ]}
      >
        <View
          style={[
            styles.msgBubble,
            isMine ? styles.msgBubbleMe : styles.msgBubbleOther,
          ]}
        >
          <Text style={styles.msgText}>{item.body}</Text>
          <Text style={styles.msgTime}>
            {new Date(item.created_at).toLocaleTimeString("nl-NL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const title = conversationTitle || "Gesprek";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: MW.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            paddingBottom: 10,
            paddingHorizontal: 16,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={24} color={MW.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={MW.accent} />
          <Text style={styles.loadingText}>Berichten laden...</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 12,
          }}
        />
      )}

      {/* Input */}
      <View
        style={[
          styles.inputBar,
          {
            paddingBottom:
              Platform.OS === "ios" ? insets.bottom || 8 : insets.bottom,
          },
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder="Typ een bericht..."
          placeholderTextColor={MW.subtle}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !input.trim()}
          style={[
            styles.sendBtn,
            (!input.trim() || sending) && { opacity: 0.5 },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: MW.border,
    backgroundColor: MW.bg,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: MW.text,
    paddingHorizontal: 8,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 8, color: MW.subtle, fontWeight: "700" },

  msgRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  msgBubble: {
    maxWidth: "80%",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MW.border,
  },
  msgBubbleMe: {
    backgroundColor: MW.bubbleMe,
    borderBottomRightRadius: 2,
  },
  msgBubbleOther: {
    backgroundColor: MW.bubbleOther,
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: 13,
    color: MW.text,
    fontWeight: "500",
  },
  msgTime: {
    fontSize: 10,
    color: MW.subtle,
    marginTop: 4,
    textAlign: "right",
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: MW.border,
    backgroundColor: "#F8FAFC",
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: MW.text,
    borderWidth: 1,
    borderColor: MW.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: MW.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
