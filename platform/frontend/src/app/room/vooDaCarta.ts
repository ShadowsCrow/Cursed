/**
 * Voo da carta no tabuleiro (cartas-na-cena, D7): a carta sobe do token de quem usou e voa até cada alvo, em arco;
 * sem alvo, dá uma volta sobre o próprio token. Só a geometria e os tempos ficam aqui, para serem testados sem o
 * PixiJS; quem desenha é o `RoomCanvas`.
 */

export interface Ponto { x: number; y: number }

/** Tempos de cada trecho, em milissegundos. */
export const SUBIDA_MS = 350;
export const VOO_MS = 700;
export const PAUSA_MS = 220;
export const SUMIDA_MS = 320;
export const VOLTA_MS = 1100;
/** Quantos alvos a carta visita; os demais só entram no registro. */
export const MAXIMO_DE_ALVOS_ANIMADOS = 6;
/** Altura da subida e do arco, em pixels do mundo (casas de 1 m valem `CELULA`). */
export const SUBIDA_PX = 42;
export const ARCO_PX = 48;

export const suave = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export interface Quadro { posicao: Ponto; escala: number; alpha: number; rotacao: number; terminou: boolean }

/** Duração total do voo de `origem` por `alvos`, ou da volta sem alvo. */
export function duracaoDoVoo(quantidadeDeAlvos: number): number {
  const alvos = Math.min(quantidadeDeAlvos, MAXIMO_DE_ALVOS_ANIMADOS);
  if (alvos === 0) return SUBIDA_MS + VOLTA_MS + SUMIDA_MS;
  return SUBIDA_MS + alvos * (VOO_MS + PAUSA_MS) + SUMIDA_MS;
}

/**
 * Onde a carta está `ms` depois de começar: sobe da origem, voa em arco até cada alvo (parando um instante em cada
 * um) e some no último. Sem alvo, sobe e dá uma volta em torno da origem.
 */
export function quadroDoVoo(ms: number, origem: Ponto, alvos: readonly Ponto[]): Quadro {
  const visitados = alvos.slice(0, MAXIMO_DE_ALVOS_ANIMADOS);
  const topo = { x: origem.x, y: origem.y - SUBIDA_PX };
  if (ms < SUBIDA_MS) {
    const t = suave(ms / SUBIDA_MS);
    return { posicao: { x: origem.x, y: origem.y - SUBIDA_PX * t }, escala: 0.6 + 0.4 * t, alpha: t, rotacao: -0.15 * (1 - t), terminou: false };
  }
  let tempo = ms - SUBIDA_MS;
  if (visitados.length === 0) {
    if (tempo < VOLTA_MS) {
      const t = tempo / VOLTA_MS;
      const angulo = 2 * Math.PI * suave(t);
      return { posicao: { x: topo.x + Math.sin(angulo) * ARCO_PX, y: topo.y - (1 - Math.cos(angulo)) * (ARCO_PX / 2) },
        escala: 1, alpha: 1, rotacao: Math.sin(angulo) * 0.25, terminou: false };
    }
    tempo -= VOLTA_MS;
    const t = Math.min(1, tempo / SUMIDA_MS);
    return { posicao: topo, escala: 1 - 0.3 * t, alpha: 1 - t, rotacao: 0, terminou: t >= 1 };
  }
  let de = topo;
  for (const alvo of visitados) {
    const chegada = { x: alvo.x, y: alvo.y - SUBIDA_PX / 2 };
    if (tempo < VOO_MS) {
      const t = suave(tempo / VOO_MS);
      const arco = Math.sin(Math.PI * t) * ARCO_PX;
      const direcao = Math.sign(chegada.x - de.x) || 1;
      return { posicao: { x: de.x + (chegada.x - de.x) * t, y: de.y + (chegada.y - de.y) * t - arco },
        escala: 1 + 0.15 * Math.sin(Math.PI * t), alpha: 1, rotacao: direcao * 0.2 * Math.sin(Math.PI * t), terminou: false };
    }
    tempo -= VOO_MS;
    if (tempo < PAUSA_MS) return { posicao: chegada, escala: 1, alpha: 1, rotacao: 0, terminou: false };
    tempo -= PAUSA_MS;
    de = chegada;
  }
  const t = Math.min(1, tempo / SUMIDA_MS);
  return { posicao: de, escala: 1 + 0.25 * t, alpha: 1 - t, rotacao: 0, terminou: t >= 1 };
}
