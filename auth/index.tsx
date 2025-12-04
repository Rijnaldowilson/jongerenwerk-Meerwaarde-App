// app/auth/index.tsx
// ⚠️ LET OP: dit scherm wordt een ALTERNATIEVE login UI
// Het verwijst netjes door naar /(auth)/login zodat Expo Router niet dubbel in de war raakt.

import { Redirect } from "expo-router";

export default function AuthIndex() {
  // Direct doorsturen naar jouw echte login scherm:
  return <Redirect href="/(auth)/login" />;
}
