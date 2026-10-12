import type { PointerEvent } from "react";

import { useReducedMotion } from "../../../cards/useReducedMotion";

/** Inclinação máxima, em graus, quando o mouse chega à borda da carta. */
const MAXIMO = 12;

/**
 * Faz a carta virar em direção ao mouse: grava `--inc-x` e `--inc-y` (graus) no elemento, que o CSS usa no `transform`.
 * Só reage a mouse e caneta (toque rola a página) e some com movimento reduzido; ao sair, a carta volta ao plano.
 */
export function useInclinacao() {
  const reduzido = useReducedMotion();
  if (reduzido) return {};
  return {
    onPointerMove(evento: PointerEvent<HTMLElement>) {
      if (evento.pointerType === "touch") return;
      const alvo = evento.currentTarget;
      const caixa = alvo.getBoundingClientRect();
      if (caixa.width === 0 || caixa.height === 0) return;
      const x = (evento.clientX - caixa.left) / caixa.width - 0.5;
      const y = (evento.clientY - caixa.top) / caixa.height - 0.5;
      alvo.style.setProperty("--inc-y", `${(x * 2 * MAXIMO).toFixed(2)}deg`);
      alvo.style.setProperty("--inc-x", `${(-y * 2 * MAXIMO).toFixed(2)}deg`);
      alvo.dataset.inclinada = "";
    },
    onPointerLeave(evento: PointerEvent<HTMLElement>) {
      const alvo = evento.currentTarget;
      alvo.style.removeProperty("--inc-x");
      alvo.style.removeProperty("--inc-y");
      delete alvo.dataset.inclinada;
    },
  };
}
