// app/(tabs)/tape.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ========= HUISSTIJL ========= */
const BRAND = {
  white: "#FFFFFF",
  text: "#0B0B0B",
  subtext: "#3B3B3B",
  border: "rgba(0,0,0,0.08)",
  blue: "#4C80C1",
  green: "#65B10A",
  darkGreen: "#006836",
  amber: "#F59E0B",
  red: "#EF4444",
  sky: "#0EA5E9",
  bg: "#F7FAFF",
};

/* ========= KEYS delen met jouw bestaande tabs ========= */
const K_ENTRIES = "@rapportage_entries_v4"; // uit rapportage.tsx
const K_ROOMS   = "@mw_casus_rooms_v1";    // uit casus.tsx

/* ========= TYPES ========= */
type PillarKey = "weerbaarheid"|"talent"|"verbinding"|"burgerschap"|"zorg"|"werk_inkomen";
type AreaType = "school"|"ambulant";
type MoodKey = "very_pos"|"pos"|"neutral"|"neg";

type Entry = {
  id: string;
  pillar: PillarKey;
  areaType: AreaType;
  areaName: string;
  notes?: string;
  count: number;
  dateISO: string;
  mood?: MoodKey;
};

type Room = {
  id: string;
  alias: string;
  schoolOrArea: string;
  pillars: PillarKey[];
  status: "open"|"await"|"closed";
  partners: any[];
  updatedAtISO: string;
};

/* ========= CONSTANTS ========= */
const PILLARS: Record<PillarKey, { label: string; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  weerbaarheid:     { label: "Weerbaarheid",       color: BRAND.green,     icon: "shield-check" },
  talent:           { label: "Talentontwikkeling", color: BRAND.blue,      icon: "star-three-points" },
  verbinding:       { label: "Verbinding",         color: BRAND.darkGreen, icon: "handshake" },
  burgerschap:      { label: "Burgerschap",        color: BRAND.sky,       icon: "town-hall" },
  zorg:             { label: "Zorg & Veiligheid",  color: BRAND.amber,     icon: "account-heart" },
  werk_inkomen:     { label: "Werk & Inkomen",     color: BRAND.red,       icon: "briefcase" },
};

const MOODS: Record<MoodKey, string> = {
  very_pos: "TOP",
  pos: "GOED",
  neutral: "OKÃ‰",
  neg: "AANDACHT",
};

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

/* ========= HELPERS ========= */
async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
async function saveJSON<T>(key: string, val: T) { try { await AsyncStorage.setItem(key, JSON.stringify(val)); } catch {} }

function shortDate(iso: string) { try { return new Date(iso).toLocaleDateString(); } catch { return ""; } }

/* ========= MAIN ========= */
export default function TapeTab() {
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [feed, setFeed] = React.useState<Array<{ type: "entry"|"room"; data: Entry|Room }>>([]);

  // Quick add modal
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [qPillar, setQPillar] = React.useState<PillarKey>("weerbaarheid");
  const [qAreaName, setQAreaName] = React.useState("");
  const [qCount, setQCount] = React.useState("1");
  const [qNotes, setQNotes] = React.useState("");

  React.useEffect(() => {
    (async () => {
      const e = await loadJSON<Entry[]>(K_ENTRIES, []);
      const r = await loadJSON<Room[]>(K_ROOMS, []);
      setEntries(e);
      setRooms(r);
    })();
  }, []);

  React.useEffect(() => {
    // Mix: recentste entries + rooms (nieuwste eerst), in â€œreelâ€-stijl
    const cards: Array<{ type: "entry"|"room"; data: any; ts: number }> = [];
    for (const e of entries) cards.push({ type: "entry", data: e, ts: new Date(e.dateISO).getTime() });
    for (const r of rooms)   cards.push({ type: "room",  data: r, ts: new Date(r.updatedAtISO).getTime() });
    cards.sort((a,b)=>b.ts-a.ts);
    setFeed(cards.map(({ type, data }) => ({ type, data })));
  }, [entries, rooms]);

  const addQuick = async () => {
    const count = Math.max(1, parseInt(qCount || "1", 10) || 1);
    const e: Entry = {
      id: `${Date.now()}`,
      pillar: qPillar,
      areaType: "school",
      areaName: qAreaName.trim() || "Algemeen",
      notes: qNotes.trim() || undefined,
      count,
      dateISO: new Date().toISOString(),
      mood: "pos",
    };
    const next = [e, ...entries];
    setEntries(next);
    await saveJSON(K_ENTRIES, next);
    setQuickOpen(false);
    setQNotes(""); setQAreaName(""); setQCount("1"); setQPillar("weerbaarheid");
  };

  const openDetails = (card: { type: "entry"|"room"; data: any }) => {
    if (card.type === "room") {
      Alert.alert("Room", `Open room: ${(card.data as Room).alias}\n(ga naar Casus-tab)`);
      return;
    }
    const e = card.data as Entry;
    Alert.alert(
      "Moment",
      `${PILLARS[e.pillar].label}\n${e.areaName} â€¢ ${e.count}x â€¢ ${shortDate(e.dateISO)}${e.notes ? `\n\nâ€œ${e.notes}â€` : ""}`
    );
  };

  const renderItem = ({ item }: { item: { type: "entry"|"room"; data: any } }) => {
    if (item.type === "entry") return <EntryReel e={item.data as Entry} onDetails={() => openDetails(item)} />;
    return <RoomReel r={item.data as Room} onDetails={() => openDetails(item)} />;
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={{ height: insets.top }} />

      {/* Header minimal, glas-achtig */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tape</Text>
        <Text style={styles.headerSub}>Snel door wat leeft â€“ MeerWaarde</Text>
      </View>
      <View style={styles.headerAccent} />

      {/* Fullscreen vertical paging */}
      <FlatList
        data={feed}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: SCREEN_H, offset: SCREEN_H * index, index })}
      />

      {/* Floating actions (professioneel, klein) */}
      <View style={[styles.fabCol, { bottom: (insets.bottom || 12) + 12 }]}>
        <Fab icon="plus" label="Moment" onPress={() => setQuickOpen(true)} />
        <Fab icon="microphone" label="Opnemen" onPress={() => Alert.alert("Opnemen", "Placeholder voor spraak/video")} />
      </View>

      {/* Quick Add modal */}
      <Modal visible={quickOpen} transparent animationType="fade" onRequestClose={() => setQuickOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Snel moment toevoegen</Text>

            <Text style={styles.label}>Pijler</Text>
            <View style={styles.chipsRow}>
              {(Object.keys(PILLARS) as PillarKey[]).map((k) => {
                const active = qPillar === k;
                return (
                  <TouchableOpacity
                    key={k}
                    onPress={() => setQPillar(k)}
                    style={[styles.pillarChip, { borderColor: PILLARS[k].color }, active && styles.pillarChipActive]}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name={PILLARS[k].icon} size={16} color={active ? BRAND.text : PILLARS[k].color} />
                    <Text style={[styles.pillarChipText, active && { color: BRAND.text }]} numberOfLines={1}>
                      {PILLARS[k].label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>School/Gebied</Text>
            <TextInput
              value={qAreaName}
              onChangeText={setQAreaName}
              placeholder="Bijv. Haarlemmermeer Lyceum"
              placeholderTextColor="#9099A6"
              style={styles.input}
            />

            <Text style={styles.label}>Aantal</Text>
            <TextInput
              value={qCount}
              onChangeText={setQCount}
              placeholder="1"
              keyboardType="number-pad"
              placeholderTextColor="#9099A6"
              style={styles.input}
            />

            <Text style={styles.label}>Korte notitie (optioneel)</Text>
            <TextInput
              value={qNotes}
              onChangeText={setQNotes}
              placeholder="Feitelijke omschrijving (anoniem)."
              placeholderTextColor="#9099A6"
              style={[styles.input, styles.inputMultiline]}
              multiline
              maxLength={280}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <TouchableOpacity onPress={() => setQuickOpen(false)} style={styles.ghostBtn}><Text style={styles.ghostBtnText}>Annuleren</Text></TouchableOpacity>
              <TouchableOpacity onPress={addQuick} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Opslaan</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ========= CARD TYPES ========= */

function EntryReel({ e, onDetails }: { e: Entry; onDetails: () => void }) {
  const meta = PILLARS[e.pillar];
  return (
    <View style={[styles.reel, { backgroundColor: BRAND.white }]}>
      {/* Accentvlak bovenin (rustig) */}
      <View style={[styles.hero, { backgroundColor: "#F6FAFF" }]}>
        <View style={styles.heroBadge(meta.color)}>
          <MaterialCommunityIcons name={meta.icon} size={18} color={BRAND.white} />
        </View>
      </View>

      {/* Info-overlay */}
      <View style={styles.infoOverlay}>
        <Text style={styles.infoTitle} numberOfLines={1}>{meta.label}</Text>
        <Text style={styles.infoSub} numberOfLines={1}>
          {e.areaName} â€¢ {e.count}x â€¢ {shortDate(e.dateISO)} {e.mood ? `â€¢ ${MOODS[e.mood]}` : ""}
        </Text>
        {!!e.notes && <Text style={styles.infoNotes} numberOfLines={3}>"{e.notes}"</Text>}
      </View>

      {/* rechts knoppen */}
      <View style={styles.sideCol}>
        <SideAction icon="dots-horizontal" onPress={onDetails} />
      </View>
    </View>
  );
}

function RoomReel({ r, onDetails }: { r: Room; onDetails: () => void }) {
  return (
    <View style={[styles.reel, { backgroundColor: BRAND.white }]}>
      <View style={[styles.hero, { backgroundColor: "#F4FFF5" }]}>
        <View style={styles.heroBadge(BRAND.blue)}>
          <MaterialCommunityIcons name="account-group" size={18} color={BRAND.white} />
        </View>
      </View>

      <View style={styles.infoOverlay}>
        <Text style={styles.infoTitle} numberOfLines={1}>Room â€¢ {r.alias}</Text>
        <Text style={styles.infoSub} numberOfLines={1}>{r.schoolOrArea} â€¢ {r.pillars.map(p=>PILLARS[p].label).join(", ")}</Text>
        <Text style={styles.infoMeta}>Status: {r.status === "open" ? "Open" : r.status === "await" ? "In afwachting" : "Gesloten"} â€¢ Laatst: {shortDate(r.updatedAtISO)}</Text>
      </View>

      <View style={styles.sideCol}>
        <SideAction icon="open-in-new" onPress={onDetails} />
      </View>
    </View>
  );
}

/* ========= UI PRIMS ========= */
function Fab({ icon, label, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void }) {
  return (
    <View style={{ alignItems: "center" }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.fabBtn}>
        <MaterialCommunityIcons name={icon} size={20} color={BRAND.white} />
      </TouchableOpacity>
      <Text style={styles.fabLabel}>{label}</Text>
    </View>
  );
}

function SideAction({ icon, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.sideBtn}>
      <MaterialCommunityIcons name={icon} size={20} color={BRAND.text} />
    </TouchableOpacity>
  );
}

/* ========= STYLES ========= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.white },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, backgroundColor: BRAND.white },
  headerTitle: { fontWeight: "800", fontSize: 18, color: BRAND.text },
  headerSub: { color: BRAND.subtext, fontSize: 12, marginTop: 2 },
  headerAccent: { height: 3, backgroundColor: BRAND.green },

  reel: {
    width: SCREEN_W, height: SCREEN_H, justifyContent: "space-between",
  },
  hero: {
    height: Math.round(SCREEN_H * 0.56),
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  heroBadge: (bg: string) => ({
    position: "absolute", right: 16, top: 16,
    backgroundColor: bg, width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: BRAND.white,
  }),

  infoOverlay: {
    position: "absolute", left: 16, right: 76, bottom: Math.max(120, SCREEN_H * 0.18),
    padding: 12, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 12, borderWidth: 1, borderColor: BRAND.border,
  },
  infoTitle: { fontWeight: "800", fontSize: 16, color: BRAND.text },
  infoSub: { color: BRAND.subtext, marginTop: 2 },
  infoNotes: { color: BRAND.text, marginTop: 8, fontStyle: "italic" },
  infoMeta: { color: BRAND.subtext, marginTop: 4, fontSize: 12 },

  sideCol: {
    position: "absolute", right: 12, bottom: Math.max(110, SCREEN_H * 0.16),
    alignItems: "center", gap: 10,
  },
  sideBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND.white,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BRAND.border,
  },

  fabCol: {
    position: "absolute", right: 14, gap: 10,
  },
  fabBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND.blue,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  fabLabel: { fontSize: 11, color: BRAND.subtext, marginTop: 4 },

  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modalCard: {
    width: "100%", maxWidth: 520, borderRadius: 16, backgroundColor: BRAND.white, borderWidth: 1, borderColor: BRAND.border,
    padding: 14,
  },
  modalTitle: { fontWeight: "800", color: BRAND.text, fontSize: 16, marginBottom: 6 },

  label: { color: BRAND.text, marginTop: 10, marginBottom: 6, fontWeight: "800" },
  input: {
    backgroundColor: BRAND.white, color: BRAND.text, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 10,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: "top" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pillarChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 999, borderWidth: 1, backgroundColor: BRAND.white,
    paddingVertical: 8, paddingHorizontal: 10,
  },
  pillarChipActive: { backgroundColor: "#F4F8FF" },
  pillarChipText: { color: BRAND.text, fontWeight: "700" },
});

