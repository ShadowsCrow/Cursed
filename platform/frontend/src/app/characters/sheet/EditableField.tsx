import { useId, useState, type FormEvent } from "react";

import { Popover } from "../../../ui/primitives";
import { campoEditavel, campoExigeAprovacao } from "../fieldPolicy";
import type { PermissoesFicha } from "../types";

export interface EditableFieldProps {
  label: string;
  /** Caminho pontuado do campo na ficha (ex.: "personagem.nome"), usado para checar permissão. */
  path: string;
  value: string;
  kind?: "text" | "number" | "textarea";
  permissoes: PermissoesFicha | undefined;
  onSave: (path: string, value: string | number) => Promise<{ status: "salvo" | "pendente" }>;
  emptyLabel?: string;
}

/**
 * Campo de leitura com edição contextual: o valor aparece sempre como texto;
 * o controle de edição só é renderizado quando `permissoes.editar` é
 * verdadeiro e o campo não está em `campos_bloqueados` (mesma regra de
 * prefixo usada pelo servidor). Campos em `campos_exigem_aprovacao` mostram um
 * aviso antes de salvar e, após o envio, uma confirmação de que a alteração
 * foi para aprovação do Narrador em vez de ser aplicada de imediato.
 */
export function EditableField({ label, path, value, kind = "text", permissoes, onSave, emptyLabel = "Não informado" }: EditableFieldProps) {
  const editavel = campoEditavel(path, permissoes);
  const exigeAprovacao = permissoes ? campoExigeAprovacao(path, permissoes) : false;
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fieldId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await onSave(path, kind === "number" ? Number(draft) : draft);
      if (result.status === "pendente") {
        setNotice("Alteração enviada para aprovação do Narrador.");
      } else {
        setNotice(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a alteração.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="editable-field">
      <span className="eyebrow">{label}</span>
      <strong>{value.trim() ? value : emptyLabel}</strong>
      {notice && <p className="preview-note">{notice}</p>}
      {editavel && (
        <Popover
          label={`Editar ${label}`}
          triggerContent="Editar"
          triggerClassName="text-action"
          contentClassName="editable-field__popover"
        >
          <form
            onSubmit={(event) => { void submit(event); }}
            onReset={() => { setDraft(value); setError(null); }}
          >
            <label htmlFor={fieldId}>{label}</label>
            {kind === "textarea" ? (
              <textarea id={fieldId} value={draft} onChange={(event) => setDraft(event.target.value)} />
            ) : (
              <input
                id={fieldId}
                type={kind === "number" ? "number" : "text"}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            )}
            {exigeAprovacao && <p className="preview-note">Esta alteração será enviada para aprovação do Narrador.</p>}
            {error && <p role="alert">{error}</p>}
            <div className="confirmation__actions">
              <button type="reset" className="button button--ghost">Cancelar</button>
              <button type="submit" className="button button--primary" disabled={pending}>
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </Popover>
      )}
    </div>
  );
}
