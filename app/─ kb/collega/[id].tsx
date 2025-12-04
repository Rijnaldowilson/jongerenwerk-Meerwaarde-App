import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function PeopleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Collega: {id}</Text>
      <Text style={{ marginTop: 8 }}>Hier kun je expertise, contactinfo of gekoppelde methodieken tonen.</Text>
    </View>
  );
}

