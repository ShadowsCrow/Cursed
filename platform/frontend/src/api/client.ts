import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";

export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("É necessário entrar na mesa para acessar este recurso.");
    this.name = "AuthenticationRequiredError";
  }
}

export function createAuthenticatedApiClient(
  baseUrl: string,
  accessToken: () => Promise<string | null>,
  fetchImpl?: typeof fetch,
) {
  const client = createClient<paths>({ baseUrl, fetch: fetchImpl });
  client.use({
    async onRequest({ request }) {
      const token = await accessToken();
      if (!token) {
        throw new AuthenticationRequiredError();
      }
      request.headers.set("Authorization", `Bearer ${token}`);
      return request;
    },
  });
  return client;
}
