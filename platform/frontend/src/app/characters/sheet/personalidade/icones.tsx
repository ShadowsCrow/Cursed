import type { CSSProperties, ReactNode } from "react";

import { caminhoDaMascara, LADO_DA_MASCARA, useMascarasDosIcones } from "./mascarasDosIcones";
import type { NomeIconePersonalidade } from "./nomesDosIcones";

/*
 * Ícones e emblemas da aba Personalidade (reformular-personalidade-da-ficha, D7). Silhuetas preenchidas, como
 * as gravuras da referência, em SVG com `currentColor`, sempre decorativas (`aria-hidden`) e sem foco. São o
 * desenho provisório e o fallback permanente da folha de ícones gerada pelo usuário.
 *
 * Os nomes são os de `ICONES_PERSONALIDADE` em `cursed_platform/catalogos.py`; o teste confere as duas listas.
 */

const decorativo = { "aria-hidden": true, focusable: "false" } as const;
const linha = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Pontas de uma estrela de `n` raios (raio externo e interno), em torno de (cx, cy). */
function estrela(cx: number, cy: number, n: number, externo: number, interno: number, giro = -90): string {
  const pontos: string[] = [];
  for (let i = 0; i < n * 2; i += 1) {
    const r = i % 2 === 0 ? externo : interno;
    const a = ((giro + (i * 180) / n) * Math.PI) / 180;
    pontos.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pontos.join("L")}Z`;
}

/** Marcas em volta de um anel (os "dentes" dos medalhões). */
function marcas(cx: number, cy: number, n: number, de: number, ate: number): string {
  let d = "";
  for (let i = 0; i < n; i += 1) {
    const a = (i * 2 * Math.PI) / n;
    d += `M${(cx + de * Math.cos(a)).toFixed(2)} ${(cy + de * Math.sin(a)).toFixed(2)}L${(cx + ate * Math.cos(a)).toFixed(2)} ${(cy + ate * Math.sin(a)).toFixed(2)}`;
  }
  return d;
}

/**
 * Um ramo de louro, como na referência: haste fina num arco mais alto que largo (subindo do pé ao alto, pelo lado
 * de fora), com pares de folhas grandes e juntas, uma para fora e outra para dentro, e uma folha na ponta.
 * `lado` 1 é o ramo da esquerda; -1, o da direita (espelhado).
 */
function ramoDeLouro(lado: 1 | -1): ReactNode {
  // Curva do pé (perto do centro) ao alto, passando por fora: quase vertical em cima, aberta em U.
  const pe = { x: 11, y: 19.6 };
  const controle = { x: 1.6, y: 15.4 };
  const alto = { x: 6.4, y: 1.8 };
  const ponto = (t: number) => {
    const u = 1 - t;
    const x = u * u * pe.x + 2 * u * t * controle.x + t * t * alto.x;
    const y = u * u * pe.y + 2 * u * t * controle.y + t * t * alto.y;
    const dx = 2 * u * (controle.x - pe.x) + 2 * t * (alto.x - controle.x);
    const dy = 2 * u * (controle.y - pe.y) + 2 * t * (alto.y - controle.y);
    const n = Math.hypot(dx, dy);
    // Subindo pelo ramo, "fora" é a esquerda da tangente; o ramo da direita é o espelho em x.
    return {
      x: lado === 1 ? x : 24 - x, y,
      tangente: { x: (lado * dx) / n, y: dy / n }, fora: { x: (lado * dy) / n, y: -dx / n },
    };
  };
  const f = (v: number) => v.toFixed(2);
  // Uma folha: elipse pontuda nas duas pontas, da base na direção dada, com o comprimento e a meia largura.
  const folha = (bx: number, by: number, dx: number, dy: number, comprimento: number, meia: number) => {
    const tx = bx + dx * comprimento;
    const ty = by + dy * comprimento;
    const nx = -dy * meia * 1.33;
    const ny = dx * meia * 1.33;
    const a = { x: bx + dx * comprimento * 0.22, y: by + dy * comprimento * 0.22 };
    const b = { x: bx + dx * comprimento * 0.72, y: by + dy * comprimento * 0.72 };
    return `M${f(bx)} ${f(by)}C${f(a.x + nx)} ${f(a.y + ny)} ${f(b.x + nx)} ${f(b.y + ny)} ${f(tx)} ${f(ty)}`
      + `C${f(b.x - nx)} ${f(b.y - ny)} ${f(a.x - nx)} ${f(a.y - ny)} ${f(bx)} ${f(by)}Z`;
  };
  const pares = 7;
  let folhas = "";
  for (let i = 0; i < pares; i += 1) {
    const { x, y, tangente, fora } = ponto(0.1 + (i * 0.8) / (pares - 1));
    const comprimento = 5 - i * 0.18;
    for (const [sentido, abertura, escala] of [[1, 0.52, 1], [-1, 0.46, 0.86]] as const) {
      const dx = tangente.x * Math.cos(abertura) + sentido * fora.x * Math.sin(abertura);
      const dy = tangente.y * Math.cos(abertura) + sentido * fora.y * Math.sin(abertura);
      const n = Math.hypot(dx, dy);
      folhas += folha(x, y, dx / n, dy / n, comprimento * escala, 0.8);
    }
  }
  const topo = ponto(0.96);
  folhas += folha(topo.x, topo.y, topo.tangente.x, topo.tangente.y, 3.8, 0.9);
  let haste = "";
  for (let t = 0; t <= 0.961; t += 0.06) {
    const q = ponto(t);
    haste += `${haste ? "L" : "M"}${f(q.x)} ${f(q.y)}`;
  }
  return (
    <>
      <path d={haste} {...linha} strokeWidth={0.7} />
      <path d={folhas} fill="currentColor" />
    </>
  );
}

const DESENHOS: Record<NomeIconePersonalidade, ReactNode> = {
  rosa_dos_ventos: (
    <>
      <circle cx="12" cy="12" r="9.2" {...linha} strokeWidth={1.3} />
      <circle cx="12" cy="12" r="7.4" {...linha} strokeWidth={0.8} />
      <path d={marcas(12, 12, 32, 9.2, 10.4)} {...linha} strokeWidth={0.5} />
      <path d={estrela(12, 12, 4, 11.8, 2.2)} fill="currentColor" />
      <path d={estrela(12, 12, 4, 7.6, 1.6, -45)} fill="currentColor" opacity={0.8} />
      <circle cx="12" cy="12" r="1.2" fill="var(--pergaminho-50, #f7ead0)" />
    </>
  ),
  lua_solar: (
    <>
      <path d={estrela(12, 12, 16, 11.8, 9.6)} fill="currentColor" opacity={0.85} />
      <circle cx="12" cy="12" r="8.6" fill="var(--pergaminho-50, #f7ead0)" />
      <circle cx="12" cy="12" r="8.6" {...linha} strokeWidth={1.3} />
      <circle cx="12" cy="12" r="6.9" {...linha} strokeWidth={0.8} />
      <path d="M13.6 5.8a6.4 6.4 0 1 0 0 12.4 5.2 5.2 0 0 1 0-12.4Z" fill="currentColor" />
      <path d={estrela(15.4, 10.2, 4, 1.5, 0.45)} fill="currentColor" />
    </>
  ),
  livro_fechado: (
    <>
      <path d="M1.8 5.2c3.7-1.3 7.2-1 10.2 1.1v14.6c-3-2-6.5-2.3-10.2-1.1Z" fill="currentColor" />
      <path d="M22.2 5.2c-3.7-1.3-7.2-1-10.2 1.1v14.6c3-2 6.5-2.3 10.2-1.1Z" fill="currentColor" />
      <path d="M3.6 8.2c2.3-.6 4.6-.4 6.6.7M3.6 11c2.3-.6 4.6-.4 6.6.7M20.4 8.2c-2.3-.6-4.6-.4-6.6.7M20.4 11c-2.3-.6-4.6-.4-6.6.7"
        {...linha} stroke="var(--pergaminho-50, #f7ead0)" strokeWidth={0.7} opacity={0.7} />
      <path d="M1 20.6c3.9-1.2 7.6-.9 11 1 3.4-1.9 7.1-2.2 11-1v1.2c-3.7-1-7.3-.7-11 1.2-3.7-1.9-7.3-2.2-11-1.2Z" fill="currentColor" />
    </>
  ),
  balanca: (
    <>
      <circle cx="12" cy="2.6" r="1.3" fill="currentColor" />
      <path d="M11.3 3.6h1.4v15.2h-1.4Z" fill="currentColor" />
      <path d="M3.4 6.2Q12 4.4 20.6 6.2v1.2Q12 5.7 3.4 7.4Z" fill="currentColor" />
      <path d="M4.6 7 2 13.4M4.6 7l2.6 6.4M19.4 7l-2.6 6.4M19.4 7 22 13.4" {...linha} strokeWidth={0.8} />
      <path d="M1.2 13.2h6.8a3.4 3.4 0 0 1-6.8 0ZM16 13.2h6.8a3.4 3.4 0 0 1-6.8 0Z" fill="currentColor" />
      <path d="M8 19.2c1.6-1.4 6.4-1.4 8 0v2.2H8Z" fill="currentColor" />
    </>
  ),
  livro_aberto: (
    <>
      <path d="M2.4 5.4c3.4-.9 6.6-.5 9 1.3V19.6c-2.5-1.6-5.6-2-9-1.1Z" fill="currentColor" />
      <path d="M21.6 5.4c-3.4-.9-6.6-.5-9 1.3V19.6c2.5-1.6 5.6-2 9-1.1Z" fill="currentColor" />
      <path d="M1.4 19.5c3.8-1 7.4-.6 10.6 1.2 3.2-1.8 6.8-2.2 10.6-1.2v1.1c-3.5-.8-7-.4-10.6 1.3-3.6-1.7-7.1-2.1-10.6-1.3Z" fill="currentColor" />
    </>
  ),
  olho: (
    <>
      <path d="M12 5.2C6.6 5.2 2.8 9.4 1.2 12c1.6 2.6 5.4 6.8 10.8 6.8S21.2 14.6 22.8 12C21.2 9.4 17.4 5.2 12 5.2Zm0 2.1c-3.8 0-6.8 2.7-8.3 4.7 1.5 2 4.5 4.7 8.3 4.7s6.8-2.7 8.3-4.7c-1.5-2-4.5-4.7-8.3-4.7Z"
        fill="currentColor" fillRule="evenodd" />
      <circle cx="12" cy="12" r="3.9" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="var(--pergaminho-50, #f7ead0)" />
      <circle cx="10.6" cy="10.6" r=".7" fill="var(--pergaminho-50, #f7ead0)" />
    </>
  ),
  louros: (
    <>
      {ramoDeLouro(1)}
      {ramoDeLouro(-1)}
      <path d="M10.2 19.2 14.4 22.4M13.8 19.2 9.6 22.4" {...linha} strokeWidth={0.9} />
    </>
  ),
  aranha: (
    <>
      <path d="M12 9.2c2.8 0 4.4 2.9 4.4 6.2 0 3.5-2 6.3-4.4 7.1-2.4-.8-4.4-3.6-4.4-7.1 0-3.3 1.6-6.2 4.4-6.2Z" fill="currentColor" />
      <ellipse cx="12" cy="7.6" rx="2.3" ry="2.3" fill="currentColor" />
      <path d="M11.1 5.6 10.5 4.4M12.9 5.6l.6-1.2" {...linha} strokeWidth={1.2} />
      <g {...linha}>
        <path d="M10.4 6.9Q8.8 5.9 8.6 3.6Q8.5 2.4 9.2 1.6" strokeWidth={1.25} />
        <path d="M13.6 6.9Q15.2 5.9 15.4 3.6Q15.5 2.4 14.8 1.6" strokeWidth={1.25} />
        <path d="M10 8.6Q7.4 7.5 5.6 5.4Q4.4 6.8 4.1 9.4" strokeWidth={1.25} />
        <path d="M14 8.6Q16.6 7.5 18.4 5.4Q19.6 6.8 19.9 9.4" strokeWidth={1.25} />
        <path d="M9.2 11.6Q6.3 11.5 4.8 13.8Q3.9 15.4 3.9 18.2" strokeWidth={1.25} />
        <path d="M14.8 11.6Q17.7 11.5 19.2 13.8Q20.1 15.4 20.1 18.2" strokeWidth={1.25} />
        <path d="M8.6 14.2Q6.6 16.4 6.5 19.2Q6.5 21.2 7.2 22.6" strokeWidth={1.2} />
        <path d="M15.4 14.2Q17.4 16.4 17.5 19.2Q17.5 21.2 16.8 22.6" strokeWidth={1.2} />
      </g>
    </>
  ),
  caveira: (
    <path fillRule="evenodd" fill="currentColor"
      d="M12 1.8c-5 0-8.4 3.5-8.4 8.2 0 2.6 1.1 4.4 2.6 5.5v3.1c0 .9.7 1.6 1.6 1.6h.9v1.9h1.8v-1.9h.9v1.9h1.2v-1.9h.9v1.9h1.8v-1.9h.9c.9 0 1.6-.7 1.6-1.6v-3.1c1.5-1.1 2.6-2.9 2.6-5.5 0-4.7-3.4-8.2-8.4-8.2ZM8.4 8.6a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Zm7.2 0a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6ZM12 13.2l-1.3 2.6h2.6Z" />
  ),
  espadas: (
    <>
      <path d="M21.6 1.6 18.8 2 7.2 13.6l1.4 1.4L20.2 3.4Z" fill="currentColor" />
      <path d="M2.4 1.6 5.2 2l11.6 11.6-1.4 1.4L3.8 3.4Z" fill="currentColor" />
      <path d="M5.2 12.4 9.8 17M6 17.2 3 20.2M18.8 12.4 14.2 17M18 17.2l3 3" {...linha} strokeWidth={1.8} />
      <circle cx="2.4" cy="21" r="1.3" fill="currentColor" />
      <circle cx="21.6" cy="21" r="1.3" fill="currentColor" />
    </>
  ),
  mao: (
    <path fill="currentColor"
      d="M9.6 22.4c-3 0-5.2-2.2-5.8-5.1L2.5 11.6c-.3-1.1.9-1.8 1.8-1l1.9 2.2V5.3a1.3 1.3 0 0 1 2.6 0v6h.7V3.1a1.3 1.3 0 0 1 2.6 0v8.2h.7V4.1a1.3 1.3 0 0 1 2.6 0v7.4h.7V6.3a1.3 1.3 0 0 1 2.6 0v9.3c0 3.8-2.6 6.8-6.5 6.8Z" />
  ),
  ampulheta: (
    <>
      <path d="M4.6 1.6h14.8v2.2H4.6ZM4.6 20.2h14.8v2.2H4.6Z" fill="currentColor" />
      <path d="M6.4 3.8c0 5 4.2 6 4.2 8.2s-4.2 3.2-4.2 8.2M17.6 3.8c0 5-4.2 6-4.2 8.2s4.2 3.2 4.2 8.2" {...linha} strokeWidth={1.4} />
      <path d="M8.6 7.4h6.8c-.8 1.6-2.4 2.6-3.4 3.6-1-1-2.6-2-3.4-3.6ZM7.8 20.2c.4-2.6 2.6-3.4 4.2-4.8 1.6 1.4 3.8 2.2 4.2 4.8Z" fill="currentColor" />
      <path d="M12 11.4v4" {...linha} strokeWidth={0.8} />
    </>
  ),
  estrela: (
    <>
      <path d={estrela(12, 12, 4, 11.4, 2.6)} fill="currentColor" />
      <path d={estrela(12, 12, 4, 7.8, 2, -45)} fill="currentColor" />
      <path d="M12 .8v22.4M.8 12h22.4" {...linha} stroke="var(--pergaminho-50, #f7ead0)" strokeWidth={0.6} opacity={0.75} />
    </>
  ),
  lua_estrela: (
    <>
      <path d="M13.2 2.4a9.8 9.8 0 1 0 8.6 14.4 8 8 0 0 1-8.6-14.4Z" fill="currentColor" />
      <path d={estrela(16.6, 10.2, 5, 3.4, 1.35)} fill="currentColor" />
    </>
  ),
};

/**
 * Ícone de linha ou emblema de quadro da aba Personalidade. Com as máscaras recortadas da referência carregadas,
 * mostra a máscara no tamanho em que o ícone aparece lá (margem negativa: o espaço no layout continua `tamanho`);
 * enquanto carregam, ou se falharem, o desenho em SVG.
 */
export function IconePersonalidade({ nome, tamanho = 36, className = "" }: {
  nome: NomeIconePersonalidade; tamanho?: number; className?: string;
}) {
  const mascaras = useMascarasDosIcones();
  if (mascaras === "prontas") {
    const lado = LADO_DA_MASCARA[nome];
    const estilo = {
      width: lado, height: lado, margin: (tamanho - lado) / 2, "--icone": `url("${caminhoDaMascara(nome)}")`,
    } as CSSProperties;
    return <span className={`personalidade-icone personalidade-icone--${nome} personalidade-icone--mascara ${className}`.trim()}
      style={estilo} aria-hidden="true" />;
  }
  return (
    <svg className={`personalidade-icone personalidade-icone--${nome} ${className}`.trim()} width={tamanho} height={tamanho}
      viewBox="0 0 24 24" {...decorativo}>
      {DESENHOS[nome]}
    </svg>
  );
}
