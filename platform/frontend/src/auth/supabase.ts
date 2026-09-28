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

/** Cria a conta; o Supabase envia a confirmação por e-mail. Não revela se o e-mail já existia. */
export async function signUp(authClient: SupabaseClient, email: string, password: string, redirectTo: string): Promise<void> {
  const { error } = await authClient.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
  if (error) throw error;
}

export async function requestPasswordReset(authClient: SupabaseClient, email: string, redirectTo: string): Promise<void> {
  const { error } = await authClient.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(authClient: SupabaseClient, password: string): Promise<void> {
  const { error } = await authClient.auth.updateUser({ password });
  if (error) throw error;
}

/** Leva ao Google e volta para `redirectTo` já autenticado. */
export async function signInWithGoogle(authClient: SupabaseClient, redirectTo: string): Promise<void> {
  const { error } = await authClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  if (error) throw error;
}
