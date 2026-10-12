import { useEffect, useRef, useState } from "react";

import type { components } from "../../api/generated/schema";
import type { ApiClient } from "../characters/types";
import { Glyph } from "../../ui/Display";
import { useRetrato } from "../plataforma/imagens";

export type Personagem = components["schemas"]["PersonagemResumo"];

/** Diâmetro do retrato, em px, na faixa normal e na compacta (aba Dados, melhorias-da-sala, item 8). */
const LADO = { normal: 64, compacta: 44 } as const;
const ESPACO = 10;

function Retrato({ api, mesaId, personagem, escolhido, lado, onEscolher }: {
  api: ApiClient; mesaId: string; personagem: Personagem; escolhido: boolean; lado: number; onEscolher: () => void;
}) {
  const imagem = useRetrato(api, mesaId, personagem.retrato_objeto, personagem.tipo, true);
  return (
    <button type="button" className="fichas-painel__retrato" aria-pressed={escolhido} title={personagem.nome} onClick={onEscolher}>
      <img src={imagem} alt="" width={lado} height={lado} />
      <span className="sr-only">{personagem.nome}</span>
    </button>
  );
}

/**
 * Faixa de retratos circulares com setas, das abas Fichas, Bolsa e Dados do painel da Sala. Mostra quantos
 * retratos couberem na largura e anda um por vez. A versão compacta (Dados) pode começar com "Sem ficha".
 */
export function FaixaDeRetratos({ api, mesaId, personagens, escolhidoId, onEscolher, compacta = false, semFicha }: {
  api: ApiClient; mesaId: string; personagens: readonly Personagem[]; escolhidoId: string | undefined;
  onEscolher: (id: string) => void;
  compacta?: boolean;
  /** Primeiro item da faixa: rolar sem ficha. */
  semFicha?: { escolhido: boolean; onEscolher: () => void };
}) {
  const lado = compacta ? LADO.compacta : LADO.normal;
  const [inicio, setInicio] = useState(0);
  const [cabem, setCabem] = useState(4);
  const faixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = faixa.current;
    if (!elemento || typeof ResizeObserver === "undefined") return undefined;
    const observador = new ResizeObserver(([entrada]) => {
      const largura = entrada?.contentRect.width ?? 0;
      if (largura > 0) setCabem(Math.max(1, Math.floor((largura + ESPACO) / (lado + ESPACO))));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [lado]);

  // "Sem ficha" ocupa um lugar como os retratos.
  const itens: (Personagem | null)[] = [...(semFicha ? [null] : []), ...personagens];
  const primeiro = Math.min(inicio, Math.max(0, itens.length - cabem));
  const visiveis = itens.slice(primeiro, primeiro + cabem);
  return (
    <div className={`fichas-painel__faixa${compacta ? " fichas-painel__faixa--compacta" : ""}`}>
      <button type="button" className="fichas-painel__seta" aria-label="Personagens anteriores"
        disabled={primeiro === 0} onClick={() => setInicio(Math.max(0, primeiro - 1))}>‹</button>
      <div ref={faixa} className="fichas-painel__retratos" role="group" aria-label="Personagens">
        {visiveis.map((p) => p === null
          ? <button key="sem-ficha" type="button" className="fichas-painel__retrato fichas-painel__sem-ficha"
            aria-pressed={semFicha!.escolhido} title="Sem ficha" onClick={semFicha!.onEscolher}>
            <Glyph name="dice" size={Math.round(lado * 0.5)} /><span className="sr-only">Sem ficha</span>
          </button>
          : <Retrato key={p.id} api={api} mesaId={mesaId} personagem={p} escolhido={p.id === escolhidoId} lado={lado}
            onEscolher={() => onEscolher(p.id)} />)}
      </div>
      <button type="button" className="fichas-painel__seta" aria-label="Próximos personagens"
        disabled={primeiro + cabem >= itens.length} onClick={() => setInicio(primeiro + 1)}>›</button>
    </div>
  );
}
