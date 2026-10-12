import { useId, type ReactNode } from "react";

import type { NomeIconeAtributo } from "./nomesDosIcones";

/*
 * Ícones da aba Atributos (redesenhar-aba-atributos, design D3). Silhuetas cheias em `currentColor`,
 * como na referência; os recortes internos usam `--icone-recorte` (a cor do papel por baixo).
 * Tudo decorativo: `aria-hidden` e sem foco.
 */

const decorativo = { "aria-hidden": true, focusable: "false" } as const;
const RECORTE = "var(--icone-recorte, #f3deba)";


const cheio = { fill: "currentColor" } as const;
const recorte = { fill: "none", stroke: RECORTE, strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const traco = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

const DESENHOS: Record<NomeIconeAtributo, ReactNode> = {
  // Punho fechado, de frente: quatro dedos, o polegar cruzado e o pulso.
  forca: (
    <g transform="rotate(-12 16 16)">
      <rect x="6.2" y="5.6" width="5.6" height="8.4" rx="2.8" {...cheio} />
      <rect x="11.4" y="4.4" width="5.6" height="9.6" rx="2.8" {...cheio} />
      <rect x="16.6" y="4.8" width="5.6" height="9.2" rx="2.8" {...cheio} />
      <rect x="21.8" y="6.2" width="5" height="8" rx="2.5" {...cheio} />
      <path d="M6.2 10.6h20.6v7.2c0 4.4-2.8 7.6-7 8.2V30H10.2v-4.2C7.8 24.6 6.2 22 6.2 18.8Z" {...cheio} />
      <path d="M11.6 6.6v6.2M16.8 5.6v7.2M22 6.4v6.4" {...recorte} strokeWidth={1.3} />
      <path d="M4.6 17.4c0-1.8 1.3-3 3-3h10a2.8 2.8 0 0 1 0 5.6h-10c-1.7 0-3-1.1-3-2.6Z" fill="none" stroke={RECORTE} strokeWidth={2.2} />
      <path d="M4.6 17.4c0-1.8 1.3-3 3-3h10a2.8 2.8 0 0 1 0 5.6h-10c-1.7 0-3-1.1-3-2.6Z" {...cheio} />
      <path d="M13.4 30v-3.6" {...recorte} strokeWidth={1.1} />
    </g>
  ),
  // Corredor em pleno passo, em traço grosso.
  destreza: (
    <>
      <circle cx="20.4" cy="5.2" r="3.4" {...cheio} />
      <g {...traco} strokeWidth="3.9">
        <path d="M17.6 10.4 13.6 18.4" />
        <path d="M17.2 11.2 12 12.4l-3.2 3.8" />
        <path d="M17.6 11.6l3.4 3.6 4.4-1" />
        <path d="M13.6 18.4l4.8 3-1.6 6.2" />
        <path d="M13.6 18.4 10.4 23.4l-5.2 1.4" />
      </g>
    </>
  ),
  // Escudo com borda interna e divisão vertical.
  vigor: (
    <>
      <path d="M16 2.6 27.4 6.8v8.4c0 7-4.8 12.2-11.4 14.4C9.4 27.4 4.6 22.2 4.6 15.2V6.8Z" {...cheio} />
      <path d="M16 6 24.2 9v6.2c0 5.2-3.3 9-8.2 10.8-4.9-1.8-8.2-5.6-8.2-10.8V9Z M16 6v20" {...recorte} />
    </>
  ),
  // Máscara de teatro sorridente.
  carisma: (
    <>
      <path d="M4.6 6.4c6.6 3 16.2 3 22.8 0v8.6c0 7.6-5 13-11.4 13S4.6 22.6 4.6 15Z" {...cheio} />
      <g fill={RECORTE}>
        <path d="M8.4 14.2c1.6-2.4 4.2-2.4 5.6 0-1.6 1.4-4 1.4-5.6 0ZM18 14.2c1.4-2.4 4-2.4 5.6 0-1.6 1.4-4 1.4-5.6 0Z" />
        <path d="M9.6 19c2.8 5.8 10 5.8 12.8 0-3.8 2.2-9 2.2-12.8 0Z" />
      </g>
      <path d="M8 11.4c1.6-1.2 4-1.4 6-.4M24 11.4c-1.6-1.2-4-1.4-6-.4" {...recorte} strokeWidth={1.2} />
    </>
  ),
  // Duas pessoas, uma à frente da outra.
  manipulacao: (
    <>
      <circle cx="21.8" cy="9" r="3.8" {...cheio} />
      <path d="M15.4 16.4c1.6-1 3.8-1.6 6.4-1.6 4.4 0 7.6 3 7.6 8.6v1.8H18Z" {...cheio} />
      <g fill="none" stroke={RECORTE} strokeWidth="2.4">
        <circle cx="11" cy="10.6" r="4.4" />
        <path d="M2.6 27.4c0-6.8 3.4-10.2 8.4-10.2s8.4 3.4 8.4 10.2Z" />
      </g>
      <circle cx="11" cy="10.6" r="4.4" {...cheio} />
      <path d="M2.6 27.4c0-6.8 3.4-10.2 8.4-10.2s8.4 3.4 8.4 10.2Z" {...cheio} />
    </>
  ),
  // Estrela de quatro pontas com faces.
  proposito: (
    <>
      <path d="M16 1.8 19.2 12.8 30.2 16 19.2 19.2 16 30.2 12.8 19.2 1.8 16 12.8 12.8Z" {...cheio} />
      <path d="M16 4.8V27.2M4.8 16h22.4" {...recorte} strokeWidth={.9} />
      <path d="m7.4 7.4 3.6 3.6M24.6 7.4 21 11M7.4 24.6l3.6-3.6M24.6 24.6 21 21" {...traco} strokeWidth={1.4} />
    </>
  ),
  // Olho aberto com íris e brilho.
  percepcao: (
    <>
      <path d="M1.8 16C5.6 9.4 10.6 6.4 16 6.4S26.4 9.4 30.2 16C26.4 22.6 21.4 25.6 16 25.6S5.6 22.6 1.8 16Z" {...cheio} />
      <path d="M5.4 16c3-4.4 6.6-6.4 10.6-6.4s7.6 2 10.6 6.4c-3 4.4-6.6 6.4-10.6 6.4S8.4 20.4 5.4 16Z" fill={RECORTE} />
      <circle cx="16" cy="16" r="5.2" {...cheio} />
      <circle cx="16" cy="16" r="2" fill={RECORTE} />
      <circle cx="18.2" cy="13.8" r="1.1" fill={RECORTE} />
    </>
  ),
  // Cérebro visto de cima, com os dois hemisférios.
  inteligencia: (
    <>
      <path d="M16 5c-2.6-1.6-6-1-7.6 1.4-3 .4-4.6 3-3.8 5.6-1.8 1.8-1.8 5.2 0 7-.5 3 1.6 6 4.8 6.2 1.4 2.4 4.4 3 6.6 1.4 2.2 1.6 5.2 1 6.6-1.4 3.2-.2 5.3-3.2 4.8-6.2 1.8-1.8 1.8-5.2 0-7 .8-2.6-.8-5.2-3.8-5.6C22 4 18.6 3.4 16 5Z" {...cheio} />
      <path d="M16 5.6v20.8M10.2 8.8c2 0 2.6 2 1.6 3.6M7.4 14.4c2-1 4.6 0 4.6 2.2M8 20c2-1 4.6 0 4.6 2.2M21.8 8.8c-2 0-2.6 2-1.6 3.6M24.6 14.4c-2-1-4.6 0-4.6 2.2M24 20c-2-1-4.6 0-4.6 2.2" {...recorte} strokeWidth={1.3} />
    </>
  ),
  // Triângulo com o olho no centro.
  raciocinio: (
    <>
      <path d="M16 3.6 29.2 27.4H2.8Z" {...traco} strokeWidth={2.6} />
      <path d="M9.4 19.6c3.4-4.4 9.8-4.4 13.2 0-3.4 4.4-9.8 4.4-13.2 0Z" {...traco} strokeWidth={1.7} />
      <circle cx="16" cy="19.6" r="2.2" {...cheio} />
    </>
  ),
};

export function IconeAtributo({ nome, tamanho = 30 }: { nome: NomeIconeAtributo; tamanho?: number }) {
  return (
    <svg className={`icone-atributo icone-atributo--${nome}`} width={tamanho} height={tamanho} viewBox="0 0 32 32" {...decorativo}>
      {DESENHOS[nome]}
    </svg>
  );
}

/* ---------- Grupos ---------- */

export type NomeGrupo = "fisicos" | "sociais" | "mentais" | "outros";

const DESENHOS_GRUPO: Record<NomeGrupo, ReactNode> = {
  // Braço flexionado: punho no alto, antebraço descendo até o cotovelo e o bíceps saliente até o ombro.
  fisicos: (
    <>
      <path d="M11.5 10.5C10.5 7.5 12 4.5 15.2 4.2c2.8-.2 5.2 1.2 5.4 3.6.2 1.8-1 3-2.6 3.2l-1.6.2c-1 2.6-2 5.2-2.6 7.8 1.8-2.8 4.6-4.4 7.8-4 3.8.4 6.4 3 6.8 6.6l.2 5.8h-19c-3 0-4.6-2.8-3.8-5.6Z" {...cheio} />
      <path d="M14 21c2.8 1.6 6.6 1.8 10 .6M15.6 7.4c1.2-.6 2.6-.4 3.4.6M15 9.6c1.2-.4 2.4-.2 3.2.4" fill="none" stroke="var(--medalhao-miolo, #3b1a12)" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  // Aperto de mãos.
  sociais: (
    <>
      <path d="M1.8 12.2 6 9.6l3.4 7.2-4.2 2.4ZM30.2 12.2 26 9.6l-3.4 7.2 4.2 2.4Z" {...cheio} />
      <g {...traco} strokeWidth={1.8}>
        <path d="M8.4 10.8c2.4-1.6 5-2 7.4-1l4.8 2.2c1.3.6.9 2.4-.5 2.3l-4.2-.6" />
        <path d="M23.8 10.8c-2.4-1.3-5.1-1.3-7.5.2l-4 2.8" />
        <path d="M10 16.6l5 4.6c.8.8 2.1.1 1.8-1M12.6 15.2l5 4.6c.8.7 2.1-.1 1.7-1.1M15.8 14.4l4 3.6c.9.7 2.1 0 1.7-1l-.9-1.4M22.8 16.8l-1.8-2.2" />
      </g>
    </>
  ),
  // Livro aberto.
  mentais: (
    <>
      <path d="M16 9.2c-3.2-2.4-7.8-3-12.6-2.2v17c4.8-.8 9.4 0 12.6 2.2 3.2-2.2 7.8-3 12.6-2.2V7c-4.8-.8-9.4-.2-12.6 2.2Z" {...cheio} />
      <path d="M16 9.6v16M6.4 11c2.4-.2 4.8.2 6.8 1.2M6.4 14.6c2.4-.2 4.8.2 6.8 1.2M6.4 18.2c2.4-.2 4.8.2 6.8 1.2M25.6 11c-2.4-.2-4.8.2-6.8 1.2M25.6 14.6c-2.4-.2-4.8.2-6.8 1.2M25.6 18.2c-2.4-.2-4.8.2-6.8 1.2" fill="none" stroke="var(--medalhao-miolo, #10213a)" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  // Pergaminho enrolado (atributos fora da lista oficial).
  outros: (
    <>
      <path d="M8 5h15.5a3.5 3.5 0 0 1 0 7H22v12.5a3.5 3.5 0 0 1-3.5 3.5H6.5a3.5 3.5 0 0 1 0-7H8Z" {...cheio} />
      <path d="M11.5 11h7M11.5 15h7M11.5 19h5" fill="none" stroke="var(--medalhao-miolo, #1b2734)" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
};

export function IconeGrupo({ nome, tamanho = 30 }: { nome: NomeGrupo; tamanho?: number }) {
  return (
    <svg className={`icone-grupo icone-grupo--${nome}`} width={tamanho} height={tamanho} viewBox="0 0 32 32" {...decorativo}>
      {DESENHOS_GRUPO[nome]}
    </svg>
  );
}

/** Medalhão do grupo: aro dourado de oito pontas (como o do Resumo) com miolo na cor do grupo. */
export function MedalhaoGrupo({ nome }: { nome: NomeGrupo }) {
  const ouro = `medalhao-grupo-${useId().replace(/:/g, "")}`;
  return (
    <svg className={`atributos-medalhao atributos-medalhao--${nome}`} viewBox="0 0 64 64" {...decorativo}>
      <defs>
        <linearGradient id={ouro} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e6bf" />
          <stop offset=".35" stopColor="#ddb872" />
          <stop offset=".65" stopColor="#7a5a26" />
          <stop offset="1" stopColor="#efd59c" />
        </linearGradient>
      </defs>
      <g fill={`url(#${ouro})`} stroke="#3b2b13" strokeWidth=".6">
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d="M32 .8 35.4 7h-6.8Z" transform={`rotate(${i * 45} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="26" fill={`url(#${ouro})`} stroke="#3b2b13" strokeWidth="1" />
      <circle cx="32" cy="32" r="21.6" className="atributos-medalhao__miolo" />
      <circle cx="32" cy="32" r="21.6" fill="none" stroke="#0008" strokeWidth="1.4" />
      <circle cx="32" cy="32" r="19.4" fill="none" stroke="#efd59c" strokeWidth=".6" opacity=".55" />
      <ellipse cx="25" cy="21" rx="9" ry="4.4" fill="#fff" opacity=".16" transform="rotate(-24 25 21)" />
    </svg>
  );
}

/** Pena de escrever do botão "Editar valores". */
export function IconePena({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <svg className="icone-pena" width={tamanho} height={tamanho} viewBox="0 0 24 24" {...decorativo}>
      <path d="M3.2 20.8 4.5 15.9 15.9 4.5a2.3 2.3 0 0 1 3.2 0l.4.4a2.3 2.3 0 0 1 0 3.2L8.1 19.5Z" fill="currentColor" />
      <path d="M14.2 6.2l3.6 3.6" fill="none" stroke="var(--icone-recorte, #f9eed6)" strokeWidth="1.3" />
    </svg>
  );
}

/** Estrela de quatro pontas dos ornamentos das vinhetas. */
export function Estrelinha({ x, y, r }: { x: number; y: number; r: number }) {
  return <path d={`M${x} ${y - r}L${x + r * .28} ${y - r * .28}L${x + r} ${y}L${x + r * .28} ${y + r * .28}L${x} ${y + r}L${x - r * .28} ${y + r * .28}L${x - r} ${y}L${x - r * .28} ${y - r * .28}Z`} fill="currentColor" />;
}
