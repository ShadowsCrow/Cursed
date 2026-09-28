import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useMatch, useParams } from "react-router";

import { ARTE } from "../../../ui/Arte";
import { FaixaDeAbertura, Icone, MolduraOrnamentada } from "../../../ui/Ornamentos";
import { routes } from "../../routes";
import { acharDocumento, carregarDocumento, DOCUMENTOS } from "./documentos";
import visaoGeral from "./visao-geral.md?raw";

const Leitura = lazy(() => import("./Leitura"));

function Carregando() {
  return <p role="status">Abrindo o texto…</p>;
}

function Documento({ slug }: { slug: string }) {
  const documento = acharDocumento(slug);
  const texto = useQuery({
    queryKey: ["biblioteca", slug],
    enabled: Boolean(documento),
    staleTime: Infinity,
    queryFn: () => carregarDocumento(documento!),
  });
  if (!documento) return <p role="alert">Este documento não está na Biblioteca.</p>;
  if (texto.isPending) return <Carregando />;
  if (texto.isError) return <p role="alert">{texto.error.message}</p>;
  return <Suspense fallback={<Carregando />}><Leitura markdown={texto.data} indice /></Suspense>;
}

function IndiceDeRegras() {
  return (
    <>
      <h1>Regras</h1>
      <p>O livro de regras do Cursed, só para leitura, na versão publicada da plataforma.</p>
      <ul className="regras-lista">
        {DOCUMENTOS.map((documento) => (
          <li key={documento.slug}>
            <NavLink to={routes.documento(documento.slug)}><Icone nome="pergaminho" tamanho={18} /> {documento.titulo}</NavLink>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Biblioteca: menu lateral com Visão geral e Regras; o texto aparece em pergaminho. */
export function Biblioteca() {
  const { documento } = useParams<"documento">();
  const emRegras = Boolean(useMatch({ path: routes.regras(), end: false }));
  const atual = acharDocumento(documento);
  const faixa = emRegras ? "faixa-regras" : "faixa-visao-geral";

  return (
    <div className="secao-lateral">
      <aside className="lateral" aria-labelledby="biblioteca-titulo">
        <h2 id="biblioteca-titulo" className="lateral__titulo">Biblioteca</h2>
        <nav aria-label="Seções da Biblioteca">
          <ul className="biblioteca__menu">
            <li><NavLink to={routes.biblioteca()} end><Icone nome="rosa" tamanho={18} /> Visão geral</NavLink></li>
            <li>
              <NavLink to={routes.regras()} end><Icone nome="livro" tamanho={18} /> Regras</NavLink>
              {emRegras && (
                <ul className="biblioteca__submenu" aria-label="Documentos de regras">
                  {DOCUMENTOS.map((item) => (
                    <li key={item.slug}><NavLink to={routes.documento(item.slug)}>{item.titulo}</NavLink></li>
                  ))}
                </ul>
              )}
            </li>
          </ul>
        </nav>
      </aside>
      <div className="painel-principal">
        <MolduraOrnamentada tipo="painel" className="biblioteca__painel">
          <div className="painel__faixa sangria-topo" aria-hidden="true">
            <FaixaDeAbertura src={`${ARTE}/${faixa}-1536.webp`} srcSet={`${ARTE}/${faixa}-768.webp 768w, ${ARTE}/${faixa}-1536.webp 1536w`}
              largura={1536} altura={512}>
              <p className="biblioteca__faixa-titulo">{emRegras ? atual?.titulo ?? "Regras" : "Visão geral"}</p>
              <p>{emRegras ? "O livro de regras do Cursed." : "O que é o Cursed e como uma campanha começa."}</p>
            </FaixaDeAbertura>
          </div>
          <MolduraOrnamentada as="article" tipo="painel" fundo="pergaminho" className="leitura">
            {!emRegras && <Suspense fallback={<Carregando />}><Leitura markdown={visaoGeral} /></Suspense>}
            {emRegras && !documento && <IndiceDeRegras />}
            {emRegras && documento && <Documento key={documento} slug={documento} />}
          </MolduraOrnamentada>
        </MolduraOrnamentada>
      </div>
    </div>
  );
}
