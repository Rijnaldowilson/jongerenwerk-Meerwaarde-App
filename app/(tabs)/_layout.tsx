// app/(tabs)/_layout.tsx
import { Feather } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Tabs, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../auth/context";
import { AppRole } from "../../auth/roles";

const MW = {
  green: "#65B10A",
  subtle: "#94A3B8",
  bg: "#FFFFFF",
  border: "rgba(0,0,0,0.06)",
};

function YouthPlusButton({
  onPress,
  style,
}: {
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.plusSlot, style]}
    >
      <View style={styles.plusBtn}>
        <FontAwesome5 name="plus" size={18} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { role, isYouth, isWorker, isManager, isAdmin } = useAuth();
  const r: AppRole = role ?? "jongere";

  const mwTabsOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarShowLabel: false,
      tabBarActiveTintColor: MW.green,
      tabBarInactiveTintColor: MW.subtle,
      tabBarStyle: {
        backgroundColor: MW.bg,
        borderTopWidth: 1,
        borderTopColor: MW.border,
        height: 58 + insets.bottom,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        paddingTop: 6,
        ...(Platform.OS === "android" ? { elevation: 10 } : {}),
      },
      tabBarItemStyle: { flex: 1 },
    }),
    [insets.bottom]
  );

  // ======================================================
  // 1) JONGERE NAVIGATIE
  // ======================================================
  if (isYouth || r === "jongere") {
    return (
      <Tabs screenOptions={mwTabsOptions}>
        <Tabs.Screen
          name="index" // app/(tabs)/index.tsx
          options={{
            title: "Feed",
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size ?? 24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="friends" // app/(tabs)/friends.tsx
          options={{
            title: "Friends",
            tabBarIcon: ({ color, size }) => (
              <Feather name="users" size={size ?? 24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="upload" // app/(tabs)/upload.tsx
          options={{
            title: "",
            tabBarIcon: () => null,
            tabBarButton: (props: any) => (
              <YouthPlusButton
                style={props?.style}
                onPress={() => router.push("/upload")}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="inbox" // app/(tabs)/inbox.tsx
          options={{
            title: "Inbox",
            tabBarIcon: ({ color, size }) => (
              <Feather name="message-circle" size={size ?? 23} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="profiel" // app/(tabs)/profiel.tsx
          options={{
            title: "Profiel",
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" size={size ?? 23} color={color} />
            ),
          }}
        />

        {/* verborgen voor jongere */}
        <Tabs.Screen
          name="workspace" // app/(tabs)/workspace.tsx
          options={{ href: null }}
        />
        <Tabs.Screen
          name="kennisHub" // app/(tabs)/kennisHub.tsx
          options={{ href: null }}
        />
        <Tabs.Screen
          name="crisis" // app/(tabs)/crisis.tsx
          options={{ href: null }}
        />
      </Tabs>
    );
  }

  // ======================================================
  // 2) JONGERENWERKER / MANAGER / ADMIN NAVIGATIE
  // ======================================================
  return (
    <Tabs screenOptions={mwTabsOptions}>
      <Tabs.Screen
        name="index" // app/(tabs)/index.tsx
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size ?? 22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="workspace" // app/(tabs)/workspace.tsx
        options={{
          title: "Workspace",
          tabBarIcon: ({ color, size }) => (
            <Feather name="briefcase" size={size ?? 22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="kennisHub" // app/(tabs)/kennisHub.tsx
        options={{
          title: "KennisHub",
          tabBarIcon: ({ color, size }) => (
            <Feather name="book-open" size={size ?? 22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="inbox" // app/(tabs)/inbox.tsx
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => (
            <Feather name="inbox" size={size ?? 22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profiel" // app/(tabs)/profiel.tsx
        options={{
          title: "Profiel",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size ?? 22} color={color} />
          ),
        }}
      />

      {/* crisis NIET als tab tonen, voor geen enkele rol */}
      <Tabs.Screen
        name="crisis" // app/(tabs)/crisis.tsx
        options={{ href: null }}
      />

      {/* verborgen voor werkers/managers/admins */}
      <Tabs.Screen
        name="friends" // app/(tabs)/friends.tsx
        options={{ href: null }}
      />
      <Tabs.Screen
        name="upload" // app/(tabs)/upload.tsx
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  plusSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    top: -6,
  },
  plusBtn: {
    width: 54,
    height: 36,
    borderRadius: 10,
    backgroundColor: MW.green,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
