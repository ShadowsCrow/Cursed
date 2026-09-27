import { useQuery } from "@tanstack/react-query";

import type { ApiClient } from "../characters/types";

/** Busca uma imagem separadamente da ficha ou da carta, usando a autorização da API. */
export function useAssetImage(api: ApiClient, mesaId: string, caminho: string, { exibicao = false, enabled = true } = {}) {
  return useQuery({
    queryKey: ["imagem-ativo", mesaId, caminho, exibicao],
    enabled,
    queryFn: async () => {
      // `exibicao` pede a versão reduzida (WEBP) quando existe; a original continua guardada.
      const { data, error } = await api.GET("/mesas/{mesa_id}/ativos", {
        params: { path: { mesa_id: mesaId }, query: exibicao ? { caminho, exibicao: true } : { caminho } },
      });
      if (error || !data) throw new Error("Não foi possível carregar a imagem.");
      return `data:${data.tipo};base64,${data.base64}`;
    },
    retry: false,
  });
}
