import * as Linking from "expo-linking";
import { useLocalSearchParams } from "expo-router";
import { Alert, Button, Text, View } from "react-native";

export default function KBDetail() {
  const { id, title, fileUri } = useLocalSearchParams<{ id: string; title?: string; fileUri?: string }>();

  const open = async () => {
    if (fileUri) {
      try {
        await Linking.openURL(fileUri);
      } catch (e) {
        Alert.alert("Openen mislukt", "Kon bestand niet openen.");
      }
    } else {
      Alert.alert("Geen bestand", "Dit item heeft geen gekoppeld bestand.");
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>{title || `Item: ${id}`}</Text>
      <View style={{ marginTop: 12 }}>
        <Button title="Open bestand" onPress={open} />
      </View>
    </View>
  );
}

