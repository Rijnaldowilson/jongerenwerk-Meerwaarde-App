// app/_layout.tsx
import { Redirect, Stack, usePathname } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../auth/context";

function isPublicRoute(pathname: string | null) {
  if (!pathname) return false;

  const PUBLIC = ["/login", "/reset", "/register", "/register-jongere"];

  return PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function Gate({ children }: { children: React.ReactNode }) {
  const { ready, user } = useAuth();
  const pathname = usePathname();

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#4C80C1" />
      </View>
    );
  }

  if (isPublicRoute(pathname)) return children;

  if (!user) {
    return <Redirect href="/login" />;
  }

  return children;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Gate>
        <Stack screenOptions={{ headerShown: false }} />
      </Gate>
    </AuthProvider>
  );
}
