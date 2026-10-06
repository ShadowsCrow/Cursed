/**
 * Gamificação da Sala (gamificacao-da-sala): preferências da Sala, sessões de jogo, estatísticas dos jogadores e
 * votação de MVP. Tudo é decidido e guardado pelo servidor; aqui só se consulta e se pede. As consultas se renovam
 * pelos avisos `sala.preferencias`, `sala.sessao`, `sala.votacao` e `sala.rolagem` (no `RoomPresence`) e pelo
 * intervalo da Sala.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { components } from "../../api/generated/schema";
import { extractErrorMessage, type ApiClient } from "../characters/types";
import { intervaloDaSala } from "./atualizacao";

export type PreferenciasDaSala = components["schemas"]["PreferenciasDaSala"];
export type SessoesDaMesa = components["schemas"]["SessoesDaMesa"];
export type SessaoDeJogo = components["schemas"]["SessaoDeJogo"];
export type EstatisticasDaMesa = components["schemas"]["EstatisticasDaMesa"];
export type EstatisticasDoJogador = components["schemas"]["EstatisticasDoJogador"];
export type EstatisticasDoPeriodo = components["schemas"]["EstatisticasDoPeriodo"];
export type EstadoDoMvp = components["schemas"]["EstadoDoMvp"];
export type VotacaoMvp = components["schemas"]["VotacaoMvp"];

export const chaveDasPreferencias = (mesaId: string) => ["sala-preferencias", mesaId] as const;
export const chaveDasSessoes = (mesaId: string) => ["sala-sessoes", mesaId] as const;
export const chaveDasEstatisticas = (mesaId: string) => ["sala-estatisticas", mesaId] as const;
export const chaveDoMvp = (mesaId: string) => ["sala-mvp", mesaId] as const;

export const PREFERENCIAS_PADRAO: PreferenciasDaSala = { destaque_criticos: false, estatisticas_visiveis: false };

const objeto = <T,>(dados: unknown): T | null => (dados && typeof dados === "object" && !Array.isArray(dados) ? dados as T : null);

export interface GamificacaoDaSala {
  preferencias: PreferenciasDaSala;
  sessoes: SessoesDaMesa | null;
  estatisticas: EstatisticasDaMesa | null;
  mvp: EstadoDoMvp | null;
  /** Ações do Narrador. */
  mudarPreferencias: (parcial: Partial<PreferenciasDaSala>) => void;
  iniciarSessao: () => void;
  encerrarSessao: () => void;
  abrirVotacao: () => void;
  encerrarVotacao: () => void;
  desempatar: (vencedorId: string) => void;
  /** Ação do jogador. */
  votar: (candidatoId: string) => void;
  pendente: boolean;
  erro: string | null;
}

export function useGamificacaoDaSala({ api, mesaId, comTempoReal, ativo }: {
  api: ApiClient; mesaId: string; comTempoReal: boolean; ativo: boolean;
}): GamificacaoDaSala {
  const queryClient = useQueryClient();
  const intervalo = intervaloDaSala(comTempoReal);
  // As estatísticas pesam mais e mudam devagar: com o tempo real, os avisos as renovam.
  const intervaloLento = comTempoReal ? intervalo : 5000;
  const ler = <T,>(caminho: string, mensagem: string) => async (): Promise<T | null> => {
    const { data, error } = await (api.GET as (c: string, o: unknown) => Promise<{ data?: unknown; error?: unknown }>)(
      caminho, { params: { path: { mesa_id: mesaId } } });
    if (error) throw new Error(extractErrorMessage(error, mensagem));
    return objeto<T>(data);
  };
  const preferencias = useQuery({
    queryKey: chaveDasPreferencias(mesaId), enabled: ativo, refetchInterval: intervalo,
    queryFn: ler<PreferenciasDaSala>("/mesas/{mesa_id}/sala/preferencias", "Não foi possível carregar as preferências da Sala."),
  });
  const sessoes = useQuery({
    queryKey: chaveDasSessoes(mesaId), enabled: ativo, refetchInterval: intervalo,
    queryFn: ler<SessoesDaMesa>("/mesas/{mesa_id}/sala/sessoes", "Não foi possível carregar as sessões."),
  });
  const estatisticas = useQuery({
    queryKey: chaveDasEstatisticas(mesaId), enabled: ativo, refetchInterval: intervaloLento,
    queryFn: ler<EstatisticasDaMesa>("/mesas/{mesa_id}/sala/estatisticas", "Não foi possível carregar as estatísticas."),
  });
  const mvp = useQuery({
    queryKey: chaveDoMvp(mesaId), enabled: ativo, refetchInterval: intervalo,
    queryFn: ler<EstadoDoMvp>("/mesas/{mesa_id}/sala/mvp", "Não foi possível carregar a votação de MVP."),
  });

  const pedir = useMutation({
    mutationFn: async ({ metodo, caminho, corpo, mensagem }: {
      metodo: "POST" | "PUT"; caminho: string; corpo?: unknown; mensagem: string;
    }) => {
      const chamar = api[metodo] as (c: string, o: unknown) => Promise<{ data?: unknown; error?: unknown }>;
      const { data, error } = await chamar(caminho, { params: { path: { mesa_id: mesaId } }, ...(corpo ? { body: corpo } : {}) });
      if (error) throw new Error(extractErrorMessage(error, mensagem));
      return data;
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: chaveDasPreferencias(mesaId) }),
      queryClient.invalidateQueries({ queryKey: chaveDasSessoes(mesaId) }),
      queryClient.invalidateQueries({ queryKey: chaveDasEstatisticas(mesaId) }),
      queryClient.invalidateQueries({ queryKey: chaveDoMvp(mesaId) }),
    ]),
  });

  const atuais = preferencias.data ?? PREFERENCIAS_PADRAO;
  const erroDeConsulta = [preferencias, sessoes, estatisticas, mvp].find((c) => c.isError)?.error?.message ?? null;
  return {
    preferencias: atuais,
    sessoes: sessoes.data ?? null,
    estatisticas: estatisticas.data ?? null,
    mvp: mvp.data ?? null,
    mudarPreferencias: (parcial) => pedir.mutate({ metodo: "PUT", caminho: "/mesas/{mesa_id}/sala/preferencias",
      corpo: { ...atuais, ...parcial }, mensagem: "Não foi possível mudar as preferências da Sala." }),
    iniciarSessao: () => pedir.mutate({ metodo: "POST", caminho: "/mesas/{mesa_id}/sala/sessoes",
      mensagem: "Não foi possível iniciar a sessão." }),
    encerrarSessao: () => pedir.mutate({ metodo: "POST", caminho: "/mesas/{mesa_id}/sala/sessoes/atual/encerramento",
      mensagem: "Não foi possível encerrar a sessão." }),
    abrirVotacao: () => pedir.mutate({ metodo: "POST", caminho: "/mesas/{mesa_id}/sala/mvp",
      mensagem: "Não foi possível abrir a votação." }),
    encerrarVotacao: () => pedir.mutate({ metodo: "POST", caminho: "/mesas/{mesa_id}/sala/mvp/encerramento",
      mensagem: "Não foi possível encerrar a votação." }),
    desempatar: (vencedorId) => pedir.mutate({ metodo: "POST", caminho: "/mesas/{mesa_id}/sala/mvp/desempate",
      corpo: { vencedor_id: vencedorId }, mensagem: "Não foi possível escolher o MVP." }),
    votar: (candidatoId) => pedir.mutate({ metodo: "PUT", caminho: "/mesas/{mesa_id}/sala/mvp/voto",
      corpo: { candidato_id: candidatoId }, mensagem: "Não foi possível votar." }),
    pendente: pedir.isPending,
    erro: pedir.isError ? pedir.error.message : erroDeConsulta,
  };
}
