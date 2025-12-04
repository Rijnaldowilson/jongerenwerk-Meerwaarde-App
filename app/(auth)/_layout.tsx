// app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Als je een index-scherm in (auth) hebt, kun je deze toevoegen, maar is niet verplicht */}
      {/* <Stack.Screen name="index" /> */}

      <Stack.Screen name="login" />
      <Stack.Screen name="reset" />
      <Stack.Screen name="register-jongere" />
      {/* Als je ook register.tsx hebt:
      <Stack.Screen name="register" />
      */}
    </Stack>
  );
}
