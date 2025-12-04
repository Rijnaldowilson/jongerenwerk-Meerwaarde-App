import { Feather } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../auth/context";
import { supabase } from "../../lib/supabase";

const MW = {
  green: "#65B10A",
  bg: "#000",
  subtle: "#9CA3AF",
  white: "#fff",
  card: "#111827",
  border: "rgba(255,255,255,0.08)",
};

type Picked = { uri: string; type: "image" | "video"; mime?: string };

export default function UploadTab() {
  const auth = useAuth() as any;
  const user = auth?.user;

  const [picked, setPicked] = useState<Picked | null>(null);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setPicked(null);
      setDesc("");
    }
  }, [user?.id]);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Toestemming nodig", "Geef toegang om te kunnen uploaden.");
      return;
    }

    const IP: any = ImagePicker as any;
    const options: any = {
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 60,
      selectionLimit: 1,
      mediaTypes: IP.MediaTypeOptions?.All ?? undefined,
    };

    const res = await ImagePicker.launchImageLibraryAsync(options);
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

  const base64ToUint8Array = (b64: string) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
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
  };

  const guessExt = (uri: string, fallback: "jpg" | "mp4") => {
    const m = uri.split("?")[0].match(/\.([a-z0-9]+)$/i);
    if (!m) return fallback;
    const ext = m[1].toLowerCase();
    if (["jpeg", "jpg", "png", "webp", "heic"].includes(ext))
      return ext === "jpeg" ? "jpg" : ext;
    if (["mp4", "mov", "m4v", "webm"].includes(ext)) return ext;
    return fallback;
  };

  const ensureProfile = async (userId: string) => {
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
    } catch {}
  };

  const uploadPost = async () => {
    if (!user?.id) {
      Alert.alert("Inloggen nodig", "Log in om te kunnen uploaden.");
      return;
    }
    if (!picked) {
      Alert.alert("Geen media", "Kies eerst een foto of video.");
      return;
    }

    setLoading(true);
    try {
      await ensureProfile(user.id);

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

      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("posts").upload(path, bytes, {
        contentType,
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("posts").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Kon public URL niet ophalen");

      const insert = {
        uid: user.id,
        type: picked.type,
        uri: publicUrl,
        description: desc || null,
        user_display: user.email?.split("@")[0] ?? "Gebruiker",
        likes: 0,
        comments_count: 0,
      };

      const { error: insErr } = await supabase.from("posts").insert(insert);
      if (insErr) throw insErr;

      setPicked(null);
      setDesc("");
      Alert.alert("Geplaatst", picked.type === "image" ? "Je foto staat live!" : "Je video staat live!");
    } catch (e: any) {
      console.warn("upload error:", e);
      Alert.alert("Mislukt", e?.message ?? "Uploaden is niet gelukt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload</Text>

      <Pressable onPress={pickMedia} style={styles.pickBtn}>
        <Feather name="image" size={18} color={MW.white} />
        <Text style={styles.pickTxt}>{picked ? "Andere kiezen" : "Kies foto of video"}</Text>
      </Pressable>

      <View style={styles.previewBox}>
        {!picked ? (
          <Text style={{ color: MW.subtle }}>Geen media geselecteerd.</Text>
        ) : picked.type === "image" ? (
          <Image source={{ uri: picked.uri }} style={{ width: "100%", height: "100%" }} />
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
        placeholderTextColor={MW.subtle}
        style={styles.input}
        multiline
        maxLength={240}
      />

      <TouchableOpacity
        onPress={uploadPost}
        disabled={loading || !picked}
        style={[styles.postBtn, (!picked || loading) && { opacity: 0.6 }]}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.postTxt}>Plaatsen</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MW.bg, padding: 14, paddingTop: 18 },
  title: { color: MW.white, fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 12 },

  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    backgroundColor: MW.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MW.border,
  },
  pickTxt: { color: MW.white, fontWeight: "800" },

  previewBox: {
    height: 320,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MW.border,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0F1A",
    marginBottom: 12,
  },

  input: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: MW.border,
    borderRadius: 12,
    padding: 10,
    color: MW.white,
    backgroundColor: MW.card,
    textAlignVertical: "top",
    marginBottom: 12,
  },

  postBtn: {
    backgroundColor: MW.green,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  postTxt: { color: "#000", fontWeight: "900", fontSize: 16 },
});
