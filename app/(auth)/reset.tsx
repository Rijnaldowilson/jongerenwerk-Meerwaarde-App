// app/(auth)/reset.tsx
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ResetPassword() {
  const router = useRouter();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  // 1) Controleer of we binnenkomen via recovery-link
  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasRecoverySession(!!data.session);
    };

    check();

    // luister op deep links terwijl app open is
    const sub = Linking.addEventListener("url", async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasRecoverySession(!!data.session);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const onUpdate = async () => {
    if (!pw1 || pw1.length < 8) {
      Alert.alert("Te kort", "Kies een wachtwoord van minimaal 8 tekens.");
      return;
    }
    if (pw1 !== pw2) {
      Alert.alert("Niet gelijk", "De twee wachtwoorden komen niet overeen.");
      return;
    }
    if (!hasRecoverySession) {
      Alert.alert(
        "Geen herstel-sessie",
        "Open eerst de herstel-link uit je e-mail op deze telefoon."
      );
      return;
    }

    try {
      setBusy(true);
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      Alert.alert("Gelukt", "Je wachtwoord is aangepast.");
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Mislukt", e?.message ?? "Wachtwoord aanpassen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const openEmailHelp = () =>
    Alert.alert(
      "Let op",
      "Open de wachtwoord-herstel link vanuit de e-mail op deze telefoon. Dan kom je automatisch hier terecht met een herstel-sessie."
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.wrap}
    >
      <Text style={styles.title}>Nieuw wachtwoord</Text>

      {hasRecoverySession === false && (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>
            Het lijkt erop dat er nog geen herstel-sessie is. Open de e-mail link
            op deze telefoon, of tik hieronder om de instructie te zien.
          </Text>
          <TouchableOpacity onPress={openEmailHelp} style={styles.helpBtn}>
            <Text style={styles.helpBtnTxt}>Hoe doe ik dat?</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.label}>Nieuw wachtwoord</Text>
      <TextInput
        value={pw1}
        onChangeText={setPw1}
        placeholder="Minimaal 8 tekens"
        secureTextEntry
        style={styles.input}
        autoComplete="password"
        textContentType="newPassword"
      />

      <Text style={[styles.label, { marginTop: 10 }]}>Herhaal wachtwoord</Text>
      <TextInput
        value={pw2}
        onChangeText={setPw2}
        placeholder=""
        secureTextEntry
        style={styles.input}
        autoComplete="password"
        textContentType="newPassword"
      />

      <TouchableOpacity
        onPress={onUpdate}
        style={[styles.btn, busy && { opacity: 0.7 }]}
        disabled={busy}
      >
        <Text style={styles.btnTxt}>
          {busy ? "Bezig…" : "Wachtwoord opslaan"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace("/(auth)/login")}
        style={styles.secondary}
      >
        <Text style={styles.secondaryTxt}>Terug naar inloggen</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0A0A0A",
    marginBottom: 16,
    textAlign: "center",
  },
  label: { color: "#5A6572", fontSize: 12, fontWeight: "700" },
  input: {
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    color: "#0A0A0A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btn: {
    marginTop: 14,
    backgroundColor: "#4C80C1",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnTxt: { color: "#fff", fontWeight: "800" },
  secondary: { marginTop: 12, alignItems: "center" },
  secondaryTxt: { color: "#4C80C1", fontWeight: "700" },
  alertBox: {
    backgroundColor: "#fff6e5",
    borderColor: "#f3d38b",
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  alertText: { color: "#4c3c16" },
  helpBtn: { marginTop: 8, alignSelf: "flex-start" },
  helpBtnTxt: { color: "#946200", fontWeight: "700" },
});
