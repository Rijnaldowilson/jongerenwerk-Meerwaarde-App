// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

// Haal environment vars op
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug (mag je laten staan tot het werkt)
console.log("SUPABASE_URL =", SUPABASE_URL);
console.log(
  "SUPABASE_ANON_KEY =",
  SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(0, 12) + "..." : undefined
);

// Guard
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Supabase env ontbreekt. Check je .env en start Expo met: npx expo start -c"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
