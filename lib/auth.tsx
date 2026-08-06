import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { useReconciledRole } from "./role-sync";
import { colors } from "./theme";
import { ROLE_ROUTES, type Role } from "./roles";

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
      <ActivityIndicator size="large" color={colors.primary} />
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
  const { role: effectiveRole, loading: roleLoading } = useReconciledRole();

  const ready = isLoaded && userLoaded && !roleLoading;
  const valid = isSignedIn && user !== null;
  const profileCompleted = user?.unsafeMetadata?.profileCompleted === true;

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
    if (!effectiveRole) {
      router.replace("/choose-role");
      return;
    }
    if (effectiveRole !== role) {
      router.replace(ROLE_ROUTES[effectiveRole]);
      return;
    }
    if (!profileCompleted) {
      router.replace("/complete-profile");
      return;
    }
  }, [ready, valid, user, role, router, effectiveRole, profileCompleted]);

  if (!ready || !valid) {
    return <FullScreenLoader />;
  }
  if (effectiveRole !== role || !profileCompleted) {
    return null;
  }
  return <>{children}</>;
}
