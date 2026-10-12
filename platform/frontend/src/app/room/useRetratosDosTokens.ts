import { useQueries } from "@tanstack/react-query";

import type { components } from "../../api/generated/schema";
import type { ApiClient } from "../characters/types";
import { retratoPadrao } from "../plataforma/imagens";

type Token = components["schemas"]["TokenSala"];

/**
 * Retrato de cada token ligado a personagem (experiencia-da-mesa, item 12), por id do token. Vem da rota do token,
 * que segue a visibilidade do token e não a da ficha: o jogador vê a foto do monstro sem poder abrir a ficha.
 * Sem foto enviada (ou se a leitura falhar), a arte padrão do tipo do personagem.
 */
export function useRetratosDosTokens(api: ApiClient, mesaId: string, tokens: readonly Token[]): Record<string, string> {
  const ligados = tokens.filter((token) => token.tipo_personagem);
  const consultas = useQueries({
    queries: ligados.map((token) => ({
      queryKey: ["retrato-token", mesaId, token.id] as const,
      queryFn: async () => {
        const { data, error } = await api.GET("/mesas/{mesa_id}/sala/tokens/{token_id}/retrato", {
          params: { path: { mesa_id: mesaId, token_id: token.id } },
        });
        if (error || !data?.base64) throw new Error("Sem retrato.");
        return `data:${data.tipo};base64,${data.base64}`;
      },
      retry: false,
      staleTime: 60_000,
    })),
  });
  const retratos: Record<string, string> = {};
  ligados.forEach((token, indice) => {
    retratos[token.id] = consultas[indice]?.data ?? retratoPadrao(token.tipo_personagem ?? "personagem", true);
  });
  return retratos;
}
