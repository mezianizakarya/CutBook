import { Stack } from "expo-router";

import { RoleGuard } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function CustomerLayout() {
  return (
    <RoleGuard role="customer">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </RoleGuard>
  );
}
