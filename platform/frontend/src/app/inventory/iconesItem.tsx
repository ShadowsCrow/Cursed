import type { Subtipo } from "./gridEngine";

/**
 * Desenho padrão de cada subtipo, para itens sem ícone de grade nem arte (reformular-visual-da-ficha, D4).
 * Traço em `currentColor` sobre a vinheta da célula; decorativo, porque o nome do item está no rótulo do botão.
 */
const TRACOS: Record<Subtipo, string[]> = {
  peitoral: [
    "M7 3.5 4 5.5v5.2c0 5 3.4 8.3 8 9.8 4.6-1.5 8-4.8 8-9.8V5.5l-3-2",
    "M7 3.5c1.2 1.7 3 2.6 5 2.6s3.8-.9 5-2.6",
    "M12 6.1v14.2", "M7.5 11h9", "M8.5 15h7",
  ],
  capacete: [
    "M4 15.5V12a8 8 0 0 1 16 0v3.5",
    "M4 15.5h6.5v4H4z", "M13.5 15.5H20v4h-6.5z", "M12 4v7.5", "M8 11.5h8",
  ],
  luvas: [
    "M8 21v-4.5L5.2 12.4a1.4 1.4 0 0 1 2.2-1.8L9 12.5V5.2a1.3 1.3 0 0 1 2.6 0V11",
    "M11.6 10.5V4.2a1.3 1.3 0 0 1 2.6 0v6.3", "M14.2 10.8V5.4a1.3 1.3 0 0 1 2.6 0v8.1c0 3.2-1.8 5.4-4.3 6.3V21",
    "M8 21h7",
  ],
  botas: [
    "M8 3h5v10.5l6.1 2.2c1 .4 1.4 1.3 1.4 2.3V20H5.5V14c0-2.4 2.5-3.2 2.5-6.2z",
    "M5.5 17.5h15", "M8 7h5",
  ],
  uma_mao: [
    "M14.5 3.5h6v6L10 20l-2.5-2.5z", "M5 14.5l4.5 4.5", "M3.5 20.5l3-3", "M12.2 11.8l6.5-6.5",
  ],
  duas_maos: [
    "M17 3h4v4L9.5 18.5 5.5 14.5z", "M3.2 12.2l8.6 8.6", "M2.5 21.5 5 19", "M14 6.8l3.2 3.2",
  ],
  escudo: [
    "M12 3 4.5 5.8v5.7c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V5.8z",
    "M12 3v18", "M4.8 11h14.4", "M12 7.5l2.6 3.5L12 14.5 9.4 11z",
  ],
  mochila: [
    "M6 8.5a6 6 0 0 1 12 0V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z",
    "M9 5.5V4a3 3 0 0 1 6 0v1.5", "M8.5 13h7v4.5h-7z", "M6 10h12",
  ],
  aljava: [
    "M8.5 8.5h7l-1 12.5h-5z", "M10 8.5 8 2.5", "M12 8.5V2", "M14 8.5l2-6",
    "M6.8 2.8 8 2.5l.3 1.2", "M11 2.5 12 2l1 .5", "M15.7 3.7l.3-1.2 1.2.3", "M9 13h6",
  ],
  moedas: [
    "M4 16.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5", "M4 13.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5",
    "M4 10.5v6", "M16 10.5v6", "M10 12.5c3.3 0 6-1.1 6-2.5S13.3 7.5 10 7.5 4 8.6 4 10s2.7 2.5 6 2.5",
    "M14 7.1c.6-.4 1.6-.6 2.8-.6 2.9 0 5.2 1 5.2 2.2v5.6c0 1-1.6 1.9-3.9 2.1",
  ],
  outro: ["M4.5 8.5 12 4l7.5 4.5v7L12 20l-7.5-4.5Z", "M4.5 8.5 12 13l7.5-4.5", "M12 13v7", "M8.2 6.3l7.6 4.4"],
  criatura: [
    "M12 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5",
    "M7 21v-6.5l-2-1.5v-2c0-1.5 1.5-2.5 3-2.5h8c1.5 0 3 1 3 2.5v2l-2 1.5V21",
    "M10 21v-5h4v5",
  ],
};

export function IconeSubtipo({ subtipo, tamanho }: { subtipo: Subtipo; tamanho?: number }) {
  return (
    <svg
      className="icone-subtipo" viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"
      data-subtipo={subtipo}
    >
      {(TRACOS[subtipo] ?? TRACOS.outro).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/** Ícone de cada categoria do catálogo (pelo campo `icone` do JSON); desconhecido cai no de Diversos. */
const TRACOS_CATEGORIA: Record<string, string[]> = {
  todos: ["M7.2 8.4c-2.3 0-3.7 1.6-3.7 3.6s1.4 3.6 3.7 3.6c3.8 0 5.8-7.2 9.6-7.2 2.3 0 3.7 1.6 3.7 3.6s-1.4 3.6-3.7 3.6c-3.8 0-5.8-7.2-9.6-7.2Z"],
  armas: TRACOS.uma_mao,
  armaduras: TRACOS.peitoral,
  escudos: TRACOS.escudo,
  acessorios: TRACOS.mochila,
  consumiveis: ["M9.5 3h5", "M10.5 3v4.2L6.3 13.4A4.6 4.6 0 0 0 10 20.5h4a4.6 4.6 0 0 0 3.7-7.1L13.5 7.2V3", "M7.6 14h8.8"],
  materiais: ["M5 19C5 10 10 5 19 5c0 9-5 14-14 14Z", "M5 19l8.5-8.5", "M9.5 14.5h4", "M12 12V8"],
  chaves: ["M8.5 4.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z", "M11.3 11.3 20 20", "M16.5 16.5l2-2", "M18.5 18.5l1.5-1.5", "M7.3 7.3h2.4v2.4H7.3z"],
  itens_de_missao: ["M7 4h10.5A2.5 2.5 0 0 1 20 6.5V7h-3", "M17 7v11.5A2.5 2.5 0 0 1 14.5 21H6a2 2 0 0 1-2-2v-1h10.5",
    "M7 4a2.5 2.5 0 0 0-2.5 2.5V18", "M9.5 9.5l3 3m0-3-3 3"],
  diversos: TRACOS.outro,
  moedas: TRACOS.moedas,
  criaturas: TRACOS.criatura,
  // Corpos carregados (cartas padrão do sistema): a mesma figura humanoide do subtipo criatura.
  corpos: TRACOS.criatura,
  // Filtros da aba Cartas (redesenhar-aba-cartas): tipos que não são de item e origens.
  habilidades: ["M4 4h3.5l9 9", "M4 4v3.5l9 9", "M20 4h-3.5l-9 9", "M20 4v3.5l-9 9",
    "M5.5 15.5l3 3", "M15.5 18.5l3-3", "M4 20l2.5-2.5", "M20 20l-2.5-2.5"],
  magias: ["M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1 3 2.2 3.5C11 9 11 6 12 3Z"],
  efeitos: ["M12 3v4", "M12 17v4", "M3 12h4", "M17 12h4", "M12 8.5l1.2 2.3 2.3 1.2-2.3 1.2-1.2 2.3-1.2-2.3L8.5 12l2.3-1.2Z"],
  origem_classe: ["M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6Z", "M8.5 11 12 8l3.5 3", "M8.5 15 12 12l3.5 3"],
  origem_raca: ["M12 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7", "M5 20.5c.6-4 3.4-6.5 7-6.5s6.4 2.5 7 6.5", "M15.3 6.2 18 4.5"],
  origem_concedida: ["M4 10h16v4H4z", "M5.5 14h13v6.5h-13z", "M12 10v10.5",
    "M12 10C10 6 6.5 6 7.5 8.5 8.2 10 12 10 12 10", "M12 10c2-4 5.5-4 4.5-1.5C15.8 10 12 10 12 10"],
};

export function IconeCategoria({ icone, tamanho = 20 }: { icone: string; tamanho?: number }) {
  return (
    <svg className="icone-categoria" viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {(TRACOS_CATEGORIA[icone] ?? TRACOS_CATEGORIA.diversos ?? []).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

const METAL: Record<"cobre" | "prata" | "ouro", [string, string, string]> = {
  cobre: ["#f0b48a", "#b0643a", "#5e2f15"],
  prata: ["#f4f4f1", "#a9adb3", "#4d535b"],
  ouro: ["#ffe7a3", "#d4a23f", "#6e4a10"],
};

/** Moeda pintada em SVG (brilho, aro e marca), para a barra de moedas; decorativa. */
export function Moeda({ tipo, tamanho = 26 }: { tipo: "cobre" | "prata" | "ouro"; tamanho?: number }) {
  const [claro, medio, escuro] = METAL[tipo];
  const id = `moeda-${tipo}`;
  return (
    <svg className="moeda" viewBox="0 0 32 32" width={tamanho} height={tamanho} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={claro} /><stop offset=".55" stopColor={medio} /><stop offset="1" stopColor={escuro} />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill={`url(#${id})`} stroke={escuro} strokeWidth="1.2" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke={escuro} strokeOpacity=".55" strokeWidth=".9" />
      <path d="M16 9.5l1.8 4.7 4.7 1.8-4.7 1.8L16 22.5l-1.8-4.7-4.7-1.8 4.7-1.8Z" fill={escuro} fillOpacity=".45" />
      <ellipse cx="11.5" cy="10" rx="4" ry="2.2" fill="#fff" fillOpacity=".35" transform="rotate(-30 11.5 10)" />
    </svg>
  );
}
