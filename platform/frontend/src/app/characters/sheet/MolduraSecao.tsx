import type { ReactNode } from "react";

import { MolduraOrnamentada } from "../../../ui/Ornamentos";

export type NomeSecao =
  | "resumo" | "informacoes" | "personalidade" | "atributos" | "pericias"
  | "equipamentos" | "inventario" | "status" | "efeitos" | "cartas";

/** Ícone de linha de cada seção da ficha (barra de abas e medalhão da moldura); sempre decorativo. */
const TRACOS: Record<NomeSecao, string[]> = {
  resumo: ["M5 4.5h14v15H5z", "M8 8h8M8 11.5h8M8 15h5", "M5 4.5 3.5 6v13.5L5 19.5M19 4.5 20.5 6v13.5L19 19.5"],
  informacoes: ["M12 3.5a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Z", "M5 20.5c.4-4.6 3.3-7.2 7-7.2s6.6 2.6 7 7.2", "M12 13.3l1.4 2.4L12 20.5l-1.4-4.8Z"],
  personalidade: ["M3.5 5.5c3-1.2 6.2-1 8.5 1v7.5c0 3.6-2.2 6-5 6.5-2.4-1.2-3.5-3.8-3.5-6.5Z",
    "M12 6.5c2.3-2 5.5-2.2 8.5-1v8.5c0 2.7-1.1 5.3-3.5 6.5-1.4-.3-2.6-1-3.5-2", "M5.8 10.5c.7-.6 1.7-.6 2.4 0M15.8 10.5c.7-.6 1.7-.6 2.4 0M6.3 14.5c1 .8 2 .8 3 0"],
  atributos: ["M12 3l2.4 5.6 6.1.5-4.6 4 1.4 5.9L12 15.9 6.7 19l1.4-5.9-4.6-4 6.1-.5Z"],
  pericias: ["M4 20 14.5 9.5", "M13 5.5 18.5 11l2-2-5.5-5.5Z", "M20 20 9.5 9.5", "M11 5.5 5.5 11l-2-2L9 3.5Z"],
  equipamentos: ["M7 3.5 4 5.5v5.2c0 5 3.4 8.3 8 9.8 4.6-1.5 8-4.8 8-9.8V5.5l-3-2", "M7 3.5c1.2 1.7 3 2.6 5 2.6s3.8-.9 5-2.6", "M12 6.1v14.2"],
  inventario: ["M6 8.5a6 6 0 0 1 12 0V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z", "M9 5.5V4a3 3 0 0 1 6 0v1.5", "M8.5 13h7v4.5h-7z", "M6 10h12"],
  status: ["M12 3 4.5 5.8v5.7c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V5.8z", "M8.5 12h7M12 8.5v7"],
  efeitos: ["M12 21c-3.9 0-6.2-2.6-6.2-5.7 0-3.5 3-5.1 3.5-8.7 2.3 1.4 3.1 3.4 2.9 5.2 1.3-.6 2.1-2.1 2.1-3.7 2.3 1.8 3.9 4.3 3.9 7.2 0 3.1-2.2 5.7-6.2 5.7Z"],
  cartas: ["M4 6.5 12.5 4l3 11-8.5 2.5Z", "M10.5 6.2 17 4.5 20 16l-8.2 2.3", "M8 9.5l2.5 4"],
};

export function IconeSecao({ nome, tamanho = 20 }: { nome: NomeSecao; tamanho?: number }) {
  return (
    <svg className="icone-secao" viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {TRACOS[nome].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/**
 * Moldura comum das seções da ficha (visual-da-ficha): pergaminho com a moldura dourada recortada e um
 * cabeçalho com medalhão, título, subtítulo e as ferramentas da seção à direita.
 */
export function MolduraSecao({ nome, titulo, subtitulo, ferramentas, className = "", children }: {
  nome: NomeSecao; titulo: string; subtitulo?: string; ferramentas?: ReactNode; className?: string; children: ReactNode;
}) {
  return (
    <MolduraOrnamentada tipo="painel" fundo="pergaminho" className={`moldura-secao moldura-secao--${nome} ${className}`.trim()}>
      <header className="moldura-secao__cabecalho">
        <span className="moldura-secao__medalhao" aria-hidden="true"><IconeSecao nome={nome} tamanho={30} /></span>
        <div className="moldura-secao__titulos">
          <h2 className="moldura-secao__titulo">{titulo}</h2>
          {subtitulo && <p className="moldura-secao__subtitulo">{subtitulo}</p>}
        </div>
        {ferramentas && <div className="moldura-secao__ferramentas">{ferramentas}</div>}
      </header>
      <div className="moldura-secao__corpo">{children}</div>
    </MolduraOrnamentada>
  );
}
