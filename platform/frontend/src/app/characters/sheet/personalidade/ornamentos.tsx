/*
 * Ornamentos da folha da Personalidade (reformular-personalidade-da-ficha, D1 e D5), desenhados sobre os recortes
 * ampliados da referência (`referencia/canto-superior-esquerdo.png` e outros). SVG decorativo (`aria-hidden`),
 * sem foco; o ouro e o azul-noite vêm de variáveis CSS da folha.
 */

const decorativo = { "aria-hidden": true, focusable: "false" } as const;

export type PosicaoDoCanto = "se" | "sd" | "ie" | "id";

/**
 * Canto de filigrana da moldura, desenhado sobre o canto ampliado da referência: um canal de azul-noite de uns
 * 9 px ao longo das duas bordas, entre dois filetes dourados; no vértice, um nó de dois laços espelhados e uma
 * ponta de lança na diagonal que termina numa conta; e um cacho em cada ponta do canal, subindo por cima da
 * borda. O canto da folha fica em (8, 8) do desenho. Um só desenho, espelhado pelo CSS nos quatro cantos; as
 * cores vêm do CSS (azul-noite na folha, bronze escuro nos cantos menores da História).
 */
export function CantoFiligrana({ posicao, className = "" }: { posicao: PosicaoDoCanto; className?: string }) {
  return (
    <svg className={`canto-filigrana canto-filigrana--${posicao} ${className}`.trim()} viewBox="0 0 96 96" {...decorativo}>
      {/* Canal e cunha do vértice, até a conta da diagonal. */}
      <path className="canto-filigrana__fundo"
        d="M8 8H88V17H40C34 20 31.5 25 31 31C25 31.5 20 34 17 40V88H8Z" />
      <g className="canto-filigrana__ouro" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Filetes de fora e de dentro do canal. */}
        <path d="M8 88V8H88" strokeWidth="3" />
        <path d="M86 17H28C21.5 17 17 21.5 17 28V86" strokeWidth="2.6" />
        {/* Cachos nas pontas do canal. */}
        <path d="M78 17C86 16.5 91 12 89.5 7C88 2.5 82.5 3 83 7C83.4 9.8 87 9.5 87 7" strokeWidth="2.3" />
        <path d="M17 78C16.5 86 12 91 7 89.5C2.5 88 3 82.5 7 83C9.8 83.4 9.5 87 7 87" strokeWidth="2.3" />
        {/* Nó do vértice: dois laços espelhados pela diagonal e um arco que os cruza. */}
        <path d="M17 38C12.5 28 15.5 16.5 25.5 13C33.5 10.5 40 14.5 38 20.5C36.4 25 30.5 24 30.8 20" strokeWidth="2.4" />
        <path d="M44 17C48 12.5 55 12 58 15.5C60.5 18.5 57 21 55 19" strokeWidth="1.8" />
        <path d="M17 44C12.5 48 12 55 15.5 58C18.5 60.5 21 57 19 55" strokeWidth="1.8" />
        <path d="M38 17C28 12.5 16.5 15.5 13 25.5C10.5 33.5 14.5 40 20.5 38C25 36.4 24 30.5 20 30.8" strokeWidth="2.4" />
        <path d="M23 11.5C18 15 15 18 11.5 23" strokeWidth="1.8" />
        {/* Diagonal da lança. */}
        <path d="M10 10 29.5 29.5" strokeWidth="2" />
      </g>
      <path className="canto-filigrana__ponta" d="M9.5 9.5C16 11 20.5 15 22.5 22.5 15 20.5 11 16 9.5 9.5Z" />
      <circle className="canto-filigrana__ponta" cx="31" cy="31" r="3.1" />
      {/* Brilho do filete de fora. */}
      <path className="canto-filigrana__brilho" d="M9.6 86V9.6H86" fill="none" strokeWidth="0.7" />
    </svg>
  );
}

/** Haste vertical à esquerda do título: pontas em lança, laços e o medalhão com cruz no meio (D5). */
export function HasteTitulo() {
  return (
    <svg viewBox="0 0 30 134" width="30" height="134" {...decorativo}>
      <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
        <path d="M15 4v42M15 88v42" />
        <path d="M15 14c-4 3-4 8 0 11 4-3 4-8 0-11ZM15 109c-4 3-4 8 0 11 4-3 4-8 0-11Z" />
        <path d="M15 30c-3 2-5 5-5 9M15 30c3 2 5 5 5 9M15 104c-3-2-5-5-5-9M15 104c3-2 5-5 5-9" />
        <path d="M11 40c-3 1-4 4-2 6M19 40c3 1 4 4 2 6M11 94c-3-1-4-4-2-6M19 94c3-1 4-4 2-6" />
        <circle cx="15" cy="67" r="12" />
        <circle cx="15" cy="67" r="8" />
        <path d="M15 51v32M-1 67h32" />
      </g>
      <path d="M15 0l2.4 4.6L15 7.4l-2.4-2.8ZM15 134l2.4-4.6-2.4-2.8-2.4 2.8Z" fill="currentColor" />
      <circle cx="15" cy="67" r="2.4" fill="currentColor" />
    </svg>
  );
}

/** Aspas de abertura da citação, cheias, como as da referência. */
export function Aspas() {
  return (
    <svg className="personalidade-citacao__aspas" viewBox="0 0 24 18" width="22" height="17" {...decorativo}>
      <path fill="currentColor"
        d="M9.6 2.2C5.4 3.4 2.4 6.6 2.4 11a4.6 4.6 0 1 0 5.4-4.5c.4-1.4 1.5-2.6 2.9-3.4ZM21 2.2c-4.2 1.2-7.2 4.4-7.2 8.8a4.6 4.6 0 1 0 5.4-4.5c.4-1.4 1.5-2.6 2.9-3.4Z" />
    </svg>
  );
}

/** Floreio da ponta esquerda do divisor do topo: ponta de seta, ponto e uma lente alongada antes da linha. */
export function FloreioDoDivisor() {
  return (
    <svg className="folha-personalidade__floreio" viewBox="0 0 64 14" width="64" height="14" {...decorativo}>
      <path d="M1 7h9M2.5 3.5 6 7l-3.5 3.5M6 3.5 9.5 7 6 10.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <circle cx="13.5" cy="7" r="1.8" fill="currentColor" />
      <path d="M16 7h4M20 7c6-6.4 24-6.4 30 0-6 6.4-24 6.4-30 0ZM50 7h14" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/** Ornamento do divisor da História: floreios nas pontas e o losango ornado no meio. */
export function DivisorDaHistoria() {
  const floreio = "M1 7c3-4 7-4 8 0-1 4-5 4-8 0Zm8 0h4M5 3c1 2 1 6 0 8";
  return (
    <span className="personalidade-historia__divisor" aria-hidden="true">
      <svg className="personalidade-historia__divisor-ponta" viewBox="0 0 14 14" width="19" height="19" {...decorativo}>
        <path d={floreio} fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg className="personalidade-historia__divisor-meio" viewBox="0 0 34 16" width="40" height="19" {...decorativo}>
        <path d="M17 1l5 7-5 7-5-7Z" fill="currentColor" />
        <path d="M17 4.5l2.5 3.5-2.5 3.5-2.5-3.5Z" fill="var(--pers-quadro, #f2dcb4)" />
        <path d="M11 8c-3-4-7-4-9-1 2 2 5 2 6 0M23 8c3-4 7-4 9-1-2 2-5 2-6 0" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg className="personalidade-historia__divisor-ponta personalidade-historia__divisor-ponta--direita" viewBox="0 0 14 14" width="19" height="19" {...decorativo}>
        <path d={floreio} fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    </span>
  );
}

/** Filigrana d'água no canto de baixo à esquerda do quadro da História: ramos, folhas e cachos em tom de pergaminho. */
export function FiligranaDagua() {
  return (
    <svg className="personalidade-historia__filigrana" viewBox="0 0 130 100" width="112" height="86" {...decorativo}>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M4 96C8 70 22 52 44 46C62 41 74 50 68 60C63 67 53 64 56 57" strokeWidth="2" />
        <path d="M4 96C24 84 46 80 66 82C86 84 100 76 104 64C107 55 99 49 92 53C88 56 90 62 95 61" strokeWidth="1.8" />
        <path d="M22 58C18 46 22 34 34 28C44 24 50 32 44 38C40 42 35 39 37 35" strokeWidth="1.5" />
        <path d="M30 30C36 18 48 12 60 12C70 12 72 22 65 24C60 26 57 21 60 19" strokeWidth="1.3" />
        <path d="M66 82C74 90 88 94 100 92C110 90 116 94 114 98" strokeWidth="1.2" />
        <path d="M12 76c5-3 8-8 8-13M18 86c6 0 11-3 13-8M44 46c-2-6-1-12 3-16M84 70c4-4 5-9 3-13" strokeWidth="1.1" />
        <path d="M8 60C4 48 8 36 18 32C26 29 30 36 25 40C22 42 19 40 20 37" strokeWidth="1.3" />
        <path d="M40 94C48 98 60 98 66 94C70 91 67 87 63 89" strokeWidth="1.2" />
        <path d="M92 53C98 44 110 42 118 48C123 52 119 58 114 55" strokeWidth="1.2" />
        <path d="M56 57c4 2 9 1 12-3M30 70c-4-2-6-6-5-10M100 78c4 1 8-1 10-4" strokeWidth="1" />
      </g>
      <g fill="currentColor">
        <path d="M20 70C14 64 14 56 20 52 22 60 22 64 20 70Z" />
        <path d="M34 56C30 48 32 40 40 38 40 46 38 52 34 56Z" />
        <path d="M50 82C46 76 48 70 56 68 56 74 54 78 50 82Z" />
        <path d="M76 82C74 76 78 70 86 70 84 76 82 80 76 82Z" />
        <path d="M52 44C54 38 60 35 66 37 62 41 58 43 52 44Z" />
        <path d="M10 48C6 42 8 36 14 34 14 40 13 44 10 48Z" />
        <path d="M60 94C58 88 62 84 68 84 66 89 64 92 60 94Z" />
        <path d="M100 58C98 52 102 48 108 48 106 53 104 56 100 58Z" />
        <path d="M28 82C26 76 30 72 36 72 34 77 32 80 28 82Z" />
        <circle cx="4" cy="96" r="2.4" />
      </g>
    </svg>
  );
}
