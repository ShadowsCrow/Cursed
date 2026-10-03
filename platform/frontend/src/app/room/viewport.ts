const ZOOM_MINIMO = 0.4;

/** A cena não tem bordas (item 7); este é só o limite de sanidade, o mesmo do servidor (`sala.LIMITE_DA_CENA`). */
export const LIMITE_DA_CENA = 2000;

/** Se um token de `tamanho` casas na casa (x, y) cabe no limite de sanidade da cena. */
export function dentroDoLimite(x: number, y: number, tamanho: number): boolean {
  return x >= -LIMITE_DA_CENA && y >= -LIMITE_DA_CENA && x + tamanho - 1 <= LIMITE_DA_CENA && y + tamanho - 1 <= LIMITE_DA_CENA;
}
const ZOOM_MAXIMO = 3;

export function proximoZoom(atual: number, fator: number): number {
  return Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, atual * fator));
}

export function pontoFixoNoZoom(
  posicao: { x: number; y: number }, escala: number, novaEscala: number, foco: { x: number; y: number },
) {
  const proporcao = novaEscala / escala;
  return { x: foco.x - (foco.x - posicao.x) * proporcao, y: foco.y - (foco.y - posicao.y) * proporcao };
}

type Medida = { largura: number; altura: number };
/** Retângulo de interesse na grade, em px do mundo; sem `x` e `y`, começa na origem. */
type Alvo = Medida & { x?: number; y?: number };

/**
 * Enquadramento do mapa: o maior zoom (dentro dos limites) em que o mapa inteiro cabe na área,
 * descontada a margem de cada lado, e a posição que o deixa centralizado. A margem pode ser
 * diferente na horizontal e na vertical, para os controles sobre o grid não cobrirem o mapa.
 */
export function enquadrar(area: Medida, mapa: Alvo, margem: number | { x: number; y: number } = 24,
  reservaDireita = 0): { escala: number; x: number; y: number } {
  const { x: margemX, y: margemY } = typeof margem === "number" ? { x: margem, y: margem } : margem;
  // A faixa da direita coberta pelo painel aberto não conta: a cena se centraliza na parte livre.
  const livre = Math.max(1, area.largura - reservaDireita);
  const larguraUtil = Math.max(1, livre - 2 * margemX);
  const alturaUtil = Math.max(1, area.altura - 2 * margemY);
  const cabe = Math.min(larguraUtil / mapa.largura, alturaUtil / mapa.altura);
  const escala = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, cabe));
  return {
    escala,
    x: (livre - mapa.largura * escala) / 2 - (mapa.x ?? 0) * escala,
    y: (area.altura - mapa.altura * escala) / 2 - (mapa.y ?? 0) * escala,
  };
}

/**
 * O que enquadrar numa cena sem bordas (experiencia-da-mesa, item 7): a área do mapa, quando há mapa,
 * unida às casas ocupadas pelos tokens visíveis, com um tamanho mínimo em casas. Sem mapa e sem tokens,
 * não há o que enquadrar (`null`).
 */
export function areaDeInteresse(
  cena: { colunas: number; linhas: number; tokens: readonly { x: number; y: number; tamanho: number }[] },
  comMapa: boolean, celula: number, minimo = { colunas: 16, linhas: 10 },
): { x: number; y: number; largura: number; altura: number } | null {
  const caixas = [
    ...(comMapa ? [{ x0: 0, y0: 0, x1: cena.colunas, y1: cena.linhas }] : []),
    ...cena.tokens.map((t) => ({ x0: t.x, y0: t.y, x1: t.x + t.tamanho, y1: t.y + t.tamanho })),
  ];
  if (caixas.length === 0) return null;
  let x0 = Math.min(...caixas.map((c) => c.x0));
  let y0 = Math.min(...caixas.map((c) => c.y0));
  let x1 = Math.max(...caixas.map((c) => c.x1));
  let y1 = Math.max(...caixas.map((c) => c.y1));
  // Um token sozinho não vira zoom máximo: a área tem um tamanho mínimo, crescendo igual para os dois lados.
  const faltaX = Math.max(0, minimo.colunas - (x1 - x0)) / 2;
  const faltaY = Math.max(0, minimo.linhas - (y1 - y0)) / 2;
  x0 -= faltaX; x1 += faltaX; y0 -= faltaY; y1 += faltaY;
  return { x: x0 * celula, y: y0 * celula, largura: (x1 - x0) * celula, altura: (y1 - y0) * celula };
}

/**
 * A casa livre mais próxima de `centro` (em anéis cada vez maiores), para "Colocar" um personagem sem cair em
 * cima de outro token. Se até o raio máximo tudo estiver ocupado, devolve o próprio centro.
 */
export function casaLivre(
  centro: { x: number; y: number }, tokens: readonly { x: number; y: number; tamanho: number }[], raioMaximo = 12,
): { x: number; y: number } {
  const ocupada = (x: number, y: number) => tokens.some((t) => x >= t.x && x < t.x + t.tamanho && y >= t.y && y < t.y + t.tamanho);
  for (let raio = 0; raio <= raioMaximo; raio += 1) {
    for (let dy = -raio; dy <= raio; dy += 1) {
      for (let dx = -raio; dx <= raio; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== raio) continue;
        const x = centro.x + dx;
        const y = centro.y + dy;
        if (dentroDoLimite(x, y, 1) && !ocupada(x, y)) return { x, y };
      }
    }
  }
  return centro;
}
