import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createAuthClient(url: string, publishableKey: string): SupabaseClient {
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export async function signInWithPassword(
  authClient: SupabaseClient,
  email: string,
  password: string,
): Promise<void> {
  const { error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(authClient: SupabaseClient): Promise<void> {
  const { error } = await authClient.auth.signOut();
  if (error) throw error;
}

export async function getAccessToken(authClient: SupabaseClient): Promise<string | null> {
  const { data, error } = await authClient.auth.getSession();
  if (error) throw error;
  return data.session?.access_token ?? null;
}
