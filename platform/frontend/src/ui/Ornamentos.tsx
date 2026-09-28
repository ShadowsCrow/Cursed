import { useState, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";

import { Ilustracao } from "./Arte";

/*
 * Componentes da navegação inicial (design D10 de navegacao-inicial-e-perfil). Seguem as regras do
 * tema: ornamentos `aria-hidden`, sem foco nem clique; estado nunca só pela cor.
 */

type MolduraOrnamentadaProps<T extends ElementType> = {
  as?: T;
  /** `painel`: caixa grande (lista lateral, conteúdo da seção); `quadro`: seção interna, cartão, item. */
  tipo?: "painel" | "quadro";
  /** `noite`: fundo escuro; `pergaminho`: superfície de leitura; `vazio`: só a moldura, sobre ilustração. */
  fundo?: "noite" | "pergaminho" | "vazio";
  /** Seleção: fundo vermelho-sangue, além de `aria-current`/`aria-pressed` em quem usa. */
  selecionada?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/**
 * Moldura dourada no mesmo desenho do Resumo da ficha: chanfros com mordida, linhas duplas e
 * volutas nos cantos, em SVG aplicado por `border-image` (9 fatias), então estica para qualquer
 * tamanho sem deformar os cantos. Nada é imagem pintada; tudo é decorativo e sem foco.
 */
export function MolduraOrnamentada<T extends ElementType = "div">({
  as, tipo = "quadro", fundo = "noite", selecionada = false, className = "", children, ...resto
}: MolduraOrnamentadaProps<T>) {
  const Elemento = (as ?? "div") as ElementType;
  const variante = selecionada ? "sangue" : fundo;
  const classes = [
    "moldura-ornada", `moldura-ornada--${tipo}`, `moldura-ornada--${variante}`,
    fundo === "pergaminho" && !selecionada ? "tema-pergaminho" : "", className,
  ].filter(Boolean).join(" ");
  return <Elemento className={classes} {...resto}>{children}</Elemento>;
}

/** Canto grande da moldura do site (mesmo desenho do canto da folha do Resumo). */
export function CantoDoSite({ posicao }: { posicao: "se" | "sd" | "ie" | "id" }) {
  return (
    <svg className={`canto-do-site canto-do-site--${posicao}`} viewBox="0 0 110 110" aria-hidden="true" focusable="false">
      <path d="M3 107V30C3 15 15 3 30 3h77" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M10 107V35c0-14 11-25 25-25h72" fill="none" stroke="currentColor" strokeWidth="1" opacity=".7" />
      <path d="M22 22c10-16 34-14 36 2 1 11-12 14-16 6-2-5 3-9 7-6M22 22c-16 10-14 34 2 36 11 1 14-12 6-16-5-2-9 3-6 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M60 15c9-4 19-4 27 0M15 60c-4 9-4 19 0 27" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M68 13c4-6 11-7 15-3-4 4-10 5-15 3ZM13 68c-6 4-7 11-3 15 4-4 5-10 3-15ZM88 16c3-3 8-3 10 0-3 2-7 2-10 0ZM16 88c-3 3-3 8 0 10 2-3 2-7 0-10Z" fill="currentColor" />
      <circle cx="22" cy="22" r="5" fill="currentColor" />
    </svg>
  );
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0] ?? "";
  const ultima = partes[partes.length - 1] ?? "";
  if (!primeira) return "?";
  const letras = partes.length === 1 ? primeira.slice(0, 2) : `${primeira[0] ?? ""}${ultima[0] ?? ""}`;
  return letras.toLocaleUpperCase("pt-BR");
}

/** Foto redonda com anel dourado; sem foto (ou se ela falhar), as iniciais do nome. */
export function Avatar({ nome, src, tamanho = 40, className = "", decorativo = false }: {
  nome: string; src?: string | null; tamanho?: number; className?: string; decorativo?: boolean;
}) {
  const [falhou, setFalhou] = useState(false);
  const rotulo = decorativo ? undefined : `Foto de ${nome}`;
  return (
    <span className={`avatar ${className}`.trim()} style={{ width: tamanho, height: tamanho, fontSize: tamanho * .38 }}
      role={decorativo ? undefined : "img"} aria-label={rotulo} aria-hidden={decorativo || undefined}>
      {src && !falhou
        ? <img src={src} alt="" width={tamanho} height={tamanho} onError={() => setFalhou(true)} />
        : <span className="avatar__iniciais" aria-hidden="true">{iniciais(nome)}</span>}
    </span>
  );
}

export interface OpcaoAlternancia<T extends string> {
  id: T;
  rotulo: string;
  contagem?: number;
}

/** Alternância segmentada (Narrando/Jogando, coleções): botões com `aria-pressed`. */
export function AlternanciaSegmentada<T extends string>({ rotulo, opcoes, valor, onChange, className = "" }: {
  rotulo: string; opcoes: OpcaoAlternancia<T>[]; valor: T; onChange: (valor: T) => void; className?: string;
}) {
  return (
    <div className={`alternancia ${className}`.trim()} role="group" aria-label={rotulo}>
      {opcoes.map((opcao) => (
        <button key={opcao.id} type="button" className="alternancia__opcao" aria-pressed={opcao.id === valor}
          onClick={() => onChange(opcao.id)}>
          <span>{opcao.rotulo}</span>
          {opcao.contagem !== undefined && <span className="alternancia__contagem" aria-label={`${opcao.contagem} no total`}>{opcao.contagem}</span>}
        </button>
      ))}
    </div>
  );
}

/** Faixa de abertura com ilustração e texto sobre o lado esquerdo, escurecido. */
export function FaixaDeAbertura({ src, srcSet, largura, altura, className = "", children }: {
  src?: string | null; srcSet?: string; largura: number; altura: number; className?: string; children: ReactNode;
}) {
  return (
    <header className={`faixa-abertura ${className}`.trim()}>
      <div className="faixa-abertura__arte">
        {src && <Ilustracao key={src} src={src} srcSet={srcSet} sizes="(max-width: 720px) 100vw, 1100px" largura={largura} altura={altura} />}
      </div>
      <div className="faixa-abertura__texto">{children}</div>
    </header>
  );
}

/** Valor de Atributo ou Perícia em pontos, só leitura. O número vem da ficha; nada é calculado. */
export function PontosDeValor({ rotulo, valor, maximo = 5, tom = "sangue" }: {
  rotulo: string; valor: number | null; maximo?: number; tom?: "sangue" | "arcano" | "ouro";
}) {
  const total = Math.max(maximo, valor ?? 0);
  return (
    <div className={`pontos pontos--${tom}`}>
      <span className="pontos__rotulo">{rotulo}</span>
      <span className="pontos__numero">{valor ?? "—"}</span>
      <span className="pontos__marcas" role="img" aria-label={valor === null ? `${rotulo}: sem valor` : `${rotulo}: ${valor} de ${total}`}>
        {Array.from({ length: total }, (_, indice) => (
          <span key={indice} className={`pontos__marca ${valor !== null && indice < valor ? "pontos__marca--cheia" : ""}`.trim()} />
        ))}
      </span>
    </div>
  );
}

export type NomeIcone =
  | "livro" | "pessoas" | "busto" | "rosa" | "coroa" | "mais" | "sair" | "menu" | "fechar" | "seta"
  | "pergaminho" | "olho" | "copiar" | "porta" | "lapis";

const TRACOS: Record<NomeIcone, ReactNode> = {
  livro: <><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5Z" /><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5Z" /><path d="M11 4c.6.5 1.4.5 2 0M11 19c.6.5 1.4.5 2 0" /></>,
  pessoas: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.6-3.6 3.3-5.6 6.5-5.6s5.9 2 6.5 5.6" /><circle cx="5.2" cy="9.6" r="2.2" /><circle cx="18.8" cy="9.6" r="2.2" /><path d="M1.8 18c.3-2.2 1.6-3.5 3.4-3.8M22.2 18c-.3-2.2-1.6-3.5-3.4-3.8" /></>,
  busto: <><circle cx="12" cy="8" r="3.6" /><path d="M5 21c.4-4.6 3.3-7.2 7-7.2s6.6 2.6 7 7.2" /><path d="m12 14 1.4 2.4L12 21l-1.4-4.6Z" /></>,
  rosa: <><circle cx="12" cy="12" r="5" /><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5" /><path d="m12 7 1.5 3.5L17 12l-3.5 1.5L12 17l-1.5-3.5L7 12l3.5-1.5Z" /></>,
  coroa: <><path d="m3.5 8 4.2 4 4.3-6.5 4.3 6.5 4.2-4-1.8 10.5H5.3Z" /><path d="M5.5 21h13" /></>,
  mais: <path d="M12 5v14M5 12h14" />,
  sair: <><path d="M14 4h4.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H14" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  fechar: <path d="m6 6 12 12M18 6 6 18" />,
  seta: <path d="M5 12h14m-5-5 5 5-5 5" />,
  pergaminho: <><path d="M7 4h10.5A2.5 2.5 0 0 1 20 6.5V7h-3" /><path d="M17 7v11.5A2.5 2.5 0 0 1 14.5 21H6a2 2 0 0 1-2-2v-1h10.5" /><path d="M7 4a2.5 2.5 0 0 0-2.5 2.5V18M9 9h5M9 12.5h5" /></>,
  olho: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  copiar: <><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V5.5c0-.8-.7-1.5-1.5-1.5h-9C4.7 4 4 4.7 4 5.5v9c0 .8.7 1.5 1.5 1.5H8" /></>,
  porta: <><path d="M6 21V5.5C6 4.7 6.7 4 7.5 4h9c.8 0 1.5.7 1.5 1.5V21M3.5 21h17" /><circle cx="14.5" cy="12.5" r=".9" /></>,
  lapis: <><path d="m4 20 1-4.5L15.5 5a2 2 0 0 1 3 3L8 18.5Z" /><path d="m13.5 7 3 3" /></>,
};

/** Ícone de linha dourado, desenhado para esta interface; sempre decorativo (o texto ao lado dá o nome). */
export function Icone({ nome, tamanho = 20, className = "" }: { nome: NomeIcone; tamanho?: number; className?: string }) {
  return (
    <svg className={`icone ${className}`.trim()} width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {TRACOS[nome]}
    </svg>
  );
}
