import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Token mínimo para o controle: nome, tamanho e versão (o servidor confere a versão). */
interface TokenComTamanho { id: string; rotulo: string; tamanho: number }

export const TAMANHO_MAXIMO_DO_TOKEN = 10;

/**
 * Quantas casas o token ocupa, sempre quadrado (melhorias-da-sala, item 6): − e + de 1×1 a 10×10.
 * Usado no menu do botão direito sobre o token e, como caminho pelo teclado, no painel da cena.
 */
export function ControleDeTamanho({ token, pendente, onMudar }: {
  token: TokenComTamanho; pendente: boolean; onMudar: (tamanho: number) => void;
}) {
  const { rotulo, tamanho } = token;
  return (
    <div className="tamanho-token" role="group" aria-label={`Tamanho de ${rotulo}`}>
      <span className="tamanho-token__titulo">Tamanho</span>
      <div className="tamanho-token__controle">
        <button type="button" aria-label={`Diminuir ${rotulo}`} title="Diminuir"
          disabled={tamanho <= 1 || pendente} onClick={() => onMudar(tamanho - 1)}>−</button>
        <span className="tamanho-token__valor" aria-live="polite">{tamanho}×{tamanho} {tamanho === 1 ? "casa" : "casas"}</span>
        <button type="button" aria-label={`Aumentar ${rotulo}`} title="Aumentar"
          disabled={tamanho >= TAMANHO_MAXIMO_DO_TOKEN || pendente} onClick={() => onMudar(tamanho + 1)}>+</button>
      </div>
    </div>
  );
}

/**
 * Menu do botão direito sobre um token no grid (melhorias-da-sala, item 6), só para o Narrador. Abre junto ao
 * cursor, sem sair da tela; fecha com Escape, com um clique fora ou no ×. O foco vai para o menu ao abrir.
 */
export function MenuDoToken({ token, posicao, pendente, erro, onTamanho, onFechar }: {
  token: TokenComTamanho; posicao: { x: number; y: number }; pendente: boolean; erro?: string | null;
  onTamanho: (tamanho: number) => void; onFechar: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [lugar, setLugar] = useState(posicao);
  // Mantém o menu inteiro dentro da janela, mesmo perto das bordas.
  useLayoutEffect(() => {
    const elemento = caixa.current;
    if (!elemento) return;
    const { width, height } = elemento.getBoundingClientRect();
    const margem = 8;
    setLugar({
      x: Math.max(margem, Math.min(posicao.x, window.innerWidth - width - margem)),
      y: Math.max(margem, Math.min(posicao.y, window.innerHeight - height - margem)),
    });
  }, [posicao]);
  useEffect(() => {
    caixa.current?.focus();
    const tecla = (evento: KeyboardEvent) => { if (evento.key === "Escape") onFechar(); };
    const fora = (evento: PointerEvent) => {
      if (caixa.current && !caixa.current.contains(evento.target as Node)) onFechar();
    };
    window.addEventListener("keydown", tecla);
    window.addEventListener("pointerdown", fora, true);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("pointerdown", fora, true);
    };
  }, [onFechar]);
  return (
    <div ref={caixa} className="menu-do-token" role="dialog" aria-label={`Token ${token.rotulo}`} tabIndex={-1}
      style={{ left: lugar.x, top: lugar.y }} onContextMenu={(evento) => evento.preventDefault()}>
      <div className="menu-do-token__topo">
        <strong className="menu-do-token__nome">{token.rotulo}</strong>
        <button type="button" className="menu-do-token__fechar" aria-label="Fechar menu do token" onClick={onFechar}>×</button>
      </div>
      <ControleDeTamanho token={token} pendente={pendente} onMudar={onTamanho} />
      {erro && <p className="menu-do-token__erro" role="alert">{erro}</p>}
    </div>
  );
}
