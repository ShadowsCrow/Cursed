/**
 * Rolagens da mesa pelo servidor (melhorias-da-sala, item 3, D14): "Rolar" pede o sorteio ao servidor, e as
 * rolagens dos outros chegam pela consulta periódica da Sala ou na hora, pelo aviso `sala.rolagem` do Realtime.
 */
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import type { components } from "../../api/generated/schema";
import { extractErrorMessage, type ApiClient } from "../characters/types";
import { TIPOS_DE_DADO, type EscolhaDaFicha, type Faces, type Montagem, type Rolagem } from "./dados";
import { intervaloDaSala } from "./atualizacao";

type RolagemDoServidor = components["schemas"]["RolagemDeDados"];

/** Preferência "Mostrar rolagens", guardada neste navegador. */
export const CHAVE_MOSTRAR_ROLAGENS = "cursed:mesa:mostrar-rolagens";
export type MostrarRolagens = "todas" | "minhas";
/** Preferência "Animação dos dados", guardada neste navegador. */
export const CHAVE_ANIMACAO_DOS_DADOS = "cursed:mesa:animacao-dos-dados";
/** Preferência do Narrador "Rolar oculto dos jogadores" (item 5): ligada por padrão, guardada neste navegador. */
export const CHAVE_ROLAR_OCULTO = "cursed:mesa:rolar-oculto";

export const chaveDasRolagens = (mesaId: string) => ["rolagens", mesaId] as const;

/** Rolagem do servidor no formato da aba Dados; `autor` só nas rolagens de outras pessoas. */
export function deServidor(rolagem: RolagemDoServidor, autor?: string, personagem?: string): Rolagem {
  const grupos = rolagem.grupos
    .filter((grupo) => TIPOS_DE_DADO.includes(grupo.faces as Faces))
    .map((grupo) => ({ faces: grupo.faces as Faces, valores: [...grupo.valores] }));
  const montagem: Montagem = {
    dados: Object.fromEntries(grupos.map((g) => [g.faces, g.valores.length])) as Montagem["dados"],
    modificador: rolagem.modificador,
  };
  const termos = (rolagem.termos ?? []).map((t) => ({ chave: t.chave, rotulo: t.rotulo, valor: t.valor }));
  const ficha: EscolhaDaFicha | undefined = rolagem.personagem_id ? {
    personagemId: rolagem.personagem_id,
    atributo: termos.find((t) => t.chave.startsWith("atributo:"))?.chave ?? null,
    pericia: termos.find((t) => t.chave.startsWith("pericia:"))?.chave ?? null,
  } : undefined;
  return { id: rolagem.id, expressao: rolagem.expressao, grupos, modificador: rolagem.modificador, total: rolagem.total,
    montagem, ...(autor ? { autor } : {}), ...(rolagem.oculta ? { oculta: true } : {}),
    ...(termos.length > 0 ? { termos } : {}), ...(ficha ? { ficha } : {}), ...(personagem ? { personagem } : {}) };
}

/** Pede ao servidor o sorteio da montagem; `oculta` só vale para o Narrador. */
export async function rolarNoServidor(api: ApiClient, mesaId: string, montagem: Montagem, oculta = false,
  ficha?: EscolhaDaFicha): Promise<RolagemDoServidor> {
  const dados = TIPOS_DE_DADO.flatMap((faces) => (montagem.dados[faces] ?? 0) > 0
    ? [{ faces, quantidade: montagem.dados[faces]! }] : []);
  const { data, error } = await api.POST("/mesas/{mesa_id}/sala/rolagens", {
    params: { path: { mesa_id: mesaId } },
    body: { dados, modificador: montagem.modificador, oculta,
      ...(ficha?.personagemId ? { personagem_id: ficha.personagemId, atributo: ficha.atributo, pericia: ficha.pericia } : {}) },
  });
  if (error || !data) throw new Error(extractErrorMessage(error, "Não foi possível rolar. Tente de novo."));
  return data;
}

/**
 * Acompanha as rolagens da mesa e chama `aoChegar` com cada rolagem nova de outra pessoa. As que já existiam
 * quando a Sala abriu só são marcadas como vistas (não rolam no tabuleiro).
 */
export function useRolagensDaMesa({ api, mesaId, userId, comTempoReal, ativo, aoChegar }: {
  api: ApiClient; mesaId: string; userId: string; comTempoReal: boolean; ativo: boolean;
  aoChegar: (rolagem: RolagemDoServidor) => void;
}) {
  const ultimo = useRef<number | null>(null);
  const avisar = useRef(aoChegar);
  useEffect(() => { avisar.current = aoChegar; }, [aoChegar]);
  const consulta = useQuery({
    queryKey: chaveDasRolagens(mesaId),
    enabled: ativo,
    retry: false,
    refetchInterval: intervaloDaSala(comTempoReal),
    // Janela atrás de outra fica oculta e não consulta; ao voltar, busca na hora e a rolagem nova rola inteira.
    staleTime: 0,
    refetchOnWindowFocus: "always",
    queryFn: async () => {
      const depois = ultimo.current;
      const { data, error } = await api.GET("/mesas/{mesa_id}/sala/rolagens", {
        params: { path: { mesa_id: mesaId }, query: depois === null ? {} : { depois } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar as rolagens."));
      return { depois, rolagens: data ?? [] };
    },
  });
  useEffect(() => {
    const resposta = consulta.data;
    if (!resposta) return;
    const primeiraVez = resposta.depois === null && ultimo.current === null;
    for (const rolagem of resposta.rolagens) {
      if (ultimo.current !== null && rolagem.id <= ultimo.current) continue;
      ultimo.current = rolagem.id;
      if (!primeiraVez && rolagem.autor_id !== userId) avisar.current(rolagem);
    }
    // Mesa sem rolagens: a partir de agora, tudo o que chegar é novo.
    if (primeiraVez && ultimo.current === null) ultimo.current = 0;
  }, [consulta.data, userId]);
}
