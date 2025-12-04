// app/dev/seed.tsx
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { supabase } from "../../lib/supabase"; // <-- nieuwe bron

const BASE_POSTS = [
  { type: "video", uri: "https://www.w3schools.com/html/mov_bbb.mp4", user: "Devi • Jongerenwerker", description: "Kick-off activiteit bij HVC 💚 #weerbaarheid" },
  { type: "image", uri: "https://picsum.photos/720/1280?random=11", user: "Noa • Jongere", description: "Kaj Munk College 🙌 #verbinding" },
  { type: "image", uri: "https://picsum.photos/720/1280?random=12", user: "Tim • Jongerenwerker", description: "Talentontwikkeling bij KSH #eigenkracht" },
  { type: "image", uri: "https://picsum.photos/720/1280?random=13", user: "Serena • Jongerenwerker", description: "Vrijwilligersdag 💙 #burgerschap" },
  { type: "image", uri: "https://picsum.photos/720/1280?random=14", user: "Yara • Jongere", description: "Nieuwe muziekstudio 🔊 #talent" },
  { type: "image", uri: "https://picsum.photos/720/1280?random=15", user: "Mo • Jongerenwerker", description: "Ambulant in Hoofddorp 🚶‍♂️ #zichtbaarheid" },
  { type: "image", uri: "https://picsum.photos/720/1280?random=16", user: "Sam • Jongere", description: "3x3 basketbal zaterdag ⛹️‍♀️" },
  { type: "image", uri: "https://picsum.photos/720/1280?random=17", user: "Ava • Jongere", description: "Street-art workshop 🎨" },
  { type: "image", uri: "https://picsum.photos/720/1280?random=18", user: "Jamal • Jongere", description: "Game-avond 🎮" },
  { type: "image", uri: "https://picsum.photos/720/1280?random=19", user: "Lina • Jongere", description: "Girls only sport 💪" },
];

const WORKERS = [
  { name: "Devi",    photo_url: "https://i.pravatar.cc/120?img=15", role: "Jongerenwerker" },
  { name: "Tim",     photo_url: "https://i.pravatar.cc/120?img=16", role: "Jongerenwerker" },
  { name: "Serena",  photo_url: "https://i.pravatar.cc/120?img=25", role: "Jongerenwerker" },
  { name: "Mo",      photo_url: "https://i.pravatar.cc/120?img=22", role: "Jongerenwerker" },
  { name: "Yara",    photo_url: "https://i.pravatar.cc/120?img=24", role: "Jongere" },
  { name: "Noa",     photo_url: "https://i.pravatar.cc/120?img=21", role: "Jongere" },
];

export default function DevSeed() {
  const [busy, setBusy] = useState(false);

  const seedPosts = async () => {
    try {
      setBusy(true);
      const { error } = await supabase.from("posts").insert(
        BASE_POSTS.map((p) => ({
          uid: "71df9478-61af-4dc6-8765-53f6995a8895", // jouw user id
          type: p.type,
          uri: p.uri,
          user_display: p.user,
          description: p.description,
          likes: 0,
          comments_count: 0,
        }))
      );
      if (error) throw error;
      Alert.alert("✅ Succes", "Posts zijn aangemaakt.");
    } catch (e: any) {
      Alert.alert("Fout", e.message ?? "Onbekende fout");
    } finally {
      setBusy(false);
    }
  };

  const seedWorkers = async () => {
    try {
      setBusy(true);
      const { error } = await supabase.from("workers").insert(
        WORKERS.map((w) => ({
          name: w.name,
          photo_url: w.photo_url,
          role: w.role,
          bio: "",
        }))
      );
      if (error) throw error;
      Alert.alert("✅ Succes", "Workers zijn aangemaakt.");
    } catch (e: any) {
      Alert.alert("Fout", e.message ?? "Onbekende fout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Seeder (tijdelijk)</Text>
      <TouchableOpacity disabled={busy} onPress={seedPosts} style={[styles.btn, busy && { opacity: 0.6 }]}>
        <Text style={styles.btnTxt}>Seed posts (10)</Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={busy} onPress={seedWorkers} style={[styles.btn, busy && { opacity: 0.6 }]}>
        <Text style={styles.btnTxt}>Seed workers (6)</Text>
      </TouchableOpacity>
      <Text style={styles.note}>
        Open dit scherm één keer. Als de feed werkt, verwijder dit bestand of zet het achter een feature flag.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, backgroundColor: "#fff", padding: 20, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#006836", marginBottom: 16, textAlign: "center" },
  btn: { backgroundColor: "#4C80C1", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 },
  btnTxt: { color: "#fff", fontWeight: "800" },
  note: { color: "#666", fontSize: 12, marginTop: 12, textAlign: "center" },
});
