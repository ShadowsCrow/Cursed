import { useId, useRef, type ReactNode } from "react";

import { useDisclosure } from "./useDisclosure";
import { useDismissable } from "./useDismissable";

export interface PopoverProps {
  /** Nome acessível do gatilho e da superfície flutuante. */
  label: string;
  /** Conteúdo visual do botão-gatilho (ícone, texto...). */
  triggerContent: ReactNode;
  triggerClassName?: string;
  /** Conteúdo completo mostrado na superfície flutuante. */
  children: ReactNode;
  contentClassName?: string;
  placement?: "top" | "bottom";
}

/**
 * Popover acessível: abre por hover, foco de teclado, clique ou toque (não
 * depende apenas de hover). Fecha com Esc ou clique/toque fora, e nunca prende
 * o foco — o usuário pode continuar navegando pela página.
 */
export function Popover({
  label,
  triggerContent,
  triggerClassName = "",
  children,
  contentClassName = "",
  placement = "top",
}: PopoverProps) {
  const { open, show, scheduleHide, toggle, setOpen } = useDisclosure();
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useDismissable({ active: open, onDismiss: () => setOpen(false), refs: [triggerRef, surfaceRef] });

  return (
    <span className="popover">
      <button
        type="button"
        ref={triggerRef}
        className={`popover__trigger ${triggerClassName}`.trim()}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
        onFocus={show}
        onBlur={scheduleHide}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onTouchStart={show}
      >
        {triggerContent}
      </button>
      {open && (
        <div
          ref={surfaceRef}
          id={id}
          role="group"
          aria-label={label}
          className={`popover__surface popover__surface--${placement} ${contentClassName}`.trim()}
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
          onFocus={show}
          onBlur={scheduleHide}
        >
          {children}
        </div>
      )}
    </span>
  );
}
