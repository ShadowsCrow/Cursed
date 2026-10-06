/**
 * Brilho do token da vez no modo turno (modo-de-turno, D8e, pedido do usuário de 2026-10-05): um halo dourado que
 * pulsa devagar em volta dos tokens de quem está na vez. Para quem pede menos movimento, o halo fica parado.
 */
import { Graphics } from "pixi.js";

import type { CombateDoTurno } from "./useModoDeTurno";

export const COR_DO_BRILHO = 0xffd27a;
/** Duração de um pulso completo (acende e apaga), em milissegundos. */
export const PERIODO_DO_BRILHO = 2400;
const CAMADAS = 6;

/**
 * Halo em anéis de opacidade baixa, que somados formam um degradê (o PixiJS não tem sombra), mais um aro fino.
 * Centrado na peça de lado `lado`, com o pivô no centro para pulsar sem sair do lugar.
 */
export function criarBrilhoDaVez(lado: number): Graphics {
  const centro = lado / 2;
  const raio = lado / 2 - 3;
  const halo = new Graphics();
  for (let camada = CAMADAS; camada >= 1; camada -= 1) {
    halo.circle(centro, centro, raio + camada * 2).fill({ color: COR_DO_BRILHO, alpha: 0.07 });
  }
  halo.circle(centro, centro, raio + 1.5).stroke({ color: COR_DO_BRILHO, width: 2, alpha: 0.9 });
  halo.pivot.set(centro, centro);
  halo.position.set(centro, centro);
  return halo;
}

/** Opacidade e escala do halo no instante `ms`: de 0,45 a 1 e de 1 a 1,08, num pulso suave; parado, o meio. */
export function pulsoDoBrilho(ms: number, reduzido: boolean): { alpha: number; escala: number } {
  if (reduzido) return { alpha: 0.8, escala: 1.04 };
  const fase = 0.5 - 0.5 * Math.cos((2 * Math.PI * ms) / PERIODO_DO_BRILHO);
  return { alpha: 0.45 + 0.55 * fase, escala: 1 + 0.08 * fase };
}

export function aplicarPulso(halos: Iterable<Graphics>, ms: number, reduzido: boolean) {
  const { alpha, escala } = pulsoDoBrilho(ms, reduzido);
  for (const halo of halos) {
    halo.alpha = alpha;
    halo.scale.set(escala);
  }
}

/** Tokens de quem está na vez durante a disputa, para brilharem no grid (modo-de-turno, D8e). */
export function tokensDaVez(combate: CombateDoTurno | null | undefined): string[] {
  if (!combate || combate.estado !== "combate") return [];
  return combate.participantes.find((p) => p.id === combate.vez_participante_id)?.token_ids ?? [];
}
