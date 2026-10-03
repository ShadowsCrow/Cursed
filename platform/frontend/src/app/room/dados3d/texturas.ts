/**
 * Texturas das faces dos dados 3D (melhorias-da-sala, item 3, D11): a pedra azul-noite pintada pelo Codex,
 * com filete dourado na borda da face e o número em dourado na fonte de títulos do sistema.
 * Cada face é mapeada num polígono canônico (o mesmo para todas as faces do sólido), de modo que uma
 * textura serve a qualquer face e trocar o número de uma face é só trocar o material dela.
 */
import { centroDaFace, cross, dot, solido, sub, unitario, type Forma, type Vetor } from "./geometria";

export const LADO_DA_TEXTURA = 256;
const MARGEM = 0.06;
export const ARTE_DA_PEDRA = "/arte/sala/dados-pedra.webp";
/**
 * A Cormorant Garamond do sistema com os algarismos alinhados (`lnum`) ligados: a padrão tem algarismos
 * de estilo antigo, em que o 1 parece um I e o 0 um o, e o canvas não liga o recurso sozinho.
 */
const FAMILIA_DOS_NUMEROS = "Cursed Numeros dos Dados";
const ARQUIVO_DA_FONTE = "/fonts/cormorant-garamond-latin-700-normal.woff2";
const FONTE = `"${FAMILIA_DOS_NUMEROS}", "Cormorant Garamond", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;

/**
 * Coordenadas 2D de cada vértice de uma face, no plano dela, com "direita" completando a base vista de fora.
 * "Cima" aponta para o primeiro vértice (o ápice da pipa no d10, a ponta dos triângulos e do pentágono);
 * no d6 aponta para o meio da primeira aresta, para o número ficar paralelo às bordas, e não na diagonal.
 */
function planoDaFace(forma: Forma, face: number): [number, number][] {
  const s = solido(forma);
  const indices = s.faces[face]!;
  const centro = centroDaFace(s, face);
  const normal = s.normais[face]!;
  const v0 = s.vertices[indices[0]!]!;
  const v1 = s.vertices[indices[1]!]!;
  const alvo: Vetor = forma === "d6" ? [(v0[0] + v1[0]) / 2, (v0[1] + v1[1]) / 2, (v0[2] + v1[2]) / 2] : v0;
  const cima = unitario(sub(alvo, centro));
  const direita = cross(cima, normal);
  return indices.map((i) => {
    const d: Vetor = sub(s.vertices[i]!, centro);
    return [dot(d, direita), dot(d, cima)];
  });
}

/** UV (0 a 1, v para cima) de cada vértice da face, cabendo no quadrado com uma margem. */
export function uvDaFace(forma: Forma, face: number): [number, number][] {
  const pontos = planoDaFace(forma, face);
  const canonico = planoDaFace(forma, 0);
  const alcance = Math.max(...canonico.flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]));
  const k = (0.5 - MARGEM) / alcance;
  return pontos.map(([x, y]) => [0.5 + x * k, 0.5 + y * k]);
}

/** Polígono canônico em pixels do canvas (y para baixo). */
function poligonoNoCanvas(forma: Forma): [number, number][] {
  return uvDaFace(forma, 0).map(([u, v]) => [u * LADO_DA_TEXTURA, (1 - v) * LADO_DA_TEXTURA]);
}

/** Altura da tinta do número e largura máxima, em frações do lado da textura. */
const ALTURA_DO_NUMERO: Record<Forma, number> = { d4: 0.19, d6: 0.36, d8: 0.25, d10: 0.24, d12: 0.28, d20: 0.22 };
const LARGURA_DO_NUMERO: Record<Forma, number> = { d4: 0.2, d6: 0.56, d8: 0.36, d10: 0.3, d12: 0.46, d20: 0.34 };

/** Centro de área do polígono (na pipa do d10 fica no meio da face, e não puxado para o ápice). */
function centroDeArea(poligono: [number, number][]): [number, number] {
  let area = 0;
  let cx = 0;
  let cy = 0;
  poligono.forEach(([x0, y0], i) => {
    const [x1, y1] = poligono[(i + 1) % poligono.length]!;
    const cruz = x0 * y1 - x1 * y0;
    area += cruz;
    cx += (x0 + x1) * cruz;
    cy += (y0 + y1) * cruz;
  });
  return [cx / (3 * area), cy / (3 * area)];
}

function dourado(ctx: CanvasRenderingContext2D, y0: number, y1: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#fff0c2");
  g.addColorStop(0.45, "#e7bf6a");
  g.addColorStop(1, "#9a6a25");
  return g;
}

/**
 * Escreve o número com o centro da tinta em (x, y). A fonte de títulos tem algarismos de estilo antigo
 * (3, 4, 5, 7 e 9 descem; 6 e 8 sobem), e o canvas não liga os alinhados. Por isso a posição e a escala
 * vêm da tinta medida de cada número: todos ficam centrados e com a mesma altura.
 */
function escreverNumero(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number,
  altura: number, larguraMaxima: number, angulo: number) {
  const BASE = 100;
  ctx.save();
  ctx.font = `700 ${BASE}px ${FONTE}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const medida = ctx.measureText(texto);
  const esquerda = medida.actualBoundingBoxLeft;
  const direita = medida.actualBoundingBoxRight;
  const acima = medida.actualBoundingBoxAscent;
  const abaixo = medida.actualBoundingBoxDescent;
  const larguraDaTinta = Math.max(1, esquerda + direita);
  // 6 e 9 levam um traço embaixo, para não se confundirem de cabeça para baixo; ele entra na centralização.
  const traco = texto === "6" || texto === "9";
  const alturaDoTraco = traco ? (acima + abaixo) * 0.1 : 0;
  const folga = traco ? (acima + abaixo) * 0.12 : 0;
  const alturaDoBloco = Math.max(1, acima + abaixo + folga + alturaDoTraco);
  const escala = Math.min(altura / (acima + abaixo || 1), larguraMaxima / larguraDaTinta);
  ctx.translate(x, y);
  ctx.rotate(angulo);
  ctx.scale(escala, escala);
  // Origem do texto para o bloco (tinta + traço) ficar centrado em 0, 0.
  const ox = -(direita - esquerda) / 2;
  const oy = acima - alturaDoBloco / 2;
  ctx.lineJoin = "round";
  ctx.lineWidth = (altura * 0.13) / escala;
  ctx.strokeStyle = "rgba(10, 8, 20, 0.85)";
  ctx.strokeText(texto, ox, oy);
  ctx.fillStyle = dourado(ctx, -alturaDoBloco / 2, alturaDoBloco / 2);
  ctx.fillText(texto, ox, oy);
  if (traco) {
    const topo = oy + abaixo + folga;
    ctx.strokeRect(-larguraDaTinta / 2, topo, larguraDaTinta, alturaDoTraco);
    ctx.fillRect(-larguraDaTinta / 2, topo, larguraDaTinta, alturaDoTraco);
  }
  ctx.restore();
}

/**
 * Desenha a textura de uma face. `rotulos` tem um número (faces comuns) ou três (d4, um por vértice,
 * na ordem dos vértices da face). `deslocamento` varia o pedaço da pedra, para as faces não ficarem iguais.
 */
export function desenharFace(ctx: CanvasRenderingContext2D, forma: Forma, rotulos: string[], pedra: CanvasImageSource | null,
  deslocamento = 0) {
  const lado = LADO_DA_TEXTURA;
  ctx.clearRect(0, 0, lado, lado);
  if (pedra) {
    const origem = (deslocamento * 97) % 256;
    ctx.drawImage(pedra, origem, origem, 256, 256, 0, 0, lado, lado);
  } else {
    ctx.fillStyle = "#16224f";
    ctx.fillRect(0, 0, lado, lado);
  }
  const poligono = poligonoNoCanvas(forma);
  const centro = centroDeArea(poligono);
  // Escurece levemente perto da borda e põe o filete dourado, com um fio escuro por dentro.
  ctx.beginPath();
  poligono.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.lineWidth = lado * 0.07;
  ctx.strokeStyle = dourado(ctx, 0, lado);
  ctx.stroke();
  ctx.lineWidth = lado * 0.012;
  ctx.strokeStyle = "rgba(8, 6, 16, 0.7)";
  ctx.save();
  ctx.translate(centro[0], centro[1]);
  ctx.scale(0.88, 0.88);
  ctx.translate(-centro[0], -centro[1]);
  ctx.stroke();
  ctx.restore();

  const altura = lado * ALTURA_DO_NUMERO[forma];
  const larguraMaxima = lado * LARGURA_DO_NUMERO[forma];
  if (forma === "d4") {
    // Um número perto de cada vértice, com o topo da letra apontando para o vértice.
    poligono.forEach(([x, y], i) => {
      const px = centro[0] + (x - centro[0]) * 0.55;
      const py = centro[1] + (y - centro[1]) * 0.55;
      const angulo = Math.atan2(x - centro[0], -(y - centro[1]));
      escreverNumero(ctx, rotulos[i]!, px, py, altura, larguraMaxima, angulo);
    });
    return;
  }
  // O número fica no centro de área da face, de pé para o "cima" dela (ver `planoDaFace`).
  escreverNumero(ctx, rotulos[0]!, centro[0], centro[1], altura, larguraMaxima, 0);
}

/** Carrega uma imagem; sem ela em `limite` ms, segue sem (a face usa a cor lisa da pedra). */
export function carregarImagem(url: string, limite = 4000): Promise<HTMLImageElement | null> {
  return new Promise((resolver) => {
    const imagem = new Image();
    const desistir = window.setTimeout(() => resolver(null), limite);
    imagem.onload = () => { window.clearTimeout(desistir); resolver(imagem); };
    imagem.onerror = () => { window.clearTimeout(desistir); resolver(null); };
    imagem.src = url;
  });
}

/** Espera a fonte de títulos para os números não saírem na fonte reserva. */
let fonteDosNumeros: Promise<void> | null = null;

export async function carregarFonte(limite = 2000): Promise<void> {
  try {
    fonteDosNumeros ??= (async () => {
      if (typeof FontFace === "undefined" || !document.fonts) return;
      const fonte = new FontFace(FAMILIA_DOS_NUMEROS, `url(${ARQUIVO_DA_FONTE})`,
        { weight: "700", featureSettings: '"lnum" 1, "tnum" 1' });
      (document.fonts as unknown as { add(fonte: FontFace): void }).add(await fonte.load());
    })();
    await Promise.race([fonteDosNumeros, new Promise((resolver) => window.setTimeout(resolver, limite))]);
  } catch {
    // Sem a fonte, vale a reserva da pilha; a escala pela tinta ainda deixa os números do mesmo tamanho.
  }
}
