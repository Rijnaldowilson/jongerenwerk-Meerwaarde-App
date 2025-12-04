// app/(auth)/register-jongere.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const MW_LOGO = require("../../assets/images/meerwaarde-logo.png");

/* -----------------------------
   MeerWaarde huisstijl
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

export default function RegisterJongereScreen() {
  const router = useRouter();

  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [wachtwoord2, setWachtwoord2] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim() || !wachtwoord.trim()) {
      Alert.alert("Let op", "Vul minimaal e-mail en wachtwoord in.");
      return false;
    }
    const mail = email.trim().toLowerCase();
    if (!mail.includes("@") || !mail.includes(".")) {
      Alert.alert("Ongeldig e-mailadres", "Controleer je e-mailadres.");
      return false;
    }
    if (wachtwoord.length < 6) {
      Alert.alert(
        "Wachtwoord te kort",
        "Gebruik minimaal 6 tekens voor je wachtwoord."
      );
      return false;
    }
    if (wachtwoord !== wachtwoord2) {
      Alert.alert("Wachtwoorden verschillen", "De wachtwoorden komen niet overeen.");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
  if (!validate()) return;

  const mail = email.trim().toLowerCase();
  const displayName = naam.trim() || mail.split("@")[0];

  setLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({
      email: mail,
      password: wachtwoord,
      options: {
        data: {
          role: "jongere",
          display_name: displayName,
        },
      },
    });

    console.log("signUp RESULT =", { data, error });

    if (error) {
      const anyErr: any = error;
      const status = anyErr?.status ?? anyErr?.cause?.status;
      const msg = anyErr?.message || "";

      console.log("signUp error detail:", { status, msg, raw: anyErr });

      if (status === 504 || msg.includes("AuthRetryableFetchError")) {
        Alert.alert(
          "Tijdelijk probleem",
          "De server reageert nu niet op tijd (504 / netwerkfout). Dit ligt aan de verbinding met Supabase of je internetverbinding."
        );
      } else {
        Alert.alert(
          "Registratie mislukt",
          msg || "Er ging iets mis bij het aanmaken van je account."
        );
      }
      return;
    }

    // Hier kom je als Supabase geen error geeft
    Alert.alert(
      "Account aangemaakt",
      "Je account is aangemaakt. Je kunt nu inloggen."
    );

    router.replace("/login");
  } catch (err: any) {
    const status = err?.status ?? err?.cause?.status;
    const msg = err?.message || "";

    console.log("signUp try/catch error:", { status, msg, raw: err });

    if (status === 504 || msg.includes("AuthRetryableFetchError")) {
      Alert.alert(
        "Server niet bereikbaar",
        "Supabase reageert niet op tijd (504 / netwerkfout). Waarschijnlijk een tijdelijk probleem of slechte verbinding."
      );
    } else {
      Alert.alert(
        "Er ging iets mis",
        msg || "Onbekende fout tijdens registreren."
      );
    }
  } finally {
    setLoading(false);
  }
};


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo + titel */}
          <View style={styles.header}>
            <Image source={MW_LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Account aanmaken</Text>
            <Text style={styles.subtitle}>
              Voor jongeren die gebruik willen maken van MeerWaarde Workspace.
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Jouw gegevens</Text>

            <Text style={styles.label}>Naam</Text>
            <View style={styles.inputRow}>
              <Feather name="user" size={16} color={MW.subtle} />
              <TextInput
                style={styles.input}
                placeholder="Bijv. Sam"
                placeholderTextColor={MW.subtle}
                value={naam}
                onChangeText={setNaam}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputRow}>
              <Feather name="mail" size={16} color={MW.subtle} />
              <TextInput
                style={styles.input}
                placeholder="jouw@mailadres.nl"
                placeholderTextColor={MW.subtle}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Wachtwoord</Text>
            <View style={styles.inputRow}>
              <Feather name="lock" size={16} color={MW.subtle} />
              <TextInput
                style={styles.input}
                placeholder="Minimaal 6 tekens"
                placeholderTextColor={MW.subtle}
                value={wachtwoord}
                onChangeText={setWachtwoord}
                secureTextEntry
              />
            </View>

            <Text style={styles.label}>Herhaal wachtwoord</Text>
            <View style={styles.inputRow}>
              <Feather name="lock" size={16} color={MW.subtle} />
              <TextInput
                style={styles.input}
                placeholder="Nog een keer"
                placeholderTextColor={MW.subtle}
                value={wachtwoord2}
                onChangeText={setWachtwoord2}
                secureTextEntry
              />
            </View>

            {/* Info over rol */}
            <View style={styles.infoBox}>
              <Feather name="info" size={16} color={MW.blue} />
              <Text style={styles.infoText}>
                Je account wordt aangemaakt met de rol{" "}
                <Text style={{ fontWeight: "800" }}>jongere</Text>. Extra rechten
                (bijv. jongerenwerker) worden later door een beheerder ingesteld.
              </Text>
            </View>

            {/* Button */}
            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="user-plus" size={18} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Account aanmaken</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Link naar login */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.loginLinkText}>
                Heb je al een account?{" "}
                <Text style={styles.loginLinkTextBold}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* -----------------------------
   Styles
------------------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MW.green,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 18,
  },
  logo: {
    width: 110,
    height: 60,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },

  card: {
    marginTop: 18,
    backgroundColor: MW.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: MW.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: MW.text,
    marginBottom: 10,
  },

  label: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: MW.sub,
  },
  inputRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: MW.soft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MW.border,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: MW.text,
  },

  infoBox: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#1E3A8A",
    fontWeight: "600",
  },

  button: {
    marginTop: 16,
    backgroundColor: MW.green,
    borderRadius: 999,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },

  loginLink: {
    marginTop: 14,
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: 12,
    color: MW.sub,
  },
  loginLinkTextBold: {
    color: MW.green,
    fontWeight: "900",
  },
});
