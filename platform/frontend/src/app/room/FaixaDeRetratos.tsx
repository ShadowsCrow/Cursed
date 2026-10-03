import { useEffect, useRef, useState } from "react";

import type { components } from "../../api/generated/schema";
import type { ApiClient } from "../characters/types";
import { useRetrato } from "../plataforma/imagens";

export type Personagem = components["schemas"]["PersonagemResumo"];

/** Diâmetro do retrato mais o espaço entre retratos, em px: decide quantos cabem na faixa. */
const LUGAR_DO_RETRATO = 64 + 10;

function Retrato({ api, mesaId, personagem, escolhido, onEscolher }: {
  api: ApiClient; mesaId: string; personagem: Personagem; escolhido: boolean; onEscolher: () => void;
}) {
  const imagem = useRetrato(api, mesaId, personagem.retrato_objeto, personagem.tipo, true);
  return (
    <button type="button" className="fichas-painel__retrato" aria-pressed={escolhido} title={personagem.nome} onClick={onEscolher}>
      <img src={imagem} alt="" width={64} height={64} />
      <span className="sr-only">{personagem.nome}</span>
    </button>
  );
}

/**
 * Faixa de retratos circulares com setas, das abas Fichas e Bolsa do painel da Sala. Mostra quantos
 * retratos couberem na largura e anda um por vez.
 */
export function FaixaDeRetratos({ api, mesaId, personagens, escolhidoId, onEscolher }: {
  api: ApiClient; mesaId: string; personagens: readonly Personagem[]; escolhidoId: string | undefined;
  onEscolher: (id: string) => void;
}) {
  const [inicio, setInicio] = useState(0);
  const [cabem, setCabem] = useState(4);
  const faixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = faixa.current;
    if (!elemento || typeof ResizeObserver === "undefined") return undefined;
    const observador = new ResizeObserver(([entrada]) => {
      const largura = entrada?.contentRect.width ?? 0;
      if (largura > 0) setCabem(Math.max(1, Math.floor((largura + 10) / LUGAR_DO_RETRATO)));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const primeiro = Math.min(inicio, Math.max(0, personagens.length - cabem));
  const visiveis = personagens.slice(primeiro, primeiro + cabem);
  return (
    <div className="fichas-painel__faixa">
      <button type="button" className="fichas-painel__seta" aria-label="Personagens anteriores"
        disabled={primeiro === 0} onClick={() => setInicio(Math.max(0, primeiro - 1))}>‹</button>
      <div ref={faixa} className="fichas-painel__retratos" role="group" aria-label="Personagens">
        {visiveis.map((p) => (
          <Retrato key={p.id} api={api} mesaId={mesaId} personagem={p} escolhido={p.id === escolhidoId}
            onEscolher={() => onEscolher(p.id)} />
        ))}
      </div>
      <button type="button" className="fichas-painel__seta" aria-label="Próximos personagens"
        disabled={primeiro + cabem >= personagens.length} onClick={() => setInicio(primeiro + 1)}>›</button>
    </div>
  );
}
