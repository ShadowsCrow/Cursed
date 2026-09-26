const ZOOM_MINIMO = 0.4;
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
