/**
 * Reações da Sala (gamificacao-da-sala, D9): o botão discreto "Reagir" no canto inferior direito do grid, com a
 * bandeja das seis reações, e a camada dos balões que sobem e somem sozinhos. Os balões não recebem cliques e são
 * ignorados por leitores de tela.
 */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { Glyph } from "../../ui/Display";
import { usePintura } from "../characters/sheet/cartas/pinturasDasCartas";
import { arteDaReacao, nomeDaReacao, REACOES, type Balao, type Reacao } from "./reacoes";

/** A pintura da reação; enquanto ela carrega (ou se faltar), o nome no mesmo espaço. */
function FiguraDaReacao({ reacao, lado }: { reacao: Reacao; lado: number }) {
  const url = arteDaReacao(reacao);
  return usePintura(url) === "pronta"
    ? <img className="reacao__figura" src={url} alt="" width={lado} height={lado} draggable={false} />
    : <span className="reacao__figura reacao__figura--texto" style={{ width: lado, height: lado }}>{nomeDaReacao(reacao)}</span>;
}

export function BotaoDeReacao({ onReagir }: { onReagir: (reacao: Reacao) => void }) {
  const [aberta, setAberta] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const bandeja = useRef<HTMLDivElement>(null);
  const itens = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!aberta) return undefined;
    itens.current[0]?.focus();
    const fora = (evento: PointerEvent) => {
      const alvo = evento.target as Node;
      if (!bandeja.current?.contains(alvo) && !botao.current?.contains(alvo)) setAberta(false);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberta]);

  function fechar() {
    setAberta(false);
    botao.current?.focus();
  }
  function tecla(evento: KeyboardEvent<HTMLDivElement>) {
    const atual = itens.current.findIndex((item) => item === document.activeElement);
    const total = REACOES.length;
    const destino = evento.key === "ArrowRight" || evento.key === "ArrowDown" ? (atual + 1) % total
      : evento.key === "ArrowLeft" || evento.key === "ArrowUp" ? (atual - 1 + total) % total
        : evento.key === "Home" ? 0 : evento.key === "End" ? total - 1 : null;
    if (evento.key === "Escape") { evento.preventDefault(); fechar(); return; }
    if (destino === null) return;
    evento.preventDefault();
    itens.current[destino]?.focus();
  }

  return (
    <div className="reacoes">
      {aberta && (
        <div ref={bandeja} className="reacoes__bandeja" role="menu" aria-label="Reações" onKeyDown={tecla}>
          {REACOES.map((reacao, indice) => (
            <button key={reacao.id} ref={(elemento) => { itens.current[indice] = elemento; }} type="button" role="menuitem"
              className="reacoes__opcao" title={reacao.nome} aria-label={reacao.nome} tabIndex={-1}
              onClick={() => { onReagir(reacao.id); fechar(); }}>
              <FiguraDaReacao reacao={reacao.id} lado={34} />
            </button>
          ))}
        </div>
      )}
      <button ref={botao} type="button" className="reacoes__botao" aria-haspopup="menu" aria-expanded={aberta}
        aria-label="Reagir" title="Reagir" onClick={() => setAberta(!aberta)}>
        <Glyph name="spark" size={17} />
      </button>
    </div>
  );
}

export function BaloesDeReacao({ baloes, nomeDe }: { baloes: readonly Balao[]; nomeDe: (usuarioId: string) => string }) {
  return (
    <div className="baloes-de-reacao" aria-hidden="true">
      {baloes.map((balao, indice) => (
        // O deslocamento lateral alterna para que balões seguidos não se sobreponham por completo.
        <div key={balao.id} className="balao-de-reacao" style={{ "--deslocamento": `${(indice % 3) * -26}px` } as CSSProperties}>
          <FiguraDaReacao reacao={balao.reacao} lado={30} />
          <span className="balao-de-reacao__nome">{nomeDe(balao.usuarioId)}</span>
        </div>
      ))}
    </div>
  );
}

/** Anúncio do MVP sobre o tabuleiro (gamificacao-da-sala): selo pintado e apelido por alguns segundos. */
export function AnuncioDoMvp({ apelido, onFim }: { apelido: string; onFim: () => void }) {
  const fim = useRef(onFim);
  useEffect(() => { fim.current = onFim; }, [onFim]);
  useEffect(() => {
    const id = window.setTimeout(() => fim.current(), DURACAO_DO_ANUNCIO_MS);
    return () => window.clearTimeout(id);
  }, []);
  const url = ARTE_DO_SELO_MVP;
  const pronta = usePintura(url) === "pronta";
  return (
    <div className="anuncio-do-mvp" role="status">
      {pronta && <img className="anuncio-do-mvp__selo" src={url} alt="" width={132} height={132} draggable={false} />}
      <p className="anuncio-do-mvp__texto"><span className="anuncio-do-mvp__rotulo">MVP</span>
        <strong className="anuncio-do-mvp__nome">{apelido}</strong></p>
    </div>
  );
}

export const DURACAO_DO_ANUNCIO_MS = 6000;
export const ARTE_DO_SELO_MVP = "/arte/sala/mvp-selo.webp";
