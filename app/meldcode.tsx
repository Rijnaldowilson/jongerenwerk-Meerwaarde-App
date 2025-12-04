// app/meldcode.tsx
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MELDCODE_PDF_URL =
  "https://www.example.com/meldcode.pdf"; // vervang door jouw echte URL (Supabase / SharePoint / website)

export default function MeldcodeScreen() {
  const router = useRouter();

  const openPdf = async () => {
    try {
      const supported = await Linking.canOpenURL(MELDCODE_PDF_URL);
      if (!supported) {
        Alert.alert(
          "Meldcode",
          "De link naar de meldcode kon niet geopend worden."
        );
        return;
      }
      await Linking.openURL(MELDCODE_PDF_URL);
    } catch (e) {
      Alert.alert(
        "Meldcode",
        "Er ging iets mis bij het openen van de meldcode. Probeer het later opnieuw."
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Meldcode",
          headerBackTitle: "Terug",
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Intro */}
        <View style={styles.card}>
          <Text style={styles.label}>Noodsituatie / Meldcode</Text>
          <Text style={styles.title}>Wat doe je bij (vermoeden van) onveiligheid?</Text>
          <Text style={styles.text}>
            Gebruik deze stappen als je je zorgen maakt over de veiligheid van een jongere
            of gezin. Bij directe (levens)gevaar: altijd eerst 112 bellen.
          </Text>
        </View>

        {/* 5 stappen meldcode - kort */}
        <View style={styles.card}>
          <Text style={styles.subtitle}>De 5 stappen van de meldcode</Text>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>In kaart brengen van signalen</Text>
              <Text style={styles.text}>
                Noteer concreet wat je ziet, hoort en merkt. Blijf feitelijk.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Overleg en raadpleeg</Text>
              <Text style={styles.text}>
                Bespreek je zorgen met een collega, gedragsdeskundige of meldcode-contactpersoon.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Gesprek met jongere/ouder</Text>
              <Text style={styles.text}>
                Voer een zorgvuldig gesprek over je zorgen, passend bij de situatie.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>4</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Weeg de ernst en het risico</Text>
              <Text style={styles.text}>
                Weeg samen met collega/leidinggevende: is melden nodig? Is acute actie nodig?
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>5</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Beslissen: melden en/of hulp organiseren</Text>
              <Text style={styles.text}>
                Neem een beslissing over melden bij Veilig Thuis en welke hulp je inzet.
              </Text>
            </View>
          </View>
        </View>

        {/* PDF + Checklist */}
        <View style={styles.card}>
          <Text style={styles.subtitle}>Documenten en checklist</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={openPdf}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Lees volledige meldcode (PDF)</Text>
          </TouchableOpacity>

          <Text style={[styles.text, { marginTop: 12, marginBottom: 6 }]}>
            Snelle checklist:
          </Text>

          {[
            "Is er direct gevaar? → bel 112.",
            "Heb je signalen concreet vastgelegd?",
            "Heb je overleg gehad met collega / leidinggevende?",
            "Is er gesproken met jongere/ouder (indien veilig & passend)?",
            "Is besloten of melden bij Veilig Thuis nodig is?",
          ].map((item, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Link naar Workspace / KennisHub uitleg */}
        <View style={[styles.card, { marginBottom: 32 }]}>
          <Text style={styles.subtitle}>Tip</Text>
          <Text style={styles.text}>
            In Workspace gebruik je de noodknop bij directe zorgen over veiligheid.
            In de KennisHub vind je straks meer achtergrondinformatie en protocollen
            over de meldcode.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6FBF2",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4C80C1",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0A0A0A",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A0A0A",
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    color: "#4B5563",
  },
  step: {
    flexDirection: "row",
    marginTop: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4C80C1",
    color: "#FFF",
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "700",
    marginRight: 10,
    fontSize: 13,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  actionButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#65B10A",
    alignSelf: "flex-start",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#65B10A",
    marginTop: 6,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },
});
