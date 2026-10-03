import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { usePersonagens } from "../characters/api";
import { InventoryGridPanel } from "../characters/sheet/InventoryGridPanel";
import { sheetKeys, useEfeitos, useFichaSnapshot, usePermissoesFicha } from "../characters/sheet/sheetApi";
import type { ApiClient } from "../characters/types";
import { useConnectivityStatus } from "../connectivity/useConnectivityStatus";
import { FaixaDeRetratos } from "./FaixaDeRetratos";

/** A bolsa de um personagem: a mesma grade da ficha, com as mesmas permissões e a versão da ficha. */
function BolsaDoPersonagem({ api, mesaId, personagemId }: { api: ApiClient; mesaId: string; personagemId: string }) {
  const queryClient = useQueryClient();
  const ficha = useFichaSnapshot(api, mesaId, personagemId);
  const permissoes = usePermissoesFicha(api, mesaId, personagemId);
  const efeitos = useEfeitos(api, mesaId, personagemId);
  const online = useConnectivityStatus() !== "offline";
  if (ficha.isError) return <p role="alert">{ficha.error.message}</p>;
  if (!ficha.isSuccess) return <p role="status">Carregando a bolsa…</p>;
  // Como na página da ficha: a versão confirmada por uma edição da grade atualiza a ficha em cache.
  const confirmarVersao = (versao: number) => queryClient.setQueryData(sheetKeys.ficha(mesaId, personagemId),
    (anterior: typeof ficha.data | undefined) => (anterior ? { ...anterior, versao } : anterior));
  return (
    <InventoryGridPanel api={api} mesaId={mesaId} personagemId={personagemId} permissoes={permissoes.data}
      versao={ficha.data.versao} online={online} onVersaoConfirmada={confirmarVersao} efeitos={efeitos.data} />
  );
}

/**
 * Aba Bolsa do painel da Sala (item 8): a faixa de retratos das Fichas e, abaixo, o inventário em grade
 * do escolhido. O Narrador escolhe a bolsa de qualquer personagem; o jogador vê só a dos próprios.
 */
export function BolsaDoPainel({ api, mesaId, userId, narrator }: { api: ApiClient; mesaId: string; userId: string; narrator: boolean }) {
  const personagens = usePersonagens(api, mesaId, false);
  const lista = useMemo(() => (personagens.data ?? []).filter((p) => narrator || p.proprietario_id === userId),
    [personagens.data, narrator, userId]);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const atual = lista.find((p) => p.id === escolhido) ?? lista[0];

  if (personagens.isPending) return <p role="status">Carregando personagens…</p>;
  if (personagens.isError) return <p role="alert">{personagens.error.message}</p>;
  if (!atual) {
    return <p className="painel-sala__vazio">{narrator ? "Ainda não há personagens na mesa." : "Você ainda não tem personagem nesta mesa."}</p>;
  }
  return (
    <div className="bolsa-painel">
      <FaixaDeRetratos api={api} mesaId={mesaId} personagens={lista} escolhidoId={atual.id} onEscolher={setEscolhido} />
      <h2 className="bolsa-painel__titulo">Bolsa de {atual.nome}</h2>
      <BolsaDoPersonagem key={atual.id} api={api} mesaId={mesaId} personagemId={atual.id} />
    </div>
  );
}
