import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";

import {
  extractErrorMessage,
  type ApiClient,
  type ParticipanteResumo,
  type PersonagemResumo,
  type PoliticaMesaContrato,
} from "./types";

export const characterQueryKeys = {
  list: (mesaId: string, excluidos: boolean) => ["personagens", mesaId, excluidos] as const,
  politica: (mesaId: string) => ["politica-mesa", mesaId] as const,
  participantes: (mesaId: string) => ["participantes", mesaId] as const,
};

export function usePersonagens(
  api: ApiClient,
  mesaId: string,
  excluidos: boolean,
  options: { enabled?: boolean } = {},
): UseQueryResult<PersonagemResumo[], Error> {
  return useQuery({
    queryKey: characterQueryKeys.list(mesaId, excluidos),
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/personagens", {
        params: { path: { mesa_id: mesaId }, query: { excluidos } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar os personagens."));
      return data ?? [];
    },
  });
}

export function usePoliticaMesa(api: ApiClient, mesaId: string): UseQueryResult<PoliticaMesaContrato, Error> {
  return useQuery({
    queryKey: characterQueryKeys.politica(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/politicas", { params: { path: { mesa_id: mesaId } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar as políticas da mesa."));
      return data as PoliticaMesaContrato;
    },
  });
}

export function useParticipantes(
  api: ApiClient,
  mesaId: string,
  options: { enabled?: boolean } = {},
): UseQueryResult<ParticipanteResumo[], Error> {
  return useQuery({
    queryKey: characterQueryKeys.participantes(mesaId),
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/participantes", { params: { path: { mesa_id: mesaId } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar os participantes."));
      return data ?? [];
    },
  });
}

export interface CriarPersonagemVariables {
  nome: string;
}

export function useCriarPersonagem(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ nome }: CriarPersonagemVariables) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/personagens", {
        params: { path: { mesa_id: mesaId } },
        body: { ficha: { personagem: { nome } } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível criar o personagem."));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["personagens", mesaId] });
    },
  });
}

export interface ExcluirPersonagemVariables {
  personagemId: string;
  versaoEsperada: number;
}

export function useExcluirPersonagem(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ personagemId, versaoEsperada }: ExcluirPersonagemVariables) => {
      const { error } = await api.DELETE("/mesas/{mesa_id}/personagens/{personagem_id}", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId }, query: { versao_esperada: versaoEsperada } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível excluir o personagem."));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["personagens", mesaId] });
    },
  });
}

export interface TransferirPersonagemVariables {
  personagemId: string;
  proprietarioId: string | null;
  versaoEsperada: number;
}

export function useTransferirPersonagem(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ personagemId, proprietarioId, versaoEsperada }: TransferirPersonagemVariables) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/personagens/{personagem_id}/transferencia", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
        body: { proprietario_id: proprietarioId, versao_esperada: versaoEsperada },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível transferir o personagem."));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["personagens", mesaId] });
    },
  });
}

export interface RestaurarPersonagemVariables {
  personagemId: string;
  versaoEsperada: number;
}

export function useRestaurarPersonagem(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ personagemId, versaoEsperada }: RestaurarPersonagemVariables) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/personagens/{personagem_id}/restauracao", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId }, query: { versao_esperada: versaoEsperada } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível restaurar o personagem."));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["personagens", mesaId] });
    },
  });
}
