// app/(tabs)/crisis.tsx
import { Feather } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../auth/context";
import { supabase } from "../../lib/supabase";

const MW = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  border: "rgba(0,0,0,0.06)",
  text: "#0A0A0A",
  sub: "#64748B",
  subtle: "#94A3B8",
  red: "#EF4444",
  green: "#16A34A",
};

type EmergencyRow = {
  id: string;
  user_id: string;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  location_label: string | null;
  audio_path: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  profiles: {
    display_name: string | null;
    role: string | null;
  } | null;
};

export default function CrisisTab() {
  const { user, isManager, isAdmin } = useAuth();
  const isMgmt = isManager || isAdmin;

  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<EmergencyRow[]>([]);

  const insets = useSafeAreaInsets();

  // ❌ Iedereen behalve manager/admin gaat weg
  if (!isMgmt) {
    return <Redirect href="/(tabs)/workspace" />;
  }

  const loadData = React.useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("emergency_logs")
        .select(
          "id, user_id, description, status, created_at, resolved_at, location_label, audio_path, gps_lat, gps_lng, profiles:profiles!emergency_logs_user_id_fkey(display_name, role)"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setItems(data as any);
    } catch (e: any) {
      console.log("load emergency logs error", e);
      Alert.alert("Fout", e?.message || "Kon de noodmeldingen niet laden.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const renderItem = ({ item }: { item: EmergencyRow }) => {
    const isResolved = item.status === "resolved";
    const workerName =
      item.profiles?.display_name || "Onbekende jongerenwerker";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{workerName}</Text>
          <View
            style={[
              styles.statusPill,
              isResolved ? styles.statusResolved : styles.statusOpen,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                isResolved ? styles.statusResolvedText : styles.statusOpenText,
              ]}
            >
              {isResolved ? "Afgehandeld" : "Open"}
            </Text>
          </View>
        </View>

        <Text style={styles.cardMeta}>
          {new Date(item.created_at).toLocaleString("nl-NL", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>

        {item.location_label && (
          <Text style={styles.cardLocation}>{item.location_label}</Text>
        )}

        <Text style={styles.cardDesc}>
          {item.description || "Geen omschrijving."}
        </Text>

        {item.audio_path && (
          <Text style={styles.audioHint}>
            🎧 Opname opgeslagen ({item.audio_path})
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crisis-overzicht</Text>
        <TouchableOpacity onPress={loadData}>
          <Feather name="refresh-ccw" size={20} color={MW.subtle} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={MW.red} />
          <Text style={styles.loadingText}>Noodmeldingen laden...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Geen noodmeldingen gevonden.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MW.bg },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: MW.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: MW.text,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 8, color: MW.subtle, fontWeight: "700" },
  emptyText: { color: MW.subtle, fontWeight: "700" },
  card: {
    marginTop: 12,
    backgroundColor: MW.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: MW.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "900", color: MW.text },
  cardMeta: {
    marginTop: 4,
    fontSize: 11,
    color: MW.subtle,
    fontWeight: "700",
  },
  cardLocation: {
    marginTop: 4,
    fontSize: 12,
    color: MW.sub,
    fontWeight: "700",
  },
  cardDesc: {
    marginTop: 8,
    fontSize: 12,
    color: MW.text,
    fontWeight: "700",
  },
  audioHint: {
    marginTop: 8,
    fontSize: 11,
    color: MW.subtle,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusOpen: { backgroundColor: "#FEF2F2" },
  statusResolved: { backgroundColor: "#ECFDF3" },
  statusPillText: { fontSize: 11, fontWeight: "900" },
  statusOpenText: { color: MW.red },
  statusResolvedText: { color: MW.green },
});
