import type { ReactNode } from "react";

import { IconeAtributo } from "../atributos/icones";
import type { NomeIconeAtributo } from "../atributos/nomesDosIcones";
import type { NomeIconePericia } from "./nomesDosIcones";

/*
 * Ícones da aba Perícias (redesenhar-aba-pericias, design D5). Silhuetas cheias em `currentColor`, na
 * mesma grade de 32 e no mesmo traço dos ícones da aba Atributos; os recortes internos usam
 * `--icone-recorte` (a cor do papel por baixo). Cinco perícias repetem o desenho de um atributo, como na
 * referência: Esportes (corredor), Briga (punho), Empatia (duas pessoas), Expressão (máscara) e
 * Ocultismo (olho). Tudo decorativo: `aria-hidden` e sem foco.
 */

const decorativo = { "aria-hidden": true, focusable: "false" } as const;
const RECORTE = "var(--icone-recorte, #f3deba)";
const cheio = { fill: "currentColor" } as const;
const recorte = { fill: "none", stroke: RECORTE, strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const traco = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

const DO_ATRIBUTO: Partial<Record<NomeIconePericia, NomeIconeAtributo>> = {
  esportes: "destreza",
  briga: "forca",
  empatia: "manipulacao",
  expressao: "carisma",
  ocultismo: "percepcao",
};

/** Pilha de moedas vista de lado: cada moeda é uma faixa com a face de cima em elipse. */
function Moedas({ x, largura, alturas }: { x: number; largura: number; alturas: number[] }) {
  const rx = largura / 2;
  return (
    <>
      {alturas.map((y) => (
        <g key={y}>
          <path d={`M${x} ${y}h${largura}v3.2a${rx} 1.9 0 0 1-${largura} 0Z`} {...cheio} />
          <path d={`M${x} ${y + 3.2}a${rx} 1.9 0 0 0 ${largura} 0`} {...recorte} strokeWidth={.9} />
        </g>
      ))}
      <ellipse cx={x + rx} cy={alturas[alturas.length - 1]} rx={rx} ry={1.9} {...cheio} />
      <ellipse cx={x + rx} cy={alturas[alturas.length - 1]} rx={rx * .62} ry={1} {...recorte} strokeWidth={.9} />
    </>
  );
}

const DESENHOS: Record<Exclude<NomeIconePericia, keyof typeof DO_ATRIBUTO>, ReactNode> = {
  // ---------- Talentos ----------
  // Raio.
  prontidao: <path d="M19.6 1.8 6.4 18.2h7.8L11 30.2 25.8 12.6h-8.2L22.4 1.8Z" {...cheio} />,
  // Bota de cano alto, de perfil, com o bico para a direita.
  esquiva: (
    <>
      <path d="M8.6 2.6h10v13.2c0 1.3.8 2.2 2 2.6l6 2c2 .7 3.2 2.3 3.2 4.3V28H5.8c-1 0-1.7-.7-1.7-1.7v-3c0-1.4.5-2.7 1.3-3.8l3.2-4.2Z" {...cheio} />
      <path d="M11.2 7h4.8M11.2 10.4h4.8M11.2 13.8h4.8M4.4 24.6h25.4" {...recorte} />
    </>
  ),
  // Cabeça de touro com chifres, de frente.
  intimidacao: (
    <>
      <path d="M3.4 2.6c-1 6.6 2.4 11.2 8.8 12.2l1-3.4C9.2 10.6 5.8 8 3.4 2.6ZM28.6 2.6c1 6.6-2.4 11.2-8.8 12.2l-1-3.4c4-.8 7.4-3.4 9.8-8.8Z" {...cheio} />
      <path d="M10.4 11.2h11.2l1.9 6.6c.5 1.7.1 3.4-1 4.7l-3.3 4.1c-.8 1-2 1.6-3.2 1.6s-2.4-.6-3.2-1.6l-3.3-4.1c-1.1-1.3-1.5-3-1-4.7Z" {...cheio} />
      <path d="M12 16.8l3 1.4M20 16.8l-3 1.4" {...recorte} strokeWidth={1.7} />
      <circle cx="14.4" cy="23.6" r="1" fill={RECORTE} />
      <circle cx="17.6" cy="23.6" r="1" fill={RECORTE} />
    </>
  ),
  // Bandeira ao vento num mastro.
  lideranca: (
    <>
      <circle cx="7" cy="2.8" r="1.8" {...cheio} />
      <path d="M5.9 4.2h2.2v24.4H5.9Z M3 28h8v2.2H3Z" {...cheio} />
      <path d="M8.1 5.2c3-1.6 6.2-1.6 9.3 0s6.2 1.6 9.3 0v11.4c-3.1 1.6-6.2 1.6-9.3 0s-6.3-1.6-9.3 0Z" {...cheio} />
    </>
  ),
  // Casario: três prédios de alturas diferentes, com janelas.
  conhecimento_urbano: (
    <>
      <path d="M2.8 28.6V15.2h6.4v13.4ZM10.4 28.6V8.2l4.4-3.4 4.4 3.4v20.4ZM20.4 28.6V12.4h4.8V9.2h3.2v19.4ZM1.6 28.2h28.8v2H1.6Z" {...cheio} />
      <path d="M6 18.4v2M6 23.2v2M13.3 11.4v2M16.3 11.4v2M13.3 16.4v2M16.3 16.4v2M13.3 21.4v2M16.3 21.4v2M22.6 15.6v2M25.8 15.6v2M22.6 20.6v2M25.8 20.6v2" {...recorte} strokeWidth={1.3} />
    </>
  ),
  // Balão de fala com reticências.
  labia: (
    <>
      <path d="M16 3.6C8.6 3.6 3.2 8.2 3.2 14c0 3.1 1.6 5.9 4.3 7.8L5.8 28.6l7-4.4c1 .2 2.1.3 3.2.3 7.4 0 12.8-4.6 12.8-10.4S23.4 3.6 16 3.6Z" {...cheio} />
      <circle cx="10.8" cy="14" r="1.6" fill={RECORTE} />
      <circle cx="16" cy="14" r="1.6" fill={RECORTE} />
      <circle cx="21.2" cy="14" r="1.6" fill={RECORTE} />
    </>
  ),

  // ---------- Técnicas ----------
  // Pegada de pata.
  lidar_com_animais: (
    <>
      <path d="M16 16.4c-4.2 0-7.8 3.6-7.8 7.4 0 2.3 1.7 3.8 3.8 3.8 1.6 0 2.6-.8 4-.8s2.4.8 4 .8c2.1 0 3.8-1.5 3.8-3.8 0-3.8-3.6-7.4-7.8-7.4Z" {...cheio} />
      <ellipse cx="7.4" cy="12.6" rx="2.6" ry="3.4" transform="rotate(-22 7.4 12.6)" {...cheio} />
      <ellipse cx="12.6" cy="7" rx="2.6" ry="3.6" transform="rotate(-6 12.6 7)" {...cheio} />
      <ellipse cx="19.4" cy="7" rx="2.6" ry="3.6" transform="rotate(6 19.4 7)" {...cheio} />
      <ellipse cx="24.6" cy="12.6" rx="2.6" ry="3.4" transform="rotate(22 24.6 12.6)" {...cheio} />
    </>
  ),
  // Engrenagem.
  oficios: (
    <>
      <g {...cheio}>
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="13.6" y="1.8" width="4.8" height="6.4" rx="1" transform={`rotate(${i * 45} 16 16)`} />
        ))}
      </g>
      <circle cx="16" cy="16" r="10.4" {...cheio} />
      <circle cx="16" cy="16" r="4.2" fill={RECORTE} />
    </>
  ),
  // Leme de navio.
  pilotagem: (
    <>
      <g {...traco} strokeWidth={2.2}>
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d="M16 16V3.4" transform={`rotate(${i * 45} 16 16)`} />
        ))}
      </g>
      <g {...cheio}>
        {Array.from({ length: 8 }, (_, i) => (
          <circle key={i} cx="16" cy="2.6" r="1.9" transform={`rotate(${i * 45} 16 16)`} />
        ))}
      </g>
      <circle cx="16" cy="16" r="8.6" fill="none" stroke="currentColor" strokeWidth={2.8} />
      <circle cx="16" cy="16" r="3.2" {...cheio} />
    </>
  ),
  // Cálice.
  etiqueta: (
    <>
      <path d="M8.6 2.8h14.8c0 6.8-2.8 11.4-7.4 12.2C11.4 14.2 8.6 9.6 8.6 2.8Z" {...cheio} />
      <path d="M14.9 14.6h2.2v8.2h-2.2Z" {...cheio} />
      <path d="M9.6 27.4c0-2.7 2.9-4.8 6.4-4.8s6.4 2.1 6.4 4.8ZM9 27.2h14v2.2H9Z" {...cheio} />
      <path d="M11.4 5.4c.3 3.2 1.5 5.4 3.2 6.6" {...recorte} strokeWidth={1.2} />
    </>
  ),
  // Alvo com a flecha cravada.
  longo_alcance: (
    <>
      <circle cx="15" cy="17" r="12.6" {...cheio} />
      <circle cx="15" cy="17" r="9" fill={RECORTE} />
      <circle cx="15" cy="17" r="6.2" {...cheio} />
      <circle cx="15" cy="17" r="2.6" fill={RECORTE} />
      <path d="M15 17 27.4 4.6" fill="none" stroke={RECORTE} strokeWidth={3.6} strokeLinecap="round" />
      <path d="M15 17 27.4 4.6" {...traco} strokeWidth={1.6} />
      <path d="M25.6 2.4 26 6l3.6.4-2.2 2.2-3.8-.4-.4-3.8Z" {...cheio} />
    </>
  ),
  // Duas espadas cruzadas.
  armas_brancas: <EspadasCruzadas />,
  // Lira.
  performance: (
    <>
      <path d="M8.4 4.8c-3.2 4.2-2.6 11.2 2 14.8V25M23.6 4.8c3.2 4.2 2.6 11.2-2 14.8V25" {...traco} strokeWidth={2.6} />
      <circle cx="8.2" cy="4.2" r="2" {...cheio} />
      <circle cx="23.8" cy="4.2" r="2" {...cheio} />
      <path d="M8.8 9h14.4" {...traco} strokeWidth={2.2} />
      <path d="M13 9v14.6M16 9v14.6M19 9v14.6" {...traco} strokeWidth={1.1} />
      <path d="M8.6 24.2h14.8v4.6H8.6Z" {...cheio} />
    </>
  ),
  // Mão aberta, de frente.
  prestidigitacao: (
    <>
      <rect x="10.2" y="4.4" width="3.4" height="13" rx="1.7" {...cheio} />
      <rect x="14" y="2.4" width="3.4" height="14" rx="1.7" {...cheio} />
      <rect x="17.8" y="3.6" width="3.4" height="13.4" rx="1.7" {...cheio} />
      <rect x="21.6" y="7" width="3.1" height="11" rx="1.55" {...cheio} />
      <path d="M10 14.4h14.7v5.4c0 5.6-3.5 9.8-8.3 9.8-3.1 0-5.2-1.5-6.8-4.1L4.8 19.6c-.8-1.2-.5-2.8.7-3.6 1.2-.7 2.5-.4 3.3.6l1.2 1.8Z" {...cheio} />
      <path d="M13.6 6v8M17.4 4.4v9.6M21.2 5.4v8.6" {...recorte} strokeWidth={.9} />
    </>
  ),
  // Figura encapuzada com o rosto na sombra.
  furtividade: (
    <>
      <path d="M16 2.2c-5.6 0-9.8 4.9-9.8 11.2 0 3.1-.6 5.9-2.1 8.4L2.6 29.4h26.8l-1.5-7.6c-1.5-2.5-2.1-5.3-2.1-8.4 0-6.3-4.2-11.2-9.8-11.2Z" {...cheio} />
      <path d="M16 8.2c-3.1 0-5.2 2.8-5.2 6.4 0 2.9 1.7 5.5 5.2 7 3.5-1.5 5.2-4.1 5.2-7 0-3.6-2.1-6.4-5.2-6.4Z" fill={RECORTE} />
      <path d="M16 10c-2.2 0-3.6 2.1-3.6 4.8 0 2.2 1.2 4 3.6 5.2 2.4-1.2 3.6-3 3.6-5.2 0-2.7-1.4-4.8-3.6-4.8Z" {...cheio} />
      <path d="M10.6 24.4 16 27.6l5.4-3.2" {...recorte} strokeWidth={1.1} />
    </>
  ),
  // Fogueira: chama sobre dois troncos cruzados.
  sobrevivencia: (
    <>
      <path d="M16 2c1 4.4 6.6 6.6 6.6 12.6 0 3.9-3 6.9-6.6 6.9s-6.6-3-6.6-6.9c0-3.2 1.8-4.7 3.1-6.5.3 1.8 1 3.1 2.2 3.7-.3-3.9.2-6.9 1.3-9.8Z" {...cheio} />
      <path d="M16 12.4c.4 2 2.6 3.1 2.6 5.6 0 1.6-1.2 2.9-2.6 2.9s-2.6-1.3-2.6-2.9c0-1.4.8-2.3 1.4-3.1.1.8.4 1.3.9 1.6-.1-1.6 0-2.9.3-4.1Z" fill={RECORTE} />
      <rect x="4.6" y="23.2" width="22.8" height="3.6" rx="1.8" transform="rotate(13 16 25)" {...cheio} />
      <rect x="4.6" y="23.2" width="22.8" height="3.6" rx="1.8" transform="rotate(-13 16 25)" {...cheio} />
      <path d="M8.4 25.6 23.6 24.4" {...recorte} strokeWidth={.9} />
    </>
  ),

  // ---------- Conhecimentos ----------
  // Fachada clássica com frontão e colunas.
  academicos: (
    <>
      <path d="M16 2.2 29.4 9.4H2.6Z M3.6 10.6h24.8v2.6H3.6Z" {...cheio} />
      {[5.4, 11, 18.4, 24].map((x) => <rect key={x} x={x} y="14.4" width="2.6" height="9.8" {...cheio} />)}
      <path d="M3.6 25.2h24.8v2.2H3.6ZM2 28.2h28v2H2Z" {...cheio} />
      <circle cx="16" cy="7.2" r="1.2" fill={RECORTE} />
    </>
  ),
  // Estrela arcana de oito pontas.
  arcanismo: (
    <>
      <path d="M16 1.4 18.3 13.7 30.6 16 18.3 18.3 16 30.6 13.7 18.3 1.4 16 13.7 13.7Z" {...cheio} />
      <path d="M16 6.4 17.4 14.6 25.6 16 17.4 17.4 16 25.6 14.6 17.4 6.4 16 14.6 14.6Z" transform="rotate(45 16 16)" {...cheio} />
      <circle cx="16" cy="16" r="2.1" fill={RECORTE} />
    </>
  ),
  // Duas pilhas de moedas.
  financas: (
    <>
      <Moedas x={2.6} largura={14} alturas={[24.4, 20.4, 16.4, 12.4, 8.4]} />
      <Moedas x={15.6} largura={13.6} alturas={[24.4, 20.4, 16.4]} />
    </>
  ),
  // Lupa.
  investigacao: (
    <>
      <circle cx="13" cy="13" r="8.6" fill="none" stroke="currentColor" strokeWidth={3.4} />
      <path d="M19.6 19.6 28 28" {...traco} strokeWidth={4.4} />
      <path d="M8.6 11.8a4.8 4.8 0 0 1 3.6-3.4" {...traco} strokeWidth={1.4} />
    </>
  ),
  // Balança da justiça.
  direito: (
    <>
      <circle cx="16" cy="4" r="1.9" {...cheio} />
      <path d="M14.9 5h2.2v21.4h-2.2ZM4.6 7.4h22.8v2H4.6ZM11.6 25.8h8.8v1.6h-8.8ZM8.8 27.6h14.4v2.2H8.8Z" {...cheio} />
      <path d="M6.6 9.4 3 18.4M6.6 9.4l3.6 9M25.4 9.4 21.8 18.4M25.4 9.4l3.6 9" {...traco} strokeWidth={1} />
      <path d="M1.8 18.2h9.6c0 2.7-2.1 4.4-4.8 4.4s-4.8-1.7-4.8-4.4ZM20.6 18.2h9.6c0 2.7-2.1 4.4-4.8 4.4s-4.8-1.7-4.8-4.4Z" {...cheio} />
    </>
  ),
  // Pena de escrever.
  linguistica: (
    <>
      <path d="M28.2 2.4C18.4 3.6 10.4 10.4 7.6 21.8l3.2 1.4c7.6-4 13.4-10.6 17.4-20.8Z" {...cheio} />
      <path d="M25.4 5.2C19.6 9.6 14.6 15 11.2 21.4M22.2 11.6l-5.4-.6M19 15.8l-4.8-.4" {...recorte} strokeWidth={1.1} />
      <path d="M9 22.6 4.6 29.6" {...traco} strokeWidth={1.9} />
    </>
  ),
  // Caduceu: bastão, asas e duas serpentes.
  medicina: (
    <>
      <circle cx="16" cy="3.2" r="1.9" {...cheio} />
      <path d="M14.9 4.4h2.2v25.2h-2.2Z" {...cheio} />
      <path d="M15 7.4C11.2 5 6.6 5 3 6.8c2.8.6 5 1.6 6.6 2.8-2 .1-3.8.7-5.2 1.8 4-.3 7.6.2 10.6 1.6ZM17 7.4C20.8 5 25.4 5 29 6.8c-2.8.6-5 1.6-6.6 2.8 2 .1 3.8.7 5.2 1.8-4-.3-7.6.2-10.6 1.6Z" {...cheio} />
      <path d="M16 13c-5.2 1.6-5.2 4.6 0 6.1s5.2 4.5 0 6.1M16 13c5.2 1.6 5.2 4.6 0 6.1s-5.2 4.5 0 6.1" {...traco} strokeWidth={1.8} />
    </>
  ),
  // Coroa.
  politica: (
    <>
      <path d="M3.4 10.4 9.6 16 16 5.6 22.4 16l6.2-5.6-2.4 14H5.8Z" {...cheio} />
      <circle cx="3.4" cy="9" r="1.9" {...cheio} />
      <circle cx="16" cy="4" r="1.9" {...cheio} />
      <circle cx="28.6" cy="9" r="1.9" {...cheio} />
      <path d="M5.8 25.4h20.4v3.4H5.8Z" {...cheio} />
      <circle cx="16" cy="19.6" r="1.7" fill={RECORTE} />
      <circle cx="10.2" cy="20.2" r="1.2" fill={RECORTE} />
      <circle cx="21.8" cy="20.2" r="1.2" fill={RECORTE} />
    </>
  ),
  // Folha com a nervura.
  natureza: (
    <>
      <path d="M27.6 3.4C14.2 3.4 5.4 10.6 5.4 20.8c0 2 .4 3.7 1 5.2C10 19 16 13.4 24 9.4 16.8 14.2 11.2 19.8 8 26.8c1.6.8 3.5 1.2 5.4 1.2 11-.2 15.2-10.4 14.2-24.6Z" {...cheio} />
      <path d="M6.4 26 3.6 29.6" {...traco} strokeWidth={1.8} />
    </>
  ),
};

/** Duas espadas cruzadas: ícone de Armas Brancas e símbolo do grupo Técnicas. */
export function EspadasCruzadas() {
  const espada = (
    <>
      <path d="M2.8 2.8 7.6 4 21.4 17.8 17.8 21.4 4 7.6Z" {...cheio} />
      <path d="M16.2 24.8 24.8 16.2l1.6 1.6-8.6 8.6Z" {...cheio} />
      <path d="M22 22 26.8 26.8" {...traco} strokeWidth={2.8} />
      <circle cx="28.2" cy="28.2" r="2" {...cheio} />
      <path d="M5 5 19.4 19.4" {...recorte} strokeWidth={.8} />
    </>
  );
  return (
    <>
      <g>{espada}</g>
      <g transform="matrix(-1 0 0 1 32 0)">{espada}</g>
    </>
  );
}

export function IconePericia({ nome, tamanho = 22 }: { nome: NomeIconePericia; tamanho?: number }) {
  const atributo = DO_ATRIBUTO[nome];
  if (atributo) return <IconeAtributo nome={atributo} tamanho={tamanho} />;
  return (
    <svg className={`icone-pericia icone-pericia--${nome}`} width={tamanho} height={tamanho} viewBox="0 0 32 32" {...decorativo}>
      {DESENHOS[nome as keyof typeof DESENHOS]}
    </svg>
  );
}

/** Símbolo do grupo Técnicas no medalhão (Talentos e Conhecimentos usam o braço e o livro da aba Atributos). */
export function IconeTecnicas({ tamanho = 30 }: { tamanho?: number }) {
  return (
    <svg className="icone-grupo icone-grupo--tecnicas" width={tamanho} height={tamanho} viewBox="0 0 32 32" {...decorativo}>
      <EspadasCruzadas />
    </svg>
  );
}
