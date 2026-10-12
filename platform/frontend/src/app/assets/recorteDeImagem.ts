import { useEffect, useState } from "react";

/*
 * Ajuste automático das imagens de itens e cartas (redesenhar-aba-cartas, pedido do usuário em 2026-09-30).
 * Muitas fotos enviadas trazem o objeto pequeno no meio de um fundo liso, e na bolsa ou na carta ele some.
 * O ajuste:
 * - apaga o fundo liso ligado às bordas (a mesma ideia do `remover_fundo` do preparar_arte.py);
 * - recorta a sobra em volta do objeto, com uma margem pequena.
 * Imagens sem fundo liso (uma cena, um retrato) ficam como estão. Tudo roda no navegador, uma vez por imagem.
 */

export interface Recorte { x: number; y: number; largura: number; altura: number; fundoRemovido: boolean }

/** Diferença máxima de cor (soma dos canais) para um pixel contar como o fundo. */
const TOLERANCIA = 60;
/** Margem em volta do objeto, em fração do maior lado do recorte. */
const MARGEM = .04;
/** Abaixo disto o fundo liso é pouco: a imagem é uma cena e fica inteira. */
const FUNDO_MINIMO = .12;

function corDasBordas(dados: Uint8ClampedArray, largura: number, altura: number): [number, number, number, number] {
  const amostras: number[][] = [];
  const pegar = (x: number, y: number) => { const i = (y * largura + x) * 4; amostras.push([dados[i]!, dados[i + 1]!, dados[i + 2]!, dados[i + 3]!]); };
  for (let x = 0; x < largura; x += Math.max(1, Math.floor(largura / 40))) { pegar(x, 0); pegar(x, altura - 1); }
  for (let y = 0; y < altura; y += Math.max(1, Math.floor(altura / 40))) { pegar(0, y); pegar(largura - 1, y); }
  const mediana = (c: number) => amostras.map((a) => a[c]!).sort((a, b) => a - b)[Math.floor(amostras.length / 2)]!;
  return [mediana(0), mediana(1), mediana(2), mediana(3)];
}

/**
 * Marca o fundo (ligado às bordas e parecido com a cor delas, ou transparente) e calcula o recorte do objeto.
 * Pura: recebe os pixels RGBA e devolve a máscara do fundo e o recorte; `null` quando não há o que ajustar.
 */
export function analisarImagem(dados: Uint8ClampedArray, largura: number, altura: number): { fundo: Uint8Array; recorte: Recorte } | null {
  const [r, g, b, a] = corDasBordas(dados, largura, altura);
  const transparente = a < 16;
  const ehFundo = (p: number) => {
    const i = p * 4;
    if (dados[i + 3]! < 16) return true;
    if (transparente) return false;
    return Math.abs(dados[i]! - r) + Math.abs(dados[i + 1]! - g) + Math.abs(dados[i + 2]! - b) <= TOLERANCIA;
  };
  const fundo = new Uint8Array(largura * altura);
  const pilha: number[] = [];
  const semear = (x: number, y: number) => { const p = y * largura + x; if (!fundo[p] && ehFundo(p)) { fundo[p] = 1; pilha.push(p); } };
  for (let x = 0; x < largura; x += 1) { semear(x, 0); semear(x, altura - 1); }
  for (let y = 0; y < altura; y += 1) { semear(0, y); semear(largura - 1, y); }
  while (pilha.length) {
    const p = pilha.pop()!;
    const x = p % largura;
    const y = (p - x) / largura;
    if (x > 0) semear(x - 1, y);
    if (x < largura - 1) semear(x + 1, y);
    if (y > 0) semear(x, y - 1);
    if (y < altura - 1) semear(x, y + 1);
  }
  let total = 0;
  let x0 = largura, y0 = altura, x1 = -1, y1 = -1;
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      if (fundo[y * largura + x]) { total += 1; continue; }
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0 || total / (largura * altura) < FUNDO_MINIMO) return null;
  const margem = Math.round(MARGEM * Math.max(x1 - x0 + 1, y1 - y0 + 1));
  x0 = Math.max(0, x0 - margem); y0 = Math.max(0, y0 - margem);
  x1 = Math.min(largura - 1, x1 + margem); y1 = Math.min(altura - 1, y1 + margem);
  return { fundo, recorte: { x: x0, y: y0, largura: x1 - x0 + 1, altura: y1 - y0 + 1, fundoRemovido: !transparente } };
}

/**
 * O jsdom (testes) não tem canvas: lá a imagem passa direto, sem ajuste, como num navegador sem canvas.
 * O algoritmo é testado à parte, em `analisarImagem`.
 */
const SEM_CANVAS = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);

/** Lado máximo da imagem ajustada: basta para a bolsa, a carta e o livro aberto. */
const LADO_MAXIMO = 1024;
const prontas = new Map<string, Promise<string>>();

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => { const imagem = new Image(); imagem.onload = () => ok(imagem); imagem.onerror = erro; imagem.src = src; });
}

/** Imagem ajustada (data URL PNG); a original quando não há o que ajustar ou o navegador não tem canvas. */
export function ajustarImagem(src: string): Promise<string> {
  const conhecida = prontas.get(src);
  if (conhecida) return conhecida;
  const promessa = (async () => {
    const imagem = await carregar(src);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    const largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
    const altura = Math.max(1, Math.round(imagem.naturalHeight * escala));
    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    const contexto = tela.getContext("2d", { willReadFrequently: true });
    if (!contexto) return src;
    contexto.drawImage(imagem, 0, 0, largura, altura);
    const pixels = contexto.getImageData(0, 0, largura, altura);
    const analise = analisarImagem(pixels.data, largura, altura);
    if (!analise) return src;
    if (analise.recorte.fundoRemovido) {
      for (let p = 0; p < analise.fundo.length; p += 1) if (analise.fundo[p]) pixels.data[p * 4 + 3] = 0;
      contexto.putImageData(pixels, 0, 0);
    }
    const { x, y, largura: w, altura: h } = analise.recorte;
    const saida = document.createElement("canvas");
    saida.width = w;
    saida.height = h;
    saida.getContext("2d")?.drawImage(tela, x, y, w, h, 0, 0, w, h);
    return saida.toDataURL("image/png");
  })().catch(() => src);
  prontas.set(src, promessa);
  return promessa;
}

/**
 * A imagem ajustada, para usar no `src`. Enquanto o ajuste roda, devolve `undefined` (a reserva continua no
 * lugar), para a imagem não aparecer pequena e depois saltar.
 */
export function useImagemAjustada(src: string | null | undefined): string | undefined {
  const [ajustada, setAjustada] = useState<{ src: string; resultado: string } | null>(null);
  useEffect(() => {
    if (!src || SEM_CANVAS) return undefined;
    let ativo = true;
    void ajustarImagem(src).then((resultado) => { if (ativo) setAjustada({ src, resultado }); });
    return () => { ativo = false; };
  }, [src]);
  if (!src) return undefined;
  if (SEM_CANVAS) return src;
  return ajustada?.src === src ? ajustada.resultado : undefined;
}

/** Só para testes. */
export function esquecerImagensAjustadas() { prontas.clear(); }
