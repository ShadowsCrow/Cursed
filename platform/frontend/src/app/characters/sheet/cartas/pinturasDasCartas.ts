import { useEffect, useState } from "react";

/*
 * Pinturas da aba Cartas (redesenhar-aba-cartas, D9): a gravura do cabeçalho e uma faixa por categoria,
 * com o medalhão e o emblema já pintados. Todas são opcionais. Cada uma carrega sozinha: uma categoria
 * sem pintura não afeta as outras. Enquanto carrega, ou se faltar, a faixa mostra a reserva (degradê com
 * o medalhão em SVG), que tem a mesma altura; nada se move quando a pintura chega. O resultado vale para
 * a sessão inteira, e as cartas da mesma categoria dividem o mesmo carregamento.
 */
export type EstadoPintura = "carregando" | "pronta" | "ausente";

const PASTA = "/arte/cartas";
export const ARTE_DA_GRAVURA = `${PASTA}/cartas-gravura.webp`;
/**
 * O grimório do detalhe (D8 revisto): o livro aberto com as páginas em branco e a cena de velas em volta,
 * numa pintura só, na proporção do diálogo do conceito (1395 × 790). O conteúdo fica por cima dela.
 */
export const ARTE_DO_GRIMORIO = `${PASTA}/cartas-detalhe-livro.webp`;
/**
 * O editor de cartas (simplificar-criacao-de-cartas, D9): o livro do conceito do editor com as páginas em
 * branco e sem os marcadores (1536 × 1024), o marcador de couro vazio (comum e ativo) e o selo de cera vazio
 * do Publicar. Os textos e emblemas vêm por cima, em SVG/CSS.
 */
export const ARTE_DO_EDITOR = `${PASTA}/cartas-editor-livro.webp`;
export const ARTE_DO_MARCADOR = `${PASTA}/cartas-editor-marcador.webp`;
export const ARTE_DO_MARCADOR_ATIVO = `${PASTA}/cartas-editor-marcador-ativo.webp`;
export const ARTE_DO_SELO = `${PASTA}/cartas-editor-selo.webp`;
export const arteDaFaixa = (categoria: string) => `${PASTA}/cartas-faixa-${categoria.replaceAll("_", "-")}.webp`;
/** Medalhão da arte da categoria, recortado em círculo, posto por cima do centro da faixa da carta. */
export const arteDoMedalhao = (categoria: string) => `${PASTA}/cartas-medalhao-${categoria.replaceAll("_", "-")}.webp`;
/** Arte quadrada da categoria no quadro da página esquerda do grimório, com a moldura de filigrana pintada. */
export const arteDaCategoria = (categoria: string) => `${PASTA}/cartas-arte-${categoria.replaceAll("_", "-")}.webp`;

const estados = new Map<string, EstadoPintura>();
const pendentes = new Map<string, Promise<EstadoPintura>>();

function carregar(url: string): Promise<EstadoPintura> {
  const existente = pendentes.get(url);
  if (existente) return existente;
  const promessa = new Promise<EstadoPintura>((resolver) => {
    const imagem = new Image();
    imagem.onload = () => resolver("pronta");
    imagem.onerror = () => resolver("ausente");
    imagem.src = url;
  }).then((estado) => { estados.set(url, estado); return estado; });
  pendentes.set(url, promessa);
  return promessa;
}

export function usePintura(url: string): EstadoPintura {
  // O resultado guardado vale só para a URL em que foi medido; trocar a URL volta ao cache ou a "carregando".
  const [medido, setMedido] = useState<{ url: string; estado: EstadoPintura } | null>(null);
  useEffect(() => {
    if (estados.has(url) || typeof Image === "undefined") return undefined;
    let ativo = true;
    void carregar(url).then((estado) => { if (ativo) setMedido({ url, estado }); });
    return () => { ativo = false; };
  }, [url]);
  if (medido?.url === url) return medido.estado;
  return estados.get(url) ?? (typeof Image === "undefined" ? "ausente" : "carregando");
}

/** Só para testes: esquece o carregamento das pinturas. */
export function esquecerPinturasDasCartas() { estados.clear(); pendentes.clear(); }
