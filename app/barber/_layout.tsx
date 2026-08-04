import { Stack } from "expo-router";

import { RoleGuard } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function BarberLayout() {
  return (
    <RoleGuard role="barber">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </RoleGuard>
  );
}
