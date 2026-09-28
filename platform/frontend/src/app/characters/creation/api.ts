import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "../../../api/generated/schema";

import { extractErrorMessage, type ApiClient, type FichaContrato } from "../types";

export type PreviaCriacao = components["schemas"]["PreviaCriacaoResposta"];
export type ProblemaCampo = components["schemas"]["ProblemaValidacao"];

/** Erro do servidor com os problemas por campo, quando a resposta os traz (422 da validação da ficha). */
export class ErroDeCriacao extends Error {
  constructor(mensagem: string, readonly problemas: ProblemaCampo[] = []) {
    super(mensagem);
  }
}

function erroDe(corpo: unknown, padrao: string): ErroDeCriacao {
  const detalhe = corpo && typeof corpo === "object" ? (corpo as { detail?: unknown }).detail : undefined;
  if (detalhe && typeof detalhe === "object" && !Array.isArray(detalhe)) {
    const { mensagem, problemas } = detalhe as { mensagem?: unknown; problemas?: unknown };
    const lista = Array.isArray(problemas)
      ? problemas.filter((p): p is ProblemaCampo => !!p && typeof p === "object" && "campo" in p && "mensagem" in p)
      : [];
    return new ErroDeCriacao(typeof mensagem === "string" ? mensagem : padrao, lista);
  }
  return new ErroDeCriacao(extractErrorMessage(corpo, padrao));
}

/** Falha de rede (o `fetch` lança) vira a mesma mensagem legível dos erros do servidor. */
async function chamar<T>(pedido: () => Promise<{ data?: T; error?: unknown }>, padrao: string): Promise<T> {
  let resposta: { data?: T; error?: unknown };
  try {
    resposta = await pedido();
  } catch {
    throw new ErroDeCriacao(`${padrao} Verifique a conexão.`);
  }
  if (resposta.error || !resposta.data) throw erroDe(resposta.error, padrao);
  return resposta.data;
}

/**
 * PV, PP e Escalas do rascunho e os problemas que impediriam a criação, calculados pelo servidor
 * sem gravar nada (design D3). A chave inclui a ficha: muda a ficha, pede de novo.
 */
export function usePreviaCriacao(api: ApiClient, mesaId: string, ficha: FichaContrato, habilitada: boolean) {
  return useQuery({
    queryKey: ["previa-criacao", mesaId, ficha],
    enabled: habilitada,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: () => chamar(() => api.POST("/mesas/{mesa_id}/personagens/previa", {
      params: { path: { mesa_id: mesaId } },
      body: { ficha },
    }), "Não foi possível calcular a prévia."),
  });
}

/** Uma única gravação com a ficha montada pelo assistente (design D2). */
export function useCriarPelaFicha(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ficha: FichaContrato) => chamar(() => api.POST("/mesas/{mesa_id}/personagens", {
      params: { path: { mesa_id: mesaId } },
      body: { ficha },
    }), "Não foi possível criar o personagem."),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["personagens", mesaId] });
    },
  });
}
