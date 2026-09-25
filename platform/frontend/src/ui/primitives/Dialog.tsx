import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { Glyph } from "../Display";
import { useFocusTrap } from "./useFocusTrap";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Elemento que deve receber o foco ao abrir; por padrão o primeiro elemento focável. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  variant?: "dialog" | "panel";
  panelSide?: "start" | "end";
  className?: string;
  /** Rótulo do botão de fechar; sobrescreve o padrão "Fechar". */
  closeLabel?: string;
}

/**
 * Diálogo modal acessível: foco preso dentro do conteúdo, Esc fecha, clique no
 * fundo fecha, e o foco retorna ao gatilho que abriu o diálogo ao fechar.
 * Também serve de base para o painel lateral (`variant="panel"`).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  initialFocusRef,
  variant = "dialog",
  panelSide = "end",
  className = "",
  closeLabel = "Fechar",
}: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useFocusTrap(containerRef, { active: open, onEscape: onClose, initialFocusRef });

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={`overlay overlay--${variant}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`${variant === "panel" ? `side-panel side-panel--${panelSide}` : "dialog"} ${className}`.trim()}
        tabIndex={-1}
      >
        <header className="dialog__head">
          <h2 id={titleId} className="dialog__title">{title}</h2>
          <button
            type="button"
            className="dialog__close"
            onClick={onClose}
            aria-label={closeLabel}
            data-focus-initial-skip="true"
          >
            <Glyph name="close" size={16} />
          </button>
        </header>
        {description && <p id={descriptionId} className="dialog__description">{description}</p>}
        <div className="dialog__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
