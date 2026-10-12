import { cloneElement, isValidElement, useId, useRef, type ReactElement } from "react";

import { useDisclosure } from "./useDisclosure";
import { useDismissable } from "./useDismissable";

export interface TooltipProps {
  /** Texto curto exibido na dica. */
  label: string;
  /** Elemento único focável (botão, link) que recebe hover/foco/toque. */
  children: ReactElement<{ "aria-describedby"?: string }>;
}

/**
 * Tooltip acessível: mostra um texto curto por hover ou foco de teclado, e
 * alterna por toque (dispositivos sem hover). Nunca é a única forma de acessar
 * uma informação essencial — para conteúdo completo, use `Popover`.
 */
export function Tooltip({ label, children }: TooltipProps) {
  const { open, show, scheduleHide, toggle, setOpen } = useDisclosure();
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useDismissable({ active: open, onDismiss: () => setOpen(false), refs: [wrapperRef] });

  const trigger = isValidElement(children)
    ? cloneElement(children, { "aria-describedby": open ? id : undefined })
    : children;

  return (
    <span
      ref={wrapperRef}
      className="tooltip-wrapper"
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
      onFocus={show}
      onBlur={scheduleHide}
      onTouchStart={toggle}
    >
      {trigger}
      {open && (
        <span role="tooltip" id={id} className="tooltip-surface">
          {label}
        </span>
      )}
    </span>
  );
}
