import { Stack } from "expo-router";

import { RoleGuard } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function OwnerLayout() {
  return (
    <RoleGuard role="owner">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </RoleGuard>
  );
}
