import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { components } from "../../api/generated/schema";
import { extractErrorMessage, type ApiClient } from "../characters/types";

type Token = components["schemas"]["TokenSala"];
type Snapshot = components["schemas"]["SalaSnapshot"];
export type Posicao = { x: number; y: number };

const SEM_CONEXAO = "Você está offline. Não é possível mover tokens agora — tente de novo quando a conexão voltar.";

/**
 * Movimento direto dos tokens (experiencia-da-mesa, item 9): soltar ou "Mover" já mostra o token no destino
 * (prévia otimista, por token) e envia o movimento; o servidor valida controle, limite e versão. Se recusar
 * ou a rede falhar, a prévia some, o token volta à última posição confirmada e o motivo fica para anunciar.
 */
export function useMovimentoDeTokens(api: ApiClient, mesaId: string, online: boolean) {
  const queryClient = useQueryClient();
  const [previas, setPrevias] = useState<Record<string, Posicao>>({});
  const [erro, setErro] = useState<string | null>(null);

  const mover = useCallback(async (token: Token, x: number, y: number) => {
    if (!online) {
      setErro(SEM_CONEXAO);
      return;
    }
    setErro(null);
    setPrevias((atuais) => ({ ...atuais, [token.id]: { x, y } }));
    try {
      const { data, error } = await api.POST("/mesas/{mesa_id}/sala/tokens/{token_id}/movimento", {
        params: { path: { mesa_id: mesaId, token_id: token.id } },
        body: { x, y, versao_esperada: token.versao },
      });
      if (error || !data) throw new Error(extractErrorMessage(error, "O movimento não foi confirmado."));
      queryClient.setQueriesData<Snapshot>({ queryKey: ["sala", mesaId] }, (anterior) => {
        if (!anterior?.cena || !anterior.cena.tokens.some((item) => item.id === data.id)) return anterior;
        return { ...anterior, cena: { ...anterior.cena,
          tokens: anterior.cena.tokens.map((item) => (item.id === data.id ? data : item)) } };
      });
      void queryClient.invalidateQueries({ queryKey: ["sala", mesaId] });
    } catch (falha) {
      const motivo = falha instanceof Error ? falha.message : "O movimento não foi confirmado.";
      setErro(`${motivo} A última posição confirmada foi restaurada.`);
    } finally {
      setPrevias((atuais) => {
        const restantes = { ...atuais };
        delete restantes[token.id];
        return restantes;
      });
    }
  }, [api, mesaId, online, queryClient]);

  return { previas, erro, mover, movendo: Object.keys(previas).length > 0 };
}
