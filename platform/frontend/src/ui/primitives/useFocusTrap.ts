import { useEffect, useRef, type RefObject } from "react";

import { useLatest } from "./useLatest";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Elementos marcados com este atributo continuam no ciclo de Tab, mas nunca
 * recebem o foco inicial automático (ex.: o botão "Fechar" de um diálogo,
 * para que o foco comece no conteúdo em vez de em uma ação de saída).
 */
export const FOCUS_TRAP_SKIP_INITIAL_ATTR = "data-focus-initial-skip";

export interface UseFocusTrapOptions {
  /** Quando verdadeiro, o foco é preso dentro do contêiner. */
  active: boolean;
  /** Chamado quando o usuário pressiona Esc dentro do contêiner. */
  onEscape?: () => void;
  /** Elemento que deve receber o foco inicial; por padrão, o primeiro elemento focável. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Devolve o foco ao gatilho quando o contêiner é desativado. Padrão: verdadeiro. */
  restoreFocus?: boolean;
}

/**
 * Prende o foco de teclado dentro de `containerRef` enquanto `active` é verdadeiro:
 * Tab e Shift+Tab ciclam apenas entre os elementos focáveis internos, Esc aciona
 * `onEscape`, e o foco retorna ao elemento que estava ativo antes da ativação.
 */
export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  { active, onEscape, initialFocusRef, restoreFocus = true }: UseFocusTrapOptions,
): void {
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const latest = useLatest({ onEscape, initialFocusRef, restoreFocus });

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const shouldRestoreFocus = latest.current.restoreFocus;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function getFocusable(): HTMLElement[] {
      if (!container) return [];
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    }

    const focusableOnOpen = getFocusable();
    const preferredInitial = focusableOnOpen.find((el) => !el.hasAttribute(FOCUS_TRAP_SKIP_INITIAL_ATTR));
    const initial = latest.current.initialFocusRef?.current ?? preferredInitial ?? focusableOnOpen[0] ?? container;
    initial.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        latest.current.onEscape?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        container?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey) {
        if (current === first || !container?.contains(current)) {
          event.preventDefault();
          last?.focus();
        }
      } else if (current === last || !container?.contains(current)) {
        event.preventDefault();
        first?.focus();
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (shouldRestoreFocus) previouslyFocused.current?.focus();
    };
  }, [active, containerRef, latest]);
}
