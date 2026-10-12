import { createAuthenticatedApiClient } from "../api/client";
import { createAuthClient, getAccessToken } from "../auth/supabase";

export interface PlatformClientConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export function createPlatformClients(config: PlatformClientConfig) {
  const auth = createAuthClient(config.supabaseUrl, config.supabasePublishableKey);
  const api = createAuthenticatedApiClient(config.apiUrl, () => getAccessToken(auth));
  return { auth, api };
}
