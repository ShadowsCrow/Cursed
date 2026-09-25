import { useCallback, useEffect, useRef, useState } from "react";

export interface UseDisclosureOptions {
  /** Atraso antes de fechar por hover/foco, para permitir mover o ponteiro até a superfície. */
  closeDelay?: number;
}

/**
 * Estado de abertura reutilizável para popovers e tooltips: hover e foco abrem/mantêm
 * abertos com um pequeno atraso ao sair, clique/toque alterna diretamente.
 */
export function useDisclosure({ closeDelay = 120 }: UseDisclosureOptions = {}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timer.current !== undefined) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
    }
  }, []);

  const show = useCallback(() => {
    clearTimer();
    setOpen(true);
  }, [clearTimer]);

  const hide = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  const scheduleHide = useCallback(() => {
    clearTimer();
    timer.current = window.setTimeout(() => setOpen(false), closeDelay);
  }, [clearTimer, closeDelay]);

  const toggle = useCallback(() => {
    clearTimer();
    setOpen((value) => !value);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { open, show, hide, scheduleHide, toggle, setOpen };
}
