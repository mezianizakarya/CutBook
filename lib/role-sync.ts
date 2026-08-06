import { useAuth, useUser } from "@clerk/expo";
import { useEffect, useState } from "react";

import type { Role } from "./roles";
import { supabase } from "./supabase";

type ProfileRoleRow = {
  role: string | null;
  updated_at: string | null;
};

function parseTimestamp(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}

/**
 * Makes `profiles.role` (Supabase) the source of truth for the app's active
 * role. Routing reads Clerk `unsafeMetadata.role`; this hook reconciles that
 * value against the database on every mount so edits made in Supabase
 * (e.g. by an admin) are picked up by the app.
 *
 * A timestamp keeps both directions consistent: app changes write
 * `roleUpdatedAt` into Clerk metadata, and the webhook mirrors them to the
 * DB asynchronously. If the DB value is newer than the metadata value, it
 * wins and is pushed back into Clerk; otherwise the metadata value (set
 * moments ago by the app) is left alone while the webhook catches up.
 */
export function useReconciledRole(): {
  role: Role | null | undefined;
  loading: boolean;
} {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const [role, setRole] = useState<Role | null | undefined>(user?.unsafeMetadata?.role);
  const [loading, setLoading] = useState(!isLoaded || !userLoaded);

  useEffect(() => {
    let cancelled = false;
    const currentUser = user;

    if (!isLoaded || !userLoaded || !isSignedIn || !currentUser) {
      setRole(currentUser?.unsafeMetadata?.role);
      setLoading(false);
      return;
    }

    setLoading(true);

    (async () => {
      const metadataRole = currentUser.unsafeMetadata?.role;
      const metadataTs =
        typeof currentUser.unsafeMetadata?.roleUpdatedAt === "number"
          ? (currentUser.unsafeMetadata.roleUpdatedAt as number)
          : 0;

      const { data, error } = await supabase
        .from("profiles")
        .select("role, updated_at")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      // Only override when the user already picked a role on onboarding
      // (avoids pushing the DB's `customer` default before they choose).
      if (!error && data && metadataRole) {
        const row = data as unknown as ProfileRoleRow;
        const dbRole = row.role as Role | null;
        const dbTs = parseTimestamp(row.updated_at);
        if (dbRole && dbRole !== metadataRole && dbTs > metadataTs) {
          setRole(dbRole);
          try {
            await currentUser.updateMetadata({
              unsafeMetadata: { role: dbRole, roleUpdatedAt: Date.now() },
            });
            await currentUser.reload();
          } catch (e) {
            console.warn("Failed to reconcile role from Supabase:", e);
          }
          if (!cancelled) {
            setRole(dbRole);
          }
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userLoaded, user]);

  return { role, loading };
}
