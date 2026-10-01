import { useQueries, useQuery } from "@tanstack/react-query";

import type { ApiClient } from "../characters/types";

function consultaImagem(api: ApiClient, mesaId: string, caminho: string, exibicao: boolean) {
  return {
    queryKey: ["imagem-ativo", mesaId, caminho, exibicao] as const,
    queryFn: async () => {
      // `exibicao` pede a versão reduzida (WEBP) quando existe; a original continua guardada.
      const { data, error } = await api.GET("/mesas/{mesa_id}/ativos", {
        params: { path: { mesa_id: mesaId }, query: exibicao ? { caminho, exibicao: true } : { caminho } },
      });
      if (error || !data) throw new Error("Não foi possível carregar a imagem.");
      return `data:${data.tipo};base64,${data.base64}`;
    },
    retry: false,
  };
}

/** Busca uma imagem separadamente da ficha ou da carta, usando a autorização da API. */
export function useAssetImage(api: ApiClient, mesaId: string, caminho: string, { exibicao = false, enabled = true } = {}) {
  return useQuery({ ...consultaImagem(api, mesaId, caminho, exibicao), enabled });
}

/** Várias imagens de uma vez (ex.: ícones da grade); devolve só as já carregadas, por caminho. */
export function useAssetImages(api: ApiClient, mesaId: string, caminhos: readonly string[]): Record<string, string | undefined> {
  const unicos = [...new Set(caminhos.filter(Boolean))];
  const resultados = useQueries({ queries: unicos.map((caminho) => consultaImagem(api, mesaId, caminho, false)) });
  return Object.fromEntries(unicos.map((caminho, i) => [caminho, resultados[i]?.data]));
}
