import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { components } from "../../api/generated/schema";
import { extractErrorMessage, type ApiClient } from "../characters/types";

export type EventoAuditoriaResumo = components["schemas"]["EventoAuditoriaResumo"];
export type MudancaAuditoria = components["schemas"]["MudancaAuditoria"];
export type PaginaAuditoria = components["schemas"]["PaginaAuditoria"];
export type CategoriaAuditoria = EventoAuditoriaResumo["categoria"];
export type RelevanciaAuditoria = EventoAuditoriaResumo["relevancia"];

export const CATEGORIAS_AUDITORIA: CategoriaAuditoria[] = [
  "mesa", "permissao", "personagem", "ficha", "inventario", "efeito", "carta",
];
export const RELEVANCIAS_AUDITORIA: RelevanciaAuditoria[] = ["mecanica", "narrativa", "organizacional"];

export interface AuditFiltros {
  sessaoId?: string;
  atorId?: string;
  personagemId?: string;
  categoria?: CategoriaAuditoria;
  relevancia?: RelevanciaAuditoria;
}

const LIMITE_PAGINA = 30;

export const auditKeys = {
  list: (mesaId: string, filtros: AuditFiltros) => ["auditoria", mesaId, filtros] as const,
  listPrefix: (mesaId: string) => ["auditoria", mesaId] as const,
};

/**
 * Linha do tempo de auditoria da mesa, paginada por cursor (`antes_de`). Cada
 * combinação de filtros é uma entrada própria de cache — trocar um filtro
 * nunca reaproveita páginas já carregadas com outra combinação, o que reinicia
 * a paginação automaticamente.
 */
export function useEventosAuditoria(api: ApiClient, mesaId: string, filtros: AuditFiltros) {
  return useInfiniteQuery({
    queryKey: auditKeys.list(mesaId, filtros),
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/auditoria", {
        params: {
          path: { mesa_id: mesaId },
          query: {
            sessao_id: filtros.sessaoId ?? undefined,
            ator_id: filtros.atorId ?? undefined,
            personagem_id: filtros.personagemId ?? undefined,
            categoria: filtros.categoria ?? undefined,
            relevancia: filtros.relevancia ?? undefined,
            antes_de: pageParam,
            limite: LIMITE_PAGINA,
          },
        },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar o registro de alterações."));
      return data as PaginaAuditoria;
    },
    getNextPageParam: (lastPage) => lastPage.proximo_cursor ?? undefined,
  });
}

export interface CorrigirEventoVariaveis {
  eventoId: number;
  motivo?: string;
  versaoEsperada: number;
}

/**
 * Correção de um evento: cria um novo evento vinculado (`corrige_evento_id`)
 * sem jamais apagar ou substituir o original. Em sucesso, invalida todas as
 * combinações de filtros carregadas desta mesa para que a nova ligação apareça
 * onde quer que o evento original esteja visível.
 */
export function useCorrigirEvento(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventoId, motivo, versaoEsperada }: CorrigirEventoVariaveis) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/auditoria/{evento_id}/correcao", {
        params: { path: { mesa_id: mesaId, evento_id: eventoId } },
        body: { motivo: motivo && motivo.trim() ? motivo.trim() : null, versao_esperada: versaoEsperada },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível aplicar a correção."));
      return data as EventoAuditoriaResumo;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: auditKeys.listPrefix(mesaId) });
      // A correção muda a versão e o conteúdo do personagem: sem isso, uma segunda correção
      // seguida usaria a versão antiga e a ficha aberta mostraria valores já revertidos.
      for (const chave of ["personagens", "ficha", "desgaste", "consequencias", "efeitos", "valores-derivados", "inventario"]) {
        void queryClient.invalidateQueries({ queryKey: [chave, mesaId] });
      }
    },
  });
}
