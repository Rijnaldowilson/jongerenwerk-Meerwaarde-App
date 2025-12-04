// app/(tabs)/index.tsx

import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ResizeMode, Video } from "expo-av";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import PagerView from "react-native-pager-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../auth/context";
import { supabase } from "../../lib/supabase";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const TAB_BASE_HEIGHT = 58;
const HEADER_H = 52;
const PAGE_SIZE = 8;

// ✅ vaste fallback avatar overal
const DEFAULT_AVATAR = "https://i.pravatar.cc/160?img=10";

/* ---------- Types ---------- */
type AppRole = "jongerenwerker" | "manager" | "jongere" | "admin" | null;

type ProfileMini = {
  id: string;
  role: AppRole;
  photo_url: string | null;
  display_name: string | null;
};

type PostRow = {
  id: string;
  uid: string;
  type: "video" | "image";
  uri: string;
  description: string | null;
  user_display: string | null;
  likes: number | null;
  comments_count: number | null;
  created_at: string;
  profiles?: ProfileMini | null; // join
};

type FeedItem = {
  id: string;
  ownerId: string;
  type: "video" | "image";
  uri: string;
  user: string;
  description: string;
  likes: number;
  comments: number;
  liked?: boolean;
  createdAt?: string;

  ownerPhotoUrl?: string | null;
  ownerRole?: AppRole;
  ownerDisplayName?: string | null;
};

type Avatar = { id: string; name: string; photo: string };

type ReplyType = {
  id: string;
  name: string;
  avatar: string;
  text: string;
  time: string;
  likes: number;
  liked?: boolean;
};

type CommentType = {
  id: string;
  name: string;
  avatar: string;
  text: string;
  likes: number;
  liked?: boolean;
  time: string;
  replies?: ReplyType[];
  collapsed?: boolean;
};

// ✅ nodig voor replies query
type ReplyRow = {
  id: string;
  comment_id: string;
  post_id: string;
  uid: string;
  name: string | null;
  avatar: string | null;
  text: string;
  likes: number | null;
  created_at: string;
};

/* =============================== UTIL =============================== */

const useItemLayout = () =>
  useMemo(
    () => (_: unknown, i: number) => ({
      length: SCREEN_H,
      offset: SCREEN_H * i,
      index: i,
    }),
    []
  );

function timeAgoISO(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "nu";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} u`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString();
}

function renderWithMentions(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return (
    <Text>
      {parts.map((p, i) =>
        p.startsWith("@") ? (
          <Text key={i} style={styles.mention}>
            {p}
          </Text>
        ) : (
          <Text key={i} style={styles.commentText}>
            {p}
          </Text>
        )
      )}
    </Text>
  );
}

/** Base64 → Uint8Array */
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

/** Geldige UUID check */
function isValidUUID(id?: string | null): id is string {
  return (
    !!id &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      id
    )
  );
}

/** Canonical role (vangt legacy 'worker') */
function canonRole(r: any): AppRole {
  if (!r) return null;
  if (r === "worker") return "jongerenwerker";
  return r as AppRole;
}

/** Zorgt dat er een profiles rij is voor de huidige gebruiker */
async function ensureProfile(userId: string) {
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!prof) {
      const { error } = await supabase.from("profiles").insert({
        id: userId,
        display_name: null,
        photo_url: null,
        role: "jongere",
      });
      if (error && error.code !== "23505") throw error;
    }
  } catch (e) {
    console.warn("ensureProfile warn:", e);
  }
}

/** Raad extensie uit een URI */
function guessExt(uri: string, fallback: "jpg" | "mp4") {
  const m = uri.split("?")[0].match(/\.([a-z0-9]+)$/i);
  if (!m) return fallback;
  const ext = m[1].toLowerCase();
  if (["jpeg", "jpg", "png", "webp", "heic"].includes(ext))
    return ext === "jpeg" ? "jpg" : ext;
  if (["mp4", "mov", "m4v", "webm"].includes(ext)) return ext;
  return fallback;
}

/* ========================== FULLSCREEN OVERLAY (Explore) ========================== */
const FullscreenCard = memo(function FullscreenCard({
  item,
  onClose,
}: {
  item: FeedItem;
  onClose: () => void;
}) {
  const videoRef = useRef<Video | null>(null);

  useEffect(() => {
    if (item.type === "video" && videoRef.current?.playAsync) {
      videoRef.current.playAsync().catch(() => {});
    }
    return () => {
      videoRef.current?.stopAsync?.().catch(() => {});
    };
  }, [item]);

  return (
    <View style={styles.fullscreenWrap}>
      {item.type === "video" ? (
        <Video
          ref={videoRef}
          source={{ uri: item.uri }}
          style={styles.fullscreenMedia}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
          isMuted={false}
          useNativeControls={false}
        />
      ) : (
        <Image source={{ uri: item.uri }} style={styles.fullscreenMedia} />
      )}
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeTxt}>✕</Text>
      </TouchableOpacity>
    </View>
  );
});

/* =============================== EXPLORE GRID =============================== */
function ExploreGrid({
  onOpen,
  posts,
}: {
  onOpen: (item: FeedItem) => void;
  posts: FeedItem[];
}) {
  const GAP = 6;
  const cardW = (SCREEN_W - GAP * 4) / 3;
  const cardH = Math.round(cardW * 1.2);
  const grid = posts.slice(0, 50);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return grid;
    return grid.filter((p) => {
      const d = p.description?.toLowerCase() ?? "";
      const u = p.user?.toLowerCase() ?? "";
      return d.includes(q) || u.includes(q);
    });
  }, [grid, query]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.exploreSearchWrap}>
        <TextInput
          placeholder="Zoek op gebruiker of tekst…"
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          style={styles.exploreSearchInput}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        numColumns={3}
        contentContainerStyle={{ padding: GAP, paddingTop: HEADER_H + 56 }}
        columnWrapperStyle={{ gap: GAP }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onOpen(item)}
            style={{
              width: cardW,
              height: cardH,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: "#111",
            }}
          >
            {item.type === "video" ? (
              <Video
                source={{ uri: item.uri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode={ResizeMode.COVER}
                isMuted
                shouldPlay={false}
                useNativeControls={false}
              />
            ) : (
              <Image
                source={{ uri: item.uri }}
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ color: "#fff", textAlign: "center", marginTop: 28 }}>
            Nog geen content in Verkennen
          </Text>
        }
      />
    </View>
  );
}
/* =============================== STORIES OVERLAY =============================== */
const StoriesOverlay = memo(function StoriesOverlay({
  avatars,
  onPressAvatar,
}: {
  avatars: Avatar[];
  onPressAvatar: (id: string) => void;
}) {
  return (
    <View style={styles.storiesOverlay} pointerEvents="box-none">
      <FlatList
        horizontal
        data={avatars}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.storiesContent}
        renderItem={({ item: av }) => (
          <TouchableOpacity
            style={styles.storyItem}
            onPress={() => onPressAvatar(av.id)}
          >
            <View style={styles.storyRing}>
              <Image source={{ uri: av.photo }} style={styles.storyImg} />
            </View>
            <Text numberOfLines={1} style={styles.storyName}>
              {av.name}
            </Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
});

/* =============================== COMMENT SHEET =============================== */
function CommentSheet({
  visible,
  onClose,
  postId,
  comments,
  onSubmit,
  onToggleCommentLike,
  onToggleReplyLike,
  onToggleCollapse,
  onReplyTo,
  replyingTo,
  onDelete,
  onReport,
  canDeleteOwn,
}: {
  visible: boolean;
  onClose: () => void;
  postId: string | null;
  comments: CommentType[];
  onSubmit: (text: string) => void;
  onToggleCommentLike: (commentId: string) => void;
  onToggleReplyLike: (commentId: string, replyId: string) => void;
  onToggleCollapse: (commentId: string) => void;
  onReplyTo: (commentId: string, name: string) => void;
  replyingTo: { commentId: string; name: string } | null;
  onDelete: (
    type: "comment" | "reply",
    ids: { commentId: string; replyId?: string }
  ) => void;
  onReport: (
    type: "comment" | "reply",
    ids: { commentId: string; replyId?: string }
  ) => void;
  canDeleteOwn: (authorName: string) => boolean;
}) {
  const insets = useSafeAreaInsets();
  const [inlineTextByComment, setInlineTextByComment] = useState<
    Record<string, string>
  >({});
  const [composerText, setComposerText] = useState("");
  const [actionFor, setActionFor] = useState<
    | null
    | {
        type: "comment" | "reply";
        commentId: string;
        replyId?: string;
        text: string;
        author: string;
      }
  >(null);

  useEffect(() => {
    if (!visible) {
      setInlineTextByComment({});
      setComposerText("");
      setActionFor(null);
    }
  }, [visible]);

  const setInlineText = (commentId: string, val: string) =>
    setInlineTextByComment((p) => ({ ...p, [commentId]: val }));

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
    } catch {}
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheetCard, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.sheetHandleWrap}>
          <View style={styles.sheetHandle} />
        </View>
        <Text style={styles.sheetTitle}>Reacties</Text>

        <FlatList
          data={comments}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
          style={{ maxHeight: SCREEN_H * 0.62 }}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 10 }}>
              <View style={styles.commentRow}>
                <Image
                  source={{ uri: item.avatar || DEFAULT_AVATAR }}
                  style={styles.commentAvatarImg}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.commentHeaderRow}>
                    <Text style={styles.commentName}>{item.name}</Text>
                    <Text style={styles.commentTime}>{item.time}</Text>
                  </View>

                  <Pressable
                    onLongPress={() =>
                      setActionFor({
                        type: "comment",
                        commentId: item.id,
                        text: item.text,
                        author: item.name,
                      })
                    }
                    style={{ marginTop: 2 }}
                  >
                    {renderWithMentions(item.text)}
                  </Pressable>

                  <View style={styles.commentActionRow}>
                    <TouchableOpacity
                      onPress={() => onReplyTo(item.id, item.name)}
                    >
                      <Text style={styles.commentReply}>Beantwoorden</Text>
                    </TouchableOpacity>
                    {!!item.replies?.length && (
                      <TouchableOpacity
                        onPress={() => onToggleCollapse(item.id)}
                      >
                        <Text style={styles.commentReply}>
                          {item.collapsed
                            ? `Toon ${item.replies.length} antwoorden`
                            : "Verberg antwoorden"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {replyingTo?.commentId === item.id && (
                    <View style={styles.inlineInputRow}>
                      <TextInput
                        placeholder={`Reageren op @${replyingTo.name}…`}
                        placeholderTextColor="#888"
                        style={styles.inlineInput}
                        value={inlineTextByComment[item.id] || ""}
                        onChangeText={(v) => setInlineText(item.id, v)}
                        returnKeyType="send"
                        onSubmitEditing={() => {
                          const send =
                            (inlineTextByComment[item.id] || "").trim();
                          if (!send) return;
                          onSubmit(
                            send.startsWith("@")
                              ? send
                              : `@${replyingTo.name} ${send}`
                          );
                          setInlineText(item.id, "");
                        }}
                      />
                      <TouchableOpacity
                        style={styles.inlineSend}
                        onPress={() => {
                          const send =
                            (inlineTextByComment[item.id] || "").trim();
                          if (!send) return;
                          onSubmit(
                            send.startsWith("@")
                              ? send
                              : `@${replyingTo.name} ${send}`
                          );
                          setInlineText(item.id, "");
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>
                          Plaats
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={{ alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => onToggleCommentLike(item.id)}
                    style={styles.commentLikeWrap}
                  >
                    <Text
                      style={[
                        styles.commentLikeIcon,
                        item.liked && { color: "#e11d48" },
                      ]}
                    >
                      ♥
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.commentLikeCount}>{item.likes}</Text>
                </View>
              </View>

              {!item.collapsed && !!item.replies?.length && (
                <View style={{ marginLeft: 44, marginTop: 6 }}>
                  {item.replies.map((r) => (
                    <View key={r.id} style={styles.replyRow}>
                      <Image
                        source={{ uri: r.avatar || DEFAULT_AVATAR }}
                        style={styles.replyAvatarImg}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={styles.commentHeaderRow}>
                          <Text style={styles.commentName}>{r.name}</Text>
                          <Text style={styles.commentTime}>{r.time}</Text>
                        </View>

                        <Pressable
                          onLongPress={() =>
                            setActionFor({
                              type: "reply",
                              commentId: item.id,
                              replyId: r.id,
                              text: r.text,
                              author: r.name,
                            })
                          }
                          style={{ marginTop: 2 }}
                        >
                          {renderWithMentions(r.text)}
                        </Pressable>

                        <View style={styles.commentActionRow}>
                          <TouchableOpacity
                            onPress={() => onReplyTo(item.id, r.name)}
                          >
                            <Text style={styles.commentReply}>Beantwoorden</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{ alignItems: "center" }}>
                        <TouchableOpacity
                          onPress={() => onToggleReplyLike(item.id, r.id)}
                          style={styles.commentLikeWrap}
                        >
                          <Text
                            style={[
                              styles.commentLikeIcon,
                              r.liked && { color: "#e11d48" },
                            ]}
                          >
                            ♥
                          </Text>
                        </TouchableOpacity>
                        <Text style={styles.commentLikeCount}>{r.likes}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.commentEmpty}>
              Nog geen reacties — wees de eerste!
            </Text>
          }
        />
        {!replyingTo && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Voeg een reactie toe…"
                placeholderTextColor="#888"
                style={styles.input}
                value={composerText}
                onChangeText={setComposerText}
                onSubmitEditing={() => {
                  const t = composerText.trim();
                  if (t) {
                    onSubmit(t);
                    setComposerText("");
                  }
                }}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={() => {
                  const t = composerText.trim();
                  if (!t) return;
                  onSubmit(t);
                  setComposerText("");
                }}
                style={[
                  styles.sendBtn,
                  !composerText.trim() && { opacity: 0.5 },
                ]}
                disabled={!composerText.trim()}
              >
                <Text style={styles.sendBtnText}>Plaats</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>

      {actionFor && (
        <>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setActionFor(null)}
          />
          <View
            style={[styles.actionCard, { paddingBottom: insets.bottom + 4 }]}
          >
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                copyToClipboard(actionFor.text);
                setActionFor(null);
              }}
            >
              <Text style={styles.actionLabel}>Kopiëren</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                onReport(actionFor.type, {
                  commentId: actionFor.commentId,
                  replyId: actionFor.replyId,
                });
                setActionFor(null);
              }}
            >
              <Text style={styles.actionLabel}>Rapporteren</Text>
            </TouchableOpacity>

            {canDeleteOwn(actionFor.author) && (
              <TouchableOpacity
                style={styles.actionItemDanger}
                onPress={() => {
                  onDelete(actionFor.type, {
                    commentId: actionFor.commentId,
                    replyId: actionFor.replyId,
                  });
                  setActionFor(null);
                }}
              >
                <Text style={styles.actionLabelDanger}>Verwijderen</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionCancel}
              onPress={() => setActionFor(null)}
            >
              <Text style={styles.actionCancelLabel}>Annuleer</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </Modal>
  );
}

/* =============================== PROFILE ACTION SHEET =============================== */
const ProfileActionSheet = memo(function ProfileActionSheet({
  visible,
  onClose,
  item,
  isFriend,
  onToggleFriend,
  onViewProfile,
}: {
  visible: boolean;
  onClose: () => void;
  item: FeedItem | null;
  isFriend: boolean;
  onToggleFriend: () => void;
  onViewProfile: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!item) return null;

  const avatarUrl = item.ownerPhotoUrl || DEFAULT_AVATAR;
  const isWorker = item.ownerRole === "jongerenwerker";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.profileSheet, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.sheetHandleWrap}>
          <View style={styles.sheetHandle} />
        </View>

        <View style={styles.profileSheetHeader}>
          <Image source={{ uri: avatarUrl }} style={styles.profileSheetAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileSheetName}>
              {item.ownerDisplayName || item.user || "Gebruiker"}
            </Text>
            <Text style={styles.profileSheetRole}>
              {isWorker ? "Jongerenwerker" : "Gebruiker"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.profileSheetItem}
          onPress={() => {
            onToggleFriend();
            onClose();
          }}
        >
          <Text style={styles.profileSheetItemTxt}>
            {isFriend ? "Ontvrienden" : "Vriend worden"}
          </Text>
        </TouchableOpacity>

        {isWorker && (
          <TouchableOpacity
            style={styles.profileSheetItem}
            onPress={() => {
              onViewProfile();
              onClose();
            }}
          >
            <Text style={styles.profileSheetItemTxt}>Bekijk profiel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.profileSheetCancel} onPress={onClose}>
          <Text style={styles.profileSheetCancelTxt}>Sluiten</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

/* =============================== FEED CARD =============================== */
const FeedCard = memo(function FeedCard({
  item,
  isActive,
  overlayBottom,
  onToggleLike,
  onOpenComments,
  onDoubleTapLike,
  onShare,
  onToggleSave,
  saved,
  following,
  onToggleFollow,
  meId,
  onDeletePost,
  onOpenOwnerProfile,
  onOpenProfileActions,
  onDM,
  canDMWithItem, // wordt niet meer gebruikt maar laten we staan voor compatibiliteit
}: {
  item: FeedItem;
  isActive: boolean;
  overlayBottom: number;
  onToggleLike: (post: FeedItem) => void;
  onOpenComments: () => void;
  onDoubleTapLike: (post: FeedItem) => void;
  onShare: (post: FeedItem) => void;
  onToggleSave: (post: FeedItem) => void;
  saved: boolean;
  following: boolean;
  onToggleFollow: (creatorId: string, wantFollow: boolean) => void;
  meId?: string | null;
  onDeletePost: (post: FeedItem) => void;
  onOpenOwnerProfile: (ownerId: string) => void;
  onOpenProfileActions: (item: FeedItem) => void;
  onDM?: (post: FeedItem) => void;
  canDMWithItem: (item: FeedItem) => boolean;
}) {
  const lastTap = useRef<number>(0);
  const [ready, setReady] = useState(item.type === "image");
  const infoBottom = overlayBottom + 20;

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) onDoubleTapLike(item);
    lastTap.current = now;
  };

 const isMine = !!meId && item.ownerId === meId;
const canFollow = !!item.ownerId; // altijd plus tonen zolang er een ownerId is

  const avatarUrl = item.ownerPhotoUrl || DEFAULT_AVATAR;
  const ownerIsWorker = item.ownerRole === "jongerenwerker";

  return (
    <Pressable
      onPress={handleTap}
      onLongPress={() => {
        if (isMine) onDeletePost(item);
      }}
      style={styles.item}
    >
      {/* Media */}
      {item.type === "video" ? (
        <>
          <Video
            source={{ uri: item.uri }}
            style={styles.media}
            isLooping
            shouldPlay={isActive}
            resizeMode={ResizeMode.COVER}
            isMuted={false}
            rate={1.0}
            volume={1.0}
            useNativeControls={false}
            onLoadStart={() => setReady(false)}
            onLoad={() => setReady(true)}
            onReadyForDisplay={() => setReady(true)}
            onError={() => setReady(true)}
          />
          {!ready && (
            <View
              style={[
                StyleSheet.absoluteFill,
                { justifyContent: "center", alignItems: "center" },
              ]}
            >
              <ActivityIndicator />
            </View>
          )}
        </>
      ) : (
        <Image source={{ uri: item.uri }} style={styles.media} />
      )}

      {/* Linker kant: naam + beschrijving */}
      <View style={[styles.overlayLeft, { bottom: infoBottom }]}>
        <View
          style={[
            styles.pillWhite,
            { flexDirection: "row", alignItems: "center", gap: 8 },
          ]}
        >
          <Text style={styles.user}>@ {item.user}</Text>
        </View>

        {!!item.description && (
          <View style={[styles.pillWhite, { marginTop: 6 }]}>
            <Text style={styles.descDark} numberOfLines={3}>
              {item.description}
            </Text>
          </View>
        )}
      </View>

      {/* Rechter kant: avatar + volgen + DM + acties */}
      <View style={[styles.overlayRight, { bottom: overlayBottom }]}>
        {/* Avatar + volg-plusje */}
        <View style={styles.profileFollowWrap}>
          {/* Avatar zelf → profiel / action sheet */}
          <Pressable
            onPress={() => onOpenProfileActions(item)}
            hitSlop={10}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View
              style={[
                styles.profileCircle,
                ownerIsWorker && { borderColor: "#65B10A" },
              ]}
            >
              <Image source={{ uri: avatarUrl }} style={styles.profileImage} />
            </View>
          </Pressable>

         {canFollow && (
  <TouchableOpacity
    onPress={() => {
      if (isMine) {
        Alert.alert("Niet mogelijk", "Je kunt jezelf niet volgen.");
        return;
      }
      onToggleFollow(item.ownerId, !following);
    }}
    style={[
      styles.profilePlus,
      following && styles.profilePlusFollowing,
    ]}
  >
    <FontAwesome5
      name={following ? "check" : "plus"}
      size={12}
      color="#fff"
    />
  </TouchableOpacity>
)}

        </View>

        {/* DM-knop: altijd tonen als onDM bestaat en er een ownerId is.
            Niet naar jezelf sturen wordt afgehandeld in startDMFromFeed. */}
        {onDM && item.ownerId && (
          <TouchableOpacity
            onPress={() => onDM(item)}
            style={styles.actionBtn}
          >
            <FontAwesome5 name="paper-plane" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Like-knop */}
        <TouchableOpacity
          onPress={() => onToggleLike(item)}
          style={styles.actionBtn}
        >
          <FontAwesome5
            name="heart"
            size={28}
            color={item.liked ? "#e11d48" : "#fff"}
          />
          <Text style={styles.actionTextLight}>{item.likes}</Text>
        </TouchableOpacity>

        {/* Comments-knop */}
        <TouchableOpacity onPress={onOpenComments} style={styles.actionBtn}>
          <FontAwesome5 name="comment-dots" size={26} color="#fff" />
          <Text style={styles.actionTextLight}>{item.comments}</Text>
        </TouchableOpacity>

        {/* Opslaan */}
        <TouchableOpacity
          onPress={() => onToggleSave(item)}
          style={styles.actionBtn}
        >
          <FontAwesome5
            name="bookmark"
            size={24}
            color={saved ? "#65B10A" : "#fff"}
          />
        </TouchableOpacity>

        {/* Delen */}
        <TouchableOpacity onPress={() => onShare(item)} style={styles.actionBtn}>
          <FontAwesome5 name="share" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
});

/* =============================== VERTICAL FEED =============================== */

  

function VerticalFeed({
  data,
  active,
  setActive,
  bottomInset,
  showStories,
  avatars,
  openWorker,
  onToggleLikeServer,
  loadCommentsFor,
  addCommentServer,
  onShare,
  onToggleSave,
  savedSet,
  onLoadMore,
  hasMore,
  loadingMore,
  deleteCommentServer,
  reportComment,
  followingSet,
  onToggleFollowServer,
  meId,
  deletePostServer,
  openOwnerProfile,
  onOpenProfileActions,
  onDMFromFeed,
  canDMWithItem,
  meName,
  meAvatar,
}: {
  data: FeedItem[];
  active: number;
  setActive: (i: number) => void;
  bottomInset: number;
  showStories?: boolean;
  avatars: Avatar[];
  openWorker: (id: string) => void;
  onToggleLikeServer: (post: FeedItem) => void;
  loadCommentsFor: (postId: string) => Promise<CommentType[]>;
  addCommentServer: (postId: string, text: string) => Promise<void>;
  onShare: (post: FeedItem) => void;
  onToggleSave: (post: FeedItem) => void;
  savedSet: Set<string>;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  deleteCommentServer: (postId: string, commentId: string) => Promise<boolean>;
  reportComment: (postId: string, commentId: string) => Promise<void>;
  followingSet: Set<string>;
  onToggleFollowServer: (creatorId: string, wantFollow: boolean) => void;
  meId?: string | null;
  deletePostServer: (post: FeedItem) => void;
  openOwnerProfile: (ownerId: string) => void;
  onOpenProfileActions: (item: FeedItem) => void;
  onDMFromFeed: (item: FeedItem) => void;
  canDMWithItem: (item: FeedItem) => boolean;
  meName: string;
  meAvatar: string;
}) {
  const listRef = useRef<FlatList<FeedItem>>(null);
  const getItemLayout = useItemLayout();

  const [local, setLocal] = useState<FeedItem[]>(data.map((x) => ({ ...x })));
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentType[]>>(
    {}
  );
  const [openItem, setOpenItem] = useState<FeedItem | null>(null);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    setLocal(data.map((x) => ({ ...x })));
  }, [data]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const newIndex = Math.round(y / SCREEN_H);
    if (newIndex !== active) setActive(newIndex);
  };

  const overlayBottom = bottomInset + TAB_BASE_HEIGHT + 24 + 64;

  const toggleLikeLocal = (post: FeedItem) => {
    const nextLiked = !post.liked;

    setLocal((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              liked: nextLiked,
              likes: nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
            }
          : p
      )
    );

    onToggleLikeServer({ ...post, liked: nextLiked });
  };

  const doubleTapLikeLocal = (post: FeedItem) => {
    if (post.liked) return;

    setLocal((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, liked: true, likes: p.likes + 1 } : p
      )
    );

    onToggleLikeServer({ ...post, liked: true });
  };

  const openCommentsFor = async (item: FeedItem) => {
    setReplyingTo(null);
    setOpenItem(item);
    if (!commentsMap[item.id]) {
      const fetched = await loadCommentsFor(item.id);
      setCommentsMap((p) => ({ ...p, [item.id]: fetched }));
    }
  };

  const closeComments = () => {
    setOpenItem(null);
    setReplyingTo(null);
  };

  const onReplyTo = (commentId: string, name: string) =>
    setReplyingTo({ commentId, name });

  // ✅ COMMENT / REPLY PLAATSEN
  const addCommentOrReply = async (text: string) => {
    if (!openItem) return;
    const pid = openItem.id;
    const trimmed = text.trim();
    if (!trimmed) return;

    // REPLY
    if (replyingTo) {
      try {
        if (!meId) {
          Alert.alert("Inloggen nodig", "Log in om te reageren.");
          return;
        }

        await ensureProfile(meId);

        const name = meName || "Gebruiker";
        const avatar = meAvatar || DEFAULT_AVATAR;

        const { data, error } = await supabase
          .from("comment_replies")
          .insert({
            post_id: pid,
            comment_id: replyingTo.commentId,
            uid: meId,
            name,
            avatar,
            text: trimmed,
            likes: 0,
          })
          .select("id")
          .single();

        if (error) throw error;

        const newReply: ReplyType = {
          id: data?.id ?? `${replyingTo.commentId}_${Date.now()}`,
          name,
          avatar,
          text: trimmed,
          likes: 0,
          liked: false,
          time: "nu",
        };

        setCommentsMap((prev) => {
          const current = prev[pid] ? [...prev[pid]] : [];
          const idx = current.findIndex((c) => c.id === replyingTo.commentId);
          if (idx < 0) return prev;

          const base = current[idx];
          const updated: CommentType = {
            ...base,
            replies: [...(base.replies || []), newReply],
            collapsed: false,
          };

          current[idx] = updated;
          return { ...prev, [pid]: current };
        });

        setReplyingTo(null);
      } catch (e: any) {
        Alert.alert(
          "Reactie mislukt",
          e?.message ?? "Kon antwoord niet plaatsen."
        );
      }

      return;
    }

    // NORMALE COMMENT
    await addCommentServer(pid, trimmed);

    const newC: CommentType = {
      id: `${pid}_${Date.now()}`,
      name: meName,
      avatar: meAvatar,
      text: trimmed,
      likes: 0,
      liked: false,
      time: "nu",
      replies: [],
      collapsed: false,
    };

    setCommentsMap((prev) => {
      const arr = prev[pid] ? [newC, ...prev[pid]] : [newC];
      return { ...prev, [pid]: arr };
    });

    setLocal((prev) =>
      prev.map((it) =>
        it.id === pid ? { ...it, comments: it.comments + 1 } : it
      )
    );
  };

  // ✅ COMMENT LIKE
  const toggleCommentLike = async (commentId: string) => {
    if (!openItem || !meId) return;
    const pid = openItem.id;

    const currentList = commentsMap[pid] || [];
    const idx = currentList.findIndex((c) => c.id === commentId);
    if (idx < 0) return;

    const comment = currentList[idx];
    const wantLike = !comment.liked;
    const nextLikes = Math.max(0, comment.likes + (wantLike ? 1 : -1));

    // Optimistic UI
    setCommentsMap((prev) => {
      const list = prev[pid] ? [...prev[pid]] : [];
      const i = list.findIndex((c) => c.id === commentId);
      if (i < 0) return prev;
      list[i] = { ...list[i], liked: wantLike, likes: nextLikes };
      return { ...prev, [pid]: list };
    });

    try {
      if (wantLike) {
        const { error } = await supabase.from("comment_likes").insert({
          comment_id: commentId,
          uid: meId,
        });
        if (error && error.code !== "23505") throw error;

        await supabase
          .from("comments")
          .update({ likes: nextLikes })
          .eq("id", commentId);
      } else {
        await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("uid", meId);

        await supabase
          .from("comments")
          .update({ likes: nextLikes })
          .eq("id", commentId);
      }
    } catch (e) {
      console.warn("toggleCommentLike error", e);
    }
  };

  // ✅ REPLY LIKE
  const toggleReplyLike = async (commentId: string, replyId: string) => {
    if (!openItem || !meId) return;
    const pid = openItem.id;

    const currentList = commentsMap[pid] || [];
    const cIdx = currentList.findIndex((c) => c.id === commentId);
    if (cIdx < 0) return;

    const comment = currentList[cIdx];
    const replies = comment.replies || [];
    const rIdx = replies.findIndex((r) => r.id === replyId);
    if (rIdx < 0) return;

    const reply = replies[rIdx];
    const wantLike = !reply.liked;
    const nextLikes = Math.max(0, reply.likes + (wantLike ? 1 : -1));

    // Optimistic UI
    setCommentsMap((prev) => {
      const list = prev[pid] ? [...prev[pid]] : [];
      const ci = list.findIndex((c) => c.id === commentId);
      if (ci < 0) return prev;

      const base = list[ci];
      const reps = base.replies ? [...base.replies] : [];
      const ri = reps.findIndex((r) => r.id === replyId);
      if (ri < 0) return prev;

      reps[ri] = { ...reps[ri], liked: wantLike, likes: nextLikes };
      list[ci] = { ...base, replies: reps };

      return { ...prev, [pid]: list };
    });

    try {
      if (wantLike) {
        const { error } = await supabase.from("reply_likes").insert({
          reply_id: replyId,
          uid: meId,
        });
        if (error && error.code !== "23505") throw error;

        await supabase
          .from("comment_replies")
          .update({ likes: nextLikes })
          .eq("id", replyId);
      } else {
        await supabase
          .from("reply_likes")
          .delete()
          .eq("reply_id", replyId)
          .eq("uid", meId);

        await supabase
          .from("comment_replies")
          .update({ likes: nextLikes })
          .eq("id", replyId);
      }
    } catch (e) {
      console.warn("toggleReplyLike error", e);
    }
  };

  const removeCommentLocal = (pid: string, commentId: string) => {
    setCommentsMap((prev) => {
      const arr = prev[pid]
        ? prev[pid].filter((c) => c.id !== commentId)
        : [];
      return { ...prev, [pid]: arr };
    });
    setLocal((prev) =>
      prev.map((it) =>
        it.id === pid
          ? { ...it, comments: Math.max(0, it.comments - 1) }
          : it
      )
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        data={local}
        keyExtractor={(it) => it.id}
        renderItem={({ item, index }) => (
          <FeedCard
            item={item}
            isActive={index === active}
            overlayBottom={overlayBottom}
            onToggleLike={toggleLikeLocal}
            onDoubleTapLike={doubleTapLikeLocal}
            onOpenComments={() => openCommentsFor(item)}
            onShare={onShare}
            onToggleSave={onToggleSave}
            saved={savedSet.has(item.id)}
            following={!!item.ownerId && followingSet.has(item.ownerId)}
            onToggleFollow={onToggleFollowServer}
            meId={meId}
            onDeletePost={deletePostServer}
            onOpenOwnerProfile={openOwnerProfile}
            onOpenProfileActions={onOpenProfileActions}
            onDM={onDMFromFeed}
            canDMWithItem={canDMWithItem}
          />
        )}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
        getItemLayout={getItemLayout}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        decelerationRate="fast"
        snapToInterval={SCREEN_H}
        snapToAlignment="start"
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (hasMore && !loadingMore) onLoadMore();
        }}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 14 }}>
              <ActivityIndicator color="#65B10A" />
            </View>
          ) : !hasMore ? (
            <Text
              style={{
                color: "#aaa",
                textAlign: "center",
                paddingVertical: 12,
              }}
            >
              — Einde —
            </Text>
          ) : null
        }
      />

      {showStories && (
        <StoriesOverlay avatars={avatars} onPressAvatar={openWorker} />
      )}

      <CommentSheet
        visible={!!openItem}
        onClose={closeComments}
        postId={openItem?.id ?? null}
        comments={openItem ? commentsMap[openItem.id] || [] : []}
        onSubmit={addCommentOrReply}
        onToggleCommentLike={toggleCommentLike}
        onToggleReplyLike={toggleReplyLike}
        onToggleCollapse={(cid) =>
          setCommentsMap((prev) => {
            if (!openItem) return prev;
            const pid = openItem.id;
            const arr = prev[pid] ? [...prev[pid]] : [];
            const idx = arr.findIndex((c) => c.id === cid);
            if (idx >= 0) {
              arr[idx] = { ...arr[idx], collapsed: !arr[idx].collapsed };
            }
            return { ...prev, [pid]: arr };
          })
        }
        onReplyTo={onReplyTo}
        replyingTo={replyingTo}
        canDeleteOwn={(author) => author === meName}
        onDelete={async (_type, ids) => {
          if (!openItem || !ids.commentId) return;
          const ok = await deleteCommentServer(openItem.id, ids.commentId);
          if (ok) removeCommentLocal(openItem.id, ids.commentId);
        }}
        onReport={async (_type, ids) => {
          if (!openItem || !ids.commentId) return;
          await reportComment(openItem.id, ids.commentId);
        }}
      />
    </View>
  );
}

/* =============================== UPLOAD COMPOSER =============================== */
function UploadComposer({
  visible,
  onClose,
  onPosted,
  userDisplay,
  userId,
  userRole,
  userPhotoUrl,
}: {
  visible: boolean;
  onClose: () => void;
  onPosted: (newItem: FeedItem) => void;
  userDisplay: string;
  userId: string;
  userRole: AppRole;
  userPhotoUrl: string | null;
}) {
  const [picked, setPicked] = useState<{
    uri: string;
    type: "image" | "video";
    mime?: string;
  } | null>(null);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setPicked(null);
      setDesc("");
      setLoading(false);
    }
  }, [visible]);

  const ensureProfileWithRole = async () => {
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!prof) {
        const { error } = await supabase.from("profiles").insert({
          id: userId,
          display_name: userDisplay || null,
          photo_url: userPhotoUrl || null,
          role: userRole || "jongere",
        });
        if (error && error.code !== "23505") throw error;
      }
    } catch (e) {
      console.warn("ensureProfileWithRole warn:", e);
    }
  };

  const pick = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Toestemming nodig",
        "Geef toegang tot je galerij om te kunnen uploaden."
      );
      return;
    }

    const IP: any = ImagePicker as any;
    const pickerOptions: any = {
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 60,
      selectionLimit: 1,
    };

    if (IP?.MediaType) {
      pickerOptions.mediaTypes = [IP.MediaType.image, IP.MediaType.video];
    } else if (IP?.MediaTypeOptions) {
      pickerOptions.mediaTypes = IP.MediaTypeOptions.All;
    }

    const res = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;

    const mt = asset.mimeType || asset.type || "";
    const isVideo = /video/i.test(mt);

    setPicked({
      uri: asset.uri,
      type: isVideo ? "video" : "image",
      mime: asset.mimeType || undefined,
    });
  };

  const uploadAndPost = async () => {
    if (!picked) {
      Alert.alert("Geen media", "Kies eerst een foto of video.");
      return;
    }

    setLoading(true);
    try {
      await ensureProfileWithRole();

      const base64 = await FileSystem.readAsStringAsync(picked.uri, {
        encoding: "base64" as any,
      });
      const bytes = base64ToUint8Array(base64);

      const ext =
        picked.type === "image"
          ? (guessExt(picked.uri, "jpg") as "jpg" | "png" | "webp" | "heic")
          : (guessExt(picked.uri, "mp4") as "mp4" | "mov" | "m4v" | "webm");

      const contentType =
        picked.mime ??
        (picked.type === "image"
          ? ext === "jpg"
            ? "image/jpeg"
            : `image/${ext}`
          : ext === "mov"
          ? "video/quicktime"
          : `video/${ext}`);

      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("posts")
        .upload(path, bytes, {
          contentType,
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("posts").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Kon public URL niet ophalen");

      const cleanDisplay = userDisplay?.trim() || "Gebruiker";

      const insert = {
        uid: userId,
        type: picked.type,
        uri: publicUrl,
        description: desc.trim() || null,
        user_display: cleanDisplay,
        likes: 0,
        comments_count: 0,
      };

      const { data: ins, error: insErr } = await supabase
        .from("posts")
        .insert(insert)
        .select("*")
        .single();

      if (insErr) throw insErr;

      const newItem: FeedItem = {
        id: ins.id,
        ownerId: ins.uid,
        type: ins.type,
        uri: ins.uri,
        user: cleanDisplay,
        description: ins.description || "",
        likes: ins.likes ?? 0,
        comments: ins.comments_count ?? 0,
        createdAt: ins.created_at,
        liked: false,
        ownerRole: userRole ?? null,
        ownerPhotoUrl: userPhotoUrl,
        ownerDisplayName: cleanDisplay,
      };

      onPosted(newItem);
      onClose();

      Alert.alert(
        "Geplaatst",
        picked.type === "image" ? "Je foto staat live!" : "Je video staat live!"
      );
    } catch (e: any) {
      Alert.alert("Mislukt", e?.message ?? "Uploaden is niet gelukt.");
      console.warn("UploadComposer error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View
        style={[styles.composeCard, { paddingBottom: insets.bottom + 12 }]}
      >
        <Text style={styles.composeTitle}>Nieuwe post</Text>

        <TouchableOpacity onPress={pick} style={styles.pickBtn}>
          <Text style={styles.pickBtnTxt}>
            {picked ? "Andere kiezen" : "Kies foto of video"}
          </Text>
        </TouchableOpacity>

        <View style={styles.previewBox}>
          {!picked ? (
            <Text style={{ color: "#666" }}>Geen media geselecteerd.</Text>
          ) : picked.type === "image" ? (
            <Image
              source={{ uri: picked.uri }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <Video
              source={{ uri: picked.uri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
              isMuted
              useNativeControls={false}
            />
          )}
        </View>

        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder="Beschrijving toevoegen…"
          placeholderTextColor="#888"
          style={styles.composeInput}
          multiline
          maxLength={240}
        />

        <TouchableOpacity
          onPress={uploadAndPost}
          disabled={loading || !picked}
          style={[styles.postBtn, (!picked || loading) && { opacity: 0.6 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postBtnTxt}>Plaatsen</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
/* =============================== MAIN =============================== */
export default function HomeFeed() {
  const insets = useSafeAreaInsets();
  const _router = useRouter();
  const router = _router as any;

  const { user, profile, role } = useAuth() as any;
  const myRole: AppRole = canonRole(profile?.role ?? role ?? null);
  const likedSetRef = useRef<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const pagerRef = useRef<PagerView>(null);

  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [forYou, setForYou] = useState<FeedItem[]>([]);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [vIdx0, setVIdx0] = useState(0);
  const [vIdx1, setVIdx1] = useState(0);
  const [openExploreItem, setOpenExploreItem] = useState<FeedItem | null>(null);

  const [showComposer, setShowComposer] = useState(false);

  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const SAVED_KEY = "saved_posts";

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastCursorRef = useRef<string | null>(null);

  const [profileSheetItem, setProfileSheetItem] = useState<FeedItem | null>(
    null
  );
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  useEffect(() => {
    likedSetRef.current = likedSet;
  }, [likedSet]);

  /* -------------------- DM: mag ik DM met deze post? -------------------- */
  const canDMWithItem = (item: FeedItem) => {
    if (!user) return false;
    if (!item?.ownerId) return false;

    // nooit naar jezelf
    if (item.ownerId === user.id) return false;

    // manager + admin geen DM vanuit feed (optioneel)
    if (myRole === "manager" || myRole === "admin") return false;

    // verder iedereen onderling mogelijk
    return true;
  };

  /* -------------------- DM: handler -------------------- */
  const startDMFromFeed = async (item: FeedItem) => {
    try {
      if (!user) {
        Alert.alert(
          "Inloggen nodig",
          "Je moet ingelogd zijn om een DM te sturen."
        );
        return;
      }

      if (!item.ownerId) {
        Alert.alert("Onbekende gebruiker", "Deze gebruiker heeft geen ID.");
        return;
      }

      if (item.ownerId === user.id) {
        Alert.alert("Niet mogelijk", "Je kunt geen DM naar jezelf sturen.");
        return;
      }

      const targetId = item.ownerId;
      const targetRole = canonRole(item.ownerRole);

      const meIsYouth = myRole === "jongere";
      const targetIsYouth = targetRole === "jongere";

      // Simpel schema met youth_id & worker_id
      let youthId: string;
      let workerId: string;

      if (meIsYouth) {
        youthId = user.id;
        workerId = targetId;
      } else if (targetIsYouth) {
        youthId = targetId;
        workerId = user.id;
      } else {
        youthId = user.id;
        workerId = targetId;
      }

      // 1) kijk of gesprek al bestaat
      const { data: existing, error: selErr } = await supabase
        .from("conversations")
        .select("id")
        .match({ youth_id: youthId, worker_id: workerId })
        .maybeSingle();

      if (selErr) throw selErr;

      let conversationId: string;

      if (existing?.id) {
        conversationId = existing.id;
      } else {
        // 2) anders nieuw gesprek
        const { data: inserted, error: insErr } = await supabase
          .from("conversations")
          .insert({
            youth_id: youthId,
            worker_id: workerId,
          })
          .select("id")
          .maybeSingle();

        if (insErr) throw insErr;
        if (!inserted?.id) {
          throw new Error("Kon geen nieuw gesprek aanmaken.");
        }

        conversationId = inserted.id;
      }

      const title = item.ownerDisplayName || item.user || "Gesprek";

      // 3) navigeer naar DM screen
      router.push({
        pathname: "../messages/[id]" as const,
        params: { id: conversationId, title },
      });
    } catch (e: any) {
      console.warn(e);
      Alert.alert("DM mislukt", e?.message ?? "Er ging iets mis.");
    }
  };

  /* saved load/persist */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVED_KEY);
        if (raw) setSavedSet(new Set(JSON.parse(raw)));
      } catch {}
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(
          SAVED_KEY,
          JSON.stringify(Array.from(savedSet))
        );
      } catch {}
    })();
  }, [savedSet]);

  // ✅ Live avatar updates
  useEffect(() => {
    const ch = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const p = payload.new as any;
          if (!p?.id) return;

          setPosts((prev) =>
            prev.map((it) =>
              it.ownerId === p.id
                ? {
                    ...it,
                    ownerPhotoUrl: p.photo_url ?? null,
                    ownerDisplayName: p.display_name ?? it.ownerDisplayName,
                    ownerRole: canonRole(p.role) ?? it.ownerRole,
                    user: p.display_name ?? it.user,
                  }
                : it
            )
          );

          setForYou((prev) =>
            prev.map((it) =>
              it.ownerId === p.id
                ? {
                    ...it,
                    ownerPhotoUrl: p.photo_url ?? null,
                    ownerDisplayName: p.display_name ?? it.ownerDisplayName,
                    ownerRole: canonRole(p.role) ?? it.ownerRole,
                    user: p.display_name ?? it.user,
                  }
                : it
            )
          );

          setAvatars((prev) =>
            prev.map((av) =>
              av.id === p.id
                ? {
                    ...av,
                    name: p.display_name || av.name,
                    photo: p.photo_url || DEFAULT_AVATAR,
                  }
                : av
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);
  /* --------- First page + likes + follows --------- */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          id, uid, type, uri, description, user_display, likes, comments_count, created_at,
          profiles:uid ( id, role, photo_url, display_name )
        `
        )
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error || !data) {
        console.warn(error?.message);
        return;
      }

      const rows = data as unknown as PostRow[];

      const mapped: FeedItem[] = rows.map((p) => ({
        id: p.id,
        ownerId: p.uid,
        type: p.type,
        uri: p.uri,
        user: p.profiles?.display_name || p.user_display || "Onbekend",
        description: p.description || "",
        likes: p.likes ?? 0,
        comments: p.comments_count ?? 0,
        createdAt: p.created_at,
        ownerPhotoUrl: p.profiles?.photo_url ?? null,
        ownerRole: canonRole(p.profiles?.role),
        ownerDisplayName: p.profiles?.display_name ?? null,
      }));

      let myLikes = new Set<string>();
      let myFollows = new Set<string>();

      if (user && mapped.length) {
        const ids = mapped.map((m) => m.id);

        const { data: likedRows } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("uid", user.id)
          .in("post_id", ids);

        if (likedRows)
          myLikes = new Set(likedRows.map((r: any) => r.post_id));

        const { data: followRows, error: fErr } = await supabase
          .from("follows")
          .select("followed")
          .eq("follower", user.id);

        if (!fErr && followRows)
          myFollows = new Set(followRows.map((r: any) => r.followed));
      }

      if (!mounted) return;

      setLikedSet(myLikes);
      setFollowingSet(myFollows);

      const base = mapped.map((m) => ({ ...m, liked: myLikes.has(m.id) }));

      setPosts(base);
      setForYou([...base].reverse());

      lastCursorRef.current = mapped[mapped.length - 1]?.createdAt ?? null;
      setHasMore(mapped.length === PAGE_SIZE);
    };

    load();

    const ch = supabase
      .channel("public:posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const p = payload.new as PostRow;

          let owner: ProfileMini | null = null;
          try {
            const { data: o } = await supabase
              .from("profiles")
              .select("id, role, photo_url, display_name")
              .eq("id", p.uid)
              .single();
            owner = (o as any) ?? null;
          } catch {}

          const newItem: FeedItem = {
            id: p.id,
            ownerId: p.uid,
            type: p.type as "image" | "video",
            uri: p.uri,
            user: owner?.display_name || p.user_display || "Onbekend",
            description: p.description || "",
            likes: p.likes ?? 0,
            comments: p.comments_count ?? 0,
            createdAt: p.created_at,
            liked: likedSetRef.current.has(p.id),
            ownerPhotoUrl: owner?.photo_url ?? null,
            ownerRole: canonRole(owner?.role),
            ownerDisplayName: owner?.display_name ?? null,
          };

          setPosts((prev) => [newItem, ...prev]);
          setForYou((prev) => [...prev, newItem]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  /* --------- Stories: robuust jongerenwerkers --------- */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, role")
        .in("role", ["jongerenwerker", "worker"])
        .order("display_name", { ascending: true });

      if (error || !data) {
        console.warn("stories load", error?.message);
        setAvatars([]);
        return;
      }

      setAvatars(
        (data as any[]).map((p) => ({
          id: p.id,
          name: p.display_name || "Jongerenwerker",
          photo: p.photo_url || DEFAULT_AVATAR,
        }))
      );
    })();
  }, []);

  const goPage = (p: number) => {
    setPage(p);
    pagerRef.current?.setPage(p);
  };

  /* --------- Load more --------- */
  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const last = lastCursorRef.current;

      let q = supabase
        .from("posts")
        .select(
          `
          id, uid, type, uri, description, user_display, likes, comments_count, created_at,
          profiles:uid ( id, role, photo_url, display_name )
        `
        )
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (last) q = q.lt("created_at", last);

      const { data, error } = await q;
      if (error || !data) throw error;

      const rows = data as unknown as PostRow[];

      const mapped: FeedItem[] = rows.map((p) => ({
        id: p.id,
        ownerId: p.uid,
        type: p.type,
        uri: p.uri,
        user: p.profiles?.display_name || p.user_display || "Onbekend",
        description: p.description || "",
        likes: p.likes ?? 0,
        comments: p.comments_count ?? 0,
        createdAt: p.created_at,
        ownerPhotoUrl: p.profiles?.photo_url ?? null,
        ownerRole: canonRole(p.profiles?.role),
        ownerDisplayName: p.profiles?.display_name ?? null,
      }));

      setPosts((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const add = mapped.filter((m) => !seen.has(m.id));
        return [...prev, ...add];
      });
      setForYou((prev) => [...prev, ...mapped]);

      if (mapped.length > 0) {
        lastCursorRef.current = mapped[mapped.length - 1].createdAt ?? last;
      }
      setHasMore(mapped.length === PAGE_SIZE);
    } catch (e: any) {
      console.warn(e?.message);
    } finally {
      setLoadingMore(false);
    }
  };

  /* --------- Like toggle --------- */
  const onToggleLikeServer = async (post: FeedItem) => {
    if (!user) {
      Alert.alert("Inloggen nodig", "Log in om te kunnen liken.");
      return;
    }

    const wantLike = post.liked === true;

    try {
      if (wantLike) {
        const { error: e1 } = await supabase.from("post_likes").insert({
          post_id: post.id,
          uid: user.id,
        });
        if (e1 && e1.code !== "23505") throw e1;

        await supabase
          .from("posts")
          .update({ likes: (post.likes ?? 0) + 1 })
          .eq("id", post.id);

        setLikedSet((prev) => new Set(prev).add(post.id));
      } else {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("uid", user.id);

        await supabase
          .from("posts")
          .update({ likes: Math.max(0, (post.likes ?? 0) - 1) })
          .eq("id", post.id);

        setLikedSet((prev) => {
          const s = new Set(prev);
          s.delete(post.id);
          return s;
        });
      }
    } catch (e: any) {
      console.warn(e.message);
    }
  };

  /* --------- Follow toggle --------- */
  const onToggleFollowServer = async (
    creatorId: string,
    wantFollow: boolean
  ) => {
    if (!user || !isValidUUID(creatorId)) return;
    try {
      if (wantFollow) {
        await ensureProfile(user.id);
        const { error } = await supabase.from("follows").insert({
          follower: user.id,
          followed: creatorId,
        });
        if (error && error.code !== "23505") throw error;
        setFollowingSet((prev) => new Set(prev).add(creatorId));
      } else {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower", user.id)
          .eq("followed", creatorId);
        if (error) throw error;
        setFollowingSet((prev) => {
          const s = new Set(prev);
          s.delete(creatorId);
          return s;
        });
      }
    } catch (e: any) {
      console.warn("follow toggle:", e?.message);
    }
  };
  /* --------- Comments + replies --------- */
  const loadCommentsFor = async (postId: string): Promise<CommentType[]> => {
    try {
      const { data: comments, error: cErr } = await supabase
        .from("comments")
        .select("id, name, avatar, text, likes, created_at, uid")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cErr || !comments) return [];

      const commentIds = comments.map((c: any) => c.id);

      let replies: ReplyRow[] = [];
      if (commentIds.length) {
        const { data: rData } = await supabase
          .from("comment_replies")
          .select(
            "id, comment_id, post_id, uid, name, avatar, text, likes, created_at"
          )
          .in("comment_id", commentIds)
          .order("created_at", { ascending: true });

        replies = (rData as any[]) || [];
      }

      let likedCommentIds = new Set<string>();
      let likedReplyIds = new Set<string>();

      if (user?.id) {
        const { data: cl } = await supabase
          .from("comment_likes")
          .select("comment_id")
          .eq("uid", user.id)
          .in("comment_id", commentIds);

        if (cl) likedCommentIds = new Set(cl.map((x: any) => x.comment_id));

        const replyIds = replies.map((r) => r.id);
        if (replyIds.length) {
          const { data: rl } = await supabase
            .from("reply_likes")
            .select("reply_id")
            .eq("uid", user.id)
            .in("reply_id", replyIds);

          if (rl) likedReplyIds = new Set(rl.map((x: any) => x.reply_id));
        }
      }

      const byComment: Record<string, ReplyType[]> = {};
      replies.forEach((r) => {
        if (!byComment[r.comment_id]) byComment[r.comment_id] = [];
        byComment[r.comment_id].push({
          id: r.id,
          name: r.name || "Gebruiker",
          avatar: r.avatar || DEFAULT_AVATAR,
          text: r.text,
          likes: r.likes || 0,
          liked: likedReplyIds.has(r.id),
          time: timeAgoISO(r.created_at),
        });
      });

      return (comments as any[]).map((c) => ({
        id: c.id,
        name: c.name || "Gebruiker",
        avatar: c.avatar || DEFAULT_AVATAR,
        text: c.text || "",
        likes: c.likes || 0,
        liked: likedCommentIds.has(c.id),
        time: timeAgoISO(c.created_at),
        replies: byComment[c.id] || [],
        collapsed: true,
      }));
    } catch (e) {
      console.warn("loadCommentsFor error", e);
      return [];
    }
  };

  const addCommentServer = async (postId: string, text: string) => {
    if (!user) {
      Alert.alert("Inloggen nodig", "Log in om te reageren.");
      return;
    }

    try {
      await ensureProfile(user.id);

      const { data: me, error: meErr } = await supabase
        .from("profiles")
        .select("display_name, photo_url")
        .eq("id", user.id)
        .single();

      if (meErr) throw meErr;

      const name =
        me?.display_name || user.email?.split("@")[0] || "Gebruiker";

      const avatar = me?.photo_url || DEFAULT_AVATAR;

      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        uid: user.id,
        name,
        avatar,
        text,
        likes: 0,
      });
      if (error) throw error;

      await supabase
        .from("posts")
        .update({
          comments_count:
            (posts.find((p) => p.id === postId)?.comments ?? 0) + 1,
        })
        .eq("id", postId);
    } catch (e: any) {
      const msg = e?.message || "Kon reactie niet plaatsen.";
      Alert.alert("Reactie mislukt", msg);
      throw e;
    }
  };

  const deleteCommentServer = async (postId: string, commentId: string) => {
    if (!user) {
      Alert.alert("Inloggen nodig", "Log in om te verwijderen.");
      return false;
    }
    try {
      if (!isValidUUID(commentId)) throw new Error("Ongeldig comment-ID.");
      if (!isValidUUID(postId)) throw new Error("Ongeldig post-ID.");

      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("uid", user.id);
      if (error) throw error;

      await supabase
        .from("posts")
        .update({
          comments_count: Math.max(
            0,
            (posts.find((p) => p.id === postId)?.comments ?? 1) - 1
          ),
        })
        .eq("id", postId);

      return true;
    } catch (e: any) {
      Alert.alert(
        "Verwijderen mislukt",
        e?.message ?? "Kon reactie niet verwijderen."
      );
      return false;
    }
  };

  const reportComment = async (_postId: string, _commentId: string) => {
    Alert.alert(
      "Bedankt",
      "Je melding is ontvangen. We bekijken dit zo snel mogelijk."
    );
  };

  /* --------- Post delete --------- */
  const deletePostServer = async (post: FeedItem) => {
    if (!user) {
      Alert.alert("Inloggen nodig", "Log in om te verwijderen.");
      return false;
    }
    if (post.ownerId !== user.id) {
      Alert.alert("Niet toegestaan", "Je kunt alleen je eigen post verwijderen.");
      return false;
    }

    try {
      const { error: delErr } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id)
        .eq("uid", user.id);
      if (delErr) throw delErr;

      try {
        const parts = post.uri.split("/posts/");
        const rel = parts[1];
        if (rel) await supabase.storage.from("posts").remove([rel]);
      } catch {}

      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setForYou((prev) => prev.filter((p) => p.id !== post.id));
      return true;
    } catch (e: any) {
      Alert.alert(
        "Verwijderen mislukt",
        e?.message ?? "Kon post niet verwijderen."
      );
      return false;
    }
  };

  /* --------- Repost & Share --------- */
  const repostPost = async (post: FeedItem) => {
    if (!user) {
      Alert.alert("Inloggen nodig", "Log in om te kunnen repost-en.");
      return;
    }
    try {
      await ensureProfile(user.id);

      const insert = {
        uid: user.id,
        type: post.type,
        uri: post.uri,
        description: post.description ? `↻ ${post.description}` : null,
        user_display: user.email?.split("@")[0] ?? "Gebruiker",
        likes: 0,
        comments_count: 0,
      };

      const { data: ins, error: insErr } = await supabase
        .from("posts")
        .insert(insert)
        .select("*")
        .single();
      if (insErr) throw insErr;

      const newItem: FeedItem = {
        id: ins.id,
        ownerId: ins.uid,
        type: ins.type,
        uri: ins.uri,
        user: ins.user_display || "Onbekend",
        description: ins.description || "",
        likes: ins.likes ?? 0,
        comments: ins.comments_count ?? 0,
        createdAt: ins.created_at,
        liked: false,
        ownerRole: myRole,
        ownerPhotoUrl: profile?.photo_url ?? null,
        ownerDisplayName: ins.user_display,
      };

      setPosts((prev) => [newItem, ...prev]);
      setForYou((prev) => [newItem, ...prev]);
      Alert.alert("Gerepost", "De post staat nu ook in jouw feed.");
    } catch (e: any) {
      Alert.alert("Mislukt", e?.message ?? "Reposten is niet gelukt.");
    }
  };

  const shareExtern = async (post: FeedItem) => {
    try {
      await Share.share({
        message: `${post.description ? post.description + " - " : ""}${
          post.uri
        }`,
        url: post.uri,
        title: "Deel post",
      });
    } catch {}
  };

  const onShare = (post: FeedItem) => {
    Alert.alert("Delen", "Wat wil je doen?", [
      { text: "Annuleer", style: "cancel" },
      { text: "Repost in feed", onPress: () => repostPost(post) },
      { text: "Extern delen", onPress: () => shareExtern(post) },
    ]);
  };

  const onToggleSave = (post: FeedItem) => {
    setSavedSet((prev) => {
      const s = new Set(prev);
      if (s.has(post.id)) s.delete(post.id);
      else s.add(post.id);
      return s;
    });
  };

  const handlePosted = (newItem: FeedItem) => {
    setPosts((prev) => [newItem, ...prev]);
    setForYou((prev) => [newItem, ...prev]);
    if (page !== 1) goPage(1);
  };

  const followingFeed = posts.filter((p) => followingSet.has(p.ownerId));
  const followingFeedToShow = followingFeed.length ? followingFeed : posts;

  // eigen avatar => profiel-tab, ander => workers-profiel
  const openWorkerProfileSafe = (id: string) => {
    if (!isValidUUID(id)) {
      Alert.alert("Profiel niet beschikbaar", "Ongeldige gebruiker.");
      return;
    }

    if (user?.id === id) {
      router.push("/(tabs)/profiel");
      return;
    }

    router.push(`/workers/${id}`);
  };

  // avatar op posts: eigen avatar => profiel-tab, ander => profiel-sheet
  const onPressAvatar = (item: FeedItem) => {
    if (!item.ownerId) return;

    if (item.ownerId === user?.id) {
      router.push("/(tabs)/profiel");
      return;
    }

    setProfileSheetItem(item);
    setProfileSheetOpen(true);
  };

  const meName =
    profile?.display_name || user?.email?.split("@")[0] || "Jij";
  const meAvatar = profile?.photo_url || DEFAULT_AVATAR;
  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={[styles.topHeader, { paddingTop: insets.top }]}>
        <View style={[styles.topHeaderInner, { gap: 14 }]}>
          <TouchableOpacity onPress={() => goPage(0)} style={styles.switchBtn}>
            <Text
              style={[
                styles.switchText,
                page === 0 && styles.switchTextActive,
              ]}
            >
              Verkennen
            </Text>
            {page === 0 && <View style={styles.switchUnderline} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => goPage(1)} style={styles.switchBtn}>
            <Text
              style={[
                styles.switchText,
                page === 1 && styles.switchTextActive,
              ]}
            >
              Volgend
            </Text>
            {page === 1 && <View style={styles.switchUnderline} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => goPage(2)} style={styles.switchBtn}>
            <Text
              style={[
                styles.switchText,
                page === 2 && styles.switchTextActive,
              ]}
            >
              Voor jou
            </Text>
            {page === 2 && <View style={styles.switchUnderline} />}
          </TouchableOpacity>
        </View>
      </View>

      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={1}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        <View key="explore" style={{ width: SCREEN_W, height: SCREEN_H }}>
          <ExploreGrid onOpen={(it) => setOpenExploreItem(it)} posts={posts} />
        </View>

        <View key="following" style={{ width: SCREEN_W, height: SCREEN_H }}>
          <VerticalFeed
            data={followingFeedToShow}
            active={vIdx0}
            setActive={setVIdx0}
            bottomInset={insets.bottom}
            showStories
            avatars={avatars}
            openWorker={(id) => openWorkerProfileSafe(id)}
            onToggleLikeServer={onToggleLikeServer}
            loadCommentsFor={loadCommentsFor}
            addCommentServer={addCommentServer}
            onShare={onShare}
            onToggleSave={onToggleSave}
            savedSet={savedSet}
            onLoadMore={loadMore}
            hasMore={hasMore}
            loadingMore={loadingMore}
            deleteCommentServer={deleteCommentServer}
            reportComment={reportComment}
            followingSet={followingSet}
            onToggleFollowServer={onToggleFollowServer}
            meId={user?.id}
            deletePostServer={deletePostServer}
            openOwnerProfile={openWorkerProfileSafe}
            onOpenProfileActions={onPressAvatar}
            onDMFromFeed={startDMFromFeed}
            canDMWithItem={canDMWithItem}
            meName={meName}
            meAvatar={meAvatar}
          />
        </View>

        <View key="foryou" style={{ width: SCREEN_W, height: SCREEN_H }}>
          <VerticalFeed
            data={forYou}
            active={vIdx1}
            setActive={setVIdx1}
            bottomInset={insets.bottom}
            showStories={false}
            avatars={avatars}
            openWorker={(id) => openWorkerProfileSafe(id)}
            onToggleLikeServer={onToggleLikeServer}
            loadCommentsFor={loadCommentsFor}
            addCommentServer={addCommentServer}
            onShare={onShare}
            onToggleSave={onToggleSave}
            savedSet={savedSet}
            onLoadMore={loadMore}
            hasMore={hasMore}
            loadingMore={loadingMore}
            deleteCommentServer={deleteCommentServer}
            reportComment={reportComment}
            followingSet={followingSet}
            onToggleFollowServer={onToggleFollowServer}
            meId={user?.id}
            deletePostServer={deletePostServer}
            openOwnerProfile={openWorkerProfileSafe}
            onOpenProfileActions={onPressAvatar}
            onDMFromFeed={startDMFromFeed}
            canDMWithItem={canDMWithItem}
            meName={meName}
            meAvatar={meAvatar}
          />
        </View>
      </PagerView>

      {openExploreItem && (
        <FullscreenCard
          item={openExploreItem}
          onClose={() => setOpenExploreItem(null)}
        />
      )}

      <ProfileActionSheet
        visible={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        item={profileSheetItem}
        isFriend={
          !!profileSheetItem?.ownerId &&
          followingSet.has(profileSheetItem.ownerId)
        }
        onToggleFriend={() => {
          if (!profileSheetItem?.ownerId) return;
          onToggleFollowServer(
            profileSheetItem.ownerId,
            !followingSet.has(profileSheetItem.ownerId)
          );
        }}
        onViewProfile={() => {
          if (!profileSheetItem?.ownerId) return;
          openWorkerProfileSafe(profileSheetItem.ownerId);
        }}
      />

      {user && (
        <>
          <TouchableOpacity
            style={[styles.fab, { bottom: insets.bottom + 16 }]}
            onPress={() => setShowComposer(true)}
          >
            <Text style={styles.fabPlus}>＋</Text>
          </TouchableOpacity>
          <UploadComposer
            visible={showComposer}
            onClose={() => setShowComposer(false)}
            onPosted={handlePosted}
            userDisplay={user.email?.split("@")[0] ?? "Gebruiker"}
            userId={user.id}
            userRole={myRole}
            userPhotoUrl={profile?.photo_url ?? null}
          />
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  topHeader: {
    position: "absolute",
    zIndex: 30,
    left: 0,
    right: 0,
    height: HEADER_H,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  topHeaderInner: { flexDirection: "row", alignItems: "center" },
  switchBtn: { alignItems: "center", paddingHorizontal: 8, paddingVertical: 4 },
  switchText: { color: "#eee", fontSize: 15, fontWeight: "700" },
  switchTextActive: { color: "#fff" },
  switchUnderline: {
    marginTop: 3,
    height: 3,
    width: 28,
    backgroundColor: "#fff",
    borderRadius: 3,
  },

  storiesOverlay: {
    position: "absolute",
    top: HEADER_H + 6,
    left: 0,
    right: 0,
    height: 98,
    backgroundColor: "transparent",
    justifyContent: "center",
    zIndex: 15,
  },
  storiesContent: { paddingHorizontal: 12 },
  storyItem: { width: 74, alignItems: "center", backgroundColor: "transparent" },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#65B10A",
    backgroundColor: "transparent",
  },
  storyImg: { width: 54, height: 54, borderRadius: 27 },
  storyName: {
    color: "#fff",
    fontSize: 11,
    marginTop: 6,
    maxWidth: 70,
    textAlign: "center",
  },

  fullscreenWrap: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
  fullscreenMedia: { width: "100%", height: "100%" },
  closeBtn: {
    position: "absolute",
    top: 28,
    right: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },

  item: { height: SCREEN_H, width: SCREEN_W, justifyContent: "flex-end" },
  media: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },

  overlayLeft: { position: "absolute", left: 12, right: 96 },
  overlayRight: {
    position: "absolute",
    right: 10,
    alignItems: "center",
    gap: 10,
  },

  pillWhite: {
    backgroundColor: "rgba(255,255,255,0.78)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },

  user: { color: "#006836", fontSize: 16, fontWeight: "700" },
  descDark: { color: "#111", fontSize: 14, lineHeight: 18 },

  actionBtn: { alignItems: "center", justifyContent: "center" },
  actionTextLight: {
    color: "#fff",
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
  },

  profileFollowWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImage: { width: "100%", height: "100%" },
  profilePlus: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#65B10A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  profilePlusFollowing: { backgroundColor: "#444" },

  exploreSearchWrap: {
    position: "absolute",
    top: HEADER_H,
    left: 12,
    right: 12,
    zIndex: 20,
  },
  exploreSearchInput: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: "#111",
  },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheetCard: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  sheetHandleWrap: { alignItems: "center", paddingVertical: 6 },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
  },
  sheetTitle: {
    color: "#111",
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 16,
    marginBottom: 6,
  },

  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  commentAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e5e5e5",
    marginTop: 2,
  },

  replyRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  replyAvatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#e5e5e5",
    marginTop: 2,
  },

  commentHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentName: { color: "#111", fontSize: 13, fontWeight: "700" },
  commentTime: { color: "#888", fontSize: 12 },
  commentText: { color: "#222", fontSize: 14 },
  mention: { color: "#4C80C1", fontWeight: "700" },

  commentActionRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  commentReply: { color: "#4C80C1", fontSize: 12, fontWeight: "700" },

  inlineInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    color: "#111",
    backgroundColor: "#f7f7f7",
  },
  inlineSend: {
    backgroundColor: "#65B10A",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  commentLikeWrap: { alignItems: "center", minWidth: 36, paddingLeft: 6 },
  commentLikeIcon: {
    color: "#888",
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  commentLikeCount: { color: "#888", fontSize: 12, marginTop: 2 },

  commentEmpty: {
    color: "#666",
    fontSize: 14,
    paddingVertical: 12,
    textAlign: "center",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    color: "#111",
    backgroundColor: "#f7f7f7",
  },
  sendBtn: {
    backgroundColor: "#65B10A",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtnText: { color: "#fff", fontWeight: "700" },

  actionCard: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  actionItem: { paddingVertical: 14, paddingHorizontal: 18 },
  actionLabel: { color: "#111", fontSize: 16, fontWeight: "600" },
  actionItemDanger: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "#fff5f6",
  },
  actionLabelDanger: { color: "#e11d48", fontSize: 16, fontWeight: "700" },
  actionCancel: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  actionCancelLabel: { color: "#4C80C1", fontSize: 16, fontWeight: "700" },

  composeCard: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    gap: 12,
  },
  composeTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  pickBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#006836",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickBtnTxt: { color: "#fff", fontWeight: "700" },
  previewBox: {
    height: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },
  composeInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 10,
    color: "#111",
    backgroundColor: "#f7f7f7",
    textAlignVertical: "top",
  },
  postBtn: {
    backgroundColor: "#65B10A",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  postBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },

  fab: {
    position: "absolute",
    left: 16,
    backgroundColor: "#65B10A",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  fabPlus: { color: "#fff", fontSize: 28, lineHeight: 28, marginTop: -1 },

  profileSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  profileSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  profileSheetAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#eee",
  },
  profileSheetName: { fontSize: 16, fontWeight: "800", color: "#111" },
  profileSheetRole: { fontSize: 12, color: "#666", marginTop: 2 },

  profileSheetItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  profileSheetItemTxt: { fontSize: 16, fontWeight: "700", color: "#111" },

  profileSheetCancel: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
    alignItems: "center",
  },
  profileSheetCancelTxt: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4C80C1",
  },
});
