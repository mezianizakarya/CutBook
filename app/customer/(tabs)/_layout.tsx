import { Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/tab-bar/FloatingTabBar";
import { ROLE_TABS } from "@/lib/roles";

export default function CustomerTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} role="customer" showProfileAvatar />}
    >
      {ROLE_TABS.customer.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}
