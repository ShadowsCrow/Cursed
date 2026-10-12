import { useMutation, useQueries, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";

import type { ApiClient } from "../characters/types";
import { sheetKeys } from "../characters/sheet/sheetApi";
import {
  erroDaApi,
  type AcaoCarta,
  type ApresentacaoResumo,
  type AquisicaoCartasResposta,
  type CartaDefinicaoResumo,
  type CartaPersonagemResumo,
  type CartaVersaoResumo,
  type OfertaResumo,
  type PreviaImportacaoCarta,
  type PreviaMigracaoCarta,
  type TipoCarta,
  type ValidacaoCarta,
} from "./types";

export const cardKeys = {
  catalogo: (mesaId: string) => ["cartas", mesaId] as const,
  versoes: (mesaId: string, cartaId: string) => ["cartas", mesaId, cartaId, "versoes"] as const,
  doPersonagem: (mesaId: string, personagemId: string) => ["cartas-personagem", mesaId, personagemId] as const,
  ofertas: (mesaId: string) => ["ofertas", mesaId] as const,
  apresentacoes: (mesaId: string) => ["apresentacoes", mesaId] as const,
};

// ------------------------------------------------------------------ catálogo

export function useCatalogo(api: ApiClient, mesaId: string): UseQueryResult<CartaDefinicaoResumo[], Error> {
  return useQuery({
    queryKey: cardKeys.catalogo(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/cartas", { params: { path: { mesa_id: mesaId } } });
      if (error) throw erroDaApi(error, "Não foi possível carregar o catálogo.");
      return data ?? [];
    },
  });
}

export function useVersoesCarta(api: ApiClient, mesaId: string, cartaId: string | null): UseQueryResult<CartaVersaoResumo[], Error> {
  return useQuery({
    queryKey: cardKeys.versoes(mesaId, cartaId ?? ""),
    enabled: Boolean(cartaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/cartas/{carta_id}/versoes", {
        params: { path: { mesa_id: mesaId, carta_id: cartaId ?? "" } },
      });
      if (error) throw erroDaApi(error, "Não foi possível carregar as versões.");
      return data ?? [];
    },
  });
}

function useInvalidarCatalogo(mesaId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: cardKeys.catalogo(mesaId) });
}

export function useCriarCarta(api: ApiClient, mesaId: string) {
  const invalidar = useInvalidarCatalogo(mesaId);
  return useMutation({
    mutationFn: async ({ tipo, rascunho }: { tipo: TipoCarta; rascunho: Record<string, unknown> }) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/cartas", {
        params: { path: { mesa_id: mesaId } }, body: { tipo, rascunho },
      });
      if (error) throw erroDaApi(error, "Não foi possível criar a carta.");
      return data as CartaDefinicaoResumo;
    },
    onSuccess: () => void invalidar(),
  });
}

export function useSalvarRascunho(api: ApiClient, mesaId: string) {
  const invalidar = useInvalidarCatalogo(mesaId);
  return useMutation({
    mutationFn: async ({ cartaId, rascunho, versao }: { cartaId: string; rascunho: Record<string, unknown>; versao: number }) => {
      const { data, error } = await api.PUT("/mesas/{mesa_id}/cartas/{carta_id}/rascunho", {
        params: { path: { mesa_id: mesaId, carta_id: cartaId } }, body: { rascunho, versao_esperada: versao },
      });
      if (error) throw erroDaApi(error, "Não foi possível salvar o rascunho.");
      return data as CartaDefinicaoResumo;
    },
    onSuccess: () => void invalidar(),
  });
}

export function useValidarCarta(api: ApiClient, mesaId: string) {
  return useMutation({
    mutationFn: async (cartaId: string) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/cartas/{carta_id}/validacao", {
        params: { path: { mesa_id: mesaId, carta_id: cartaId } },
      });
      if (error) throw erroDaApi(error, "Não foi possível validar a carta.");
      return data as ValidacaoCarta;
    },
  });
}

export function usePublicarCarta(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cartaId, versao, promoverAtivos }: { cartaId: string; versao: number; promoverAtivos?: boolean }) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/cartas/{carta_id}/publicacao", {
        params: { path: { mesa_id: mesaId, carta_id: cartaId } },
        body: { versao_esperada: versao, promover_ativos: Boolean(promoverAtivos) },
      });
      if (error) throw erroDaApi(error, "Não foi possível publicar a carta.");
      return data as CartaVersaoResumo;
    },
    onSuccess: (versao) => {
      void queryClient.invalidateQueries({ queryKey: cardKeys.catalogo(mesaId) });
      void queryClient.invalidateQueries({ queryKey: cardKeys.versoes(mesaId, versao.definicao_id) });
    },
  });
}

export function usePreviaImportacaoCarta(api: ApiClient, mesaId: string) {
  return useMutation({
    mutationFn: async (codigo: string) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/cartas/importacoes/previa", {
        params: { path: { mesa_id: mesaId } }, body: { codigo },
      });
      if (error) throw erroDaApi(error, "Não foi possível ler o código.");
      return data as PreviaImportacaoCarta;
    },
  });
}

export function useImportarCarta(api: ApiClient, mesaId: string) {
  const invalidar = useInvalidarCatalogo(mesaId);
  return useMutation({
    mutationFn: async (codigo: string) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/cartas/importacoes", {
        params: { path: { mesa_id: mesaId } }, body: { codigo },
      });
      if (error) throw erroDaApi(error, "Não foi possível importar a carta.");
      return data as CartaDefinicaoResumo;
    },
    onSuccess: () => void invalidar(),
  });
}

// --------------------------------------------------------------------- posse

function consultaCartasDoPersonagem(api: ApiClient, mesaId: string, personagemId: string) {
  return {
    queryKey: cardKeys.doPersonagem(mesaId, personagemId),
    queryFn: async (): Promise<CartaPersonagemResumo[]> => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/personagens/{personagem_id}/cartas", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
      });
      if (error) throw erroDaApi(error, "Não foi possível carregar as cartas do personagem.");
      return data ?? [];
    },
  };
}

export function useCartasDoPersonagem(
  api: ApiClient, mesaId: string, personagemId: string,
): UseQueryResult<CartaPersonagemResumo[], Error> {
  return useQuery(consultaCartasDoPersonagem(api, mesaId, personagemId));
}

/** As cartas de vários personagens de uma vez, na ordem pedida (mesma consulta e chave de `useCartasDoPersonagem`). */
export function useCartasDosPersonagens(
  api: ApiClient, mesaId: string, personagemIds: readonly string[],
): UseQueryResult<CartaPersonagemResumo[], Error>[] {
  return useQueries({ queries: personagemIds.map((id) => consultaCartasDoPersonagem(api, mesaId, id)) });
}

/** Após qualquer comando de posse: nova versão da ficha e dados que dependem das cartas. */
function useAposComandoDePosse(mesaId: string, personagemId: string) {
  const aplicar = useAplicarComandoDePosse(mesaId);
  return (resposta: AquisicaoCartasResposta) => aplicar(personagemId, resposta);
}

function useAplicarComandoDePosse(mesaId: string) {
  const queryClient = useQueryClient();
  return (personagemId: string, resposta: AquisicaoCartasResposta) => {
    queryClient.setQueryData(sheetKeys.ficha(mesaId, personagemId), (antigo: { versao: number } | undefined) =>
      antigo ? { ...antigo, versao: resposta.versao } : antigo,
    );
    for (const chave of [
      cardKeys.doPersonagem(mesaId, personagemId), sheetKeys.inventario(mesaId, personagemId),
      sheetKeys.efeitos(mesaId, personagemId), sheetKeys.valoresDerivados(mesaId, personagemId),
    ]) {
      void queryClient.invalidateQueries({ queryKey: chave });
    }
  };
}

export function useConcederCarta(api: ApiClient, mesaId: string, personagemId: string) {
  const aposComando = useAposComandoDePosse(mesaId, personagemId);
  return useMutation({
    mutationFn: async (corpo: { versao_id: string; excecao_aprendizado: boolean; motivo: string | null; versao_esperada: number }) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/personagens/{personagem_id}/cartas", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } }, body: corpo,
      });
      if (error) throw erroDaApi(error, "Não foi possível conceder a carta.");
      return data as AquisicaoCartasResposta;
    },
    onSuccess: aposComando,
  });
}

/**
 * "Enviar" da biblioteca da mesa: concede a carta ao personagem escolhido, sem abrir a ficha dele. Item
 * entra no inventário sem lugar na grade; habilidade e magia ficam disponíveis; efeito é aplicado.
 */
export function useEnviarCarta(api: ApiClient, mesaId: string) {
  const aplicar = useAplicarComandoDePosse(mesaId);
  return useMutation({
    mutationFn: async ({ personagemId, versaoId }: { personagemId: string; versaoId: string }) => {
      const caminho = { mesa_id: mesaId, personagem_id: personagemId };
      const ficha = await api.GET("/mesas/{mesa_id}/personagens/{personagem_id}/ficha", { params: { path: caminho } });
      if (ficha.error || !ficha.data) throw erroDaApi(ficha.error, "Não foi possível ler a ficha do personagem.");
      const { data, error } = await api.POST("/mesas/{mesa_id}/personagens/{personagem_id}/cartas", {
        params: { path: caminho },
        body: { versao_id: versaoId, excecao_aprendizado: false, motivo: null, versao_esperada: ficha.data.versao },
      });
      if (error) throw erroDaApi(error, "Não foi possível enviar a carta.");
      return data as AquisicaoCartasResposta;
    },
    onSuccess: (resposta, { personagemId }) => aplicar(personagemId, resposta),
  });
}

export function useTransicaoCarta(api: ApiClient, mesaId: string, personagemId: string) {
  const aposComando = useAposComandoDePosse(mesaId, personagemId);
  return useMutation({
    mutationFn: async ({ cartaId, acao, versao, motivo }: { cartaId: string; acao: AcaoCarta; versao: number; motivo?: string | null }) => {
      const { data, error } = await api.POST(
        "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/transicoes/{acao}",
        {
          params: { path: { mesa_id: mesaId, personagem_id: personagemId, carta_id: cartaId, acao } },
          body: { versao_esperada: versao, motivo: motivo ?? null },
        },
      );
      if (error) throw erroDaApi(error, "Não foi possível atualizar a carta.");
      return data as AquisicaoCartasResposta;
    },
    onSuccess: aposComando,
  });
}

export function usePreviaMigracao(
  api: ApiClient, mesaId: string, personagemId: string, cartaId: string | null, versaoDestinoId: string | null,
): UseQueryResult<PreviaMigracaoCarta, Error> {
  return useQuery({
    queryKey: ["migracao-carta", mesaId, personagemId, cartaId, versaoDestinoId],
    enabled: Boolean(cartaId && versaoDestinoId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao/previa",
        {
          params: {
            path: { mesa_id: mesaId, personagem_id: personagemId, carta_id: cartaId ?? "" },
            query: { versao_destino_id: versaoDestinoId ?? "" },
          },
        },
      );
      if (error) throw erroDaApi(error, "Não foi possível comparar as versões.");
      return data as PreviaMigracaoCarta;
    },
  });
}

export function useMigrarCarta(api: ApiClient, mesaId: string, personagemId: string) {
  const aposComando = useAposComandoDePosse(mesaId, personagemId);
  return useMutation({
    mutationFn: async ({ cartaId, versaoDestinoId, versao }: { cartaId: string; versaoDestinoId: string; versao: number }) => {
      const { data, error } = await api.POST(
        "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao",
        {
          params: { path: { mesa_id: mesaId, personagem_id: personagemId, carta_id: cartaId } },
          body: { versao_destino_id: versaoDestinoId, versao_esperada: versao },
        },
      );
      if (error) throw erroDaApi(error, "Não foi possível migrar a carta.");
      return data as AquisicaoCartasResposta;
    },
    onSuccess: aposComando,
  });
}

// ------------------------------------------------------------------- ofertas

export function useOfertas(api: ApiClient, mesaId: string): UseQueryResult<OfertaResumo[], Error> {
  return useQuery({
    queryKey: cardKeys.ofertas(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/ofertas", { params: { path: { mesa_id: mesaId } } });
      if (error) throw erroDaApi(error, "Não foi possível carregar as ofertas.");
      return data ?? [];
    },
  });
}

export interface NovaOferta {
  titulo: string;
  versao_ids: string[];
  personagem_ids: string[];
  min_escolhas: number;
  max_escolhas: number;
  expira_em: string | null;
}

export function useCriarOferta(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (corpo: NovaOferta) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/ofertas", {
        params: { path: { mesa_id: mesaId } }, body: corpo,
      });
      if (error) throw erroDaApi(error, "Não foi possível criar a oferta.");
      return data as OfertaResumo;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cardKeys.ofertas(mesaId) }),
  });
}

export function useCancelarOferta(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ofertaId: string) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/ofertas/{oferta_id}/cancelamento", {
        params: { path: { mesa_id: mesaId, oferta_id: ofertaId } },
      });
      if (error) throw erroDaApi(error, "Não foi possível cancelar a oferta.");
      return data as OfertaResumo;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cardKeys.ofertas(mesaId) }),
  });
}

export function useResponderOferta(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ofertaId, personagemId, escolhas }: { ofertaId: string; personagemId: string; escolhas: string[] }) => {
      const ficha = await api.GET("/mesas/{mesa_id}/personagens/{personagem_id}/ficha", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
      });
      if (ficha.error) throw erroDaApi(ficha.error, "Não foi possível ler a ficha do personagem.");
      const { data, error } = await api.POST("/mesas/{mesa_id}/ofertas/{oferta_id}/respostas/{personagem_id}", {
        params: { path: { mesa_id: mesaId, oferta_id: ofertaId, personagem_id: personagemId } },
        body: { escolhas, versao_esperada: ficha.data?.versao ?? 0 },
      });
      if (error) throw erroDaApi(error, "Não foi possível confirmar a escolha.");
      return data as AquisicaoCartasResposta;
    },
    onSuccess: (_, { personagemId }) => {
      void queryClient.invalidateQueries({ queryKey: cardKeys.ofertas(mesaId) });
      void queryClient.invalidateQueries({ queryKey: cardKeys.doPersonagem(mesaId, personagemId) });
      void queryClient.invalidateQueries({ queryKey: sheetKeys.ficha(mesaId, personagemId) });
    },
  });
}

// ------------------------------------------------------------- apresentação

export function useApresentacoes(api: ApiClient, mesaId: string): UseQueryResult<ApresentacaoResumo[], Error> {
  return useQuery({
    queryKey: cardKeys.apresentacoes(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/apresentacoes", { params: { path: { mesa_id: mesaId } } });
      if (error) throw erroDaApi(error, "Não foi possível carregar as apresentações.");
      return data ?? [];
    },
  });
}

export function useApresentarCarta(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (corpo: { versao_id: string; destinatarios: string[] }) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/apresentacoes", {
        params: { path: { mesa_id: mesaId } }, body: corpo,
      });
      if (error) throw erroDaApi(error, "Não foi possível apresentar a carta.");
      return data as ApresentacaoResumo;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cardKeys.apresentacoes(mesaId) }),
  });
}

/** O participante fechou a carta apresentada: o servidor não a mostra mais para ele, nem ao recarregar. */
export function useMarcarApresentacaoVista(api: ApiClient, mesaId: string) {
  return useMutation({
    mutationFn: async (apresentacaoId: string) => {
      const { error } = await api.POST("/mesas/{mesa_id}/apresentacoes/{apresentacao_id}/visualizacao", {
        params: { path: { mesa_id: mesaId, apresentacao_id: apresentacaoId } },
      });
      if (error) throw erroDaApi(error, "Não foi possível registrar que a carta foi vista.");
    },
  });
}

/** Respostas que ainda aguardam escolha em ofertas abertas e dentro da validade. */
export function contarOfertasPendentes(ofertas: OfertaResumo[] | undefined): number {
  return (ofertas ?? []).reduce(
    (total, oferta) => total + (oferta.estado === "aberta" && !oferta.expirada
      ? oferta.destinatarios.filter((d) => d.estado === "pendente").length : 0),
    0,
  );
}

/** Oferta aceita por todos: cada destinatário já respondeu, então ela sai da lista do Narrador. */
export function ofertaAceita(oferta: OfertaResumo): boolean {
  return oferta.destinatarios.length > 0 && oferta.destinatarios.every((d) => d.estado === "respondida");
}
