import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";

import {
  extractErrorMessage,
  type ApiClient,
  type AlvoDescanso,
  type EntidadePublica,
  type ParticipanteResumo,
  type PedidoAlteracaoResumo,
  type PersonagemResumo,
  type PoliticaMesaContrato,
  type ResultadoDescansoResumo,
  type RevelacaoContrato,
} from "./types";

export const characterQueryKeys = {
  list: (mesaId: string, excluidos: boolean) => ["personagens", mesaId, excluidos] as const,
  politica: (mesaId: string) => ["politica-mesa", mesaId] as const,
  participantes: (mesaId: string) => ["participantes", mesaId] as const,
  entidadesPublicas: (mesaId: string) => ["entidades-publicas", mesaId] as const,
  solicitacoes: (mesaId: string) => ["solicitacoes", mesaId] as const,
};

export function useSolicitacoes(api: ApiClient, mesaId: string): UseQueryResult<PedidoAlteracaoResumo[], Error> {
  return useQuery({
    queryKey: characterQueryKeys.solicitacoes(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/solicitacoes", { params: { path: { mesa_id: mesaId } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar as solicitações."));
      return data ?? [];
    },
  });
}

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

/** O Narrador grava a política inteira; o servidor reorganiza as moedas se o limite por pilha mudar. */
export function useConfigurarPolitica(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (politica: PoliticaMesaContrato) => {
      const { data, error } = await api.PUT("/mesas/{mesa_id}/politicas", {
        params: { path: { mesa_id: mesaId } },
        body: politica,
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível salvar as políticas da mesa."));
      return data as PoliticaMesaContrato;
    },
    onSuccess: (politica) => {
      queryClient.setQueryData(characterQueryKeys.politica(mesaId), politica);
      void queryClient.invalidateQueries({ queryKey: ["grade-inventario", mesaId] });
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

export interface CriarEntidadeVariables {
  nome: string;
  tipo: "personagem" | "npc" | "monstro";
  visibilidade: "mesa" | "narrador";
  proprietarioId: string | null;
}

/**
 * Cria uma entidade (personagem, NPC ou monstro) do Narrador. Oculta por
 * padrão (`visibilidade: "narrador"`); a revelação é feita depois, por
 * `useAlterarVisibilidade`. Só o Narrador pode chamar este comando — o
 * servidor recusa qualquer outro papel.
 */
export function useCriarEntidade(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ nome, tipo, visibilidade, proprietarioId }: CriarEntidadeVariables) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/entidades", {
        params: { path: { mesa_id: mesaId } },
        body: { tipo, visibilidade, proprietario_id: proprietarioId, ficha: { personagem: { nome } } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível criar a entidade."));
      return data as PersonagemResumo;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["personagens", mesaId] });
      void queryClient.invalidateQueries({ queryKey: characterQueryKeys.entidadesPublicas(mesaId) });
    },
  });
}

export interface AlterarVisibilidadeVariables {
  personagemId: string;
  visibilidade: "mesa" | "narrador";
  revelacao: RevelacaoContrato;
  versaoEsperada: number;
}

export function useAlterarVisibilidade(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ personagemId, visibilidade, revelacao, versaoEsperada }: AlterarVisibilidadeVariables) => {
      const { data, error } = await api.PUT("/mesas/{mesa_id}/personagens/{personagem_id}/visibilidade", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
        body: { visibilidade, revelacao, versao_esperada: versaoEsperada },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível alterar a visibilidade."));
      return data as PersonagemResumo;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["personagens", mesaId] });
      void queryClient.invalidateQueries({ queryKey: characterQueryKeys.entidadesPublicas(mesaId) });
    },
  });
}

/**
 * O que qualquer participante da mesa (Narrador ou jogador) pode ver de cada
 * entidade: nome público e retrato, nunca a ficha. Usado pela visão "Grupo".
 */
export function useEntidadesPublicas(api: ApiClient, mesaId: string): UseQueryResult<EntidadePublica[], Error> {
  return useQuery({
    queryKey: characterQueryKeys.entidadesPublicas(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/entidades-publicas", { params: { path: { mesa_id: mesaId } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar o grupo."));
      return data ?? [];
    },
  });
}

export interface PreviaDescansoVariaveis {
  tipo: "curto" | "longo";
  conforto: number | null;
  seguranca: number | null;
  alvos: AlvoDescanso[];
}

/** Pré-visualização de descanso: calcula por personagem sem gravar nada. */
export function usePreviaDescanso(api: ApiClient, mesaId: string) {
  return useMutation({
    mutationFn: async ({ tipo, conforto, seguranca, alvos }: PreviaDescansoVariaveis) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/descansos/previa", {
        params: { path: { mesa_id: mesaId } },
        body: { tipo, conforto, seguranca, alvos },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível calcular a prévia do descanso."));
      return data as ResultadoDescansoResumo;
    },
  });
}

export interface ConfirmarDescansoVariaveis extends PreviaDescansoVariaveis {
  versoes: Record<string, number>;
  motivo?: string;
}

/**
 * Confirma o descanso: recalcula no servidor e aplica a todos os alvos, ou a
 * nenhum. `versoes` traz a versão de cada personagem vista na prévia; um 409
 * indica que alguma ficha mudou desde então e nada foi gravado.
 */
export function useConfirmarDescanso(api: ApiClient, mesaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tipo, conforto, seguranca, alvos, versoes, motivo }: ConfirmarDescansoVariaveis) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/descansos", {
        params: { path: { mesa_id: mesaId } },
        body: { tipo, conforto, seguranca, alvos, versoes, motivo: motivo ?? null },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível confirmar o descanso."));
      return data as ResultadoDescansoResumo;
    },
    onSuccess: (data) => {
      for (const resultado of data.resultados) {
        void queryClient.invalidateQueries({ queryKey: ["ficha", mesaId, resultado.personagem_id] });
        void queryClient.invalidateQueries({ queryKey: ["efeitos", mesaId, resultado.personagem_id] });
        void queryClient.invalidateQueries({ queryKey: ["valores-derivados", mesaId, resultado.personagem_id] });
        void queryClient.invalidateQueries({ queryKey: ["desgaste", mesaId, resultado.personagem_id] });
      }
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
