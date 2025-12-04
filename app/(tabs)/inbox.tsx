// app/(tabs)/inbox.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
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

type ConversationRow = {
  id: string;
  youth_id: string;
  worker_id: string;
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
};

type InboxItem = {
  id: string;
  otherId: string;
  otherName: string;
  otherPhoto: string | null;
  otherRole: AppRole;
  lastMessage: string;
  lastAt: string | null;
  isDummy?: boolean;
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

/* -----------------------------
   Header
------------------------------ */
function InboxHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View>
        <Text style={styles.headerTitle}>Inbox</Text>
        <Text style={styles.headerSubtitle}>Privéberichten & DM’s</Text>
      </View>
      <View style={styles.headerIconWrap}>
        <Feather name="message-circle" size={18} color="#FFFFFF" />
      </View>
    </View>
  );
}

/* -----------------------------
   Helpers
------------------------------ */
function timeAgoISO(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "nu";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} u`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString("nl-NL");
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
function avatarFallback(id: string) {
  const idx = (Math.abs(hash(id)) % 70) + 1;
  return `https://i.pravatar.cc/120?img=${idx}`;
}

/* -----------------------------
   Component
------------------------------ */
export default function InboxTab() {
  const router = useRouter();
  const auth = useAuth() as any;
  const user = auth?.user;

  const role: AppRole =
    auth?.profile?.role ?? auth?.currentProfile?.role ?? auth?.role ?? null;

  const isManager = role === "manager"; // managers geen toegang tot DM

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [convos, setConvos] = useState<ConversationRow[]>([]);
  const [profilesById, setProfilesById] = useState<
    Record<string, ProfileMini>
  >({});

  const load = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // 1) alle gesprekken waar ik jeugd of jongerenwerker ben
      const { data: cData, error: cErr } = await supabase
        .from("conversations")
        .select(
          "id, youth_id, worker_id, created_at, last_message, last_message_at"
        )
        .or(`youth_id.eq.${user.id},worker_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (cErr) throw cErr;
      const rows = (cData as ConversationRow[]) ?? [];
      setConvos(rows);

      // 2) andere profielen ophalen
      const otherIds = Array.from(
        new Set(
          rows
            .flatMap((r) => [r.youth_id, r.worker_id])
            .filter((id) => id !== user.id)
        )
      );

      if (otherIds.length === 0) {
        setProfilesById({});
        return;
      }

      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, role")
        .in("id", otherIds);

      if (pErr) throw pErr;

      const map: Record<string, ProfileMini> = {};
      (pData as any[]).forEach((p) => {
        map[p.id] = {
          id: p.id,
          display_name: p.display_name ?? null,
          photo_url: p.photo_url ?? null,
          role: (p.role as AppRole) ?? null,
        };
      });
      setProfilesById(map);
    } catch (e: any) {
      console.warn("Inbox load error:", e?.message);
      setConvos([]);
      setProfilesById({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Realtime updates: nieuwe gesprekken / berichten
    const ch = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Echte items uit database
  const items: InboxItem[] = useMemo(() => {
    if (!user?.id) return [];
    return convos.map((c) => {
      const meIsYouth = c.youth_id === user.id;
      const otherId = meIsYouth ? c.worker_id : c.youth_id;
      const other = profilesById[otherId];

      return {
        id: c.id,
        otherId,
        otherName: other?.display_name || "Gebruiker",
        otherPhoto: other?.photo_url ?? null,
        otherRole: other?.role ?? null,
        lastMessage: c.last_message || "Nog geen bericht",
        lastAt: c.last_message_at || c.created_at,
      };
    });
  }, [convos, profilesById, user?.id]);

  // ✅ Dummy gesprekken alleen als er nog géén echte zijn
  const itemsWithDummy: InboxItem[] = useMemo(() => {
    if (items.length > 0) return items;

    const now = new Date().toISOString();

    return [
      {
        id: "dummy-1",
        otherId: "dummy-youth-1",
        otherName: "Test Jongere",
        otherPhoto: null,
        otherRole: "jongere",
        lastMessage: "Hey, hoe gaat het? 😊",
        lastAt: now,
        isDummy: true,
      },
      {
        id: "dummy-2",
        otherId: "dummy-worker-1",
        otherName: "Demo Jongerenwerker",
        otherPhoto: null,
        otherRole: "jongerenwerker",
        lastMessage: "Alles klaar voor de pilot, bedankt! 💚",
        lastAt: now,
        isDummy: true,
      },
    ];
  }, [items]);

  if (isManager) {
    return (
      <View style={styles.container}>
        <InboxHeader />
        <View style={styles.lockedWrap}>
          <Feather name="lock" size={22} color={MW.subtle} />
          <Text style={styles.lockedTitle}>Geen toegang</Text>
          <Text style={styles.lockedText}>
            Managers hebben geen toegang tot privéberichten (AVG).
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <InboxHeader />

      {loading ? (
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <ActivityIndicator color={MW.green} />
          <Text style={styles.loadingText}>Berichten ophalen...</Text>
        </View>
      ) : (
        <FlatList
          data={itemsWithDummy}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 140 }}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          renderItem={({ item }) => {
            const photo = item.otherPhoto || avatarFallback(item.otherId);
            const isDummy = !!item.isDummy;

            return (
              <Pressable
                onPress={() => {
                  // Dummy gesprekken zijn alleen voor de look & feel → niet klikbaar
                  if (isDummy) return;

                  router.push({
                    pathname: "../messages/[id]" as const, // route naar chat
                    params: {
                      id: item.id,
                      title: item.otherName, // 👈 naam meegeven aan chat
                    },
                  });
                }}
                style={({ pressed }) => [
                  styles.card,
                  pressed &&
                    !isDummy && {
                      opacity: 0.8,
                      transform: [{ scale: 0.99 }],
                    },
                  isDummy && styles.cardDummy,
                ]}
              >
                <View style={styles.avatarWrap}>
                  <Image source={{ uri: photo }} style={styles.avatar} />
                  {item.otherRole === "jongerenwerker" && (
                    <View style={styles.roleBadge}>
                      <Feather name="user" size={10} color="#166534" />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text numberOfLines={1} style={styles.name}>
                      {item.otherName}
                    </Text>

                    <View style={styles.timeWrap}>
                      {isDummy && <View style={styles.unreadDot} />}
                      <Text style={styles.time}>
                        {timeAgoISO(item.lastAt)}
                      </Text>
                    </View>
                  </View>

                  <Text numberOfLines={1} style={styles.lastMsg}>
                    {item.lastMessage}
                  </Text>

                  <View style={styles.bottomRow}>
                    {item.otherRole === "jongerenwerker" && (
                      <View style={styles.workerPill}>
                        <Text style={styles.workerPillTxt}>Jongerenwerker</Text>
                      </View>
                    )}

                    {isDummy && (
                      <View style={styles.demoPill}>
                        <Feather name="info" size={10} color="#1d4ed8" />
                        <Text style={styles.demoPillTxt}>Demo voor pilot</Text>
                      </View>
                    )}
                  </View>
                </View>

                {!isDummy && (
                  <Feather name="chevron-right" size={18} color={MW.subtle} />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            // eigenlijk niet meer gebruikt door de dummy items
            <View style={styles.emptyWrap}>
              <Feather name="message-circle" size={26} color={MW.subtle} />
              <Text style={styles.emptyTitle}>Nog geen gesprekken</Text>
              <Text style={styles.emptyText}>
                Klik in de feed op een jongerenwerker om een DM te starten.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MW.bg },

  header: {
    backgroundColor: MW.green,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: MW.subtle,
    fontWeight: "600",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: MW.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: MW.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardDummy: {
    opacity: 0.88,
  },

  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    backgroundColor: MW.soft,
  },
  roleBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#BBF7D0",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(22,101,52,0.35)",
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: MW.text,
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  time: {
    fontSize: 11,
    fontWeight: "800",
    color: MW.subtle,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MW.blue,
  },

  lastMsg: {
    marginTop: 3,
    fontSize: 13,
    color: MW.sub,
    fontWeight: "600",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },

  workerPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#E9F8E2",
    borderWidth: 1,
    borderColor: "rgba(101,177,10,0.25)",
  },
  workerPillTxt: {
    fontSize: 10,
    fontWeight: "800",
    color: MW.green,
  },

  demoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
  },
  demoPillTxt: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1D4ED8",
  },

  emptyWrap: {
    marginTop: 40,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "900",
    color: MW.text,
  },
  emptyText: {
    marginTop: 4,
    fontSize: 13,
    color: MW.subtle,
    textAlign: "center",
    fontWeight: "600",
  },

  lockedWrap: {
    marginTop: 50,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  lockedTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "900",
    color: MW.text,
  },
  lockedText: {
    marginTop: 4,
    fontSize: 13,
    color: MW.subtle,
    textAlign: "center",
    fontWeight: "600",
  },
});
