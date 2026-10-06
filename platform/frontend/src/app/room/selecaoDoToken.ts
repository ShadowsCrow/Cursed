/**
 * Destaque do token escolhido (pedido do usuário, 2026-10-05): ao escolher um token na aba Tokens ou no grid, ele
 * ganha um aro azul-gelo por fora, cor diferente do dourado da vez (`brilhoDaVez.ts`), para os dois não se confundirem.
 */
import { Graphics } from "pixi.js";

export const COR_DA_SELECAO = 0x7fd8ff;

/** Aro largo e um halo fraco por fora do token de lado `lado`, sem receber eventos. */
export function criarAroDeSelecao(lado: number): Graphics {
  const centro = lado / 2;
  const raio = lado / 2 - 3;
  const aro = new Graphics()
    .circle(centro, centro, raio + 9).fill({ color: COR_DA_SELECAO, alpha: 0.12 })
    .circle(centro, centro, raio + 5).stroke({ color: COR_DA_SELECAO, width: 3, alpha: 1 });
  aro.eventMode = "none";
  return aro;
}
