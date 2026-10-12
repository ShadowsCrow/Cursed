import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { useDismissable } from "./useDismissable";

export interface MenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface MenuProps {
  /** Nome acessível do menu e, por padrão, conteúdo visível do gatilho. */
  label: string;
  items: MenuItem[];
  triggerContent?: ReactNode;
  triggerClassName?: string;
}

/**
 * Menu suspenso acessível (padrão "menu button"): abre com clique, Enter, espaço
 * ou seta; navega entre itens com as setas, Home e End; Esc fecha e devolve o
 * foco ao gatilho; clicar/tocar fora também fecha.
 */
export function Menu({ label, items, triggerContent, triggerClassName = "" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openMenu(focusIndex: number) {
    setOpen(true);
    setActiveIndex(focusIndex);
  }

  useDismissable({ active: open, onDismiss: close, refs: [triggerRef, menuRef] });

  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(items.length - 1);
    }
  }

  function handleItemKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index - 1 + items.length) % items.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <span className="menu">
      <button
        type="button"
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        className={`menu__trigger ${triggerClassName}`.trim()}
        onClick={() => (open ? close() : openMenu(0))}
        onKeyDown={handleTriggerKeyDown}
      >
        {triggerContent ?? label}
      </button>
      {open && (
        <div ref={menuRef} id={id} role="menu" aria-label={label} className="menu__surface">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              tabIndex={-1}
              disabled={item.disabled}
              className="menu__item"
              onClick={() => {
                item.onSelect();
                close();
              }}
              onKeyDown={(event) => handleItemKeyDown(event, index)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
