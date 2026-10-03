import { useQuery } from "@tanstack/react-query";

import { extractErrorMessage, type ApiClient } from "../characters/types";
import { sheetKeys } from "../characters/sheet/sheetApi";
import type { EscolhaDaFicha, TermoDaFicha } from "./dados";

/** Atributo ou Perícia que dá para somar na rolagem (item 8); `valor` nulo quando a ficha não o calcula. */
export interface OpcaoDaFicha { chave: string; rotulo: string; valor: number | null }

/**
 * Atributos e Perícias da ficha escolhida para rolar, com os totais que a ficha mostra (valores derivados do
 * servidor, mesma chave de cache da ficha), e as parcelas da escolha atual, para a prévia da expressão.
 * O servidor recalcula os totais ao rolar; estes servem só para escolher e mostrar.
 */
export function useOpcoesDaFicha(api: ApiClient, mesaId: string, escolha: EscolhaDaFicha | undefined) {
  const personagemId = escolha?.personagemId ?? "";
  const consulta = useQuery({
    queryKey: sheetKeys.valoresDerivados(mesaId, personagemId),
    enabled: Boolean(personagemId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/personagens/{personagem_id}/valores-derivados", {
        params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar os valores da ficha."));
      return data ?? [];
    },
  });
  const valores = personagemId ? consulta.data ?? [] : [];
  const opcoes = (grupo: "atributo" | "pericia"): OpcaoDaFicha[] => valores.filter((v) => v.grupo === grupo)
    .map((v) => ({ chave: v.chave, rotulo: v.rotulo, valor: typeof v.total === "number" ? Math.round(v.total) : null }));
  const atributos = opcoes("atributo");
  const pericias = opcoes("pericia");
  const termos: TermoDaFicha[] = [escolha?.atributo, escolha?.pericia].flatMap((chave) => {
    const opcao = [...atributos, ...pericias].find((o) => o.chave === chave);
    return opcao && opcao.valor !== null ? [{ chave: opcao.chave, rotulo: opcao.rotulo, valor: opcao.valor }] : [];
  });
  return { atributos, pericias, termos, carregando: Boolean(personagemId) && consulta.isPending };
}
