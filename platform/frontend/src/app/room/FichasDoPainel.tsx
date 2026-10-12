import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { Dialog } from "../../ui/primitives";
import { useCartasDoPersonagem } from "../cards/api";
import { usePersonagens } from "../characters/api";
import { CharacterSheetPage } from "../characters/sheet/CharacterSheetPage";
import { useClasses, useListasFicha } from "../characters/sheet/catalogoApi";
import { ResumoFicha } from "../characters/sheet/resumo/ResumoFicha";
import { useFichaSnapshot, useInventario, useValoresDerivados } from "../characters/sheet/sheetApi";
import type { ApiClient } from "../characters/types";
import { FaixaDeRetratos } from "./FaixaDeRetratos";

/** Resumo só de leitura, com as mesmas consultas da página da ficha (o padrão da Vitrine do acervo). */
function ResumoDoPersonagem({ api, mesaId, personagemId, onAbrir }: {
  api: ApiClient; mesaId: string; personagemId: string; onAbrir: (secao?: string) => void;
}) {
  const ficha = useFichaSnapshot(api, mesaId, personagemId);
  const valores = useValoresDerivados(api, mesaId, personagemId);
  const inventario = useInventario(api, mesaId, personagemId);
  const cartas = useCartasDoPersonagem(api, mesaId, personagemId);
  const classes = useClasses(api, mesaId);
  const listas = useListasFicha(api, mesaId);
  if (ficha.isError) return <p role="alert">{ficha.error.message}</p>;
  if (valores.isError) return <p role="alert">{valores.error.message}</p>;
  if (!ficha.isSuccess || !valores.isSuccess) return <p role="status">Carregando o resumo…</p>;
  return (
    <ResumoFicha
      api={api} mesaId={mesaId} personagemId={personagemId}
      ficha={ficha.data.ficha} versao={ficha.data.versao}
      valores={valores.data} inventario={inventario.data ?? []} cartas={cartas.data ?? []}
      listas={listas.data} classes={classes.data}
      onAbrir={(secao) => onAbrir(secao)}
      onIlustracaoAlterada={() => undefined}
    />
  );
}

/**
 * Aba Fichas do painel da Sala: faixa de retratos com setas e, abaixo, o resumo do escolhido.
 * A ficha completa abre numa janela flutuante por cima da Sala, sem sair dela. O servidor decide
 * quais personagens cada um vê; os da própria pessoa vêm primeiro.
 */
export function FichasDoPainel({ api, mesaId, userId }: { api: ApiClient; mesaId: string; userId: string }) {
  const personagens = usePersonagens(api, mesaId, false);
  const lista = useMemo(() => [...(personagens.data ?? [])]
    .sort((a, b) => Number(b.proprietario_id === userId) - Number(a.proprietario_id === userId)), [personagens.data, userId]);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [fichaAberta, setFichaAberta] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const atual = lista.find((p) => p.id === escolhido) ?? lista[0];

  if (personagens.isPending) return <p role="status">Carregando personagens…</p>;
  if (personagens.isError) return <p role="alert">{personagens.error.message}</p>;
  if (lista.length === 0) return <p className="painel-sala__vazio">Ainda não há personagens para mostrar.</p>;

  function abrirFicha(secao?: string) {
    setSearchParams((atuais) => {
      const proximos = new URLSearchParams(atuais);
      if (secao) proximos.set("secao", secao);
      else proximos.delete("secao");
      return proximos;
    }, { replace: true });
    setFichaAberta(true);
  }
  function fecharFicha() {
    setFichaAberta(false);
    setSearchParams((atuais) => {
      const proximos = new URLSearchParams(atuais);
      proximos.delete("secao");
      proximos.delete("novo");
      return proximos;
    }, { replace: true });
  }

  return (
    <div className="fichas-painel">
      <FaixaDeRetratos api={api} mesaId={mesaId} personagens={lista} escolhidoId={atual?.id} onEscolher={setEscolhido} />
      {atual && <>
        <div className="fichas-painel__titulo">
          <h2>{atual.nome}</h2>
          <button type="button" className="button button--secondary" onClick={() => abrirFicha()}>Abrir ficha completa</button>
        </div>
        <div className="fichas-painel__resumo">
          <ResumoDoPersonagem key={atual.id} api={api} mesaId={mesaId} personagemId={atual.id} onAbrir={abrirFicha} />
        </div>
        {fichaAberta && (
          <Dialog open title={`Ficha de ${atual.nome}`} onClose={fecharFicha} className="ficha-flutuante" closeLabel="Fechar ficha">
            <CharacterSheetPage api={api} mesaId={mesaId} personagemId={atual.id} userId={userId} onBack={fecharFicha} />
          </Dialog>
        )}
      </>}
    </div>
  );
}
