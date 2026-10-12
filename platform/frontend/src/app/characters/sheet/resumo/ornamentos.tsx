import { useId, type CSSProperties } from "react";

/*
 * Ornamentos e ícones do Resumo (aba-resumo-da-ficha, design D4). Tudo é desenho em SVG com
 * `currentColor`, decorativo (`aria-hidden`) e sem foco; a cor vem dos tokens do tema.
 */

const decorativo = { "aria-hidden": true, focusable: "false" } as const;

/** Rosa dos ventos de quatro pontas, usada nos divisores e no fecho da página. */
export function RosaDosVentos({ tamanho = 28, className = "" }: { tamanho?: number; className?: string }) {
  return (
    <svg className={`resumo-rosa ${className}`.trim()} width={tamanho} height={tamanho} viewBox="0 0 40 40" {...decorativo}>
      <path d="M20 1 23 17 39 20 23 23 20 39 17 23 1 20 17 17Z" fill="currentColor" />
      <path d="m20 20 8-8-3.4 6.2Zm0 0 8 8-6.2-3.4Zm0 0-8 8 3.4-6.2Zm0 0-8-8 6.2 3.4Z" fill="currentColor" opacity=".75" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" strokeWidth="1" opacity=".8" />
      <circle cx="20" cy="20" r="2.2" fill="var(--resumo-pergaminho, #f3deba)" />
    </svg>
  );
}

/** Linha dourada com a rosa dos ventos ao centro. */
export function DivisorOrnado({ className = "" }: { className?: string }) {
  return (
    <div className={`resumo-divisor ${className}`.trim()} aria-hidden="true">
      <span className="resumo-divisor__linha" />
      <RosaDosVentos tamanho={26} />
      <span className="resumo-divisor__linha" />
    </div>
  );
}

/** Voluta das pontas da placa do título. */
export function Voluta({ lado }: { lado: "esquerda" | "direita" }) {
  return (
    <svg className={`resumo-voluta resumo-voluta--${lado}`} viewBox="0 0 90 30" {...decorativo}>
      <path d="M88 15H40c-8 0-12-10-20-10-7 0-10 6-6 10 3 3 8 1 7-3M40 15c-8 0-12 10-20 10-7 0-10-6-6-10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m6 15 5-4 5 4-5 4Z" fill="currentColor" />
    </svg>
  );
}

/** Estandarte pendurado nos cantos superiores, na cor da classe. */
export function Estandarte({ lado, cor }: { lado: "esquerda" | "direita"; cor?: string }) {
  const estilo = cor ? ({ "--estandarte-cor": cor } as CSSProperties) : undefined;
  return (
    <svg className={`resumo-estandarte resumo-estandarte--${lado}`} viewBox="0 0 64 190" style={estilo} {...decorativo}>
      <path d="M2 8h60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M8 10h48v160l-24-16-24 16Z" className="resumo-estandarte__tecido" />
      <path d="M12 14h40v146l-20-13.3L12 160Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <g transform="translate(32 62)">
        <circle r="11" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M0-19 3-3 19 0 3 3 0 19-3 3-19 0-3-3Z" fill="currentColor" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".9">
        <path d="M32 92c-5 6-5 13 0 18 5-5 5-12 0-18Z" />
        <path d="M31 108c-3-5-9-6-12-2 3 4 8 5 12 2ZM33 108c3-5 9-6 12-2-3 4-8 5-12 2Z" />
        <path d="M32 110v22M26 120h12M28 132c1.5 2 6.5 2 8 0" />
      </g>
    </svg>
  );
}

/* ---------- Ícones das linhas ---------- */

export type NomeIconeFicha =
  | "forca" | "destreza" | "vigor" | "carisma" | "manipulacao" | "proposito"
  | "percepcao" | "inteligencia" | "raciocinio"
  | "talentos" | "tecnicas" | "conhecimentos"
  | "arcanismo" | "furtividade" | "sobrevivencia" | "alvo" | "punho" | "lingua";

const ICONES: Record<NomeIconeFicha, string> = {
  forca: "M7 11V7.6a1.6 1.6 0 0 1 3.2 0V10m0-.5V6.4a1.6 1.6 0 0 1 3.2 0v3.2m0 0V7.8a1.6 1.6 0 0 1 3.2 0V11m0-.6a1.6 1.6 0 0 1 3.2 0v3.4c0 4.2-2.6 7.2-6.6 7.2h-1.6C8.6 21 6 18.7 6 15.6V13a1.8 1.8 0 0 1 3.6 0v1.6",
  destreza: "M20 3.5C11.5 3.8 6.6 9.2 6 17.4L4 21M6 17.4c5.3-.3 9.6-2.6 11.6-7M8.4 12.6h6.2M11 8.6h5.6",
  vigor: "M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3Z",
  carisma: "M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2ZM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1",
  manipulacao: "M4 5.5c3.2 1.6 12.8 1.6 16 0v5.6c0 5-3.6 8.4-8 8.4s-8-3.4-8-8.4ZM7.8 11c.8-.9 2.2-.9 3 0M13.2 11c.8-.9 2.2-.9 3 0M9.4 15c1.5 1 3.7 1 5.2 0",
  proposito: "M12 21c-3.9 0-6.2-2.6-6.2-5.7 0-3.5 3-5.1 3.5-8.7 2.3 1.4 3.1 3.4 2.9 5.2 1.3-.6 2.1-2.1 2.1-3.7 2.3 1.8 3.9 4.3 3.9 7.2 0 3.1-2.2 5.7-6.2 5.7Z",
  percepcao: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  inteligencia: "M12 7c-2.1-1.6-5-2-8-1.6v12.8c3-.4 5.9 0 8 1.6 2.1-1.6 5-2 8-1.6V5.4C17 5 14.1 5.4 12 7Zm0 0v12.8",
  raciocinio: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM15.4 8.6l-2.1 4.7-4.7 2.1 2.1-4.7Z",
  talentos: "M12 3l1.9 7.1L21 12l-7.1 1.9L12 21l-1.9-7.1L3 12l7.1-1.9Z",
  tecnicas: "M14.5 3.5l6 6-2.4 2.4-6-6ZM13.3 7.1 4 16.4 7.6 20l9.3-9.3",
  conhecimentos: "M8 4h10a2 2 0 0 1 0 4h-1v10a2 2 0 0 1-2 2H6a2 2 0 0 1 0-4h1V6a2 2 0 0 1 2-2m-2 12h8M10.5 8.5h4M10.5 11.5h4",
  arcanismo: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 6.5l1.4 4.1 4.1 1.4-4.1 1.4-1.4 4.1-1.4-4.1L6.5 12l4.1-1.4Z",
  furtividade: "M4.5 20.5c0-7.5 2.8-16 7.5-16s7.5 8.5 7.5 16M8.4 20.5c0-4.3 1.6-8.5 3.6-8.5s3.6 4.2 3.6 8.5",
  sobrevivencia: "M5 19C5 10 10 5 19 5c0 9-5 14-14 14Zm0 0 8.5-8.5",
  alvo: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM12 11.2v1.6M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4",
  punho: "M5.5 13.5 12 7l6.5 6.5M8 11v8h8v-8M4 6.5 7 4M20 6.5 17 4",
  lingua: "M4 5h16v10H10l-4 4v-4H4ZM8 9h8M8 12h5",
};

export function IconeFicha({ nome, tamanho = 22 }: { nome: NomeIconeFicha; tamanho?: number }) {
  return (
    <svg className="resumo-icone" width={tamanho} height={tamanho} viewBox="0 0 24 24" {...decorativo}>
      <path d={ICONES[nome]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Medalhões ---------- */

export type TipoMedalhao = "vida" | "proposito" | "defesa";

const SIMBOLO_MEDALHAO: Record<TipoMedalhao, string> = {
  vida: "M24 36s-12-7.2-12-16.2a6.6 6.6 0 0 1 12-3.8 6.6 6.6 0 0 1 12 3.8C36 28.8 24 36 24 36Z",
  proposito: "M24 8l3.2 12.8L40 24l-12.8 3.2L24 40l-3.2-12.8L8 24l12.8-3.2Z",
  defesa: "M24 9l12 4.4v9.2c0 7.8-5.2 13-12 15.4-6.8-2.4-12-7.6-12-15.4v-9.2Z",
};

/** Medalhão circular com aro dourado de oito pontas e o símbolo do recurso. */
export function Medalhao({ tipo }: { tipo: TipoMedalhao }) {
  const ouro = `medalhao-ouro-${useId().replace(/:/g, "")}`;
  return (
    <svg className={`resumo-medalhao resumo-medalhao--${tipo}`} viewBox="0 0 48 48" {...decorativo}>
      <defs>
        <linearGradient id={ouro} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e6bf" />
          <stop offset=".35" stopColor="#ddb872" />
          <stop offset=".65" stopColor="#7a5a26" />
          <stop offset="1" stopColor="#efd59c" />
        </linearGradient>
      </defs>
      <g className="resumo-medalhao__pontas">
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d="M24 .6 26.2 5h-4.4Z" transform={`rotate(${i * 45} 24 24)`} />
        ))}
      </g>
      <circle cx="24" cy="24" r="19" className="resumo-medalhao__aro" fill={`url(#${ouro})`} />
      <circle cx="24" cy="24" r="15.6" className="resumo-medalhao__miolo" />
      <circle cx="24" cy="24" r="15.6" fill="none" stroke="#0006" strokeWidth="1" />
      <path d={SIMBOLO_MEDALHAO[tipo]} className="resumo-medalhao__simbolo" transform="translate(24 24) scale(.62) translate(-24 -24)" />
      <ellipse cx="19" cy="16" rx="7" ry="3.4" fill="#fff" opacity=".22" transform="rotate(-24 19 16)" />
    </svg>
  );
}

/* ---------- Ornamentos dos quadros e da folha ---------- */

/** Remate em flor sobre a borda de cima dos quadros. */
export function Remate() {
  return (
    <svg className="resumo-remate" viewBox="0 0 64 24" {...decorativo}>
      <path d="M4 22c7 0 11-4 15-6.5 4.5-2.6 8-2.4 13 2.5 5-4.9 8.5-5.1 13-2.5 4 2.5 8 6.5 15 6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M32 1.5c-3.4 4.4-3.4 9 0 12.5 3.4-3.5 3.4-8.1 0-12.5Z" fill="currentColor" />
      <path d="M30.6 13.4c-3.2-4.2-8.8-4.6-11.4-.8 3.2 2.4 8 2.6 11.4.8ZM33.4 13.4c3.2-4.2 8.8-4.6 11.4-.8-3.2 2.4-8 2.6-11.4.8Z" fill="currentColor" opacity=".85" />
      <path d="m32 15.5 2.6 2.6-2.6 2.6-2.6-2.6Z" fill="currentColor" />
    </svg>
  );
}

/** Voluta pequena ao lado do título de cada quadro. */
export function VolutaTitulo({ espelhada = false }: { espelhada?: boolean }) {
  return (
    <svg className={`resumo-voluta-titulo ${espelhada ? "resumo-voluta-titulo--espelhada" : ""}`.trim()} viewBox="0 0 44 16" {...decorativo}>
      <path d="M43 8H24c-4 0-6-5-10.5-5C9.8 3 8.4 6 10.4 8c1.6 1.6 4.3.8 3.8-1.4M24 8c-4 0-6 5-10.5 5-3.7 0-5.1-3-3.1-5" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="m2 8 3-3 3 3-3 3Z" fill="currentColor" />
    </svg>
  );
}

/** Crista em arco apontado sobre o quadro de Recursos. */
export function Crista() {
  return (
    <svg className="resumo-crista" viewBox="0 0 150 44" {...decorativo}>
      <path d="M2 43c26 0 42-6 53-18L75 5l20 20c11 12 27 18 53 18Z" fill="#f7e9cc" stroke="#6a4a15" strokeWidth="2" />
      <path d="M16 43c20-1 33-6 42-15L75 11l17 17c9 9 22 14 42 15" fill="none" stroke="#b08a45" strokeWidth="1" />
      <path d="M75 15.5 78 24l8.5 3-8.5 3-3 8.5-3-8.5-8.5-3 8.5-3Z" fill="#7a5a26" />
      <circle cx="75" cy="27" r="2" fill="#f7e9cc" />
    </svg>
  );
}

/** Asa do pingente pendurado sob o quadro de Recursos. */
export function Asa({ lado }: { lado: "esquerda" | "direita" }) {
  return (
    <svg className={`resumo-asa resumo-asa--${lado}`} viewBox="0 0 56 30" {...decorativo}>
      <path d="M55 12C45 2 27-1 3 4c11 1.6 18 4.4 22 7.6C16 10.6 9 11.6 3 14.6c10 .6 17 2.6 21.6 5.4-6 .2-11 2-14.6 5 13 .8 24-2 32-7.2 5-3.2 9-4.8 13-5.8Z" fill="#b08a45" stroke="#6a4a15" strokeWidth="1" />
      <path d="M52 12.6C40 7 28 6 14 7.6M50 13.6c-10 0-19 1.4-27 3.8M47 15.2c-7 2-13 4.6-19 8" fill="none" stroke="#6a4a15" strokeWidth=".8" opacity=".8" />
    </svg>
  );
}

/** Canto grande da folha: moldura dupla, volutas e folhas. */
export function CantoDaFolha({ posicao }: { posicao: "se" | "sd" | "ie" | "id" }) {
  return (
    <svg className={`resumo-canto-folha resumo-canto-folha--${posicao}`} viewBox="0 0 110 110" {...decorativo}>
      <path d="M3 107V30C3 15 15 3 30 3h77" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M10 107V35c0-14 11-25 25-25h72" fill="none" stroke="currentColor" strokeWidth="1" opacity=".7" />
      <path d="M22 22c10-16 34-14 36 2 1 11-12 14-16 6-2-5 3-9 7-6M22 22c-16 10-14 34 2 36 11 1 14-12 6-16-5-2-9 3-6 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M60 15c9-4 19-4 27 0M15 60c-4 9-4 19 0 27" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M68 13c4-6 11-7 15-3-4 4-10 5-15 3ZM13 68c-6 4-7 11-3 15 4-4 5-10 3-15ZM88 16c3-3 8-3 10 0-3 2-7 2-10 0ZM16 88c-3 3-3 8 0 10 2-3 2-7 0-10Z" fill="currentColor" />
      <circle cx="22" cy="22" r="5" fill="currentColor" />
      <path d="m22 13 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" fill="var(--resumo-pergaminho, #f3deba)" transform="scale(.55) translate(18 18)" />
    </svg>
  );
}

/** Flor vertical no meio das bordas laterais da folha. */
export function FlorDaBorda({ lado }: { lado: "esquerda" | "direita" }) {
  return (
    <svg className={`resumo-flor resumo-flor--${lado}`} viewBox="0 0 24 120" {...decorativo}>
      <path d="M12 2v116" stroke="currentColor" strokeWidth="1" />
      <path d="M12 38c-7 7-7 15 0 22 7-7 7-15 0-22ZM12 60c-7 7-7 15 0 22 7-7 7-15 0-22Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 52c-3 3-3 6 0 8 3-2 3-5 0-8ZM12 68c-3 3-3 6 0 8 3-2 3-5 0-8Z" fill="currentColor" />
      <path d="m12 56 4 4-4 4-4-4Z" fill="currentColor" />
      <path d="M12 30c-4-2-7-6-6-10 4 1 6 5 6 10Zm0 0c4-2 7-6 6-10-4 1-6 5-6 10ZM12 90c-4 2-7 6-6 10 4-1 6-5 6-10Zm0 0c4 2 7 6 6 10-4-1-6-5-6-10Z" fill="currentColor" opacity=".8" />
    </svg>
  );
}
