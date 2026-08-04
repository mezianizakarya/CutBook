import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";

import { FullScreenLoader, emailIsVerified } from "@/lib/auth";
import { ROLE_ROUTES } from "@/lib/roles";

/**
 * Central authentication router. Every entry point (app launch, sign-in,
 * sign-up, password reset) lands here and is redirected based on auth state,
 * email verification, role and profile completion.
 */
export default function LoadingScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !userLoaded) {
      return;
    }
    if (!isSignedIn || !user) {
      router.replace("/welcome");
      return;
    }
    if (user.unsafeMetadata?.disabled) {
      router.replace("/unauthorized");
      return;
    }
    if (!emailIsVerified(user)) {
      router.replace("/verify-email");
      return;
    }
    const role = user.unsafeMetadata?.role;
    if (!role) {
      router.replace("/choose-role");
      return;
    }
    if (!user.unsafeMetadata?.profileCompleted) {
      router.replace("/complete-profile");
      return;
    }
    router.replace(ROLE_ROUTES[role]);
  }, [isLoaded, isSignedIn, userLoaded, user, router]);

  return <FullScreenLoader />;
}
