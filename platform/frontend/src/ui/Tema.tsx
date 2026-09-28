import { forwardRef, useState, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";

/*
 * Componentes de tema (design D8 de criacao-guiada-e-nova-estetica). Os ornamentos são só
 * decoração: `aria-hidden`, sem foco e sem clique (`pointer-events: none` em `tema.css`), e
 * ficam mais simples abaixo de 480 px.
 */

function Canto({ posicao }: { posicao: "se" | "sd" | "ie" | "id" }) {
  return (
    <svg className={`moldura__canto moldura__canto--${posicao}`} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M2 30V9.5C2 5.4 5.4 2 9.5 2H30" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 30V12c0-3.3 2.7-6 6-6h18" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".65" />
      <path d="m9 9 3.2-1.4L15 9l-1.4 3.2L9 15l1.4-3.2Z" fill="currentColor" />
    </svg>
  );
}

type MolduraProps<T extends ElementType> = {
  as?: T;
  /** `noite`: moldura sobre a paleta noturna; `pergaminho`: borda que separa o pergaminho da noite. */
  variante?: "noite" | "pergaminho";
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/** Borda ornamentada com quatro cantos. O conteúdo não perde área: os cantos ficam na borda. */
export function Moldura<T extends ElementType = "div">({ as, variante = "noite", className = "", children, ...resto }: MolduraProps<T>) {
  const Elemento = (as ?? "div") as ElementType;
  return (
    <Elemento className={`moldura moldura--${variante} ${className}`.trim()} {...resto}>
      <Canto posicao="se" /><Canto posicao="sd" /><Canto posicao="ie" /><Canto posicao="id" />
      {children}
    </Elemento>
  );
}

type PergaminhoProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/**
 * Superfície de leitura: texto escuro sobre pergaminho. Redefine os tokens semânticos
 * (`.tema-pergaminho`), então os controles dentro dela usam as cores de pergaminho sem ajuste.
 */
export function Pergaminho<T extends ElementType = "div">({ as, className = "", children, ...resto }: PergaminhoProps<T>) {
  const Elemento = (as ?? "div") as ElementType;
  return (
    <Elemento className={`pergaminho tema-pergaminho ${className}`.trim()} {...resto}>
      {children}
    </Elemento>
  );
}

export interface TituloOrnadoProps extends Omit<ComponentPropsWithoutRef<"h2">, "children"> {
  nivel?: 1 | 2 | 3;
  /** Linha curta acima do título (ex.: "ETAPA 3 DE 8"). */
  sobretitulo?: ReactNode;
  children: ReactNode;
}

/** Título em fonte de exibição com um divisor ornamental abaixo. */
export const TituloOrnado = forwardRef<HTMLHeadingElement, TituloOrnadoProps>(function TituloOrnado(
  { nivel = 2, sobretitulo, className = "", children, ...resto }, ref,
) {
  const Cabecalho = `h${nivel}` as "h2";
  return (
    <div className={`titulo-ornado titulo-ornado--${nivel} ${className}`.trim()}>
      {sobretitulo && <span className="titulo-ornado__sobretitulo">{sobretitulo}</span>}
      <Cabecalho ref={ref} className="titulo-ornado__texto" {...resto}>{children}</Cabecalho>
      <svg className="titulo-ornado__divisor" viewBox="0 0 240 14" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
        <path d="M0 7h98M142 7h98" stroke="currentColor" strokeWidth="1" />
        <path className="titulo-ornado__floreio" d="M98 7c6-5 11-5 14 0M142 7c-6 5-11 5-14 0" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="m120 1 5 6-5 6-5-6Z" fill="currentColor" />
      </svg>
    </div>
  );
});

export interface SeloProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  /** `ouro`: destaque; `sangue`: ativo ou alerta; `noite`: neutro. O texto sempre diz o estado. */
  tom?: "ouro" | "sangue" | "noite";
  children: ReactNode;
}

/** Rótulo em forma de faixa. A cor só complementa o texto, nunca o substitui. */
export function Selo({ tom = "ouro", className = "", children, ...resto }: SeloProps) {
  return <span className={`selo selo--${tom} ${className}`.trim()} {...resto}>{children}</span>;
}

/** Estrela de oito pontas com anel: versão simplificada do emblema, legível em 16 px. */
export function EmblemaSimples({ tamanho = 24, className = "" }: { tamanho?: number; className?: string }) {
  return (
    <svg className={`emblema-simples ${className}`.trim()} width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 1 18.6 13.4 31 16 18.6 18.6 16 31 13.4 18.6 1 16 13.4 13.4Z" fill="currentColor" />
      <path d="m16 16 6.4-6.4-2.3 5.1Zm0 0 6.4 6.4-5.1-2.3Zm0 0-6.4 6.4 2.3-5.1Zm0 0L9.6 9.6l5.1 2.3Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Marca da plataforma: emblema detalhado (imagem) com o nome "CURSED" em texto real.
 * Se a imagem faltar ou falhar, fica a versão simplificada em SVG, nunca uma imagem quebrada.
 */
export function Marca({ tamanho = 40, subtitulo = "PLATAFORMA RPG", compacta = false }: { tamanho?: number; subtitulo?: string | null; compacta?: boolean }) {
  const [falhou, setFalhou] = useState(false);
  return (
    <span className={`marca ${compacta ? "marca--compacta" : ""}`.trim()}>
      <span className="marca__emblema" style={{ width: tamanho, height: tamanho }} aria-hidden="true">
        {falhou || compacta
          ? <EmblemaSimples tamanho={Math.round(tamanho * .8)} />
          : <img src="/arte/emblema-cursed-256.webp" width={tamanho} height={tamanho} alt="" onError={() => setFalhou(true)} />}
      </span>
      <span className="marca__texto">
        <strong>CURSED</strong>
        {subtitulo && <small>{subtitulo}</small>}
      </span>
    </span>
  );
}

/** Página inteira de carregamento, erro ou aviso, com a marca da plataforma. */
export function EstadoDePagina({ children, alerta = false }: { children: ReactNode; alerta?: boolean }) {
  return (
    <main className="page estado-pagina" role={alerta ? "alert" : undefined} aria-busy={alerta ? undefined : true}>
      <Marca tamanho={56} />
      <div className="estado-pagina__conteudo">{children}</div>
    </main>
  );
}
