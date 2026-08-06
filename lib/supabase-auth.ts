import { useAuth } from "@clerk/expo";
import { useEffect } from "react";

import { setClerkTokenProvider } from "./supabase";

/**
 * Bridges the Clerk session into Supabase. Mount once inside <ClerkProvider>
 * (e.g. in the root layout). Every Supabase request is then sent with a
 * Clerk-issued JWT carrying the "authenticated" role claim, so RLS policies
 * keyed to `auth.jwt() ->> 'sub'` work. Requires the native Clerk <-> Supabase
 * integration to be activated in both dashboards.
 */
export function useSupabaseSession() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      setClerkTokenProvider(null);
      return;
    }

    setClerkTokenProvider(async () => (isSignedIn ? await getToken() : null));

    return () => {
      setClerkTokenProvider(null);
    };
  }, [getToken, isLoaded, isSignedIn]);
}
