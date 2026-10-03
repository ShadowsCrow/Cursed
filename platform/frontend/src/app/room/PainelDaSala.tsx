import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { Glyph } from "../../ui/Display";
import { ABAS_DO_PAINEL, type AbaDoPainel } from "./abasDoPainel";

/** Chat da mesa: só um espaço reservado nesta etapa (decisão do usuário, 2026-10-02). */
export function ChatReservado() {
  return (
    <div className="chat-painel">
      <p className="chat-painel__aviso">
        O chat da mesa ainda vai chegar. Quando chegar, o registro da mesa também vai aparecer aqui.
      </p>
      <div className="chat-painel__mensagens" aria-hidden="true" />
      <form className="chat-painel__envio" onSubmit={(evento) => evento.preventDefault()}>
        <label className="sr-only" htmlFor="chat-painel-mensagem">Mensagem</label>
        <textarea id="chat-painel-mensagem" disabled rows={2} placeholder="Mensagem (em breve)" />
        <button type="submit" className="button" disabled>Enviar</button>
      </form>
    </div>
  );
}

/** Música da mesa: só um espaço reservado nesta etapa (decisão do usuário, 2026-10-02). */
export function MusicaReservada() {
  return (
    <div className="chat-painel">
      <p className="chat-painel__aviso">
        A música da mesa ainda vai chegar. Por enquanto, nada toca por aqui.
      </p>
    </div>
  );
}

/**
 * Painel direito da Sala com abas fixas no topo (Cena, Chat, Fichas, Bolsa, Cartas, Música) e o botão de recolher.
 * Com o painel estreito, as abas mostram só o ícone; o nome continua para leitores de tela e como dica.
 * Segue o padrão de abas: setas, Home e End trocam de aba e levam o foco junto.
 */
export function PainelDaSala({ aba, onTrocarAba, onRecolher, conteudo }: {
  aba: AbaDoPainel;
  onTrocarAba: (aba: AbaDoPainel) => void;
  onRecolher: () => void;
  conteudo: ReactNode;
}) {
  const botoes = useRef(new Map<AbaDoPainel, HTMLButtonElement>());
  function tecla(evento: KeyboardEvent<HTMLDivElement>) {
    const indice = ABAS_DO_PAINEL.findIndex((item) => item.id === aba);
    const total = ABAS_DO_PAINEL.length;
    const destino = evento.key === "ArrowRight" ? (indice + 1) % total
      : evento.key === "ArrowLeft" ? (indice - 1 + total) % total
        : evento.key === "Home" ? 0
          : evento.key === "End" ? total - 1 : null;
    if (destino === null) return;
    evento.preventDefault();
    const proxima = ABAS_DO_PAINEL[destino]!.id;
    onTrocarAba(proxima);
    botoes.current.get(proxima)?.focus();
  }
  return (
    <>
      <div className="painel-sala__topo">
        <div className="painel-sala__abas" role="tablist" aria-label="Painel da Sala" onKeyDown={tecla}>
          {ABAS_DO_PAINEL.map((item) => (
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
