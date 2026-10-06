/**
 * Modo turno da Sala (modo-de-turno): o estado do combate, filtrado pelo servidor para quem lê, e as ações. Renova-se
 * pelo aviso `sala.turno` (no `RoomPresence`) e pelo intervalo da Sala. As rolagens de iniciativa voltam na resposta,
 * para quem rolou animar e pôr no histórico; as dos outros chegam pelo caminho das rolagens da mesa.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { components } from "../../api/generated/schema";
import { extractErrorMessage, type ApiClient } from "../characters/types";
import { intervaloDaSala } from "./atualizacao";

export type CombateDoTurno = components["schemas"]["CombateDoTurno"];
export type ParticipanteDoTurno = components["schemas"]["ParticipanteDoTurno"];
type RolagemDoServidor = components["schemas"]["RolagemDeDados"];

export const chaveDoTurno = (mesaId: string) => ["sala-turno", mesaId] as const;

export interface ModoDeTurno {
  combate: CombateDoTurno | null;
  entrar: () => void;
  /** Rola a iniciativa de um participante; resolve com as rolagens feitas (para animar e pôr no histórico). */
  rolar: (participanteId: string) => Promise<RolagemDoServidor[]>;
  rolarNpcs: () => Promise<RolagemDoServidor[]>;
  comecar: () => void;
  proximo: () => void;
  /** Correr: o saldo de movimento da vez dobra (dono do personagem na vez ou Narrador). */
  correr: () => void;
  sair: () => void;
  pendente: boolean;
  erro: string | null;
}

type Chamada = (caminho: string, opcoes: unknown) => Promise<{ data?: unknown; error?: unknown }>;

export function useModoDeTurno({ api, mesaId, comTempoReal, ativo }: {
  api: ApiClient; mesaId: string; comTempoReal: boolean; ativo: boolean;
}): ModoDeTurno {
  const queryClient = useQueryClient();
  const caminho = { params: { path: { mesa_id: mesaId } } };
  const consulta = useQuery({
    queryKey: chaveDoTurno(mesaId), enabled: ativo, refetchInterval: intervaloDaSala(comTempoReal),
    queryFn: async () => {
      const { data, error } = await (api.GET as Chamada)("/mesas/{mesa_id}/sala/turno", caminho);
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar o modo turno."));
      const combate = data && typeof data === "object" && "combate" in data ? (data as { combate: CombateDoTurno | null }).combate : null;
      return combate ?? null;
    },
  });
  const pedir = useMutation({
    mutationFn: async ({ rota, corpo, mensagem }: { rota: string; corpo?: unknown; mensagem: string }) => {
      const { data, error } = await (api.POST as Chamada)(rota, { ...caminho, ...(corpo ? { body: corpo } : {}) });
      if (error) throw new Error(extractErrorMessage(error, mensagem));
      return data;
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: chaveDoTurno(mesaId) }),
      queryClient.invalidateQueries({ queryKey: ["sala-estatisticas", mesaId] }),
    ]),
  });
  const rolagensDe = (dados: unknown): RolagemDoServidor[] =>
    dados && typeof dados === "object" && "rolagens" in dados ? (dados as { rolagens: RolagemDoServidor[] }).rolagens : [];
  return {
    combate: consulta.data ?? null,
    entrar: () => pedir.mutate({ rota: "/mesas/{mesa_id}/sala/turno", mensagem: "Não foi possível entrar em modo turno." }),
    rolar: async (participanteId) => rolagensDe(await pedir.mutateAsync({ rota: "/mesas/{mesa_id}/sala/turno/iniciativa",
      corpo: { participante_id: participanteId }, mensagem: "Não foi possível rolar a iniciativa." }).catch(() => undefined)),
    rolarNpcs: async () => rolagensDe(await pedir.mutateAsync({ rota: "/mesas/{mesa_id}/sala/turno/iniciativa/npcs",
      mensagem: "Não foi possível rolar os NPCs e monstros." }).catch(() => undefined)),
    comecar: () => pedir.mutate({ rota: "/mesas/{mesa_id}/sala/turno/inicio", mensagem: "Não foi possível começar a disputa." }),
    proximo: () => pedir.mutate({ rota: "/mesas/{mesa_id}/sala/turno/proximo", mensagem: "Não foi possível passar a vez." }),
    correr: () => pedir.mutate({ rota: "/mesas/{mesa_id}/sala/turno/correr", mensagem: "Não foi possível correr." }),
    sair: () => pedir.mutate({ rota: "/mesas/{mesa_id}/sala/turno/encerramento", mensagem: "Não foi possível sair do modo turno." }),
    pendente: pedir.isPending,
    erro: pedir.isError ? pedir.error.message : consulta.isError ? consulta.error.message : null,
  };
}
