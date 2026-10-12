/**
 * Cartas usadas na cena (cartas-na-cena): a mão de cartas de um personagem, usar uma carta, os usos da mesa e o
 * desfazer do Narrador. Tudo é decidido pelo servidor (posse, vez, ação, PP); aqui só se consulta, se pede e se
 * apresenta. A mão se renova pelos avisos `sala.uso` e `sala.turno` (no `RoomPresence`) e pelo intervalo da Sala.
 */
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import type { components } from "../../api/generated/schema";
import { extractErrorMessage, type ApiClient } from "../characters/types";
import { intervaloDaSala } from "./atualizacao";

export type MaoDeCartas = components["schemas"]["MaoDeCartas"];
export type CartaDaMao = components["schemas"]["CartaDaMao"];
export type UsoDeCarta = components["schemas"]["UsoDeCarta"];
export type AcaoDaCarta = CartaDaMao["acao"];

/** Preferência "Animação das cartas", guardada neste navegador; ligada por padrão. */
export const CHAVE_ANIMACAO_DAS_CARTAS = "cursed:mesa:animacao-das-cartas";
/** A mão de cartas aberta ou recolhida neste navegador. */
export const CHAVE_MAO_ABERTA = "cursed:mesa:mao-aberta";

export const chaveDaMao = (mesaId: string, personagemId: string | null) => ["sala-mao", mesaId, personagemId] as const;
export const chaveDosUsos = (mesaId: string) => ["usos", mesaId] as const;

export const ROTULO_DA_ACAO: Record<AcaoDaCarta, string> = {
  padrao: "Ação Padrão", bonus: "Ação Bônus", reacao: "Reação", nenhuma: "Ação Livre",
};

/** Um uso de carta no histórico da aba Dados (acontecimento ao lado das rolagens). */
export interface UsoNoHistorico {
  id: number;
  /** Posição na ordem de chegada, compartilhada com as rolagens, para o histórico misto. */
  ordem: number;
  personagemId: string;
  personagem: string;
  titulo: string;
  custoPago: number;
  custoExtra?: string;
  alvos: string[];
  desfeito: boolean;
  /** Arte da carta já carregada neste navegador, quando se conhece. */
  arte?: string;
  /** Nome de quem pediu, nos usos de outras pessoas da mesa. */
  autor?: string;
}

/** "Lia usou Lança de Fogo (3 PP) em Goblin 2", como no registro da mesa. */
export function descreverUso(uso: Pick<UsoNoHistorico, "personagem" | "titulo" | "custoPago" | "alvos">): string {
  const alvos = uso.alvos.length > 0 ? ` em ${uso.alvos.join(", ")}` : "";
  return `${uso.personagem} usou ${uso.titulo} (${uso.custoPago} PP)${alvos}`;
}

/** Uso do servidor no formato do histórico; `ordem` é dada por quem guarda. */
export function deUsoDoServidor(uso: UsoDeCarta, autor?: string, arte?: string): Omit<UsoNoHistorico, "ordem"> {
  return {
    id: uso.id, personagemId: uso.personagem_id, personagem: uso.personagem_nome, titulo: uso.titulo,
    custoPago: uso.custo_pago, ...(uso.custo_extra ? { custoExtra: uso.custo_extra } : {}),
    alvos: (uso.alvos ?? []).map((a) => a.rotulo), desfeito: uso.desfeito, ...(arte ? { arte } : {}), ...(autor ? { autor } : {}),
  };
}

const objeto = <T,>(dados: unknown): T | null => (dados && typeof dados === "object" && !Array.isArray(dados) ? dados as T : null);
type Chamada = (caminho: string, opcoes: unknown) => Promise<{ data?: unknown; error?: unknown }>;

/** A mão de cartas jogáveis do personagem, com o motivo de indisponibilidade já calculado pelo servidor. */
export function useMaoDeCartas({ api, mesaId, personagemId, comTempoReal, ativo }: {
  api: ApiClient; mesaId: string; personagemId: string | null; comTempoReal: boolean; ativo: boolean;
}) {
  return useQuery({
    queryKey: chaveDaMao(mesaId, personagemId), enabled: ativo && Boolean(personagemId),
    refetchInterval: intervaloDaSala(comTempoReal), retry: false,
    queryFn: async () => {
      const { data, error } = await (api.GET as Chamada)("/mesas/{mesa_id}/sala/mao",
        { params: { path: { mesa_id: mesaId }, query: { personagem_id: personagemId } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar a mão de cartas."));
      return objeto<MaoDeCartas>(data);
    },
  });
}

/** Pede ao servidor o uso da carta pelo personagem, com os tokens marcados como alvos. */
export async function usarCarta(api: ApiClient, mesaId: string, personagemId: string, versaoId: string,
  alvos: string[]): Promise<UsoDeCarta> {
  const { data, error } = await (api.POST as Chamada)("/mesas/{mesa_id}/sala/usos", {
    params: { path: { mesa_id: mesaId } }, body: { personagem_id: personagemId, versao_id: versaoId, alvos },
  });
  const uso = objeto<UsoDeCarta>(data);
  if (error || !uso) throw new Error(extractErrorMessage(error, "Não foi possível usar a carta."));
  return uso;
}

/** Só o Narrador: desfaz o último uso de um personagem (o PP e a ação voltam). */
export async function desfazerUso(api: ApiClient, mesaId: string, usoId: number): Promise<UsoDeCarta> {
  const { data, error } = await (api.POST as Chamada)("/mesas/{mesa_id}/sala/usos/{uso_id}/desfazer", {
    params: { path: { mesa_id: mesaId, uso_id: usoId } },
  });
  const uso = objeto<UsoDeCarta>(data);
  if (error || !uso) throw new Error(extractErrorMessage(error, "Não foi possível desfazer o uso."));
  return uso;
}

/** Quantos usos atrás da última a consulta volta a olhar, para perceber um uso desfeito. */
const JANELA_DE_RELEITURA = 20;

/**
 * Acompanha os usos da mesa: chama `aoChegar` com cada uso novo de outra pessoa e `aoAtualizar` quando um uso já
 * visto é desfeito. Os que já existiam quando a Sala abriu só são marcados como vistos.
 */
export function useUsosDaMesa({ api, mesaId, userId, comTempoReal, ativo, aoChegar, aoAtualizar }: {
  api: ApiClient; mesaId: string; userId: string; comTempoReal: boolean; ativo: boolean;
  aoChegar: (uso: UsoDeCarta) => void; aoAtualizar?: (uso: UsoDeCarta) => void;
}) {
  const vistos = useRef<Map<number, boolean> | null>(null);
  const ultimo = useRef<number | null>(null);
  const avisar = useRef({ aoChegar, aoAtualizar });
  useEffect(() => { avisar.current = { aoChegar, aoAtualizar }; }, [aoChegar, aoAtualizar]);
  const consulta = useQuery({
    queryKey: chaveDosUsos(mesaId), enabled: ativo, retry: false, refetchInterval: intervaloDaSala(comTempoReal),
    staleTime: 0, refetchOnWindowFocus: "always",
    queryFn: async () => {
      const depois = ultimo.current === null ? null : Math.max(0, ultimo.current - JANELA_DE_RELEITURA);
      const { data, error } = await (api.GET as Chamada)("/mesas/{mesa_id}/sala/usos",
        { params: { path: { mesa_id: mesaId }, query: depois === null ? {} : { depois } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar os usos de carta."));
      return { depois, usos: Array.isArray(data) ? data as UsoDeCarta[] : [] };
    },
  });
  useEffect(() => {
    const resposta = consulta.data;
    if (!resposta) return;
    const primeiraVez = vistos.current === null;
    const mapa = vistos.current ?? new Map<number, boolean>();
    vistos.current = mapa;
    for (const uso of resposta.usos) {
      const visto = mapa.get(uso.id);
      if (visto === undefined) {
        mapa.set(uso.id, uso.desfeito);
        if (ultimo.current === null || uso.id > ultimo.current) ultimo.current = uso.id;
        if (!primeiraVez && uso.autor_id !== userId) avisar.current.aoChegar(uso);
      } else if (visto !== uso.desfeito) {
        mapa.set(uso.id, uso.desfeito);
        avisar.current.aoAtualizar?.(uso);
      }
    }
    if (ultimo.current === null) ultimo.current = 0;
  }, [consulta.data, userId]);
}
