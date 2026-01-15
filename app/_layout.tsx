// app/_layout.tsx
import { Redirect, Stack, usePathname } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../auth/context";

function isPublicRoute(pathname: string | null) {
  // ✅ Cruciaal: als pathname nog niet beschikbaar is, NIET redirecten
  // Expo Router is dan nog aan het resolven van de deeplink route.
  if (!pathname) return true;

  const PUBLIC_PREFIXES = [
    "/login",
    "/reset",
    "/register",
    "/register-jongere",

    // ✅ Supabase flows
    "/auth/callback",
    "/auth/new-password",

    // ✅ Route-group fallback
    "/(auth)",
  ];

  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
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
