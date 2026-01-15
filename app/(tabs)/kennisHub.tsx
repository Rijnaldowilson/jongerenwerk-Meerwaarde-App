// -------------------------------
// app/(tabs)/leeromgeving.tsx
// DEEL 1/10
// -------------------------------
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useAuth } from "../../auth/context";
import { supabase } from "../../lib/supabase";

const { width: W } = Dimensions.get("window");

/* -----------------------------
   Huisstijl
------------------------------ */
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
  amber: "#F59E0B",
  red: "#EF4444",
};

/* -----------------------------
   Types
------------------------------ */
type AppRole =
  | "jongerenwerker"
  | "manager"
  | "jongere"
  | "admin"
  | "worker"
  | null;

type LearnCategoryKey =
  | "Methodieken"
  | "Jaarplannen"
  | "Formats"
  | "Protocollen"
  | "Training"
  | "Projecten"
  | "Overige documenten"
  | "Media";

type LearnCategory = {
  key: LearnCategoryKey;
  title: string;
  tint: string;
  image: string;
  icon: keyof typeof Feather.glyphMap;
  count?: number;
};

type KnowlesRow = {
  id: string;
  uid?: string | null;
  title: string;
  category: LearnCategoryKey;
  meta?: string | null;
  image?: string | null;
  file_path: string | null;
  created_at: string;
  is_recommended?: boolean | null;
  is_featured?: boolean | null;
};

type LearnItem = {
  id: string;
  title: string;
  category: LearnCategoryKey;
  meta?: string | null;
  image: string;
  is_recommended?: boolean | null;
  is_featured?: boolean | null;
  file_path?: string | null;
  created_at?: string;
};

/* -----------------------------
   Gebiedsanalyse configuratie
------------------------------ */
export type AreaSectionKey =
  | "leefomgeving"
  | "data"
  | "ervaringen"
  | "jongerenwerk";

export const AREA_TOP_CARDS = [
  {
    key: "demografie",
    title: "Demografie",
    subtitle: "Sociaal-economische achtergrond",
    icon: "users" as keyof typeof Feather.glyphMap,
    image:
      "https://images.pexels.com/photos/7578935/pexels-photo-7578935.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    key: "onderwijs",
    title: "Onderwijs",
    subtitle: "Schooldeelname & ontwikkeling",
    icon: "book-open",
    image:
      "https://images.pexels.com/photos/8617981/pexels-photo-8617981.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    key: "gezondheid",
    title: "Gezondheid",
    subtitle: "Welzijn & veiligheid",
    icon: "heart",
    image:
      "https://images.pexels.com/photos/7697730/pexels-photo-7697730.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
];

export const AREA_BOTTOM_CARDS = [
  {
    key: "leefomgeving",
    label: "Leefomgeving",
    icon: "image",
    description: "Buurt, voorzieningen & hotspots",
  },
  {
    key: "data",
    label: "Data",
    icon: "bar-chart-2",
    description: "Cijfers, trends & wijkmonitor",
  },
  {
    key: "ervaringen",
    label: "Ervaringen",
    icon: "message-circle",
    description: "Stem van jongeren & inwoners",
  },
  {
    key: "jongerenwerk",
    label: "Jongerenwerk",
    icon: "target",
    description: "Doelen, acties en impact",
  },
];

/* -----------------------------
   Helpers
------------------------------ */
const extFromName = (name?: string) => {
  if (!name) return "bin";
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
};

const niceMetaFromExt = (ext: string) => {
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "DOCX";
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  if (["jpg", "jpeg", "png", "heic"].includes(ext)) return "Afbeelding";
  return ext.toUpperCase();
};

const isPreviewableInWebview = (ext: string) =>
  ["pdf", "png", "jpg", "jpeg", "heic", "doc", "docx", "ppt", "pptx"].includes(
    ext
  );

function getInitial(text?: string | null) {
  if (!text) return "?";
  const t = text.trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

/* -----------------------------
   Fallback (als DB leeg is)
------------------------------ */
const FALLBACK_CATEGORIES: LearnCategory[] = [
  {
    key: "Methodieken",
    title: "Methodieken",
    tint: MW.blue,
    icon: "book-open",
    count: 12,
    image:
      "https://images.pexels.com/photos/4145190/pexels-photo-4145190.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    key: "Jaarplannen",
    title: "Jaarplannen",
    tint: "#0EA5E9",
    icon: "calendar",
    count: 5,
    image:
      "https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    key: "Formats",
    title: "Formats",
    tint: "#7A5C2E",
    icon: "file-text",
    count: 18,
    image:
      "https://images.pexels.com/photos/4386476/pexels-photo-4386476.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    key: "Protocollen",
    title: "Protocollen",
    tint: MW.amber,
    icon: "shield",
    count: 7,
    image:
      "https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    key: "Training",
    title: "Training",
    tint: "#0F8A6A",
    icon: "award",
    count: 9,
    image:
      "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    key: "Projecten",
    title: "Projecten",
    tint: "#6366F1",
    icon: "layers",
    count: 6,
    image:
      "https://images.pexels.com/photos/3184436/pexels-photo-3184436.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    key: "Overige documenten",
    title: "Overige\nDocumenten",
    tint: "#334155",
    icon: "folder",
    count: 14,
    image:
      "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    key: "Media",
    title: "Media",
    tint: "#F97316",
    icon: "image",
    count: 21,
    image:
      "https://images.pexels.com/photos/3825573/pexels-photo-3825573.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
];

/* -----------------------------
   Header (Workspace-stijl)
------------------------------ */
function LearnHeader({
  onPressUpload,
  canUpload,
}: {
  onPressUpload: () => void;
  canUpload: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Text style={styles.headerTitle}>KennisHub</Text>

      {canUpload && (
        <TouchableOpacity
          onPress={onPressUpload}
          hitSlop={10}
          style={styles.headerIconBtn}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

/* -----------------------------
   Category card (bovenste rij)
------------------------------ */
function CategoryCard({
  item,
  onPress,
}: {
  item: LearnCategory;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.catCard}>
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.catBg}
        imageStyle={{ borderRadius: 14 }}
      >
        <View style={styles.catOverlay} />
        <View style={styles.catIconCircle}>
          <Feather name={item.icon} size={16} color="#FFFFFF" />
        </View>
        <Text style={styles.catTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {!!item.count && <Text style={styles.catCount}>{item.count} items</Text>}
      </ImageBackground>
    </TouchableOpacity>
  );
}

/* -----------------------------
   Aanbevolen kaart
------------------------------ */
function RecommendedCard({
  item,
  onPress,
}: {
  item: LearnItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.recCard}>
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.recBg}
        imageStyle={{ borderRadius: 18 }}
      >
        <View style={styles.recOverlay} />
        <Text style={styles.recLabel}>Aanbevolen voor jou</Text>
        <Text style={styles.recTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {!!item.meta && <Text style={styles.recMeta}>{item.meta}</Text>}
      </ImageBackground>
    </TouchableOpacity>
  );
}

/* -----------------------------
   Quick grid card
------------------------------ */
function QuickCard({
  item,
  onPress,
}: {
  item: LearnCategory;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.quickCard}>
      <View style={[styles.quickIconWrap, { backgroundColor: `${item.tint}18` }]}>
        <Feather name={item.icon} size={18} color={item.tint} />
      </View>
      <Text style={styles.quickTitle} numberOfLines={2}>
        {item.key}
      </Text>
      {!!item.count && <Text style={styles.quickCount}>{item.count} items</Text>}
    </TouchableOpacity>
  );
}

/* -----------------------------
   Featured tile
------------------------------ */
function FeaturedTile({
  item,
  onPress,
}: {
  item: LearnItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.featureTile}>
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.featureBg}
        imageStyle={{ borderRadius: 12 }}
      >
        <View style={styles.featureOverlay} />
        <Text style={styles.featureTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {!!item.meta && (
          <Text style={styles.featureMeta} numberOfLines={1}>
            {item.meta}
          </Text>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
}
/* -----------------------------
   Gebiedsanalyse sectie (feed-achtig)
------------------------------ */
function AreaAnalysisSection({
  onOpenSection,
}: {
  onOpenSection: (key: AreaSectionKey) => void;
}) {
  const [showFullText, setShowFullText] = useState(false);

  const introTextFull =
    "Een gebiedsanalyse voor jongerenwerk brengt de lokale omstandigheden en behoeften van jongeren in kaart. Je combineert feitelijke gegevens (demografie, onderwijs, gezondheid, veiligheid, leefomgeving) met ervaringen van jongeren, ouders en professionals. Zo krijg je zicht op thema’s als talentontwikkeling, schoolverlating, gezondheid en sociale problemen, en kun je het jongerenwerk beter afstemmen op de doelgroep in dit gebied.";

  const introTextShort =
    "Een gebiedsanalyse combineert cijfers (demografie, onderwijs, gezondheid, leefomgeving) met ervaringen van jongeren en inwoners. Zo stem je het jongerenwerk beter af op jouw gebied.";

  const introText = showFullText ? introTextFull : introTextShort;

  return (
    <View style={styles.analysisSection}>
      <Text style={styles.analysisTitle}>Gebiedsanalyse jongerenwerk</Text>

      {/* Bovenste tegels (demografie / onderwijs / gezondheid) */}
      <View style={styles.analysisHeroRow}>
        {AREA_TOP_CARDS.map((card) => (
          <View key={card.key} style={styles.analysisHeroCard}>
            <ImageBackground
              source={{ uri: card.image }}
              style={styles.analysisHeroImage}
              imageStyle={{ borderRadius: 18 }}
            >
              <View style={styles.analysisHeroOverlay} />
              <View style={styles.analysisHeroIconWrap}>
                <Feather name={card.icon} size={18} color="#FFFFFF" />
              </View>
            </ImageBackground>
            <View style={{ paddingHorizontal: 8, paddingBottom: 10, paddingTop: 6 }}>
              <Text style={styles.analysisHeroTitle} numberOfLines={1}>
                {card.title}
              </Text>
              <Text style={styles.analysisHeroSubtitle} numberOfLines={2}>
                {card.subtitle}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Uitlegkaart */}
      <View style={styles.analysisIntroCard}>
        <Text style={styles.analysisIntroText}>{introText}</Text>
        <TouchableOpacity
          onPress={() => setShowFullText((v) => !v)}
          style={styles.analysisMoreBtn}
        >
          <Text style={styles.analysisMoreText}>
            {showFullText ? "Toon kortere uitleg" : "Lees volledige uitleg"}
          </Text>
          <Feather
            name={showFullText ? "chevron-up" : "chevron-down"}
            size={14}
            color={MW.green}
          />
        </TouchableOpacity>
      </View>

      {/* Onderste tegels: leefomgeving / data / ervaringen / jongerenwerk */}
      <View style={styles.analysisBottomGrid}>
        {AREA_BOTTOM_CARDS.map((card) => (
          <TouchableOpacity
            key={card.key as string}
            style={styles.analysisBottomCard}
            activeOpacity={0.9}
            onPress={() => onOpenSection(card.key as AreaSectionKey)}
          >
            <View style={styles.analysisBottomIconWrap}>
              <Feather name={card.icon as any} size={18} color={MW.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.analysisBottomTitle}>{card.label}</Text>
              <Text style={styles.analysisBottomSubtitle} numberOfLines={2}>
                {card.description}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={MW.subtle} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
/* -----------------------------
   Upload modal
------------------------------ */
function UploadModal({
  visible,
  onClose,
  categories,
  onUploaded,
  meId,
}: {
  visible: boolean;
  onClose: () => void;
  categories: LearnCategory[];
  onUploaded: () => void;
  meId: string | null;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LearnCategoryKey>("Methodieken");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  useEffect(() => {
    if (!visible) {
      setTitle("");
      setCategory("Methodieken");
      setPicked(null);
      setBusy(false);
    }
  }, [visible]);

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*",
    });
    if (res.canceled) return;
    setPicked(res.assets[0]);
    if (!title.trim()) {
      const n = res.assets[0].name || "Nieuw document";
      setTitle(n.replace(/\.[^/.]+$/, ""));
    }
  };

  const upload = async () => {
    if (!picked) {
      Alert.alert("Geen bestand", "Kies eerst een document om te uploaden.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Titel ontbreekt", "Geef een titel voor het document.");
      return;
    }
    if (!meId) {
      Alert.alert("Niet ingelogd", "Log opnieuw in om te uploaden.");
      return;
    }

    setBusy(true);
    try {
      const ext = extFromName(picked.name);
      const safeCat = category.toLowerCase().replace(/\s+/g, "-");
      const filePath = `${safeCat}/${Date.now()}_${picked.name}`;

  


const fileBase64 = await FileSystem.readAsStringAsync(picked.uri, {
  encoding: "base64",
});


const { error: upErr } = await supabase.storage
  .from("knowledge")
  .upload(filePath, fileBase64, {
    contentType: picked.mimeType || "application/octet-stream",
    upsert: false,
    cacheControl: "3600",
  });


      if (upErr) {
        console.log("upload error", upErr);
        throw upErr;
      }

      const image =
        categories.find((c) => c.key === category)?.image ||
        "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg";

      const meta = `${niceMetaFromExt(ext)}${
        picked.size ? " • " + Math.ceil(picked.size / 1024) + "kb" : ""
      }`;

      const { error: iErr } = await supabase.from("knowles").insert({
        title: title.trim(),
        category,
        meta,
        image,
        file_path: filePath,
        uid: meId,
        is_featured: false,
        is_recommended: false,
      });

      if (iErr) {
        console.log("insert knowles error", iErr);
        throw iErr;
      }

      Alert.alert("Geupload!", "Je document staat nu in de KennisHub.");
      onClose();
      onUploaded();
    } catch (e: any) {
      console.log("upload exception", e);
      Alert.alert(
        "Upload mislukt",
        e?.message || "Er ging iets mis bij het uploaden. Probeer het opnieuw."
      );
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.uploadModal}>
        <Text style={styles.uploadTitle}>Document toevoegen</Text>

        <Text style={styles.formLabel}>Titel</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Bijv. Protocol groepsavond"
          placeholderTextColor={MW.subtle}
          style={styles.formInput}
        />

        <Text style={styles.formLabel}>Categorie</Text>
        <View style={styles.categoryPicker}>
          {categories.map((c) => {
            const active = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setCategory(c.key)}
                style={[
                  styles.categoryChip,
                  active && { backgroundColor: "#E9F8E2", borderColor: MW.green },
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active && { color: MW.green },
                  ]}
                >
                  {c.key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={pickFile} style={styles.pickBtn}>
          <Feather name="paperclip" size={16} color="#fff" />
          <Text style={styles.pickBtnText}>
            {picked ? picked.name : "Kies document"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={upload}
          disabled={busy}
          style={[styles.formSubmitBtn, busy && { opacity: 0.6 }]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="upload" size={16} color="#FFFFFF" />
              <Text style={styles.formSubmitText}>Upload naar KennisHub</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

/* -----------------------------
   Doc viewer (WebView)
------------------------------ */
function DocViewerModal({
  visible,
  onClose,
  url,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  url: string | null;
  title?: string;
}) {
  if (!visible || !url) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <View
          style={{
            paddingTop: Platform.OS === "ios" ? 56 : 20,
            paddingHorizontal: 12,
            paddingBottom: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#111",
          }}
        >
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <Text
            style={{ color: "#fff", fontWeight: "800", flex: 1 }}
            numberOfLines={1}
          >
            {title || "Document"}
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(url)} style={{ padding: 4 }}>
            <Feather name="external-link" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <WebView
          source={{ uri: url }}
          style={{ flex: 1 }}
          startInLoadingState
          renderLoading={() => (
            <View
              style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
            >
              <ActivityIndicator color="#fff" />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}
/* -----------------------------
   Category modal + zoekbalk
------------------------------ */
function CategoryModal({
  visible,
  onClose,
  category,
  items,
  onOpenItem,
}: {
  visible: boolean;
  onClose: () => void;
  category: LearnCategoryKey | null;
  items: LearnItem[];
  onOpenItem: (item: LearnItem) => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!visible) setSearch("");
  }, [visible]);

  if (!visible || !category) return null;

  const filtered = items.filter((i) => {
    if (i.category !== category) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.title.toLowerCase().includes(q) ||
      (i.meta || "").toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        {/* Header */}
        <View style={styles.catModalHeader}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
            <Feather name="chevron-left" size={22} color={MW.text} />
          </TouchableOpacity>
          <Text style={styles.catModalTitle}>{category}</Text>
        </View>

        {/* Zoekbalk */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={MW.subtle} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Zoek in documenten..."
              placeholderTextColor={MW.subtle}
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* Lijst met documenten */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {filtered.length === 0 ? (
            <Text style={styles.catModalEmpty}>
              Geen documenten gevonden voor deze zoekopdracht.
            </Text>
          ) : (
            filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => onOpenItem(item)}
                style={styles.docRow}
                activeOpacity={0.8}
              >
                <View style={styles.docIconCircle}>
                  <Feather name="file-text" size={18} color={MW.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!!item.meta && (
                    <Text style={styles.docMeta} numberOfLines={1}>
                      {item.meta}
                    </Text>
                  )}
                  {!!item.created_at && (
                    <Text style={styles.docDate}>
                      {new Date(item.created_at).toLocaleDateString("nl-NL")}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={18} color={MW.subtle} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
/* -----------------------------
   Teamschat component
------------------------------ */
const TEAM_OPTIONS = [
  { key: "jongerenwerk", label: "Team Jongerenwerk" },
  { key: "manager", label: "Team Managers" },
] as const;

type TeamKey = (typeof TEAM_OPTIONS)[number]["key"];

function TeamChat({
  meId,
  profile,
}: {
  meId: string | null;
  profile: any;
}) {
  const [selectedTeam, setSelectedTeam] = useState<TeamKey>("jongerenwerk");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  if (profile?.role === "jongere") return null;

  const displayName: string =
    profile?.display_name ||
    profile?.username ||
    profile?.email?.split?.("@")?.[0] ||
    "Onbekend";

  const photoUrl: string | null = profile?.photo_url ?? null;

  useEffect(() => {
    let cancelled = false;
    let channel: any | null = null;

    const load = async () => {
      setLoading(true);
      try {
        let { data: thread, error } = await supabase
          .from("team_threads")
          .select("*")
          .eq("team", selectedTeam)
          .maybeSingle();

        if (error) {
          console.log("thread error", error);
        }

        if (!thread) {
          const { data: created, error: insertError } = await supabase
            .from("team_threads")
            .insert({
              team: selectedTeam,
              title:
                TEAM_OPTIONS.find((t) => t.key === selectedTeam)?.label ??
                selectedTeam,
            })
            .select()
            .single();

          if (insertError) {
            console.log("insert thread error", insertError);
            return;
          }
          thread = created;
        }

        if (!thread || cancelled) return;

        setThreadId(thread.id);

        const { data: msgs, error: msgError } = await supabase
          .from("team_messages")
          .select("*")
          .eq("thread_id", thread.id)
          .order("created_at", { ascending: true });

        if (msgError) {
          console.log("messages error", msgError);
        }

        if (!cancelled) {
          setMessages(msgs ?? []);
        }

        channel = supabase
          .channel(`team_messages:${thread.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "team_messages",
              filter: `thread_id=eq.${thread.id}`,
            },
            (payload) => {
              if (cancelled) return;
              setMessages((prev) => [...prev, payload.new as any]);
            }
          )
          .subscribe();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedTeam]);

  const send = async (customContent?: string) => {
    const raw = customContent ?? text;
    const trimmed = raw.trim();
    if (!trimmed || !threadId || !meId || sending) return;

    setSending(true);
    if (!customContent) setText("");

    const { data, error } = await supabase
      .from("team_messages")
      .insert({
        thread_id: threadId,
        sender_id: meId,
        sender_name: displayName,
        sender_photo_url: photoUrl,
        content: trimmed,
      })
      .select("*")
      .single();

    if (error) {
      console.log("send error", error);
      Alert.alert("Fout", "Bericht kon niet worden verstuurd.");
      if (!customContent) setText(raw);
    } else if (data) {
      setMessages((prev) => [...prev, data]);
    }

    setSending(false);
  };

  const submitQuestion = async (payload: {
    topic: string;
    urgency: "Laag" | "Normaal" | "Hoog";
    context: string;
    desired: string;
  }) => {
    const badge =
      payload.urgency === "Hoog"
        ? "🔥 Hoog"
        : payload.urgency === "Normaal"
        ? "⚖️ Normaal"
        : "🕊️ Laag";

    const content = [
      `🧩 TEAMVRAAG — ${badge}`,
      "",
      `Onderwerp: ${payload.topic}`,
      "",
      `Context:\n${payload.context}`,
      "",
      payload.desired ? `Wat heb ik nodig?\n${payload.desired}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await send(content);
  };

  return (
    <KeyboardAvoidingView
      style={styles.teamChatContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Tabs voor teams */}
      <View style={styles.teamTabs}>
        {TEAM_OPTIONS.map((t) => {
          const active = t.key === selectedTeam;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.teamTab, active && styles.teamTabActive]}
              onPress={() => setSelectedTeam(t.key)}
            >
              <Text
                style={[
                  styles.teamTabLabel,
                  active && styles.teamTabLabelActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Knop voor teamvraag-formulier */}
      <View style={styles.teamQuestionBar}>
        <TouchableOpacity
          style={styles.teamQuestionButton}
          onPress={() => setShowQuestionForm(true)}
        >
          <Feather name="help-circle" size={16} color={MW.blue} />
          <Text style={styles.teamQuestionButtonText}>Nieuwe teamvraag</Text>
        </TouchableOpacity>
      </View>

      {/* Berichtenlijst */}
      <View style={styles.teamChatBox}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={MW.green} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 10, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((item: any) => {
              const isMine = item.sender_id === meId;
              const name = item.sender_name || "Onbekend";
              const avatarInitial = getInitial(name);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.teamMessageRow,
                    isMine && { flexDirection: "row-reverse" },
                  ]}
                >
                  <View
                    style={[
                      styles.teamAvatar,
                      isMine && { backgroundColor: MW.green },
                    ]}
                  >
                    <Text
                      style={[
                        styles.teamAvatarInitial,
                        isMine && { color: "#FFFFFF" },
                      ]}
                    >
                      {avatarInitial}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.teamBubble,
                      isMine ? styles.teamBubbleMe : styles.teamBubbleOther,
                    ]}
                  >
                    {!isMine && (
                      <Text style={styles.teamBubbleSender}>{name}</Text>
                    )}
                    <Text
                      style={[
                        styles.teamBubbleText,
                        isMine && { color: "#FFFFFF" },
                      ]}
                    >
                      {item.content}
                    </Text>
                    <Text
                      style={[
                        styles.teamBubbleTime,
                        isMine && { color: "rgba(255,255,255,0.8)" },
                      ]}
                    >
                      {new Date(item.created_at).toLocaleTimeString("nl-NL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Input */}
      <View style={styles.teamChatInputRow}>
        <TextInput
          style={styles.teamChatInput}
          placeholder="Stuur een bericht naar je team..."
          placeholderTextColor={MW.subtle}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.teamChatSendButton,
            (!text.trim() || sending) && { opacity: 0.5 },
          ]}
          onPress={() => send()}
          disabled={!text.trim() || sending}
        >
          <Feather name="send" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Teamvraag-formulier */}
      {showQuestionForm && (
        <View style={styles.formPanel}>
          <View style={styles.formPanelHeader}>
            <Text style={styles.formPanelTitle}>Nieuwe teamvraag</Text>
            <TouchableOpacity
              onPress={() => setShowQuestionForm(false)}
              style={{ padding: 4 }}
            >
              <Feather name="x" size={18} color={MW.sub} />
            </TouchableOpacity>
          </View>

          <QuestionForm
            onCancel={() => setShowQuestionForm(false)}
            onSubmit={async (payload) => {
              await submitQuestion(payload);
              setShowQuestionForm(false);
            }}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/* -----------------------------
   Vraag-formulier component
------------------------------ */
function QuestionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (payload: {
    topic: string;
    urgency: "Laag" | "Normaal" | "Hoog";
    context: string;
    desired: string;
  }) => void;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [urgency, setUrgency] =
    useState<"Laag" | "Normaal" | "Hoog">("Normaal");
  const [context, setContext] = useState("");
  const [desired, setDesired] = useState("");

  const submit = () => {
    if (!topic.trim() || !context.trim()) {
      Alert.alert("Onvolledig", "Onderwerp en context zijn verplicht.");
      return;
    }
    onSubmit({
      topic: topic.trim(),
      urgency,
      context: context.trim(),
      desired: desired.trim(),
    });
    setTopic("");
    setContext("");
    setDesired("");
    setUrgency("Normaal");
  };

  return (
    <>
      <Text style={styles.formLabel}>Onderwerp</Text>
      <TextInput
        value={topic}
        onChangeText={setTopic}
        placeholder="Bijv. casus, protocol, aanpak..."
        placeholderTextColor={MW.subtle}
        style={styles.formInput}
      />

      <Text style={styles.formLabel}>Urgentie</Text>
      <View style={styles.urgencyRow}>
        {(["Laag", "Normaal", "Hoog"] as const).map((u) => {
          const active = urgency === u;
          return (
            <TouchableOpacity
              key={u}
              onPress={() => setUrgency(u)}
              style={[
                styles.urgencyChip,
                active && styles.urgencyChipActive,
                active && u === "Hoog" && { borderColor: MW.red },
              ]}
            >
              <Text
                style={[
                  styles.urgencyChipText,
                  active && styles.urgencyChipTextActive,
                  active && u === "Hoog" && { color: MW.red },
                ]}
              >
                {u}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.formLabel}>Context / situatie</Text>
      <TextInput
        value={context}
        onChangeText={setContext}
        placeholder="Wat speelt er? Korte samenvatting..."
        placeholderTextColor={MW.subtle}
        style={[styles.formInput, { height: 80, textAlignVertical: "top" }]}
        multiline
      />

      <Text style={styles.formLabel}>Wat heb je nodig?</Text>
      <TextInput
        value={desired}
        onChangeText={setDesired}
        placeholder="Bijv. advies, meedenken, format..."
        placeholderTextColor={MW.subtle}
        style={[styles.formInput, { height: 56, textAlignVertical: "top" }]}
        multiline
      />

      <View style={{ flexDirection: "row", marginTop: 10, gap: 8 }}>
        <TouchableOpacity
          onPress={onCancel}
          style={[
            styles.formSubmitBtn,
            {
              backgroundColor: "#E5E7EB",
              flex: 1,
            },
          ]}
        >
          <Text
            style={[
              styles.formSubmitText,
              { color: "#111827", fontWeight: "800" },
            ]}
          >
            Annuleer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={submit}
          style={[styles.formSubmitBtn, { flex: 1 }]}
        >
          <Feather name="send" size={16} color="#FFFFFF" />
          <Text style={styles.formSubmitText}>Verstuur vraag</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
/* -----------------------------
   Gebiedsanalyse formulier-config
------------------------------ */

type AreaSectionField = {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  minHeight?: number;
};

const AREA_SECTION_FIELDS: Record<AreaSectionKey, AreaSectionField[]> = {
  leefomgeving: [
    {
      key: "samenvatting",
      label: "Korte beschrijving leefomgeving",
      placeholder:
        "Hoe ziet de wijk eruit? Welke plekken gebruiken jongeren (pleinen, hangplekken, voorzieningen)?",
      multiline: true,
      minHeight: 80,
    },
    {
      key: "sterke_punten",
      label: "Sterke punten",
      placeholder: "Wat gaat goed in de buurt? Voorzieningen, sociale cohesie, etc.",
      multiline: true,
      minHeight: 70,
    },
    {
      key: "zorgen",
      label: "Zorgen / knelpunten",
      placeholder:
        "Waar maak je je zorgen over? Onveiligheid, gebrek aan ruimte, spanningen...",
      multiline: true,
      minHeight: 70,
    },
    {
      key: "belangrijke_plekken",
      label: "Belangrijke plekken voor jongeren",
      placeholder: "Noem belangrijke hotspots, scholen, sportplekken, etc.",
      multiline: true,
      minHeight: 60,
    },
  ],
  data: [
    {
      key: "belangrijkste_cijfers",
      label: "Belangrijkste cijfers",
      placeholder:
        "Bijv. aantal jongeren, schooluitval, werkloosheid, politiecijfers...",
      multiline: true,
      minHeight: 90,
    },
    {
      key: "bronnen",
      label: "Bronnen",
      placeholder: "Bijv. CBS, gemeente, wijkmonitor, eigen registraties...",
      multiline: true,
      minHeight: 60,
    },
    {
      key: "interpretatie",
      label: "Wat zeggen deze cijfers?",
      placeholder:
        "Korte duiding: wat valt op? Waar lijken kansen of risico’s te zitten?",
      multiline: true,
      minHeight: 70,
    },
  ],
  ervaringen: [
    {
      key: "jongeren",
      label: "Wat vertellen jongeren?",
      placeholder:
        "Welke ervaringen, wensen en zorgen hoor je van jongeren zelf?",
      multiline: true,
      minHeight: 80,
    },
    {
      key: "inwoners",
      label: "Wat vertellen ouders/inwoners?",
      placeholder:
        "Wat hoor je van ouders, buurtbewoners of sleutelfiguren in de wijk?",
      multiline: true,
      minHeight: 80,
    },
    {
      key: "professionals",
      label: "Wat zeggen andere professionals?",
      placeholder:
        "Bijv. school, politie, wijkteam, sport, cultuur, welzijn...",
      multiline: true,
      minHeight: 70,
    },
  ],
  jongerenwerk: [
    {
      key: "hoofddoelen",
      label: "Hoofddoelen jongerenwerk",
      placeholder:
        "Welke doelen stel je voor dit gebied? Bijv. talentontwikkeling, voorkomen schooluitval...",
      multiline: true,
      minHeight: 80,
    },
    {
      key: "acties",
      label: "Acties & aanbod",
      placeholder:
        "Welke activiteiten, projecten of aanpakken wil je (blijven) inzetten?",
      multiline: true,
      minHeight: 80,
    },
    {
      key: "monitoring",
      label: "Wat wil je volgen / meten?",
      placeholder:
        "Bijv. bereik, participatie, veiligheid, welzijn, schooldeelname...",
      multiline: true,
      minHeight: 70,
    },
  ],
};

type AreaAnalysisSectionRow = {
  id: string;
  area_id: string;
  section_key: AreaSectionKey;
  content: Record<string, string | null>;
};

function AreaSectionModal({
  visible,
  onClose,
  sectionKey,
  areaId,
  meId,
}: {
  visible: boolean;
  onClose: () => void;
  sectionKey: AreaSectionKey | null;
  areaId: string;
  meId: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible || !sectionKey) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("area_analysis_sections")
          .select("*")
          .eq("area_id", areaId)
          .eq("section_key", sectionKey)
          .maybeSingle();

        if (error) {
          console.log("load area section error", error);
        }

        if (!cancelled && data) {
          const row = data as AreaAnalysisSectionRow;
          const content = row.content || {};
          const mapped: Record<string, string> = {};
          Object.entries(content).forEach(([k, v]) => {
            mapped[k] = (v as string) ?? "";
          });
          setValues(mapped);
        } else if (!cancelled) {
          setValues({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [visible, sectionKey, areaId]);

  if (!visible || !sectionKey) return null;

  const fields = AREA_SECTION_FIELDS[sectionKey];
  const titleMap: Record<AreaSectionKey, string> = {
    leefomgeving: "Leefomgeving",
    data: "Data & cijfers",
    ervaringen: "Ervaringen",
    jongerenwerk: "Jongerenwerk-doelen",
  };

  const handleChange = (k: string, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
  };

  const save = async () => {
    if (!meId) {
      Alert.alert("Niet ingelogd", "Log opnieuw in om de analyse op te slaan.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        area_id: areaId,
        section_key: sectionKey,
        content: values,
        created_by: meId,
      };

      const { error } = await supabase
        .from("area_analysis_sections")
        .upsert(payload, {
          onConflict: "area_id,section_key",
        });

      if (error) {
        console.log("save area section error", error);
        Alert.alert(
          "Opslaan mislukt",
          "De gegevens konden niet worden opgeslagen. Probeer het later opnieuw."
        );
        return;
      }

      Alert.alert("Opgeslagen", "Gebiedsanalyse is bijgewerkt.");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        {/* Header */}
        <View style={styles.areaModalHeader}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
            <Feather name="chevron-down" size={22} color={MW.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.areaModalTitle}>{titleMap[sectionKey]}</Text>
            <Text style={styles.areaModalSub}>Gebiedsanalyse</Text>
          </View>
          <TouchableOpacity
            onPress={save}
            disabled={saving}
            style={[
              styles.areaModalSaveBtn,
              saving && { opacity: 0.6 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="save" size={14} color="#FFFFFF" />
                <Text style={styles.areaModalSaveText}>Opslaan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color={MW.green} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 24,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {fields.map((f) => (
              <View key={f.key} style={{ marginTop: 10 }}>
                <Text style={styles.formLabel}>{f.label}</Text>
                <TextInput
                  value={values[f.key] ?? ""}
                  onChangeText={(t) => handleChange(f.key, t)}
                  placeholder={f.placeholder}
                  placeholderTextColor={MW.subtle}
                  style={[
                    styles.areaFieldInput,
                    f.multiline && {
                      height: f.minHeight ?? 70,
                      textAlignVertical: "top",
                    },
                  ]}
                  multiline={f.multiline}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
/* -----------------------------
   Screen component
------------------------------ */
const TOP_CARD_W = Math.min(135, W * 0.36);
const TOP_CARD_H = 135;
const ANALYSIS_CARD_W = (W - 16 * 2 - 12 * 2) / 3;

export default function LeeromgevingTab() {
  const auth = useAuth() as any;
  const user = auth.user as { id: string; email?: string } | null;
  const role = (auth.profile?.role ?? auth.role ?? null) as AppRole;
  const router = useRouter();
  const meId = user?.id ?? null;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [teamChatOpen, setTeamChatOpen] = useState(false);

  const [categories, setCategories] = useState<LearnCategory[]>([]);
  const [recommended, setRecommended] = useState<LearnItem | null>(null);
  const [featured, setFeatured] = useState<LearnItem[]>([]);
  const [items, setItems] = useState<LearnItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catModalKey, setCatModalKey] = useState<LearnCategoryKey | null>(null);

  // Gebiedsanalyse modal state
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [areaModalKey, setAreaModalKey] = useState<AreaSectionKey | null>(null);
  const currentAreaId = "default";

  const canUpload =
    role === "jongerenwerker" ||
    role === "manager" ||
    role === "admin" ||
    role === "worker";

  const isPro =
    role === "jongerenwerker" ||
    role === "manager" ||
    role === "admin" ||
    role === "worker";

  const reload = async () => {
    setLoading(true);
    try {
      const { data: catRows, error: cErr } = await supabase
        .from("learn_categories")
        .select("key, title, tint, image, icon, sort_order")
        .order("sort_order", { ascending: true });

      const { data: knowlesRows, error: kErr } = await supabase
        .from("knowles")
        .select(
          "id, title, category, meta, image, file_path, is_recommended, is_featured, created_at"
        )
        .order("created_at", { ascending: false });

      if (kErr) throw kErr;

      const mappedItems: LearnItem[] =
        (knowlesRows as KnowlesRow[] | null)?.map((r) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          meta: r.meta || undefined,
          image:
            r.image ||
            FALLBACK_CATEGORIES.find((c) => c.key === r.category)?.image ||
            "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg",
          is_recommended: r.is_recommended,
          is_featured: r.is_featured,
          file_path: r.file_path || undefined,
          created_at: r.created_at,
        })) ?? [];

      setItems(mappedItems);

      const rec =
        mappedItems.find((x) => x.is_recommended) ?? mappedItems[0] ?? null;
      const feat = mappedItems.filter((x) => x.is_featured).slice(0, 3);

      const counts: Record<string, number> = {};
      mappedItems.forEach((it) => {
        counts[it.category] = (counts[it.category] || 0) + 1;
      });

      if (cErr || !catRows?.length) {
        setCategories(
          FALLBACK_CATEGORIES.map((c) => ({
            ...c,
            count: counts[c.key] ?? c.count ?? 0,
          }))
        );
      } else {
        setCategories(
          (catRows as any[]).map((c) => ({
            key: c.key,
            title: c.title,
            tint: c.tint || MW.green,
            image: c.image,
            icon: c.icon,
            count: counts[c.key] ?? 0,
          }))
        );
      }

      setRecommended(rec);
      setFeatured(feat);
    } catch (e) {
      console.log("reload error", e);
      setCategories(FALLBACK_CATEGORIES);
      setRecommended(null);
      setFeatured([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const QUICK_GRID = useMemo(() => {
    const pick = [
      "Methodieken",
      "Formats",
      "Protocollen",
      "Training",
    ] as LearnCategoryKey[];
    return categories.filter((c) => pick.includes(c.key)).slice(0, 4);
  }, [categories]);

  const onOpenCategory = (key: LearnCategoryKey) => {
    setCatModalKey(key);
    setCatModalOpen(true);
  };

  const onOpenItem = async (item: LearnItem) => {
    if (!item.file_path) {
      Alert.alert("Geen document", "Dit item heeft nog geen document gekoppeld.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("knowledge")
      .createSignedUrl(item.file_path, 60 * 10);

    if (error || !data?.signedUrl) {
      Alert.alert("Fout", "Kon document niet openen.");
      return;
    }

    const ext = extFromName(item.file_path);
    let url = data.signedUrl;

    if (["doc", "docx", "ppt", "pptx"].includes(ext)) {
      url = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
        url
      )}`;
    }

    if (isPreviewableInWebview(ext)) {
      setViewerUrl(url);
      setViewerTitle(item.title);
      setViewerOpen(true);
    } else {
      Linking.openURL(url);
    }
  };

  if (!isPro) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center", padding: 24 },
        ]}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "800",
            color: MW.sub,
            textAlign: "center",
          }}
        >
          Je hebt geen toegang tot de KennisHub.
        </Text>
        <Text
          style={{ marginTop: 6, color: MW.subtle, textAlign: "center" }}
        >
          Deze omgeving is bedoeld voor jongerenwerkers.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LearnHeader
        canUpload={canUpload}
        onPressUpload={() => setUploadOpen(true)}
      />

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator color={MW.green} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* bovenste categorie-rij */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
          >
            {categories.map((c) => (
              <CategoryCard
                key={c.key}
                item={c}
                onPress={() => onOpenCategory(c.key)}
              />
            ))}
          </ScrollView>

          {/* aanbevolen */}
          {!!recommended && (
            <View style={styles.sectionWrap}>
              <RecommendedCard
                item={recommended}
                onPress={() => onOpenItem(recommended)}
              />
            </View>
          )}

          {/* snel naar */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Snel naar</Text>
            <View style={styles.quickGrid}>
              {QUICK_GRID.map((q) => (
                <QuickCard
                  key={q.key}
                  item={q}
                  onPress={() => onOpenCategory(q.key)}
                />
              ))}
            </View>
          </View>

          {/* Gebiedsanalyse sectie */}
          <AreaAnalysisSection
            onOpenSection={(key) => {
              setAreaModalKey(key);
              setAreaModalOpen(true);
            }}
          />

          {/* Meldcode kaart */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Meldcode & noodsituaties</Text>
            <TouchableOpacity
              onPress={() => router.push("/meldcode")}
              activeOpacity={0.9}
              style={styles.meldcodeCard}
            >
              <View style={styles.meldcodeIconCircle}>
                <Feather name="alert-triangle" size={22} color="#FDBA74" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.meldcodeTitle}>Meldcode huiselijk geweld</Text>
                <Text style={styles.meldcodeText}>
                  Stappenplan, checklist en link naar het volledige protocol. Gebruik
                  bij (vermoeden van) onveiligheid.
                </Text>
                <Text style={styles.meldcodeHint}>
                  Tip: gebruik de noodknop in Workspace bij directe onveiligheid.
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#C2410C" />
            </TouchableOpacity>
          </View>

          {/* uitgelicht */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Uitgelicht</Text>
            <View style={styles.featureRow}>
              {featured.map((f) => (
                <FeaturedTile
                  key={f.id}
                  item={f}
                  onPress={() => onOpenItem(f)}
                />
              ))}
              {featured.length === 0 && (
                <Text style={{ color: MW.subtle }}>
                  Nog geen uitgelichte items.
                </Text>
              )}
            </View>
          </View>

          {/* Teamschat → knop + modal */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Teamschat</Text>

            <TouchableOpacity
              onPress={() => setTeamChatOpen(true)}
              activeOpacity={0.9}
              style={styles.teamChatButton}
            >
              <View style={styles.teamChatButtonIcon}>
                <Feather name="message-square" size={22} color={MW.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamChatButtonTitle}>Open Teamschat</Text>
                <Text style={styles.teamChatButtonText}>
                  Chat met &quot;Team Jongerenwerk&quot; of &quot;Team Managers&quot; en
                  verstuur teamvragen via formulier.
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={MW.green} />
            </TouchableOpacity>

            <Modal
              visible={teamChatOpen}
              animationType="slide"
              onRequestClose={() => setTeamChatOpen(false)}
            >
              <View style={{ flex: 1, backgroundColor: "#F1F5F9" }}>
                <View style={styles.teamChatModalHeader}>
                  <TouchableOpacity
                    onPress={() => setTeamChatOpen(false)}
                    style={{ padding: 6 }}
                  >
                    <Feather name="chevron-down" size={22} color={MW.text} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamChatModalTitle}>Teamschat</Text>
                    <Text style={styles.teamChatModalSub}>
                      Alleen zichtbaar voor professionele rollen.
                    </Text>
                  </View>
                </View>

                <TeamChat meId={meId} profile={auth.profile} />
              </View>
            </Modal>
          </View>
        </ScrollView>
      )}

      {/* Upload */}
      <UploadModal
        visible={uploadOpen}
        onClose={() => setUploadOpen(false)}
        categories={categories.length ? categories : FALLBACK_CATEGORIES}
        onUploaded={reload}
        meId={meId}
      />

      {/* Document viewer */}
      <DocViewerModal
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
        url={viewerUrl}
        title={viewerTitle ?? undefined}
      />

      {/* Category lijst met zoekbalk */}
      <CategoryModal
        visible={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        category={catModalKey}
        items={items}
        onOpenItem={onOpenItem}
      />

      {/* Gebiedsanalyse formulier-modal */}
      <AreaSectionModal
        visible={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
        sectionKey={areaModalKey}
        areaId={currentAreaId}
        meId={meId}
      />
    </View>
  );
}
/* -----------------------------
   Styles
------------------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MW.bg,
  },

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
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Top categories row */
  catRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  catCard: {
    width: TOP_CARD_W,
    height: TOP_CARD_H,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: MW.surface,
    borderWidth: 1,
    borderColor: MW.border,
  },
  catBg: {
    flex: 1,
    padding: 8,
    justifyContent: "flex-end",
  },
  catOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  catIconCircle: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  catTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  catCount: {
    marginTop: 3,
    color: "#E5E7EB",
    fontSize: 10,
    fontWeight: "700",
  },

  sectionWrap: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: MW.green,
    marginBottom: 8,
  },

  /* Recommended */
  recCard: {
    height: 150,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: MW.border,
    backgroundColor: MW.surface,
  },
  recBg: {
    flex: 1,
    padding: 14,
    justifyContent: "flex-end",
  },
  recOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  recLabel: {
    color: "#EAF7E3",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },
  recTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    width: "85%",
  },
  recMeta: {
    marginTop: 6,
    color: "#F1F5F9",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Quick grid */
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickCard: {
    width: (W - 16 * 2 - 10) / 2,
    backgroundColor: MW.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: MW.border,
  },
  quickIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: MW.text,
  },
  quickCount: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    color: MW.subtle,
  },

  /* Gebiedsanalyse */
  analysisSection: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  analysisTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: MW.green,
    marginBottom: 10,
  },
  analysisHeroRow: {
    flexDirection: "row",
    gap: 12,
  },
  analysisHeroCard: {
    width: ANALYSIS_CARD_W,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  analysisHeroImage: {
    height: 120,
    borderRadius: 18,
    overflow: "hidden",
  },
  analysisHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  analysisHeroIconWrap: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  analysisHeroTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: MW.text,
  },
  analysisHeroSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: MW.sub,
  },
  analysisIntroCard: {
    marginTop: 14,
    backgroundColor: "#FFFDF7",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  analysisIntroText: {
    fontSize: 13,
    lineHeight: 19,
    color: MW.text,
  },
  analysisMoreBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
  },
  analysisMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: MW.green,
  },
  analysisBottomGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 6,
  },
  analysisBottomCard: {
    width: (W - 16 * 2 - 10) / 2,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: MW.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  analysisBottomIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E9F8E2",
    alignItems: "center",
    justifyContent: "center",
  },
  analysisBottomTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: MW.text,
  },
  analysisBottomSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: MW.sub,
  },

  /* Featured row */
  featureRow: {
    flexDirection: "row",
    gap: 10,
  },
  featureTile: {
    flex: 1,
    height: 95,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: MW.border,
    backgroundColor: MW.surface,
  },
  featureBg: {
    flex: 1,
    padding: 8,
    justifyContent: "flex-end",
  },
  featureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  featureTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  featureMeta: {
    marginTop: 2,
    color: "#E2E8F0",
    fontWeight: "700",
    fontSize: 10,
  },

  /* Meldcode kaart */
  meldcodeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  meldcodeIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  meldcodeTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#9A3412",
  },
  meldcodeText: {
    marginTop: 2,
    fontSize: 12,
    color: "#7C2D12",
    fontWeight: "600",
  },
  meldcodeHint: {
    marginTop: 6,
    fontSize: 11,
    color: "#9A3412",
    fontStyle: "italic",
  },

  /* Teamschat button + modal header */
  teamChatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#E9F8E2",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(101,177,10,0.25)",
  },
  teamChatButtonIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DDF3D1",
    alignItems: "center",
    justifyContent: "center",
  },
  teamChatButtonTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: MW.green,
  },
  teamChatButtonText: {
    fontSize: 12,
    color: MW.sub,
    marginTop: 2,
    fontWeight: "600",
  },

  teamChatModalHeader: {
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MW.border,
  },
  teamChatModalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: MW.text,
  },
  teamChatModalSub: {
    fontSize: 11,
    fontWeight: "700",
    color: MW.subtle,
    marginTop: 2,
  },

  teamChatContainer: {
    flex: 1,
  },
  teamTabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MW.border,
    backgroundColor: "#FFFFFF",
  },
  teamTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  teamTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: MW.green,
  },
  teamTabLabel: {
    fontSize: 12,
    color: MW.subtle,
    fontWeight: "700",
  },
  teamTabLabelActive: {
    color: MW.text,
  },
  teamChatBox: {
    flex: 1,
  },

  teamQuestionBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EEF2FF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  teamQuestionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  teamQuestionButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: MW.blue,
  },

  teamMessageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginVertical: 2,
  },
  teamAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  teamAvatarInitial: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F172A",
  },

  teamBubble: {
    maxWidth: "78%",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: MW.border,
  },
  teamBubbleMe: {
    backgroundColor: MW.green,
    borderColor: MW.green,
  },
  teamBubbleOther: {
    backgroundColor: "#FFFFFF",
  },
  teamBubbleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  teamBubbleTime: {
    marginTop: 4,
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "right",
  },
  teamBubbleSender: {
    fontSize: 11,
    fontWeight: "800",
    color: MW.sub,
    marginBottom: 2,
  },

  teamChatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: MW.border,
    backgroundColor: "#FFFFFF",
  },
  teamChatInput: {
    flex: 1,
    minHeight: 34,
    maxHeight: 90,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MW.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    color: MW.text,
    backgroundColor: "#F8FAFC",
  },
  teamChatSendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MW.green,
  },

  /* Upload modal */
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  uploadModal: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 120,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: MW.border,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: MW.text,
    marginBottom: 8,
  },
  categoryPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MW.border,
    backgroundColor: "#FFFFFF",
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: MW.sub,
  },
  pickBtn: {
    marginTop: 10,
    backgroundColor: MW.blue,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  pickBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
  },

  formPanel: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: MW.border,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  formPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  formPanelTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: MW.text,
  },
  formLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "800",
    color: MW.sub,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MW.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: MW.text,
  },
  urgencyRow: {
    flexDirection: "row",
    gap: 6,
  },
  urgencyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MW.border,
    backgroundColor: "#FFFFFF",
  },
  urgencyChipActive: {
    backgroundColor: "#E9F8E2",
    borderColor: MW.green,
  },
  urgencyChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: MW.subtle,
  },
  urgencyChipTextActive: {
    color: MW.green,
  },
  formSubmitBtn: {
    marginTop: 10,
    backgroundColor: MW.green,
    borderRadius: 999,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  formSubmitText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },

  /* Category modal + search */
  catModalHeader: {
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MW.border,
  },
  catModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: MW.text,
  },
  catModalEmpty: {
    marginTop: 24,
    textAlign: "center",
    color: MW.subtle,
    fontSize: 13,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: MW.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: MW.text,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MW.border,
  },
  docIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E9F8E2",
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: MW.text,
  },
  docMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: MW.subtle,
  },
  docDate: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: MW.sub,
  },

  /* Area modal styles */
  areaModalHeader: {
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MW.border,
  },
  areaModalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: MW.text,
  },
  areaModalSub: {
    fontSize: 11,
    fontWeight: "700",
    color: MW.subtle,
    marginTop: 2,
  },
  areaModalSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: MW.green,
  },
  areaModalSaveText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  areaFieldInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MW.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: MW.text,
  },
});
