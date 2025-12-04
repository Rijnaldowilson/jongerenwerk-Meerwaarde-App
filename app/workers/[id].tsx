import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type AppRole =
  | "jongerenwerker"
  | "manager"
  | "jongere"
  | "admin"
  | "worker"
  | "youth"
  | null;

type Worker = {
  id: string;
  name: string;
  role?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
};

const MW = {
  green: "#65B10A",
  blue: "#4C80C1",
  darkGreen: "#006836",
  bg: "#FFFFFF",
  text: "#111111",
  subtle: "#6B7280",
  card: "#F7F8FA",
  line: "#E5E7EB",
};

function isValidUUID(id?: string | null): id is string {
  return (
    !!id &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      id
    )
  );
}

function avatarFallback(id?: string, name?: string | null) {
  const base = id || name || "default";
  let hash = 0;
  for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) | 0;
  const idx = (Math.abs(hash) % 70) + 1;
  return `https://i.pravatar.cc/200?img=${idx}`;
}

export default function WorkerProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ✅ params-safe
  const idParam = params?.id;
  const id = useMemo(() => {
    if (typeof idParam === "string") return idParam;
    if (Array.isArray(idParam)) return idParam[0];
    return null;
  }, [idParam]);

  const [w, setW] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!id || !isValidUUID(id)) {
        setLoading(false);
        setW(null);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, display_name, photo_url, bio, phone, email, instagram")
        .eq("id", id)
        .maybeSingle();

      if (!alive) return;

      if (error || !data) {
        setW(null);
        setLoading(false);
        return;
      }

      const mapped: Worker = {
        id: data.id,
        name: data.display_name || "Jongerenwerker",
        role: data.role,
        photo_url: data.photo_url,
        bio: data.bio,
        phone: (data as any).phone ?? null,
        email: (data as any).email ?? null,
        instagram: (data as any).instagram ?? null,
      };

      setW(mapped);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: MW.bg }]}>
        <ActivityIndicator color={MW.green} />
      </View>
    );
  }

  // ✅ MW-stijl fallback (geen wit scherm meer)
  if (!w) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={26} color={MW.darkGreen} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Jongerenwerker</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerContent}>
          <View style={styles.notFoundIcon}>
            <Feather name="user-x" size={30} color={MW.blue} />
          </View>
          <Text style={styles.notFoundTitle}>Profiel niet gevonden</Text>
          <Text style={styles.notFoundText}>
            Deze jongerenwerker heeft nog geen profiel of is verwijderd.
          </Text>

          <TouchableOpacity onPress={() => router.back()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnTxt}>Terug</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const avatarUrl = w.photo_url || avatarFallback(w.id, w.name);

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ title: w.name, headerShown: false }} />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
        {/* Header / Kapla balk vibe */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={26} color={MW.darkGreen} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{w.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.topCard}>
          <View style={styles.avatarRing}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          </View>

          <Text style={styles.name}>{w.name}</Text>

          {!!w.role && (
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>
                {w.role === "jongerenwerker" ? "Jongerenwerker" : w.role}
              </Text>
            </View>
          )}

          {!!w.bio && <Text style={styles.bio}>{w.bio}</Text>}

          <TouchableOpacity
            onPress={() =>
              Alert.alert("Binnenkort", "Vriend worden koppelen we straks aan Supabase.")
            }
            style={styles.friendBtn}
          >
            <Feather name="user-plus" size={16} color="#fff" />
            <Text style={styles.friendBtnTxt}>Vriend worden</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsWrap}>
          {!!w.phone && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${w.phone}`)}
              style={styles.actionBtn}
            >
              <Feather name="phone" size={16} color={MW.blue} />
              <Text style={styles.actionTxt}>Bel</Text>
            </TouchableOpacity>
          )}

          {!!w.email && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${w.email}`)}
              style={styles.actionBtn}
            >
              <Feather name="mail" size={16} color={MW.blue} />
              <Text style={styles.actionTxt}>E-mail</Text>
            </TouchableOpacity>
          )}

          {!!w.instagram && (
            <TouchableOpacity
              onPress={() => Linking.openURL(w.instagram!)}
              style={styles.actionBtn}
            >
              <Feather name="instagram" size={16} color={MW.blue} />
              <Text style={styles.actionTxt}>Instagram</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MW.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    height: 56,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomColor: MW.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: MW.bg,
  },
  backBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    color: MW.darkGreen,
    fontSize: 16,
    fontWeight: "800",
  },

  topCard: {
    marginTop: 14,
    marginHorizontal: 14,
    backgroundColor: MW.card,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: MW.line,
  },

  avatarRing: {
    width: 122,
    height: 122,
    borderRadius: 61,
    borderWidth: 4,
    borderColor: MW.green,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#eee",
  },

  name: { fontSize: 22, fontWeight: "900", color: MW.darkGreen, marginTop: 10 },

  rolePill: {
    marginTop: 6,
    backgroundColor: "#EAF5FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#D6E8FF",
  },
  roleText: { color: MW.blue, fontSize: 12, fontWeight: "800" },

  bio: {
    fontSize: 15,
    color: MW.text,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
  },

  friendBtn: {
    marginTop: 14,
    backgroundColor: MW.blue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  friendBtnTxt: { color: "#fff", fontWeight: "800" },

  actionsWrap: {
    marginTop: 12,
    marginHorizontal: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: MW.bg,
    borderWidth: 1,
    borderColor: MW.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionTxt: { color: MW.text, fontWeight: "800" },

  // Not-found MW style
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  notFoundIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#EAF5FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D6E8FF",
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: MW.darkGreen,
    marginTop: 6,
  },
  notFoundText: {
    color: MW.subtle,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: MW.green,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "900" },
});
