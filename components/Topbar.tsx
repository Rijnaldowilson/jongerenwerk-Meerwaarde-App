import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Action = { label: string; onPress: () => void };

export default function Topbar({
  title,
  subtitle,
  actions = [],
}: {
  title: string;
  subtitle?: string;
  actions?: Action[];
}) {
  return (
    <LinearGradient
      colors={["#EAF1F8", "#DDE9F6"]} // zelfde gradient als rapportage
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <SafeAreaView edges={["top"]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>{title}</Text>
            {!!subtitle && <Text style={styles.h2}>{subtitle}</Text>}
          </View>
          {actions.length > 0 && (
            <View style={styles.actions}>
              {actions.map((a, i) => (
                <TouchableOpacity key={i} onPress={a.onPress} activeOpacity={0.9} style={styles.topBtn}>
                  <Text style={styles.topBtnTxt}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  h1: { fontSize: 22, fontWeight: "900", color: "#0B2D47" },
  h2: { fontSize: 12, color: "#3A4766", marginTop: 2 },
  actions: { flexDirection: "row", gap: 10 },
  topBtn: {
    backgroundColor: "#ffffff",
    borderColor: "#D8E3EE",
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  topBtnTxt: { color: "#0B2D47", fontWeight: "800", fontSize: 12 },
});
