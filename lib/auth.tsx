import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { colors } from "./theme";
import type { Role } from "./roles";

export function emailIsVerified(user: {
  primaryEmailAddress?: { verification?: { status?: string | null } | null } | null;
} | null | undefined): boolean {
  return user?.primaryEmailAddress?.verification?.status === "verified";
}

export function FullScreenLoader() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

/**
 * Protects every route inside a role group. Reused by each role layout so the
 * role/profile/verification checks are never duplicated.
 */
export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const router = useRouter();

  const ready = isLoaded && userLoaded;
  const valid = isSignedIn && user !== null;

  useEffect(() => {
    if (!ready) return;
    if (!valid) {
      router.replace("/welcome");
      return;
    }
    if (!emailIsVerified(user)) {
      router.replace("/verify-email");
      return;
    }
    if (user.unsafeMetadata?.disabled) {
      router.replace("/unauthorized");
      return;
    }
    if (!user.unsafeMetadata?.role) {
      router.replace("/choose-role");
      return;
    }
    if (user.unsafeMetadata?.role !== role) {
      router.replace("/unauthorized");
      return;
    }
    if (!user.unsafeMetadata?.profileCompleted) {
      router.replace("/complete-profile");
      return;
    }
  }, [ready, valid, user, role, router]);

  if (!ready || !valid) {
    return <FullScreenLoader />;
  }
  if (
    user.unsafeMetadata?.role !== role ||
    !user.unsafeMetadata?.profileCompleted
  ) {
    return null;
  }
  return <>{children}</>;
}
