// app/auth/index.tsx
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../auth/context";

/**
 * Simpele rol-keuze:
 * - Jongeren kunnen ALLEEN "jongere" kiezen
 * - Jongerenwerker/manager alleen met code (pilot-veilig)
 */
type RoleChoice = "jongere" | "jongerenwerker" | "manager";

const ROLE_LABEL: Record<RoleChoice, string> = {
  jongere: "Jongere",
  jongerenwerker: "Jongerenwerker",
  manager: "Manager",
};

// 👉 Zet hier jouw toegangscodes (pilot)
// Later kun je dit uit DB halen.
const STAFF_CODES = {
  jongerenwerker: "MW-WORKER-2025",
  manager: "MW-MANAGER-2025",
};

export default function AuthScreen() {
  const { signIn, signUp, ready } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup extra velden
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<RoleChoice>("jongere");
  const [staffCode, setStaffCode] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    if (!ready || busy) return false;
    if (!email.trim() || !password.trim()) return false;
    if (mode === "signup" && !displayName.trim()) return false;
    return true;
  }, [ready, busy, email, password, mode, displayName]);

  const validateStaffCode = () => {
    if (role === "jongere") return true;
    const expected = STAFF_CODES[role];
    return staffCode.trim() === expected;
  };

  const onSubmit = async () => {
    setErr(null);
    setBusy(true);

    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
        return;
      }

      // ------- SIGNUP -------
      if (!validateStaffCode()) {
        Alert.alert(
          "Onjuiste code",
          "De toegangscode voor deze rol klopt niet."
        );
        return;
      }

      await signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        role, // jongere / jongerenwerker / manager
      });

      Alert.alert(
        "Account gemaakt",
        "Je account is aangemaakt. Je bent nu ingelogd."
      );

    } catch (e: any) {
      setErr(e?.message ?? "Actie mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.wrap}
    >
      {/* Logo + titel */}
      <View style={{ alignItems: "center", marginBottom: 18 }}>
        <Image
          source={require("../../assets/images/meerwaarde-logo.png")}
          style={{ width: 92, height: 92, marginBottom: 10 }}
          resizeMode="contain"
        />
        <Text style={styles.brand}>Jongerenwerk</Text>
        <Text style={styles.subBrand}>
          {mode === "login" ? "Log in" : "Account aanmaken"}
        </Text>
      </View>

      {/* MODE SWITCH */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          onPress={() => setMode("login")}
          style={[styles.modeBtn, mode === "login" && styles.modeBtnActive]}
        >
          <Text style={[styles.modeTxt, mode === "login" && styles.modeTxtActive]}>
            Inloggen
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode("signup")}
          style={[styles.modeBtn, mode === "signup" && styles.modeBtnActive]}
        >
          <Text style={[styles.modeTxt, mode === "signup" && styles.modeTxtActive]}>
            Aanmelden
          </Text>
        </TouchableOpacity>
      </View>

      {/* SIGNUP EXTRA */}
      {mode === "signup" && (
        <>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Naam"
            style={styles.input}
          />

          {/* ROLE PICKER (buttons) */}
          <View style={styles.roleRow}>
            {(["jongere", "jongerenwerker", "manager"] as RoleChoice[]).map((r) => {
              const active = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  style={[styles.roleBtn, active && styles.roleBtnActive]}
                >
                  <Text style={[styles.roleTxt, active && styles.roleTxtActive]}>
                    {ROLE_LABEL[r]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* STAFF CODE only for staff roles */}
          {role !== "jongere" && (
            <TextInput
              value={staffCode}
              onChangeText={setStaffCode}
              placeholder="Toegangscode (van beheerder)"
              style={styles.input}
              autoCapitalize="none"
            />
          )}
        </>
      )}

      {/* EMAIL/PASS */}
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Wachtwoord"
        secureTextEntry
        style={styles.input}
      />

      {!!err && <Text style={styles.error}>{err}</Text>}

      <TouchableOpacity
        onPress={onSubmit}
        style={[styles.btn, !canSubmit && { opacity: 0.6 }]}
        disabled={!canSubmit}
      >
        <Text style={styles.btnTxt}>
          {busy ? "Bezig…" : mode === "login" ? "Log in" : "Account maken"}
        </Text>
      </TouchableOpacity>

      {mode === "login" ? (
        <Text style={styles.hint}>
          Geen account? Druk op “Aanmelden”.
        </Text>
      ) : (
        <Text style={styles.hint}>
          Jongeren kunnen zonder code aanmelden. Medewerkers krijgen een code van de beheerder.
        </Text>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff", padding: 20, justifyContent: "center" },
  brand: { fontSize: 22, fontWeight: "800", color: "#006836" },
  subBrand: { marginTop: 4, color: "#666", fontWeight: "700" },

  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },

  modeRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  modeBtnActive: {
    backgroundColor: "#006836",
    borderColor: "#006836",
  },
  modeTxt: { fontWeight: "800", color: "#111" },
  modeTxtActive: { color: "#fff" },

  roleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  roleBtnActive: {
    backgroundColor: "#4C80C1",
    borderColor: "#4C80C1",
  },
  roleTxt: { fontWeight: "800", color: "#111", fontSize: 12 },
  roleTxtActive: { color: "#fff" },

  btn: {
    backgroundColor: "#4C80C1",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  btnTxt: { color: "#fff", fontWeight: "800" },

  error: { color: "#e11d48", marginBottom: 8 },
  hint: { color: "#666", fontSize: 12, marginTop: 10, textAlign: "center" },
});
