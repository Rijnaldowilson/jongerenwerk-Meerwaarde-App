import { Text, View } from "react-native";
export default function AuthCallback() {
  return (
    <View style={{ flex: 1, backgroundColor: "yellow", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "900" }}>CALLBACK ✅</Text>
    </View>
  );
}
