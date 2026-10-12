/**
 * Destaque do token escolhido (pedido do usuário, 2026-10-05): ao escolher um token na aba Tokens ou no grid, ele
 * ganha um aro azul-gelo por fora, cor diferente do dourado da vez (`brilhoDaVez.ts`), para os dois não se confundirem.
 */
import { Graphics } from "pixi.js";

export const COR_DA_SELECAO = 0x7fd8ff;
/** Alvo marcado para uma carta (cartas-na-cena): vermelho-alaranjado, distinto da escolha e da vez. */
export const COR_DO_ALVO = 0xff7a5c;

/** Aro tracejado de alvo por fora do token de lado `lado`, sem receber eventos. */
export function criarAroDeAlvo(lado: number): Graphics {
  const centro = lado / 2;
  const raio = lado / 2 - 3;
  const aro = new Graphics().circle(centro, centro, raio + 10).fill({ color: COR_DO_ALVO, alpha: 0.14 });
  const dentes = 12;
  for (let i = 0; i < dentes; i += 1) {
    const inicio = (i / dentes) * Math.PI * 2;
    aro.arc(centro, centro, raio + 6, inicio, inicio + Math.PI / dentes).stroke({ color: COR_DO_ALVO, width: 3, alpha: 1 });
  }
  aro.eventMode = "none";
  return aro;
}

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
