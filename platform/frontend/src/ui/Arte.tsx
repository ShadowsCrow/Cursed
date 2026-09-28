import { useState, type ReactNode } from "react";

/*
 * Arte do tema (design D11). As imagens vêm de `public/arte/`, geradas por
 * `scripts/preparar_arte.py`. Toda ilustração é decorativa (`alt=""`), tem largura e altura
 * declaradas e, se o arquivo faltar ou não carregar, some sem deixar ícone quebrado: o
 * contêiner mantém o gradiente do tema no mesmo espaço.
 */

export const ARTE = "/arte";

export type EtapaIlustrada =
  | "conceito" | "identidade" | "raca" | "classe" | "atributos" | "pericias" | "personalidade" | "conferencia";

interface IlustracaoProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  largura: number;
  altura: number;
  className?: string;
}

/** Imagem decorativa que desaparece ao falhar; o fundo do contêiner é a alternativa. */
export function Ilustracao({ src, srcSet, sizes, largura, altura, className = "" }: IlustracaoProps) {
  const [falhou, setFalhou] = useState(false);
  if (falhou) return null;
  return (
    <img
      className={`ilustracao ${className}`.trim()}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      width={largura}
      height={altura}
      alt=""
      aria-hidden="true"
      decoding="async"
      onError={() => setFalhou(true)}
    />
  );
}

/** Cabeçalho com o castelo ao fundo e o texto sobre o terço esquerdo, escurecido. */
export function CabecalhoIlustrado({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <header className={`cabecalho-ilustrado ${className}`.trim()}>
      <div className="cabecalho-ilustrado__arte">
        <Ilustracao
          src={`${ARTE}/ancora-castelo-1536.webp`}
          srcSet={`${ARTE}/ancora-castelo-768.webp 768w, ${ARTE}/ancora-castelo-1536.webp 1536w`}
          sizes="(max-width: 640px) 100vw, 1200px"
          largura={1536}
          altura={768}
        />
      </div>
      <div className="cabecalho-ilustrado__texto">{children}</div>
    </header>
  );
}

/** Ilustração de uma etapa do assistente, com camada fria e vinheta em CSS. */
export function IlustracaoDeEtapa({ etapa, children }: { etapa: EtapaIlustrada; children?: ReactNode }) {
  return (
    <div className={`ilustracao-etapa ilustracao-etapa--${etapa}`}>
      <div className="ilustracao-etapa__arte">
        <Ilustracao src={`${ARTE}/etapa-${etapa}.webp`} largura={1200} altura={800} />
      </div>
      {children && <div className="ilustracao-etapa__texto">{children}</div>}
    </div>
  );
}
