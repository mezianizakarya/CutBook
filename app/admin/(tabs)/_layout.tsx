import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";

import { ROLE_TABS } from "@/lib/roles";
import { colors } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
      }}
    >
      {ROLE_TABS.admin.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon as IconName} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
