import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to your .env file"
  );
}

type ClerkTokenProvider = () => Promise<string | null>;

let getClerkToken: ClerkTokenProvider | null = null;

/**
 * Registers the function Supabase calls on every request to obtain a fresh
 * Clerk session token. Wire it up once via `useSupabaseSession()` in the root
 * layout. When no provider is registered, requests go out unauthenticated.
 */
export function setClerkTokenProvider(provider: ClerkTokenProvider | null) {
  getClerkToken = provider;
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  async accessToken() {
    return getClerkToken ? await getClerkToken() : null;
  },
});
