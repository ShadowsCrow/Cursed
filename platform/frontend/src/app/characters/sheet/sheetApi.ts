import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";

import { useCommandPreview, type UseCommandPreviewResult } from "../../connectivity/useCommandPreview";
import {
  extractErrorMessage,
  type ApiClient,
  type EfeitoResumo,
  type FichaContrato,
  type FichaSnapshot,
  type ImportacaoResultado,
  type ItemInventarioResumo,
  type PedidoAlteracaoResumo,
  type PermissoesFicha,
  type PreviaImportacaoResumo,
  type ValorDerivadoResumo,
} from "../types";
import { withFieldValue } from "./fichaAccess";

export const sheetKeys = {
  ficha: (mesaId: string, personagemId: string) => ["ficha", mesaId, personagemId] as const,
  permissoes: (mesaId: string, personagemId: string) => ["permissoes-ficha", mesaId, personagemId] as const,
  inventario: (mesaId: string, personagemId: string) => ["inventario", mesaId, personagemId] as const,
  efeitos: (mesaId: string, personagemId: string) => ["efeitos", mesaId, personagemId] as const,
  valoresDerivados: (mesaId: string, personagemId: string) => ["valores-derivados", mesaId, personagemId] as const,
};

export function useFichaSnapshot(api: ApiClient, mesaId: string, personagemId: string): UseQueryResult<FichaSnapshot, Error> {
  return useQuery({
    queryKey: sheetKeys.ficha(mesaId, personagemId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/personagens/{personagem_id}/ficha", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar a ficha."));
      return data as FichaSnapshot;
    },
  });
}

export function usePermissoesFicha(api: ApiClient, mesaId: string, personagemId: string): UseQueryResult<PermissoesFicha, Error> {
  return useQuery({
    queryKey: sheetKeys.permissoes(mesaId, personagemId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/personagens/{personagem_id}/permissoes", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar as permissões."));
      return data as PermissoesFicha;
    },
  });
}

export function useInventario(api: ApiClient, mesaId: string, personagemId: string): UseQueryResult<ItemInventarioResumo[], Error> {
  return useQuery({
    queryKey: sheetKeys.inventario(mesaId, personagemId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/personagens/{personagem_id}/inventario", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar o inventário."));
      return data ?? [];
    },
  });
}

export function useEfeitos(api: ApiClient, mesaId: string, personagemId: string): UseQueryResult<EfeitoResumo[], Error> {
  return useQuery({
    queryKey: sheetKeys.efeitos(mesaId, personagemId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/personagens/{personagem_id}/efeitos", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar os efeitos."));
      return data ?? [];
    },
  });
}

export function useValoresDerivados(api: ApiClient, mesaId: string, personagemId: string): UseQueryResult<ValorDerivadoResumo[], Error> {
  return useQuery({
    queryKey: sheetKeys.valoresDerivados(mesaId, personagemId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/personagens/{personagem_id}/valores-derivados", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar os valores derivados."));
      return data ?? [];
    },
  });
}

export type SalvarCampoResultado =
  | { status: "salvo"; snapshot: FichaSnapshot }
  | { status: "pendente"; pedido: PedidoAlteracaoResumo };

export interface SalvarCampoVariaveis {
  path: string;
  value: unknown;
  ficha: FichaContrato;
  versao: number;
}

/**
 * Comando de gravação de um único campo da ficha: lê o valor atual, substitui
 * apenas o caminho editado e envia a ficha inteira (a API não aceita PATCH
 * parcial). Uma resposta 200 confirma a alteração; 202 indica que ela foi
 * enviada para aprovação do Narrador e a ficha exibida permanece a anterior.
 */
export function useSalvarCampoFicha(api: ApiClient, mesaId: string, personagemId: string, atorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, value, ficha, versao }: SalvarCampoVariaveis): Promise<SalvarCampoResultado> => {
      const novaFicha = withFieldValue(ficha, path, value);
      const { data, error, response } = await api.PUT("/mesas/{mesa_id}/personagens/{personagem_id}/ficha", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
        body: {
          id: crypto.randomUUID(),
          tipo: "atualizar_ficha",
          mesa_id: mesaId,
          personagem_id: personagemId,
          ator_id: atorId,
          versao_esperada: versao,
          ficha: novaFicha,
        },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível salvar a alteração."));
      if (response.status === 202) {
        return { status: "pendente", pedido: data as unknown as PedidoAlteracaoResumo };
      }
      return { status: "salvo", snapshot: data as FichaSnapshot };
    },
    onSuccess: (result) => {
      if (result.status === "salvo") {
        queryClient.setQueryData(sheetKeys.ficha(mesaId, personagemId), result.snapshot);
      }
    },
  });
}

export interface EquipCommandOptions {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  item: ItemInventarioResumo;
  /** Versão atual do personagem (compartilhada por todos os comandos, não por item). */
  versaoEsperada: number;
  online: boolean;
  onVersaoConfirmada: (versao: number) => void;
}

/**
 * Comando de equipar/desequipar sobre um item específico, seguindo o padrão de
 * prévia local do `useCommandPreview`: o slot alterna de imediato e, se o
 * servidor recusar, a prévia é descartada e o estado anterior volta a ser
 * exibido. Ao confirmar, atualiza o inventário em cache e invalida efeitos e
 * valores derivados, já que ambos podem depender do item equipado.
 */
export function useEquipCommand({
  api,
  mesaId,
  personagemId,
  item,
  versaoEsperada,
  online,
  onVersaoConfirmada,
}: EquipCommandOptions): UseCommandPreviewResult<ItemInventarioResumo, boolean> {
  const queryClient = useQueryClient();
  return useCommandPreview<ItemInventarioResumo, boolean>({
    confirmed: item,
    previewFrom: (equipado) => ({ ...item, equipado }),
    online,
    run: async (equipado) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/equipar", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId, item_id: item.id } },
        body: { equipado, versao_esperada: versaoEsperada },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível atualizar o equipamento."));
      const resposta = data as { versao: number; item: ItemInventarioResumo };
      onVersaoConfirmada(resposta.versao);
      queryClient.setQueryData(sheetKeys.inventario(mesaId, personagemId), (old?: ItemInventarioResumo[]) =>
        old?.map((entry) => (entry.id === resposta.item.id ? resposta.item : entry)) ?? old,
      );
      void queryClient.invalidateQueries({ queryKey: sheetKeys.efeitos(mesaId, personagemId) });
      void queryClient.invalidateQueries({ queryKey: sheetKeys.valoresDerivados(mesaId, personagemId) });
      return resposta.item;
    },
  });
}

export function usePreviaImportacao(api: ApiClient, mesaId: string, personagemId: string) {
  return useMutation({
    mutationFn: async (codigo: string) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/personagens/{personagem_id}/importacoes/previa", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
        body: { codigo },
      });
      if (error) throw new Error(extractErrorMessage(error, "Código não reconhecido."));
      return data as PreviaImportacaoResumo;
    },
  });
}

export function useImportarCodigo(api: ApiClient, mesaId: string, personagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ codigo, versaoEsperada }: { codigo: string; versaoEsperada: number }) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/personagens/{personagem_id}/importacoes", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
        body: { codigo, versao_esperada: versaoEsperada },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível concluir a importação."));
      return data as ImportacaoResultado;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(sheetKeys.ficha(mesaId, personagemId), (old?: FichaSnapshot) =>
        old ? { ...old, versao: data.versao } : old,
      );
      void queryClient.invalidateQueries({ queryKey: sheetKeys.inventario(mesaId, personagemId) });
      void queryClient.invalidateQueries({ queryKey: sheetKeys.efeitos(mesaId, personagemId) });
      void queryClient.invalidateQueries({ queryKey: sheetKeys.valoresDerivados(mesaId, personagemId) });
    },
  });
}
