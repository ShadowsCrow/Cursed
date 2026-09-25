import { describe, expect, it } from "vitest";
import { AuthenticationRequiredError, createAuthenticatedApiClient } from "./client";

describe("cliente da API autenticado", () => {
  it("envia o token ao servidor em cada requisição protegida", async () => {
    let authorization: string | null = null;
    const fetchImpl: typeof fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      authorization = request.headers.get("Authorization");
      return Response.json({ status: "ok" });
    };
    const client = createAuthenticatedApiClient(
      "https://api.example", async () => "token-atual", fetchImpl,
    );
    const { data, response } = await client.GET("/health");
    expect(response.status).toBe(200);
    expect(data?.status).toBe("ok");
    expect(authorization).toBe("Bearer token-atual");
  });

  it("recusa chamada sem sessão antes de enviar a requisição", async () => {
    let requests = 0;
    const fetchImpl: typeof fetch = async () => {
      requests += 1;
      return Response.json({ status: "ok" });
    };
    const client = createAuthenticatedApiClient(
      "https://api.example", async () => null, fetchImpl,
    );
    await expect(client.GET("/health")).rejects.toThrow(AuthenticationRequiredError);
    expect(requests).toBe(0);
  });

  it("propaga rejeição de token inválido ou expirado pelo servidor", async () => {
    const fetchImpl: typeof fetch = async () => Response.json(
      { detail: "Token inválido." }, { status: 401 },
    );
    const client = createAuthenticatedApiClient(
      "https://api.example", async () => "token-expirado", fetchImpl,
    );
    const { response, error } = await client.GET("/health");
    expect(response.status).toBe(401);
    expect(error).toEqual({ detail: "Token inválido." });
  });
});
