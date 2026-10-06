/**
 * Sub-abas de uma aba do painel da Sala (pedidos do usuário, 2026-10-04): no lugar das seções retráteis, um tema por
 * vez nas abas Mestre e Cena. Seguem o padrão de abas acessível: lista de abas, a atual anunciada como selecionada,
 * setas, Home e End trocam de sub-aba e levam o foco junto. Cada uma pode trazer a quantidade de itens e um aviso.
 */
import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface SubAba<T extends string> {
  id: T;
  rotulo: string;
  /** Quantidade de itens, ao lado do nome (só visual; o conteúdo da sub-aba a mostra também). */
  contagem?: number;
  /** Ponto de aviso, com o texto lido por leitores de tela (ex.: "votação aberta"). */
  aviso?: string;
}

export function SubAbas<T extends string>({ rotulo, prefixo, itens, aba, onTrocar, children }: {
  /** Nome acessível da lista de sub-abas. */
  rotulo: string;
  /** Prefixo dos ids das sub-abas e do painel (ex.: "mestre"). */
  prefixo: string;
  itens: SubAba<T>[];
  aba: T;
  onTrocar: (aba: T) => void;
  children: ReactNode;
}) {
  const botoes = useRef(new Map<T, HTMLButtonElement>());
  function tecla(evento: KeyboardEvent<HTMLDivElement>) {
    const indice = itens.findIndex((item) => item.id === aba);
    const total = itens.length;
    const destino = evento.key === "ArrowRight" ? (indice + 1) % total
      : evento.key === "ArrowLeft" ? (indice - 1 + total) % total
        : evento.key === "Home" ? 0 : evento.key === "End" ? total - 1 : null;
    if (destino === null) return;
    evento.preventDefault();
    const proxima = itens[destino]!.id;
    onTrocar(proxima);
    botoes.current.get(proxima)?.focus();
  }
  return (
    <>
      <div className="sub-abas" role="tablist" aria-label={rotulo} onKeyDown={tecla}>
        {itens.map((item) => (
          <button key={item.id} type="button" role="tab" id={`${prefixo}-aba-${item.id}`} aria-selected={aba === item.id}
            aria-controls={`${prefixo}-conteudo`} tabIndex={aba === item.id ? 0 : -1} className="sub-abas__aba" title={item.rotulo}
            ref={(elemento) => { if (elemento) botoes.current.set(item.id, elemento); else botoes.current.delete(item.id); }}
            onClick={() => onTrocar(item.id)}>
            {item.rotulo}
            {item.contagem !== undefined && <span className="sub-abas__contagem" aria-hidden="true">{item.contagem}</span>}
            {item.aviso && <><span className="sub-abas__aviso" aria-hidden="true" /><span className="sr-only"> ({item.aviso})</span></>}
          </button>
        ))}
      </div>
      <div id={`${prefixo}-conteudo`} className="sub-abas__conteudo" role="tabpanel" aria-labelledby={`${prefixo}-aba-${aba}`}>
        {children}
      </div>
    </>
  );
}
