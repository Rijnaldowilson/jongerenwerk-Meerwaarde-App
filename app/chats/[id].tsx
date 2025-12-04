// app/chat/[id].tsx
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../auth/context";
import { supabase } from "../../lib/supabase";

type AppRole = "jongere" | "jongerenwerker" | "manager" | "admin" | null;

type ProfileMini = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  role: AppRole;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_by: string[] | null;
};

type ConversationRow = {
  id: string;
  youth_id: string;
  worker_id: string;
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
  youth?: ProfileMini | null;
  worker?: ProfileMini | null;
};

const MW = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  soft: "#F6FBF2",
  border: "rgba(0,0,0,0.06)",
  text: "#0A0A0A",
  sub: "#5A6572",
  subtle: "#94A3B8",
  green: "#65B10A",
  blue: "#4C80C1",
  red: "#EF4444",
};

function timeAgoISO(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "nu";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} u`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString();
}

/* -----------------------------
   MW Header
------------------------------ */
function ChatHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.9}>
        <Feather name="chevron-left" size={24} color="#fff" />
      </TouchableOpacity>

      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>

      <View style={{ width: 34, height: 34 }} />
    </View>
  );
}

/* -----------------------------
   Bubble
------------------------------ */
function Bubble({
  mine,
  text,
  time,
}: {
  mine: boolean;
  text: string;
  time: string;
}) {
  return (
    <View style={[styles.bubbleRow, mine ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, mine ? { color: "#fff" } : { color: MW.text }]}>
          {text}
        </Text>
        <Text style={[styles.bubbleTime, mine ? { color: "rgba(255,255,255,0.8)" } : { color: MW.subtle }]}>
          {time}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const convoId = id;

  const auth = useAuth() as any;
  const user = auth?.user;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");

  const listRef = useRef<FlatList<MessageRow>>(null);

  const otherProfile = useMemo(() => {
    if (!conversation || !user?.id) return null;
    const meIsYouth = conversation.youth_id === user.id;
    return meIsYouth ? conversation.worker : conversation.youth;
  }, [conversation, user?.id]);

  const title = otherProfile?.display_name || "Chat";

  const loadConversationAndMessages = async () => {
    if (!convoId || !user?.id) return;
    setLoading(true);
    try {
      // 1) conversation + joins
      const { data: c, error: cErr } = await supabase
        .from("conversations")
        .select(
          `
          id, youth_id, worker_id, created_at, last_message, last_message_at,
          youth:profiles!conversations_youth_id_fkey ( id, display_name, photo_url, role ),
          worker:profiles!conversations_worker_id_fkey ( id, display_name, photo_url, role )
        `
        )
        .eq("id", convoId)
        .single();
      if (cErr) throw cErr;
      setConversation(c as any);

      // 2) messages
      const { data: m, error: mErr } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at, read_by")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: true });
      if (mErr) throw mErr;
      setMessages((m as any[]) ?? []);

      // scroll to bottom
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: false });
      });
    } catch (e: any) {
      console.warn("chat load:", e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversationAndMessages();

    if (!convoId) return;

    // realtime on messages in this convo
    const ch = supabase
      .channel(`chat-${convoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convoId}`,
        },
        (payload) => {
          const msg = payload.new as MessageRow;
          setMessages((prev) => {
            if (prev.some((p) => p.id === msg.id)) return prev;
            return [...prev, msg];
          });

          requestAnimationFrame(() => {
            listRef.current?.scrollToEnd({ animated: true });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convoId, user?.id]);

  const sendMessage = async () => {
    if (!user?.id || !convoId) return;
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setText("");

    try {
      // insert message
      const { data: ins, error: insErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: convoId,
          sender_id: user.id,
          body,
          read_by: [user.id],
        })
        .select("*")
        .single();

      if (insErr) throw insErr;

      // update conversation last_message
      await supabase
        .from("conversations")
        .update({
          last_message: body,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", convoId);

      // optimistic add (realtime komt ook binnen, maar dit voelt sneller)
      setMessages((prev) => [...prev, ins as any]);

      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (e: any) {
      console.warn("send error:", e?.message);
      // rollback text for user
      setText(body);
    } finally {
      setSending(false);
    }
  };

  if (!user?.id) {
    return (
      <View style={styles.container}>
        <ChatHeader title="Chat" onBack={() => router.back()} />
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <Text style={{ color: MW.subtle, fontWeight: "700" }}>
            Log in om te chatten.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChatHeader title={title} onBack={() => router.back()} />

      {loading ? (
        <View style={{ marginTop: 24 }}>
          <ActivityIndicator color={MW.green} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 12 }}
          renderItem={({ item }) => {
            const mine = item.sender_id === user.id;
            return (
              <Bubble
                mine={mine}
                text={item.body}
                time={timeAgoISO(item.created_at)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={{ marginTop: 30, alignItems: "center" }}>
              <Text style={{ color: MW.subtle, fontWeight: "700" }}>
                Nog geen berichten.
              </Text>
              <Text style={{ color: MW.subtle, marginTop: 4 }}>
                Zeg hallo 👋
              </Text>
            </View>
          }
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}

      {/* Composer */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}
      >
        <View style={styles.composerWrap}>
          <TextInput
            style={styles.input}
            placeholder="Typ een bericht…"
            placeholderTextColor={MW.subtle}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />

          <Pressable
            onPress={sendMessage}
            disabled={!text.trim() || sending}
            style={[
              styles.sendBtn,
              (!text.trim() || sending) && { opacity: 0.5 },
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Feather name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* -----------------------------
   Styles (Meerwaarde)
------------------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MW.bg,
  },

  header: {
    backgroundColor: MW.green,
    paddingHorizontal: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    marginHorizontal: 8,
  },

  bubbleRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: MW.green,
    borderColor: "rgba(101,177,10,0.9)",
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: MW.soft,
    borderColor: MW.border,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  bubbleTime: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
    alignSelf: "flex-end",
  },

  composerWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: MW.border,
    backgroundColor: MW.bg,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: MW.border,
    backgroundColor: MW.soft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    color: MW.text,
    fontSize: 15,
    fontWeight: "600",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: MW.green,
    alignItems: "center",
    justifyContent: "center",
  },
});
