import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router";

import { routes } from "../../routes";
import { documentoDoArquivo } from "./documentos";
import { ancora, titulosDoIndice } from "./markdown";

/*
 * Leitura de Markdown da Biblioteca (design D9). Sem HTML bruto: `react-markdown` não executa HTML
 * embutido. Tabelas ficam num contêiner rolável próprio; títulos `##` ganham âncora para o índice.
 * Este módulo é carregado só na Biblioteca (import dinâmico).
 */

function textoDe(filhos: ReactNode): string {
  return Children.toArray(filhos).map((filho) => {
    if (typeof filho === "string" || typeof filho === "number") return String(filho);
    if (isValidElement<{ children?: ReactNode }>(filho)) return textoDe(filho.props.children);
    return "";
  }).join("");
}

/** Link entre documentos (`Carga.md`, `Carga.md#secao`) vira link da Biblioteca; externos abrem à parte. */
function destinoDoLink(href: string | undefined): { interno: string } | { externo: string } | null {
  if (!href) return null;
  if (href.startsWith("#") || href.startsWith("/")) return { interno: href };
  const [caminho = "", secao] = href.split("#");
  if (caminho.toLowerCase().endsWith(".md")) {
    const documento = documentoDoArquivo(decodeURIComponent(caminho.slice(caminho.lastIndexOf("/") + 1)));
    if (documento) return { interno: `${routes.documento(documento.slug)}${secao ? `#${secao}` : ""}` };
    return null;
  }
  return { externo: href };
}

const COMPONENTES: Components = {
  h2: ({ children }) => <h2 id={ancora(textoDe(children))}>{children}</h2>,
  h3: ({ children }) => <h3 id={ancora(textoDe(children))}>{children}</h3>,
  table: ({ children }) => (
    <div className="leitura__tabela" role="region" aria-label="Tabela" tabIndex={0}><table>{children}</table></div>
  ),
  a: ({ href, children }) => {
    const destino = destinoDoLink(href);
    if (destino === null) return <span>{children}</span>;
    if ("externo" in destino) return <a href={destino.externo} target="_blank" rel="noreferrer noopener">{children}</a>;
    return destino.interno.startsWith("#") ? <a href={destino.interno}>{children}</a> : <Link to={destino.interno}>{children}</Link>;
  },
  // Blocos de código podem rolar na horizontal: precisam ser alcançáveis pelo teclado.
  pre: ({ children }) => <pre tabIndex={0}>{children}</pre>,
  img: ({ alt }) => <span>{alt}</span>,
};

export default function Leitura({ markdown, indice = false }: { markdown: string; indice?: boolean }) {
  const titulos = indice ? titulosDoIndice(markdown) : [];
  return (
    <>
      {titulos.length > 1 && (
        <nav className="leitura__indice" aria-label="Seções do documento">
          <h2>Nesta página</h2>
          <ol>{titulos.map((titulo) => <li key={titulo.id}><a href={`#${titulo.id}`}>{titulo.texto}</a></li>)}</ol>
        </nav>
      )}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTES}>{markdown}</ReactMarkdown>
    </>
  );
}
