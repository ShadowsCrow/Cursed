import { useId } from "react";

import { IconeCategoria } from "../../../inventory/iconesItem";

/*
 * Ornamentos da carta (redesenhar-aba-cartas, D7). Tudo decorativo e em SVG: o medalhão da faixa sem
 * pintura (aro dourado com quatro pontas e miolo escuro com raios, como na referência) e as volutas dos
 * cantos de cima da carta e do pé da faixa.
 */

/** Ponta do aro: losango com duas volutas, desenhada para o norte e girada para as outras três. */
function Ponta({ angulo }: { angulo: number }) {
  return (
    <g transform={`rotate(${angulo} 39 39)`}>
      <path d="M39 1.6 41.6 5.4 39 8.4 36.4 5.4Z" fill="currentColor" />
      <path d="M36.3 6.6c-2.4.2-3.6 1.8-3.4 3.6M41.7 6.6c2.4.2 3.6 1.8 3.4 3.6" fill="none" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" />
    </g>
  );
}

/** Medalhão da faixa sem pintura: 66 px de aro (78 com as pontas) e o ícone da categoria em ouro. */
export function MedalhaoDaCarta({ icone }: { icone: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <span className="carta-medalhao" aria-hidden="true">
      <svg className="carta-medalhao__aro" viewBox="0 0 78 78" focusable="false">
        <defs>
          <radialGradient id={`${id}-miolo`} cx="50%" cy="46%" r="55%">
            <stop offset="0" stopColor="#3a4f86" />
            <stop offset=".55" stopColor="#1b2649" />
            <stop offset="1" stopColor="#0b1128" />
          </radialGradient>
          <linearGradient id={`${id}-ouro`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe6a6" />
            <stop offset=".5" stopColor="#d9a84e" />
            <stop offset="1" stopColor="#8d6424" />
          </linearGradient>
        </defs>
        <circle cx="39" cy="39" r="31" fill={`url(#${id}-miolo)`} />
        <g stroke="#e9c77a" strokeOpacity=".22" strokeWidth=".7">
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i * 15 * Math.PI) / 180;
            return <path key={i} d={`M${39 + Math.cos(a) * 12} ${39 + Math.sin(a) * 12}L${39 + Math.cos(a) * 28} ${39 + Math.sin(a) * 28}`} />;
          })}
        </g>
        <circle cx="39" cy="39" r="31" fill="none" stroke={`url(#${id}-ouro)`} strokeWidth="2.6" />
        <circle cx="39" cy="39" r="28" fill="none" stroke="#d9b46a" strokeOpacity=".55" strokeWidth=".7" />
        <g color="#e2bd6c">{[0, 90, 180, 270].map((angulo) => <Ponta key={angulo} angulo={angulo} />)}</g>
      </svg>
      <span className="carta-medalhao__icone"><IconeCategoria icone={icone} tamanho={30} /></span>
    </span>
  );
}

/** Voluta de canto da carta (canto de cima, sobre a faixa) ou do pé da faixa; `lado` espelha. */
export function VolutaDaCarta({ posicao }: { posicao: "se" | "sd" | "fe" | "fd" }) {
  const espelhada = posicao === "sd" || posicao === "fd";
  return (
    <svg className={`carta-voluta carta-voluta--${posicao}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      style={espelhada ? { transform: "scaleX(-1)" } : undefined}>
      {posicao === "se" || posicao === "sd" ? (
        <g fill="none" stroke="currentColor" strokeLinecap="round">
          <path d="M2.5 21.5V9.5C2.5 5.6 5.6 2.5 9.5 2.5h12" strokeWidth="1.6" />
          <path d="M6 16c0-5 3-9.5 9.5-10" strokeWidth="1" />
          <path d="M6.2 11.2c1.8-.2 3 .9 2.8 2.4-.2 1.2-1.6 1.6-2.3.8" strokeWidth="1" />
          <path d="M11.2 6.2c-.2 1.8.9 3 2.4 2.8 1.2-.2 1.6-1.6.8-2.3" strokeWidth="1" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1">
          <path d="M3 3c0 5 2.6 8.5 7.5 9.5" />
          <path d="M5.2 7.8c1.6-.4 2.8.4 2.8 1.7 0 1-1 1.6-1.9 1" />
          <path d="M3 3c3.5.4 5.4 2 5.8 4.2" />
        </g>
      )}
    </svg>
  );
}
