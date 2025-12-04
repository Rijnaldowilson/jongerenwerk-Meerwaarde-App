// app/+not-found.tsx
import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Niet gevonden" }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Text style={{ fontSize: 16, marginBottom: 12 }}>Deze pagina bestaat niet.</Text>
        <Link href="/(tabs)" style={{ color: "#4C80C1", fontWeight: "700" }}>Ga naar start</Link>
      </View>
    </>
  );
}
