/* global Image, document */
/**
 * Medida por "caixa de tinta" (reformular-personalidade-da-ficha, D0): dentro de uma região de busca, o menor
 * retângulo que contém os pixels mais escuros (ou mais claros) que um limiar. A mesma função mede a imagem de
 * referência e a captura da tela, então as duas medidas são comparáveis — a caixa do DOM não serve, porque a
 * entrelinha e o respiro das letras a deixam maior que o desenho.
 *
 * As funções rodam dentro da página (canvas do Chromium), sem dependências de imagem no Node.
 */

/**
 * Mede cada âncora numa imagem. Roda em `pagina.evaluate`: precisa ser autocontida.
 * @param {{ imagem: string, ancoras: { nome: string, modo: "escuro" | "claro", limiar: number, minimo?: number,
 *   regiao: [number, number, number, number] }[] }} entrada  imagem em data URL; região em px da imagem [x0, y0, x1, y1]
 * @returns {Promise<Record<string, [number, number, number, number] | null>>} caixa [x, y, largura, altura] em px da imagem
 */
export async function medirNaPagina({ imagem, ancoras }) {
  const img = new Image();
  img.src = imagem;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const saida = {};
  for (const { nome, modo, limiar, minimo = 2, regiao } of ancoras) {
    const x0 = Math.max(0, Math.round(regiao[0]));
    const y0 = Math.max(0, Math.round(regiao[1]));
    const x1 = Math.min(canvas.width, Math.round(regiao[2]));
    const y1 = Math.min(canvas.height, Math.round(regiao[3]));
    if (x1 <= x0 || y1 <= y0) { saida[nome] = null; continue; }
    const { data } = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
    const largura = x1 - x0;
    const altura = y1 - y0;
    const colunas = new Uint32Array(largura);
    const linhas = new Uint32Array(altura);
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const i = (y * largura + x) * 4;
        const luz = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (modo === "escuro" ? luz < limiar : luz > limiar) { colunas[x]++; linhas[y]++; }
      }
    }
    // Uma coluna ou linha só conta com `minimo` pixels de tinta: manchas soltas do pergaminho não alargam a caixa.
    const primeiro = (v) => v.findIndex((n) => n >= minimo);
    const ultimo = (v) => { for (let k = v.length - 1; k >= 0; k--) if (v[k] >= minimo) return k; return -1; };
    const cx0 = primeiro(colunas);
    const cy0 = primeiro(linhas);
    saida[nome] = cx0 < 0 || cy0 < 0 ? null : [x0 + cx0, y0 + cy0, ultimo(colunas) - cx0 + 1, ultimo(linhas) - cy0 + 1];
  }
  return saida;
}

/**
 * Monta as imagens de comparação (lado a lado, sobreposição a 50% e diferença) a partir de dois recortes com o
 * mesmo enquadramento (canto da folha na mesma posição). Roda em `pagina.evaluate`.
 * @param {{ referencia: string, tela: string }} entrada  data URLs
 * @returns {Promise<{ ladoALado: string, sobreposicao: string, diferenca: string }>} PNGs em data URL
 */
export async function comporNaPagina({ referencia, tela }) {
  const carregar = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
  const [ref, cap] = await Promise.all([carregar(referencia), carregar(tela)]);
  const quadro = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };
  // Cada imagem no tamanho natural: uma aba mais baixa que a referência não corta a referência.
  const largura = Math.max(ref.naturalWidth, cap.naturalWidth);
  const altura = Math.max(ref.naturalHeight, cap.naturalHeight);

  const [lado, cl] = quadro(largura * 2 + 16, altura);
  cl.fillStyle = "#050d14";
  cl.fillRect(0, 0, lado.width, altura);
  cl.drawImage(ref, 0, 0);
  cl.drawImage(cap, largura + 16, 0);

  const [sobre, cs] = quadro(largura, altura);
  cs.fillStyle = "#050d14";
  cs.fillRect(0, 0, largura, altura);
  cs.drawImage(cap, 0, 0);
  cs.globalAlpha = 0.5;
  cs.drawImage(ref, 0, 0);

  const [dif, cd] = quadro(largura, altura);
  cd.fillStyle = "#050d14";
  cd.fillRect(0, 0, largura, altura);
  cd.drawImage(cap, 0, 0);
  cd.globalCompositeOperation = "difference";
  cd.drawImage(ref, 0, 0);

  return { ladoALado: lado.toDataURL("image/png"), sobreposicao: sobre.toDataURL("image/png"), diferenca: dif.toDataURL("image/png") };
}

/** Tolerância de cada tipo de âncora (design D0): posição em px e tamanho em fração. */
export const TOLERANCIAS = {
  texto: { posicao: 6, tamanho: 0.08 },
  ornamento: { posicao: 6, tamanho: 0.08 },
  quadro: { posicao: 6, tamanho: 0.04 },
  area: { posicao: 6, tamanho: 0.04 },
};

/**
 * Compara uma caixa medida com a esperada.
 * @returns {{ dx: number, dy: number, dw: number, dh: number, ok: boolean }}
 */
export function comparar(esperada, medida, tipo, propria = {}) {
  // Uma âncora pode ter tolerância própria no gabarito (`tolerancia`), sempre com uma `nota` do porquê.
  const { posicao, tamanho } = { ...(TOLERANCIAS[tipo] ?? TOLERANCIAS.texto), ...propria };
  const [ex, ey, ew, eh] = esperada;
  const [mx, my, mw, mh] = medida;
  const dx = mx - ex;
  const dy = my - ey;
  const dw = (mw - ew) / ew;
  const dh = (mh - eh) / eh;
  // Tamanho em fração, mas nunca mais apertado que a tolerância de posição (caixas finas, como filetes).
  const cabe = (d, base) => Math.abs(d * base) <= Math.max(tamanho * base, posicao);
  return { dx, dy, dw, dh, ok: Math.abs(dx) <= posicao && Math.abs(dy) <= posicao && cabe(dw, ew) && cabe(dh, eh) };
}
