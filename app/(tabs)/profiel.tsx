// app/(tabs)/profiel.tsx
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
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
import { useAuth } from "../../auth/context";
import { supabase } from "../../lib/supabase";

const { width: W } = Dimensions.get("window");

/* -----------------------------
   MeerWaarde huisstijl (licht)
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

type Role =
  | "jongere"
  | "jongerenwerker"
  | "manager"
  | "admin"
  | "worker"
  | "youth";

type FeedPostRow = {
  id: string;
  uid: string;
  type: "image" | "video";
  uri: string;
  description: string | null;
  likes: number | null;
  comments_count: number | null;
  created_at: string;
};

type FeedPost = {
  id: string;
  type: "image" | "video";
  uri: string;
  caption: string;
  likes: number;
  comments: number;
  createdAt: string;
};

const SAVED_KEY = "saved_posts";

/* -----------------------------
   Helpers
------------------------------ */
function timeAgoISO(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "nu";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} u`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString();
}

function guessExt(uri: string, fallback: "jpg" | "png" = "jpg") {
  const m = uri.split("?")[0].match(/\.([a-z0-9]+)$/i);
  if (!m) return fallback;
  const ext = m[1].toLowerCase();
  if (["jpeg", "jpg", "png", "webp", "heic"].includes(ext))
    return ext === "jpeg" ? "jpg" : (ext as any);
  return fallback;
}

function base64ToUint8Array(b64: string) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  let bufferLength = b64.length * 0.75;
  if (b64[b64.length - 1] === "=") bufferLength--;
  if (b64[b64.length - 2] === "=") bufferLength--;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const enc1 = lookup[b64.charCodeAt(i)];
    const enc2 = lookup[b64.charCodeAt(i + 1)];
    const enc3 = lookup[b64.charCodeAt(i + 2)];
    const enc4 = lookup[b64.charCodeAt(i + 3)];
    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (enc3 !== undefined && !Number.isNaN(enc3))
      bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    if (enc4 !== undefined && !Number.isNaN(enc4))
      bytes[p++] = ((enc3 & 3) << 6) | enc4;
  }
  return bytes;
}

/* -----------------------------
   Header (Workspace-stijl)
------------------------------ */
function ProfileHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Text style={styles.headerTitle}>Profiel</Text>

      <TouchableOpacity
        onPress={onOpenSettings}
        activeOpacity={0.9}
        style={styles.settingsBtn}
      >
        <Feather name="settings" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

/* -----------------------------
   Instellingen modal
------------------------------ */
function SettingsModal({
  visible,
  onClose,
  onLogout,
}: {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.settingsBackdrop} onPress={onClose} />
      <View style={[styles.settingsCard, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.settingsHandleWrap}>
          <View style={styles.settingsHandle} />
        </View>

        <Text style={styles.settingsTitle}>Instellingen</Text>

        <TouchableOpacity style={styles.settingsItem} activeOpacity={0.8}>
          <Feather name="user" size={18} color={MW.sub} />
          <Text style={styles.settingsLabel}>Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem} activeOpacity={0.8}>
          <Feather name="lock" size={18} color={MW.sub} />
          <Text style={styles.settingsLabel}>Privacy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem} activeOpacity={0.8}>
          <Feather name="bell" size={18} color={MW.sub} />
          <Text style={styles.settingsLabel}>Meldingen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem} activeOpacity={0.8}>
          <Feather name="help-circle" size={18} color={MW.sub} />
          <Text style={styles.settingsLabel}>Hulp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsItemDanger}
          activeOpacity={0.8}
          onPress={() => {
            onClose();
            onLogout();
          }}
        >
          <Feather name="log-out" size={18} color={MW.red} />
          <Text style={styles.settingsLabelDanger}>Uitloggen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.85}
          style={styles.settingsCloseBtn}
        >
          <Text style={styles.settingsCloseText}>Sluiten</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

/* -----------------------------
   Kleine pills
------------------------------ */
function RolePill({ role }: { role: Role }) {
  const label =
    role === "jongere" || role === "youth"
      ? "Jongere"
      : role === "jongerenwerker" || role === "worker"
      ? "Jongerenwerker"
      : role === "manager"
      ? "Manager"
      : "Admin";
  return (
    <View style={styles.rolePill}>
      <Text style={styles.rolePillText}>{label}</Text>
    </View>
  );
}

function StatBlock({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* -----------------------------
   Post tile (grid)
------------------------------ */
function PostTile({ post, onOpen }: { post: FeedPost; onOpen: () => void }) {
  const size = (W - 16 * 2 - 6 * 2) / 3;
  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.9}
      style={{ width: size, height: size }}
    >
      <ImageBackground
        source={{ uri: post.uri }}
        style={[styles.postTile, { width: size, height: size }]}
        imageStyle={{ borderRadius: 10 }}
      >
        <View style={styles.postTileOverlay} />
        {post.type === "video" && (
          <View style={styles.videoBadge}>
            <Feather name="play" size={12} color="#fff" />
          </View>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
}

/* -----------------------------
   Post preview modal
------------------------------ */
function PostPreviewModal({
  visible,
  onClose,
  post,
}: {
  visible: boolean;
  onClose: () => void;
  post: FeedPost | null;
}) {
  if (!post) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.previewBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.previewCard}>
          <Image source={{ uri: post.uri }} style={styles.previewImage} />
          <View style={{ padding: 12 }}>
            <Text style={styles.previewCaption}>{post.caption}</Text>
            <View style={styles.previewMetaRow}>
              <Text style={styles.previewMeta}>❤️ {post.likes}</Text>
              <Text style={styles.previewMeta}>💬 {post.comments}</Text>
              <Text style={styles.previewMetaSmall}>
                {new Date(post.createdAt).toLocaleDateString()} •{" "}
                {timeAgoISO(post.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* -----------------------------
   Screen
------------------------------ */
export default function ProfielTab() {
  const auth = useAuth() as any;
  const user = auth.user;
  const globalProfile = auth.profile as any;
  const role = auth.role as Role | null;
  const refreshProfile = auth.refreshProfile as () => Promise<void>;
  const signOut = auth.signOut as () => Promise<void>;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  const [tab, setTab] = useState<"posts" | "saved">("posts");
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<FeedPost | null>(null);

  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const isPro =
    role === "jongerenwerker" ||
    role === "worker" ||
    role === "manager" ||
    role === "admin";

  // load saved ids from AsyncStorage (zelfde key als feed)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVED_KEY);
        if (raw) setSavedSet(new Set(JSON.parse(raw)));
      } catch {}
    })();
  }, []);

  // sync edit fields vanuit globalProfile
  useEffect(() => {
    if (!user?.id || !globalProfile) return;
    setEditName(globalProfile.display_name ?? user.email?.split("@")[0] ?? "");
    setEditBio(globalProfile.bio ?? "");
  }, [user?.id, globalProfile?.display_name, globalProfile?.bio]);

  // load my posts
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) return;

      const { data: myPosts, error } = await supabase
        .from("posts")
        .select(
          "id, uid, type, uri, description, likes, comments_count, created_at"
        )
        .eq("uid", user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (error) {
        console.warn("fetch posts error", error);
        setPosts([]);
        return;
      }

      const mapped: FeedPost[] =
        (myPosts as FeedPostRow[] | null)?.map((r) => ({
          id: r.id,
          type: r.type,
          uri: r.uri,
          caption: r.description || "",
          likes: r.likes ?? 0,
          comments: r.comments_count ?? 0,
          createdAt: r.created_at,
        })) ?? [];

      setPosts(mapped);
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const savedPosts = useMemo(
    () => posts.filter((p) => savedSet.has(p.id)),
    [posts, savedSet]
  );

  const postCount = posts.length;
  const savedCount = savedPosts.length;
  const followingCount = useMemo(
    () => auth.followingCount ?? 0,
    [auth.followingCount]
  );

  const selectTab = (t: typeof tab) => setTab(t);

  // avatar upload
  const pickAndUploadAvatar = async () => {
    if (!user?.id) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Toestemming nodig", "Geef toegang tot je galerij.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      selectionLimit: 1,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;

    setUploadingAvatar(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: "base64" as any,
      });
      const bytes = base64ToUint8Array(base64);
      const ext = guessExt(asset.uri, "jpg");
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, bytes, {
          contentType: ext === "png" ? "image/png" : "image/jpeg",
          upsert: true,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Geen public url");

      const { error: uErr } = await supabase
        .from("profiles")
        .update({ photo_url: publicUrl })
        .eq("id", user.id);
      if (uErr) throw uErr;

      await refreshProfile();

      Alert.alert("Gelukt", "Je profielfoto is aangepast.");
    } catch (e: any) {
      console.warn("avatar upload", e?.message);
      Alert.alert("Mislukt", e?.message ?? "Avatar uploaden ging mis.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfileEdits = async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editName.trim() || null,
          bio: editBio.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;

      await refreshProfile();

      setEditOpen(false);
    } catch (e: any) {
      Alert.alert("Opslaan mislukt", e?.message ?? "Er ging iets mis.");
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: MW.sub }}>Log in om je profiel te zien</Text>
      </View>
    );
  }

  if (!globalProfile) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator color={MW.green} />
      </View>
    );
  }

  const avatarUri =
    globalProfile.photo_url ?? "https://i.pravatar.cc/160?img=10";
  const displayName =
    globalProfile.display_name ?? user.email?.split("@")[0] ?? "Gebruiker";
  const username =
    globalProfile.username ?? user.email?.split("@")[0] ?? "user";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ProfileHeader onOpenSettings={() => setSettingsOpen(true)} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top profiel kaart */}
        <View style={styles.topCard}>
          {/* Bovenste rij: avatar + tekst */}
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Pressable
              onPress={pickAndUploadAvatar}
              style={{ position: "relative" }}
            >
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
              <View style={styles.avatarEditBadge}>
                {uploadingAvatar ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Feather name="camera" size={12} color="#fff" />
                )}
              </View>
            </Pressable>

            <View style={{ flex: 1 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={styles.displayName}>{displayName}</Text>
                {!!role && <RolePill role={role} />}
              </View>
              <Text style={styles.username}>@{username}</Text>

              {!!globalProfile.location && (
                <Text style={styles.metaLine}>
                  <Feather name="map-pin" size={12} color={MW.subtle} />{" "}
                  {globalProfile.location}
                </Text>
              )}
              {!!globalProfile.team && isPro && (
                <Text style={styles.metaLine}>
                  <Feather name="users" size={12} color={MW.subtle} />{" "}
                  {globalProfile.team}
                </Text>
              )}
            </View>
          </View>

          {/* Pro banner voor teamrollen */}
          {isPro && (
            <View style={styles.proBanner}>
              <View style={styles.proIconWrap}>
                <Feather name="award" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.proTitle}>MeerWaarde team</Text>
                <Text style={styles.proSubtitle}>
                  Deze rol heeft toegang tot extra functies in de app.
                </Text>
              </View>
            </View>
          )}

          {!!globalProfile.bio && (
            <Text style={styles.bio} numberOfLines={4}>
              {globalProfile.bio}
            </Text>
          )}

          {/* Stats rij */}
          <View style={styles.statsRow}>
            <StatBlock value={postCount} label="Posts" />
            <View style={styles.statsDivider} />
            <StatBlock value={savedCount} label="Opgeslagen" />
            <View style={styles.statsDivider} />
            <StatBlock value={followingCount} label="Volgend" />
          </View>

          {/* Actie rij onderaan dezelfde kaart */}
          <View style={styles.topCardActionsRow}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => setEditOpen(true)}
              style={styles.editBtn}
            >
              <Feather name="edit-2" size={14} color={MW.green} />
              <Text style={styles.editBtnTxt}>Bewerk profiel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => selectTab("posts")}
            style={[styles.tabBtn, tab === "posts" && styles.tabBtnActive]}
          >
            <Feather
              name="grid"
              size={16}
              color={tab === "posts" ? MW.green : MW.subtle}
            />
            <Text
              style={[
                styles.tabTxt,
                tab === "posts" && styles.tabTxtActive,
              ]}
            >
              Posts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => selectTab("saved")}
            style={[styles.tabBtn, tab === "saved" && styles.tabBtnActive]}
          >
            <Feather
              name="bookmark"
              size={16}
              color={tab === "saved" ? MW.green : MW.subtle}
            />
            <Text
              style={[
                styles.tabTxt,
                tab === "saved" && styles.tabTxtActive,
              ]}
            >
              Opgeslagen
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab content */}
        {tab === "posts" && (
          <View style={styles.gridWrap}>
            {posts.map((p) => (
              <PostTile key={p.id} post={p} onOpen={() => setPreviewPost(p)} />
            ))}
            {posts.length === 0 && (
              <Text style={styles.emptyText}>Nog geen posts geplaatst.</Text>
            )}
          </View>
        )}

        {tab === "saved" && (
          <View style={styles.gridWrap}>
            {savedPosts.map((p) => (
              <PostTile key={p.id} post={p} onOpen={() => setPreviewPost(p)} />
            ))}
            {savedPosts.length === 0 && (
              <Text style={styles.emptyText}>Je hebt nog niets opgeslagen.</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Edit modal */}
      <Modal
        visible={editOpen}
        animationType="slide"
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.editContainer}>
          <View style={styles.editHeader}>
            <TouchableOpacity
              onPress={() => setEditOpen(false)}
              style={{ padding: 6 }}
            >
              <Feather name="x" size={22} color={MW.sub} />
            </TouchableOpacity>
            <Text style={styles.editTitle}>Profiel bewerken</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          >
            <Text style={styles.editLabel}>Naam</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Je naam"
              placeholderTextColor={MW.subtle}
              style={styles.editInput}
            />

            <Text style={styles.editLabel}>Bio</Text>
            <TextInput
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Korte bio"
              placeholderTextColor={MW.subtle}
              style={[styles.editInput, styles.editArea]}
              multiline
            />

            <TouchableOpacity
              onPress={saveProfileEdits}
              disabled={savingProfile}
              style={[styles.saveBtn, savingProfile && { opacity: 0.6 }]}
            >
              {savingProfile ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="save" size={16} color="#fff" />
                  <Text style={styles.saveBtnTxt}>Opslaan</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Instellingen modal */}
      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={async () => {
          try {
            await signOut();
          } catch {}
        }}
      />

      {/* Post preview */}
      <PostPreviewModal
        visible={!!previewPost}
        post={previewPost}
        onClose={() => setPreviewPost(null)}
      />
    </View>
  );
}

/* -----------------------------
   Styles
------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MW.bg },

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
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  topCard: {
    marginTop: 10,
    marginHorizontal: 16,
    padding: 14,
    backgroundColor: MW.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MW.border,
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E5E7EB",
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    backgroundColor: MW.blue,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  displayName: {
    fontSize: 18,
    fontWeight: "900",
    color: MW.text,
  },
  username: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: MW.subtle,
  },
  metaLine: {
    marginTop: 2,
    fontSize: 12,
    color: MW.sub,
    fontWeight: "600",
  },
  bio: {
    marginTop: 10,
    fontSize: 13,
    color: MW.text,
    lineHeight: 18,
  },

  proBanner: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#E9F8E2",
    borderWidth: 1,
    borderColor: "rgba(101,177,10,0.25)",
  },
  proIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MW.green,
    alignItems: "center",
    justifyContent: "center",
  },
  proTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: MW.green,
  },
  proSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: MW.sub,
  },

  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#E9F8E2",
    borderWidth: 1,
    borderColor: "rgba(101,177,10,0.25)",
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: MW.green,
  },

  statsRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: MW.soft,
    borderRadius: 14,
    paddingVertical: 8,
  },
  statBlock: { alignItems: "center", flex: 1 },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    color: MW.text,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: MW.subtle,
  },
  statsDivider: {
    width: 1,
    height: 28,
    backgroundColor: MW.border,
  },

  topCardActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MW.border,
    backgroundColor: MW.soft,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editBtnTxt: {
    fontSize: 12,
    fontWeight: "800",
    color: MW.green,
  },

  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: MW.soft,
    borderWidth: 1,
    borderColor: MW.border,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: {
    backgroundColor: "#E9F8E2",
    borderColor: "rgba(101,177,10,0.25)",
  },
  tabTxt: {
    fontSize: 12,
    fontWeight: "800",
    color: MW.subtle,
  },
  tabTxtActive: {
    color: MW.green,
  },

  gridWrap: {
    marginTop: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  postTile: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  postTileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  videoBadge: {
    position: "absolute",
    right: 6,
    top: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  emptyText: {
    marginTop: 12,
    fontSize: 13,
    color: MW.subtle,
  },

  // edit modal
  editContainer: { flex: 1, backgroundColor: "#F3F4F6" },
  editHeader: {
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MW.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: MW.text,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: MW.sub,
    marginTop: 10,
    marginBottom: 4,
  },
  editInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MW.border,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: MW.text,
  },
  editArea: {
    height: 110,
    textAlignVertical: "top",
    paddingTop: 8,
  },
  saveBtn: {
    marginTop: 18,
    backgroundColor: MW.green,
    borderRadius: 999,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  saveBtnTxt: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },

  // preview modal
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 16,
  },
  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 320,
    backgroundColor: "#111",
  },
  previewCaption: {
    fontSize: 14,
    fontWeight: "700",
    color: MW.text,
  },
  previewMetaRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  previewMeta: {
    fontSize: 12,
    fontWeight: "800",
    color: MW.sub,
  },
  previewMetaSmall: {
    fontSize: 11,
    color: MW.subtle,
    fontWeight: "700",
    marginLeft: "auto",
  },

  /* ---------- Settings modal styles ---------- */
  settingsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  settingsCard: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingTop: 8,
    overflow: "hidden",
  },
  settingsHandleWrap: { alignItems: "center", paddingVertical: 6 },
  settingsHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
  },

  settingsTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: MW.text,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  settingsItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingsLabel: { fontSize: 14, fontWeight: "700", color: MW.text },

  settingsItemDanger: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF5F6",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: MW.border,
  },
  settingsLabelDanger: { fontSize: 14, fontWeight: "800", color: MW.red },

  settingsCloseBtn: {
    marginTop: 4,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: MW.soft,
    borderWidth: 1,
    borderColor: MW.border,
    marginBottom: 8,
  },
  settingsCloseText: { fontSize: 12, fontWeight: "800", color: MW.sub },
});
