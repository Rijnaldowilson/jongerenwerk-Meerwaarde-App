// app/auth/new-password.tsx
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function NewPassword() {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!pw1 || pw1.length < 8) {
      Alert.alert("Wachtwoord te kort", "Gebruik minimaal 8 tekens.");
      return;
    }
    if (pw1 !== pw2) {
      Alert.alert("Komt niet overeen", "De wachtwoorden zijn niet gelijk.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setBusy(false);

    if (error) {
      Alert.alert("Fout", error.message);
      return;
    }

    Alert.alert("Gelukt", "Je wachtwoord is ingesteld. Je kunt nu inloggen.");
    router.replace("/login");
  };

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Nieuw wachtwoord instellen</Text>

      <TextInput
        placeholder="Nieuw wachtwoord"
        secureTextEntry
        value={pw1}
        onChangeText={setPw1}
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <TextInput
        placeholder="Herhaal nieuw wachtwoord"
        secureTextEntry
        value={pw2}
        onChangeText={setPw2}
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <Button title={busy ? "Opslaan…" : "Wachtwoord opslaan"} onPress={save} disabled={busy} />
    </View>
  );
}
