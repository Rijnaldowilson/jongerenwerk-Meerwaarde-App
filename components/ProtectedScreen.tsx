// components/ProtectedScreen.tsx
import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AppRole, useAuth } from "../providers/AuthProvider";

export function ProtectedScreen({
  allowed,
  children,
}: {
  allowed: AppRole[];
  children: React.ReactNode;
}) {
  const { loading, session, role } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Feather name="log-in" size={36} color="#4C80C1" />
        <Text style={{ marginTop: 12, fontSize: 16, fontWeight: "800" }}>
          Niet ingelogd
        </Text>
        <Text style={{ marginTop: 6, fontSize: 13, color: "#5A6572", textAlign: "center" }}>
          Log in om verder te gaan.
        </Text>
      </View>
    );
  }

  if (!role || !allowed.includes(role)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Feather name="lock" size={40} color="#4C80C1" />
        <Text style={{ marginTop: 12, fontSize: 18, fontWeight: "800" }}>
          Geen toegang
        </Text>
        <Text style={{ marginTop: 6, fontSize: 13, color: "#5A6572", textAlign: "center" }}>
          Dit scherm is alleen voor jongerenwerkers en managers.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
