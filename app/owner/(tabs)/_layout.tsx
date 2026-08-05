import { Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/tab-bar/FloatingTabBar";
import { ROLE_TABS } from "@/lib/roles";

export default function OwnerTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} role="owner" showProfileAvatar />}
    >
      {ROLE_TABS.owner.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}
