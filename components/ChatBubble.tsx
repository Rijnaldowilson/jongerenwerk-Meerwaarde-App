// app/chat/[id].tsx
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth/context";
import { supabase } from "../lib/supabase";

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
};

function timeAgoISO(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString().slice(0, 5);
}

function avatarFallback(id: string) {
  const h = Math.abs(hash(id));
  const idx = (h % 70) + 1;
  return `https://i.pravatar.cc/120?img=${idx}`;
}
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/* -----------------------------
   MW Header
------------------------------ */
function ChatHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Feather name="chevron-left" size={24} color="#fff" />
      </Pressable>
      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>
      <View style={{ width: 34, height: 34 }} />
    </View>
  );
}

/* -----------------------------
   Bubble (MW stijl)
------------------------------ */
function Bubble({
  mine,
  text,
  time,
  avatar,
}: {
  mine: boolean;
  text: string;
  time: string;
  avatar: string | null | undefined;
}) {
  return (
    <View style={[styles.bubbleRow, mine ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }]}>
      {!mine && (
        <Image
          source={{ uri: avatar || avatarFallback("other") }}
          style={styles.bubbleAvatar}
        />
      )}

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
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const convId = typeof id === "string" ? id : "";
  const { user, role } = useAuth();
  const meId = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [otherProfile, setOtherProfile] = useState<ProfileMini | null>(null);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<MessageRow>>(null);

  const title = otherProfile?.display_name || "Chat";

  // Managers mogen nooit DM
  if (role === "manager") {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={{ color: MW.text, fontWeight: "700" }}>
          Managers hebben geen toegang tot DM’s.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backCta}>
          <Text style={styles.backCtaTxt}>Terug</Text>
        </Pressable>
      </View>
    );
  }

  useEffect(() => {
    if (!meId || !convId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadAll = async () => {
      setLoading(true);
      try {
        // 1) conversation
        const { data: c, error: cErr } = await supabase
          .from("conversations")
          .select("id, youth_id, worker_id, created_at, last_message, last_message_at")
          .eq("id", convId)
          .single();

        if (cErr) throw cErr;
        if (!mounted) return;
        setConversation(c as any);

        const otherId = c.youth_id === meId ? c.worker_id : c.youth_id;

        // 2) other profile
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("id, display_name, photo_url, role")
          .eq("id", otherId)
          .single();

        if (!mounted) return;
        if (pErr) {
          setOtherProfile(null);
        } else {
          setOtherProfile(p as any);
        }

        // 3) messages
        const { data: m, error: mErr } = await supabase
          .from("messages")
          .select("id, conversation_id, sender_id, body, created_at, read_by")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true });

        if (mErr) throw mErr;
        if (!mounted) return;
        setMessages((m as any[]) ?? []);

        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated: false });
        });
      } catch (e: any) {
        console.warn("chat load error:", e?.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAll();

    // realtime insert
    const ch = supabase
      .channel(`chat-${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
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
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [meId, convId]);

  const canSend = useMemo(
    () => !!composer.trim() && !!meId && !!convId && !sending,
    [composer, meId, convId, sending]
  );

  const onSend = async () => {
    if (!canSend || !meId) return;
    const body = composer.trim();
    setComposer("");
    setSending(true);

    try {
      const { data: ins, error: insErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_id: meId,
          body,
          read_by: [meId],
        })
        .select("*")
        .single();

      if (insErr) throw insErr;

      // update convo last message
      await supabase
        .from("conversations")
        .update({
          last_message: body,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", convId);

      // optimistic add (realtime komt ook)
      setMessages((prev) => [...prev, ins as any]);

      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (e: any) {
      console.warn("send error:", e?.message);
      setComposer(body);
    } finally {
      setSending(false);
    }
  };

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
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 12 }}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === meId;
            return (
              <Bubble
                mine={mine}
                text={item.body}
                time={timeAgoISO(item.created_at)}
                avatar={mine ? null : otherProfile?.photo_url}
              />
            );
          }}
          ListEmptyComponent={
            <View style={{ marginTop: 30, alignItems: "center" }}>
              <Text style={{ color: MW.subtle, fontWeight: "700" }}>
                Nog geen berichten.
              </Text>
            </View>
          }
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}
      >
        <View style={[styles.composerRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            value={composer}
            onChangeText={setComposer}
            placeholder="Typ een bericht…"
            placeholderTextColor={MW.subtle}
            style={styles.input}
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={[styles.sendBtn, !canSend && { opacity: 0.5 }]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendTxt}>Stuur</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MW.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

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
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 8,
  },
  bubbleAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: MW.soft,
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

  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    backgroundColor: MW.green,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 62,
  },
  sendTxt: { color: "#fff", fontWeight: "900" },

  backCta: {
    marginTop: 10,
    backgroundColor: MW.blue,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backCtaTxt: { color: "#fff", fontWeight: "800" },
});
