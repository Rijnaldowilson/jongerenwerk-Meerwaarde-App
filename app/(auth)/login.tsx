// app/(auth)/login.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Canvas, LinearGradient, Rect, vec } from "@shopify/react-native-skia";

import { useAuth } from "../../auth/context";
import { supabase } from "../../lib/supabase";

const MW_LOGO = require("../../assets/images/meerwaarde-logo.png");

const MW = {
  bg: "#ffffffff",
  surface: "#FFFFFF",
  text: "#0A0A0A",
  sub: "#5A6572",
  border: "rgba(0,0,0,0.08)",
  green: "#65B10A",
  blue: "#4C80C1",
};

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const W = 360;

  const onSubmit = async () => {
    const mail = email.trim().toLowerCase();
    const pass = pw.trim();

    if (!mail || !pass) {
      setErr("Vul je e-mailadres en wachtwoord in.");
      return;
    }

    try {
      setErr(null);
      setBusy(true);
      Keyboard.dismiss();

      await signIn(mail, pass);
      router.replace("/(tabs)");
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();

      if (msg.includes("invalid") || msg.includes("wrong") || msg.includes("credentials")) {
        setErr("Onjuiste inloggegevens. Controleer je e-mail en wachtwoord.");
      } else if (msg.includes("email not confirmed")) {
        setErr("Je e-mailadres is nog niet bevestigd. Check je mailbox.");
      } else {
        setErr("Inloggen mislukt. Probeer het later opnieuw.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onForgotPassword = async () => {
    const mail = email.trim().toLowerCase();
    if (!mail) {
      Alert.alert(
        "E-mailadres nodig",
        "Vul eerst het e-mailadres in waarmee je geregistreerd bent."
      );
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(mail, {
        // redirectTo kun je later nog invullen
      });
      if (error) throw error;

      Alert.alert(
        "E-mail verzonden",
        "Als dit e-mailadres bekend is, is er een herstelmail verstuurd."
      );
    } catch {
      Alert.alert(
        "Wachtwoord herstellen",
        "Er ging iets mis bij het versturen. Probeer het later opnieuw."
      );
    }
  };

  const onRegisterJongere = () => {
    // Route is /register-jongere (zonder (auth) in de URL)
    router.push("/register-jongere");
  };

  const onContactForWorkerAccess = () => {
    Linking.openURL(
      "mailto:beheerder@meerwaarde.nl?subject=Toegang%20JIS%20app&body=Hoi,%0A%0AIk wil graag toegang als jongerenwerker.%0A"
    ).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: MW.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View
        style={{
          backgroundColor: MW.surface,
          borderBottomColor: MW.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
          paddingTop: 18,
          paddingBottom: 10,
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ color: MW.text, fontSize: 26, fontWeight: "800" }}>Inloggen</Text>

        <Canvas style={{ width: W, height: 6 }}>
          <Rect x={0} y={0} width={W} height={6}>
            <LinearGradient start={vec(0, 0)} end={vec(W, 0)} colors={[MW.green, MW.blue]} />
          </Rect>
        </Canvas>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ padding: 16 }}>
          {/* Logo */}
          <Image source={MW_LOGO} resizeMode="contain" style={styles.logo} />

          {/* Login card */}
          <View style={styles.card}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="jij@meerwaarde.nl"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              inputMode="email"
              editable={!busy}
            />

            <Text style={[styles.label, { marginTop: 10 }]}>Wachtwoord</Text>
            <TextInput
              value={pw}
              onChangeText={setPw}
              placeholder=""
              secureTextEntry
              style={styles.input}
              autoComplete="password"
              textContentType="password"
              editable={!busy}
            />

            {err ? <Text style={{ color: "#B91C1C", marginTop: 8 }}>{err}</Text> : null}

            <TouchableOpacity
              onPress={onSubmit}
              activeOpacity={0.9}
              style={[styles.btn, busy && { opacity: 0.7 }]}
              disabled={busy}
            >
              <Text style={styles.btnTxt}>{busy ? "Bezig…" : "Inloggen"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onForgotPassword} activeOpacity={0.8} disabled={busy}>
              <Text style={[styles.forgotTxt, busy && { opacity: 0.5 }]}>
                Wachtwoord vergeten?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Jongeren-registratie */}
          <View style={{ marginTop: 18 }}>
            <Text style={{ color: MW.sub, fontSize: 13, textAlign: "center", marginBottom: 6 }}>
              Nog geen account als jongere?
            </Text>
            <TouchableOpacity
              onPress={onRegisterJongere}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: MW.blue,
                paddingVertical: 10,
                paddingHorizontal: 18,
                alignSelf: "center",
              }}
              activeOpacity={0.9}
              disabled={busy}
            >
              <Text style={{ color: MW.blue, fontWeight: "700", fontSize: 13 }}>
                Maak een jongeren-account aan
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info voor professionals */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: MW.sub, fontSize: 11, textAlign: "center" }}>
              Jongerenwerker of manager? Je krijgt toegang via een uitnodigingsmail of QR-code.
            </Text>
            <TouchableOpacity
              onPress={onContactForWorkerAccess}
              activeOpacity={0.8}
              disabled={busy}
            >
              <Text
                style={{
                  marginTop: 6,
                  textAlign: "center",
                  color: MW.blue,
                  fontWeight: "600",
                  fontSize: 12,
                  textDecorationLine: "underline",
                }}
              >
                Vraag toegang aan bij de beheerder
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
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
  logo: { width: "100%", height: 120, alignSelf: "center", marginBottom: 20 },
  forgotTxt: {
    marginTop: 10,
    textAlign: "center",
    color: "#4C80C1",
    fontWeight: "700",
    fontSize: 13,
  },
});
