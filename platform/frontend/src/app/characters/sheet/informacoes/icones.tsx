/*
 * Ícones e emblemas da aba Informações básicas (redesenhar-informacoes-basicas, D2 e D3). Desenho em SVG com
 * `currentColor`, sempre decorativo (`aria-hidden`) e sem foco; a cor vem dos tokens do pergaminho.
 */

const decorativo = { "aria-hidden": true, focusable: "false" } as const;

export type NomeIconeInformacao =
  | "nome" | "arquetipo" | "nivel" | "altura" | "tamanho-base"
  | "classe" | "raca" | "idade" | "sexo-masculino" | "sexo-feminino" | "sexo-outro" | "tamanho-atual";

/** Cada ícone: traços (contorno) e preenchimentos, numa caixa de 24 × 24. */
const ICONES: Record<NomeIconeInformacao, { tracos?: string[]; cheios?: string[] }> = {
  nome: { cheios: ["M12 2.8a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8Z", "M3.8 21.5c.2-5 3.8-8.4 8.2-8.4s8 3.4 8.2 8.4Z"] },
  arquetipo: {
    tracos: ["M12 2.6a9.4 9.4 0 1 1 0 18.8 9.4 9.4 0 0 1 0-18.8Z"],
    cheios: ["M12 4.6 13.4 10.6 19.4 12 13.4 13.4 12 19.4 10.6 13.4 4.6 12 10.6 10.6Z",
      "m7.2 7.2 4.1 3.2-.9.9Zm9.6 0-3.2 4.1-.9-.9Zm0 9.6-4.1-3.2.9-.9Zm-9.6 0 3.2-4.1.9.9Z"],
  },
  nivel: {
    tracos: ["M12 2.6a9.4 9.4 0 1 1 0 18.8 9.4 9.4 0 0 1 0-18.8Z", "M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z"],
    cheios: ["m8 12.2 4-3.4 4 3.4v2.2l-4-3.4-4 3.4Z", "m8 15.6 4-3.4 4 3.4v2l-4-3.4-4 3.4Z"],
  },
  altura: { tracos: ["M12 3v18", "M8 3h8M8 21h8", "M12 6.5h3.2M12 10h4.2M12 13.5h3.2M12 17h4.2"] },
  "tamanho-base": {
    cheios: [
      "M12 4.2a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4ZM7.8 20.5v-5.2c0-2.4 1.8-4.4 4.2-4.4s4.2 2 4.2 4.4v5.2Z",
      "M5.4 7.2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4ZM2 20.5v-4c0-2 1.4-3.6 3.4-3.6.8 0 1.4.2 2 .6-.6.9-.9 2-.9 3.1v3.9Z",
      "M18.6 7.2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4ZM22 20.5v-4c0-2-1.4-3.6-3.4-3.6-.8 0-1.4.2-2 .6.6.9.9 2 .9 3.1v3.9Z",
    ],
  },
  classe: {
    tracos: ["M4.5 3.5 17 16", "M19.5 3.5 7 16", "M14.8 18.2l3.4-3.4M9.2 18.2l-3.4-3.4", "m17.4 17.4 3 3M6.6 17.4l-3 3"],
    cheios: ["M3.2 2.2h2.4l.6 2.4-1.6 1-1.4-1.4ZM20.8 2.2h-2.4l-.6 2.4 1.6 1 1.4-1.4Z"],
  },
  raca: {
    tracos: ["M5 20.5 16 9.5"],
    cheios: ["M20.5 3c-6.7.3-12 3.8-13.3 10.9L6 19l4.3-1.6c6.2-2 9.4-7.4 10.2-14.4Zm-3.3 4.2-7.8 7.7"],
  },
  idade: {
    tracos: ["M6.5 3h11M6.5 21h11", "M8 3c0 5 7.6 5.6 7.6 9S8 16 8 21M16 3c0 5-7.6 5.6-7.6 9S16 16 16 21"],
    cheios: ["M9.6 6.6h4.8L12 9.6Z", "M12 16.6 15 20H9Z"],
  },
  "sexo-masculino": { tracos: ["M10 9.4a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2Z", "M14 11 20 5", "M15.2 4.4H20.6V9.8"] },
  "sexo-feminino": { tracos: ["M12 3a5.6 5.6 0 1 1 0 11.2A5.6 5.6 0 0 1 12 3Z", "M12 14.2V21.5", "M8.8 18.2h6.4"] },
  "sexo-outro": { tracos: ["M12 5.4a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2Z", "M12 16.6V22", "M12 5.4V2"] },
  "tamanho-atual": {
    tracos: ["M4 4l6 6M4 4h5M4 4v5", "M20 4l-6 6M20 4h-5M20 4v5", "M4 20l6-6M4 20h5M4 20v-5", "M20 20l-6-6M20 20h-5M20 20v-5"],
  },
};

export function IconeInformacao({ nome, tamanho = 28 }: { nome: NomeIconeInformacao; tamanho?: number }) {
  const { tracos = [], cheios = [] } = ICONES[nome];
  return (
    <svg className={`info-icone info-icone--${nome}`} width={tamanho} height={tamanho} viewBox="0 0 24 24" {...decorativo}>
      {cheios.map((d) => <path key={d} d={d} fill="currentColor" />)}
      {tracos.map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** Emblema do título de um quadro: busto num medalhão (pessoais) ou escudo com gema (origem). */
export function EmblemaQuadro({ tipo }: { tipo: "pessoal" | "origem" }) {
  return (
    <svg className={`info-emblema info-emblema--${tipo}`} viewBox="0 0 56 56" {...decorativo}>
      {tipo === "pessoal" ? (
        <>
          <path d="M28 2.5c6 5.5 13 7.5 21 7.5-1 20-8 34-21 43.5C15 44 8 30 7 10c8 0 15-2 21-7.5Z" fill="var(--info-emblema-fundo)" stroke="currentColor" strokeWidth="2" />
          <path d="M28 7.2c5 4.3 11 6.2 17.2 6.6-1.2 16.5-7 28.2-17.2 36.3-10.2-8.1-16-19.8-17.2-36.3C17 13.4 23 11.5 28 7.2Z" fill="none" stroke="currentColor" strokeWidth="1" opacity=".75" />
          <circle cx="28" cy="22.5" r="6.2" fill="currentColor" />
          <path d="M16.5 40.5c.8-7.4 5.4-11.4 11.5-11.4s10.7 4 11.5 11.4c-3.4 3-7.2 5.2-11.5 6.8-4.3-1.6-8.1-3.8-11.5-6.8Z" fill="currentColor" />
          <path d="m28 29.3 1.6 3-1.6 7-1.6-7Z" fill="var(--info-emblema-fundo)" />
        </>
      ) : (
        <>
          <path d="M9 14c3-4 3-8 1-11 5 1 8 4 9 8M47 14c-3-4-3-8-1-11-5 1-8 4-9 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M28 5 45.5 11v14c0 12.5-7.6 21.6-17.5 26C18.1 46.6 10.5 37.5 10.5 25V11Z" fill="var(--info-emblema-fundo)" stroke="currentColor" strokeWidth="2" />
          <path d="M28 9.4 41.6 14v11c0 10.2-6 17.8-13.6 21.6C20.4 42.8 14.4 35.2 14.4 25V14Z" fill="none" stroke="currentColor" strokeWidth="1" opacity=".75" />
          <path d="M28 17.5 35 24.5 28 35.5 21 24.5Z" fill="currentColor" />
          <path d="M28 17.5v18M21 24.5h14M24.5 21l3.5 14.5L31.5 21" fill="none" stroke="var(--info-emblema-fundo)" strokeWidth=".9" opacity=".7" />
          <path d="m28 1.5 1.8 3.2L28 7.9l-1.8-3.2Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/** Pena ao lado do título da folha. */
export function Pena() {
  return (
    <svg className="info-pena" viewBox="0 0 48 48" {...decorativo}>
      <path d="M44 3C30 5 18 14 13.5 29.5L12 36l5.5-2.4C33 26.6 41 16 44 3Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M44 3 12 36M4 45l8-9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M36.5 10.5c-3 .2-6 .2-9.5-.6M31.5 15.5c-3.4.3-6.6.2-9.6-.8M26.5 21c-3 .2-5.6 0-8-.8M21.5 26.5c-2 .2-4 0-5.6-.6M38.5 14c-.4 3-1.2 5.8-2.6 8.2M33.5 19.5c-.3 2.6-1 5-2.2 7.2M28.5 24.8c-.3 2-.9 3.8-1.8 5.4" fill="none" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

/** Livro aberto do título da faixa do conceito. */
export function LivroAberto() {
  return (
    <svg className="info-livro" viewBox="0 0 48 40" {...decorativo}>
      <path d="M24 9c-5-4-12-5-20-4v28c8-1 15 0 20 4 5-4 12-5 20-4V5c-8-1-15 0-20 4Z" fill="var(--info-emblema-fundo)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 9v28" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11c4.6-.4 8.6.2 12 2M8 16c4.6-.4 8.6.2 12 2M8 21c4.6-.4 8.6.2 12 2M8 26c4.6-.4 8.6.2 12 2M40 11c-4.6-.4-8.6.2-12 2M40 16c-4.6-.4-8.6.2-12 2M40 21c-4.6-.4-8.6.2-12 2M40 26c-4.6-.4-8.6.2-12 2" fill="none" stroke="currentColor" strokeWidth="1" opacity=".7" />
      <path d="M2 36c8-1.4 16-.4 22 3 6-3.4 14-4.4 22-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

