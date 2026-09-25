import { useRef } from "react";

import { Dialog } from "./Dialog";

export interface ConfirmationProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  /** Verdadeiro enquanto o comando confirmado está em trânsito para o servidor. */
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmação para ações relevantes (equipar, aplicar efeito, excluir).
 * Reaproveitando o `Dialog`, mas com foco inicial no botão Cancelar — a opção mais
 * segura — e um par de ações claramente rotuladas.
 */
export function Confirmation({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmationProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onClose={onCancel} title={title} description={description} initialFocusRef={cancelRef} className="confirmation">
      <div className="confirmation__actions">
        <button type="button" ref={cancelRef} className="button button--ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`button ${tone === "danger" ? "button--danger" : "button--primary"}`}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Enviando…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
