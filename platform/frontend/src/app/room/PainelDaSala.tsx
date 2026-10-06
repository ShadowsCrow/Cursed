import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { Glyph } from "../../ui/Display";
import { abasDoPainel, type AbaDoPainel } from "./abasDoPainel";

/**
 * Painel direito da Sala com abas fixas no topo (Cena, Dados, Mestre ou Jogador, Fichas, Bolsa, Cartas, Música) e o botão
 * de recolher. A aba do papel é Mestre para o Narrador e Jogador para os demais (gamificacao-da-sala).
 * Com o painel estreito, as abas mostram só o ícone; o nome continua para leitores de tela e como dica.
 * Segue o padrão de abas: setas, Home e End trocam de aba e levam o foco junto.
 */
export function PainelDaSala({ aba, narrador = false, onTrocarAba, onRecolher, conteudo }: {
  aba: AbaDoPainel;
  narrador?: boolean;
  onTrocarAba: (aba: AbaDoPainel) => void;
  onRecolher: () => void;
  conteudo: ReactNode;
}) {
  const botoes = useRef(new Map<AbaDoPainel, HTMLButtonElement>());
  const abas = abasDoPainel(narrador);
  function tecla(evento: KeyboardEvent<HTMLDivElement>) {
    const indice = abas.findIndex((item) => item.id === aba);
    const total = abas.length;
    const destino = evento.key === "ArrowRight" ? (indice + 1) % total
      : evento.key === "ArrowLeft" ? (indice - 1 + total) % total
        : evento.key === "Home" ? 0
          : evento.key === "End" ? total - 1 : null;
    if (destino === null) return;
    evento.preventDefault();
    const proxima = abas[destino]!.id;
    onTrocarAba(proxima);
    botoes.current.get(proxima)?.focus();
  }
  return (
    <>
      <div className="painel-sala__topo">
        <div className="painel-sala__abas" role="tablist" aria-label="Painel da Sala" onKeyDown={tecla}>
          {abas.map((item) => (
            <button key={item.id} type="button" role="tab" id={`aba-painel-${item.id}`}
              ref={(elemento) => { if (elemento) botoes.current.set(item.id, elemento); else botoes.current.delete(item.id); }}
              aria-selected={aba === item.id} aria-controls="painel-sala-conteudo" tabIndex={aba === item.id ? 0 : -1}
              title={item.rotulo} onClick={() => onTrocarAba(item.id)}>
              <Glyph name={item.icone} size={17} />
              <span className="painel-sala__aba-rotulo">{item.rotulo}</span>
            </button>
          ))}
        </div>
        <button type="button" className="painel-sala__recolher" aria-label="Recolher painel" title="Recolher painel"
          aria-expanded="true" aria-controls="painel-da-cena" onClick={onRecolher}>
          <Glyph name="chevron" size={18} />
        </button>
      </div>
      <div id="painel-sala-conteudo" className="painel-sala__conteudo" role="tabpanel" aria-labelledby={`aba-painel-${aba}`}>
        {conteudo}
      </div>
    </>
  );
}
