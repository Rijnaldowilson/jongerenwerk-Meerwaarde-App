// app/(tabs)/friends.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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


type ProfileMini = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  role: "jongere" | "jongerenwerker" | "manager" | "admin" | null;
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

/* -----------------------------
   Header (zelfde stijl als Profiel)
------------------------------ */
function FriendsHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Text style={styles.headerTitle}>Friends</Text>
      {/* Rechter knop optioneel (nu leeg, maar spacing klopt) */}
      <View style={{ width: 34, height: 34 }} />
    </View>
  );
}

export default function FriendsTab() {
  const router = useRouter();
  const auth = useAuth() as any;
  const user = auth?.user;

  const [tab, setTab] = useState<"volgend" | "ontdekken">("volgend");
  const [loading, setLoading] = useState(true);

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followingProfiles, setFollowingProfiles] = useState<ProfileMini[]>([]);
  const [suggestedProfiles, setSuggestedProfiles] = useState<ProfileMini[]>([]);

  const [query, setQuery] = useState("");

  const avatarFor = (p: ProfileMini) =>
    p.photo_url ||
    `https://i.pravatar.cc/120?img=${(Math.abs(hash(p.id)) % 70) + 1}`;

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        // 1) fetch follows
        const { data: followRows, error: fErr } = await supabase
          .from("follows")
          .select("followed")
          .eq("follower", user.id);

        if (fErr) throw fErr;

        const ids = new Set((followRows ?? []).map((r: any) => r.followed));
        if (!mounted) return;
        setFollowingIds(ids);

        // 2) load profiles for following
        if (ids.size > 0) {
          const { data: profs, error: pErr } = await supabase
            .from("profiles")
            .select("id, display_name, photo_url, role")
            .in("id", Array.from(ids))
            .order("display_name", { ascending: true });

          if (pErr) throw pErr;
          if (!mounted) return;
          setFollowingProfiles((profs as any[]) ?? []);
        } else {
          setFollowingProfiles([]);
        }

        // 3) suggestions
        const { data: sugg, error: sErr } = await supabase
          .from("profiles")
          .select("id, display_name, photo_url, role")
          .neq("id", user.id)
          .order("display_name", { ascending: true })
          .limit(50);

        if (sErr) throw sErr;

        const filtered = (sugg as any[]).filter((p) => !ids.has(p.id));
        if (!mounted) return;
        setSuggestedProfiles(filtered);
      } catch (e: any) {
        console.warn("friends load:", e?.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const onToggleFollow = async (profile: ProfileMini, wantFollow: boolean) => {
    if (!user?.id) return;

    try {
      if (wantFollow) {
        const { error } = await supabase.from("follows").insert({
          follower: user.id,
          followed: profile.id,
        });
        if (error && error.code !== "23505") throw error;

        setFollowingIds((prev) => new Set(prev).add(profile.id));
        setFollowingProfiles((prev) =>
          prev.some((p) => p.id === profile.id) ? prev : [profile, ...prev]
        );
        setSuggestedProfiles((prev) => prev.filter((p) => p.id !== profile.id));
      } else {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower", user.id)
          .eq("followed", profile.id);
        if (error) throw error;

        setFollowingIds((prev) => {
          const s = new Set(prev);
          s.delete(profile.id);
          return s;
        });
        setFollowingProfiles((prev) => prev.filter((p) => p.id !== profile.id));
        setSuggestedProfiles((prev) =>
          prev.some((p) => p.id === profile.id) ? prev : [profile, ...prev]
        );
      }
    } catch (e: any) {
      console.warn("follow toggle:", e?.message);
    }
  };

  const list = tab === "volgend" ? followingProfiles : suggestedProfiles;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => (p.display_name ?? "").toLowerCase().includes(q));
  }, [query, list]);

  const openProfile = (p: ProfileMini) => {
    router.push({ pathname: "/workers/[id]", params: { id: p.id } });
  };

  return (
    <View style={styles.container}>
      <FriendsHeader />

      {/* Tabs + search onder header */}
      <View style={styles.subHeader}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setTab("volgend")}
            style={[styles.tabBtn, tab === "volgend" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabTxt, tab === "volgend" && styles.tabTxtActive]}>
              Volgend
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("ontdekken")}
            style={[styles.tabBtn, tab === "ontdekken" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabTxt, tab === "ontdekken" && styles.tabTxtActive]}>
              Ontdekken
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color={MW.subtle} />
          <TextInput
            placeholder="Zoek mensen…"
            placeholderTextColor={MW.subtle}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ marginTop: 24 }}>
          <ActivityIndicator color={MW.green} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 140 }}
          renderItem={({ item }) => {
            const isFollowing = followingIds.has(item.id);
            return (
              <Pressable
                onPress={() => openProfile(item)}
                style={styles.card}
              >
                <Image source={{ uri: avatarFor(item) }} style={styles.avatar} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.display_name || "Gebruiker"}
                  </Text>
                  <Text style={styles.role}>
                    {item.role === "jongerenwerker" ? "Jongerenwerker" : "Jongere"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => onToggleFollow(item, !isFollowing)}
                  style={[
                    styles.followBtn,
                    isFollowing && styles.followBtnFollowing,
                  ]}
                >
                  <Text
                    style={[
                      styles.followTxt,
                      isFollowing && styles.followTxtFollowing,
                    ]}
                  >
                    {isFollowing ? "Volgend" : "Volg"}
                  </Text>
                </TouchableOpacity>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === "volgend"
                ? "Je volgt nog niemand."
                : "Geen suggesties gevonden."}
            </Text>
          }
        />
      )}
    </View>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MW.bg },

  /* Header exact als Profiel */
  header: {
    backgroundColor: MW.green,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  /* Subheader met tabs + search */
  subHeader: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: MW.border,
    backgroundColor: MW.bg,
    gap: 10,
  },

  tabsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: MW.soft,
    borderWidth: 1,
    borderColor: MW.border,
  },
  tabBtnActive: {
    backgroundColor: "#E9F6D9",
    borderColor: "rgba(101,177,10,0.35)",
  },
  tabTxt: { color: MW.subtle, fontWeight: "800" },
  tabTxtActive: { color: MW.text },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: MW.soft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 9 : 7,
    borderWidth: 1,
    borderColor: MW.border,
  },
  searchInput: { flex: 1, color: MW.text },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: MW.bg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: MW.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: MW.soft,
  },

  name: { color: MW.text, fontSize: 15, fontWeight: "800" },
  role: { color: MW.subtle, fontSize: 12, marginTop: 2 },

  followBtn: {
    backgroundColor: MW.green,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  followBtnFollowing: {
    backgroundColor: MW.soft,
    borderWidth: 1,
    borderColor: MW.border,
  },
  followTxt: { color: "#fff", fontWeight: "900" },
  followTxtFollowing: { color: MW.text },

  empty: {
    color: MW.subtle,
    textAlign: "center",
    marginTop: 30,
    fontWeight: "700",
  },
});

