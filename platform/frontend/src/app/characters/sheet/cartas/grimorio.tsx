import type { ReactElement } from "react";

/*
 * Ornamentos do detalhe em grimório (redesenhar-aba-cartas, D8 revisto): a estrela de quatro pontas das
 * junções, os fechos de latão da capa e os ícones dos quadros de dados. Tudo decorativo e em SVG.
 */

/** Estrela dourada de quatro pontas com brilho, das junções das molduras. */
export function EstrelaDoGrimorio() {
  return (
    <svg className="grimorio-estrela" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 0 13.7 10.3 24 12 13.7 13.7 12 24 10.3 13.7 0 12 10.3 10.3Z" fill="currentColor" />
      <path d="M12 5.5 12.8 11.2 18.5 12 12.8 12.8 12 18.5 11.2 12.8 5.5 12 11.2 11.2Z" fill="#fff3cf" opacity=".55" />
    </svg>
  );
}

/** Fecho de latão preso à capa, na borda do livro. */
export function FechoDoLivro({ lado }: { lado: "esquerda" | "direita" }) {
  return (
    <svg className={`grimorio-fecho grimorio-fecho--${lado}`} viewBox="0 0 28 44" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="grimorio-latao" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3d488" /><stop offset=".5" stopColor="#b8862f" /><stop offset="1" stopColor="#5e3d10" />
        </linearGradient>
      </defs>
      <rect x="3" y="2" width="16" height="40" rx="3" fill="url(#grimorio-latao)" stroke="#3b2608" strokeWidth="1" />
      <rect x="15" y="12" width="11" height="20" rx="2.5" fill="url(#grimorio-latao)" stroke="#3b2608" strokeWidth="1" />
      <circle cx="11" cy="8" r="1.8" fill="#3b2608" /><circle cx="11" cy="36" r="1.8" fill="#3b2608" />
      <path d="M7 16v12M20 17v10" stroke="#fff1c4" strokeOpacity=".5" strokeWidth="1" />
    </svg>
  );
}

export type NomeIconeDado =
  | "marcacoes" | "origem" | "versao" | "recebida" | "potencia" | "custo" | "escola" | "grau"
  | "aprendizado" | "descansos" | "adicional" | "requisitos" | "legado"
  // Campos do Framework de Criação (adaptar-cartas-ao-framework); traços do Lucide (licença ISC).
  | "tipo" | "lancamento" | "combo" | "persistencia" | "alcance" | "forma" | "alvo" | "impactos" | "duracao"
  | "efeito" | "teste" | "componentes" | "limitacoes" | "escalonamento";

const TRACOS: Record<NomeIconeDado, string[]> = {
  // Raio, como no conceito.
  marcacoes: ["M13.5 2.5 5.5 13.5h6l-1.5 8 8.5-11.5h-6l1-7.5Z"],
  // Camadas empilhadas.
  origem: ["M12 3.5 21 8l-9 4.5L3 8Z", "M3 12.2l9 4.5 9-4.5", "M3 16.2l9 4.5 9-4.5"],
  // Etiqueta.
  versao: ["M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8a1 1 0 0 1 0 1.4l-7.6 7.6a1 1 0 0 1-1.4 0Z", "M8 8h.01"],
  // Calendário.
  recebida: ["M4 6.5h16v13.5H4Z", "M4 10.5h16", "M8 4v4M16 4v4", "M8 14h2M12 14h2M16 14h.5M8 17h2M12 17h2"],
  // Sol de raios, a potência.
  potencia: ["M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8", "M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"],
  // Pilha de moedas.
  custo: ["M5 7c0-1.4 3.1-2.5 7-2.5s7 1.1 7 2.5-3.1 2.5-7 2.5S5 8.4 5 7Z", "M5 7v4.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V7", "M5 11.5V16c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4.5"],
  // Livro aberto.
  escola: ["M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1Z", "M12 6.5v13"],
  // Estrela de cinco pontas.
  grau: ["M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8L8 13.5l-4.3-4 5.8-.7Z"],
  // Ampulheta.
  aprendizado: ["M6.5 3.5h11M6.5 20.5h11", "M7.5 3.5c0 5 9 5 9 8.5s-9 3.5-9 8.5M16.5 3.5c0 5-9 5-9 8.5s9 3.5 9 8.5"],
  // Lua crescente.
  descansos: ["M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10Z"],
  // Gota.
  adicional: ["M12 3.5c3.5 4.5 6 7.8 6 10.8a6 6 0 0 1-12 0c0-3 2.5-6.3 6-10.8Z"],
  // Cadeado.
  requisitos: ["M6 10.5h12v10H6Z", "M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5", "M12 14.5v2.5"],
  // Pergaminho.
  legado: ["M7 4h11v13.5a2.5 2.5 0 0 1-2.5 2.5H6", "M7 4a2 2 0 0 0-2 2v1.5h2", "M6 20a2.5 2.5 0 0 1-2.5-2.5V16H14v1.5a2.5 2.5 0 0 0 2.5 2.5", "M10 8h5M10 11h5"],
  // Raio (zap).
  tipo: ["M13 2 3 14h9l-1 8 10-12h-9l1-8Z"],
  // Cronômetro (timer).
  lancamento: ["M10 2h4", "M12 14l3-3", "M12 6a8 8 0 1 1 0 16 8 8 0 0 1 0-16"],
  // Elos (link).
  combo: ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"],
  // Repetição (repeat).
  persistencia: ["m17 2 4 4-4 4", "M3 11v-1a4 4 0 0 1 4-4h14", "m7 22-4-4 4-4", "M21 13v1a4 4 0 0 1-4 4H3"],
  // Mira (crosshair).
  alcance: ["M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20", "M22 12h-4M6 12H2M12 6V2M12 22v-4"],
  // Formas (shapes).
  forma: ["M8.3 10a.7.7 0 0 1-.63-1.08L11.4 3a.7.7 0 0 1 1.2-.04L16.3 8.9a.7.7 0 0 1-.57 1.1Z", "M4 14h6v7H4Z", "M17.5 14a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7"],
  // Alvo (target).
  alvo: ["M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20", "M12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12", "M12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4"],
  // Cerquilha (hash).
  impactos: ["M4 9h16M4 15h16", "M10 3 8 21M16 3l-2 18"],
  // Relógio (clock).
  duracao: ["M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18", "M12 7v5l3 2"],
  // Brilho (sparkle).
  efeito: ["M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0Z"],
  // Dado (dice-5).
  teste: ["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"],
  // Mão aberta (hand).
  componentes: ["M18 11V6a2 2 0 0 0-4 0", "M14 10V4a2 2 0 0 0-4 0v2", "M10 10.5V6a2 2 0 0 0-4 0v8", "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"],
  // Tendência de queda (trending-down).
  limitacoes: ["M22 17 13.5 8.5l-5 5L2 7", "M16 17h6v-6"],
  // Tendência de alta (trending-up).
  escalonamento: ["M22 7l-8.5 8.5-5-5L2 17", "M16 7h6v6"],
};

const ESCURO = "#3a2412";

/** Os seis dados do conceito têm ícones cheios, cor de creme; os demais ficam em traço. */
const CHEIOS: Partial<Record<NomeIconeDado, ReactElement>> = {
  marcacoes: <path d="M13.8 1.8 4.8 13.4h6.3L9.5 22.2l9.7-12H13Z" />,
  origem: (
    <>
      <path d="M12 2.8 21.6 7.7 12 12.6 2.4 7.7Z" />
      <path d="M4.7 11 12 14.7 19.3 11l2.3 1.2-9.6 4.9-9.6-4.9Z" />
      <path d="M4.7 15.3 12 19l7.3-3.7 2.3 1.2-9.6 4.9-9.6-4.9Z" />
    </>
  ),
  versao: <path fillRule="evenodd" d="M2.8 11.8V3.9a1.1 1.1 0 0 1 1.1-1.1h7.9l9.8 9.8a1.2 1.2 0 0 1 0 1.7l-7.9 7.9a1.2 1.2 0 0 1-1.7 0ZM7.6 5.9a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z" />,
  recebida: (
    <>
      <path d="M3.5 5.5h17v15h-17Z" />
      <path d="M7 3v4.2M17 3v4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3.5 9.2h17" stroke={ESCURO} strokeWidth="1" />
      {[0, 1, 2, 3].flatMap((c) => [0, 1, 2].map((l) => (
        <rect key={`${c}-${l}`} x={5.6 + c * 3.4} y={11 + l * 3.1} width="2.1" height="1.9" fill={ESCURO} />
      )))}
    </>
  ),
  potencia: (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <path key={a} d="M12 .8 13.5 6.6 12 8.2 10.5 6.6Z" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="5.6" />
      <circle cx="12" cy="12" r="3.9" fill="none" stroke={ESCURO} strokeWidth="1" />
      <circle cx="12" cy="12" r="1.6" fill={ESCURO} />
    </>
  ),
  custo: (
    <>
      {[15.5, 11.5, 7.5].map((y) => (
        <g key={y}>
          <path d={`M5 ${y}v2.4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V${y}`} />
          <ellipse cx="12" cy={y} rx="7" ry="2.6" stroke={ESCURO} strokeWidth=".8" />
        </g>
      ))}
    </>
  ),
};

export function IconeDoDado({ nome }: { nome: NomeIconeDado }) {
  const cheio = CHEIOS[nome];
  if (cheio) {
    return (
      <svg className="grimorio-icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">{cheio}</svg>
    );
  }
  return (
    <svg className="grimorio-icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {TRACOS[nome].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
