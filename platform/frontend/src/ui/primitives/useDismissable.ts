import { useEffect, type RefObject } from "react";

import { useLatest } from "./useLatest";

export interface UseDismissableOptions {
  /** Quando verdadeiro, ouve Esc e cliques/toques fora dos `refs`. */
  active: boolean;
  /** Chamado quando o usuário pressiona Esc ou interage fora dos elementos informados. */
  onDismiss: () => void;
  /** Elementos considerados "dentro" (gatilho, superfície flutuante, etc). */
  refs: RefObject<HTMLElement | null>[];
}

/** Fecha popovers, tooltips e menus com Esc ou com clique/toque fora dos elementos informados. */
export function useDismissable({ active, onDismiss, refs }: UseDismissableOptions): void {
  const latest = useLatest({ onDismiss, refs });

  useEffect(() => {
    if (!active) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      const inside = latest.current.refs.some((ref) => ref.current?.contains(target));
      if (!inside) latest.current.onDismiss();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") latest.current.onDismiss();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, latest]);
}
