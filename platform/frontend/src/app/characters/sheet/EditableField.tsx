import { useId, useState, type FormEvent } from "react";

import { Popover } from "../../../ui/primitives";
import { campoEditavel, campoExigeAprovacao } from "../fieldPolicy";
import type { PermissoesFicha } from "../types";
import { contarCaracteres } from "./fichaAccess";

export interface EditableFieldProps {
  label: string;
  /** Caminho pontuado do campo na ficha (ex.: "personagem.nome"), usado para checar permissão. */
  path: string;
  value: string;
  kind?: "text" | "number" | "textarea";
  permissoes: PermissoesFicha | undefined;
  onSave: (path: string, value: string | number) => Promise<{ status: "salvo" | "pendente" }>;
  emptyLabel?: string;
  /** Dica de preenchimento no campo vazio; nunca é gravada como valor. */
  placeholder?: string;
  min?: number;
  /** Aviso do servidor para o valor atual (ex.: fora das regras). */
  aviso?: string;
  /** Texto longo (ex.: História): área maior e parágrafos preservados na leitura. */
  longo?: boolean;
  /** Máximo de caracteres do JSON de listas; mostra o contador e impede salvar acima dele. */
  limite?: number | null;
}


/**
 * Campo de leitura com edição contextual: o valor aparece sempre como texto;
 * o controle de edição só é renderizado quando `permissoes.editar` é
 * verdadeiro e o campo não está em `campos_bloqueados` (mesma regra de
 * prefixo usada pelo servidor). Campos em `campos_exigem_aprovacao` mostram um
 * aviso antes de salvar e, após o envio, uma confirmação de que a alteração
 * foi para aprovação do Narrador em vez de ser aplicada de imediato.
 */
export function EditableField({
  label, path, value, kind = "text", permissoes, onSave, emptyLabel = "Não informado", placeholder, min, aviso, longo = false, limite,
}: EditableFieldProps) {
  const editavel = campoEditavel(path, permissoes);
  const exigeAprovacao = permissoes ? campoExigeAprovacao(path, permissoes) : false;
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fieldId = useId();
  const contadorId = useId();
  const caracteres = contarCaracteres(draft);
  const passou = typeof limite === "number" && caracteres > limite;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      // Número vazio segue como texto vazio: quem salva decide se isso limpa o campo.
      const result = await onSave(path, kind === "number" && draft.trim() !== "" ? Number(draft) : draft);
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
    <div className={`editable-field ${longo ? "editable-field--longo" : ""}`.trim()}>
      <span className="eyebrow">{label}</span>
      {value.trim() ? <strong>{value}</strong> : <strong className="editable-field__vazio">{emptyLabel}</strong>}
      {aviso && <small className="field-warning">{aviso}</small>}
      {notice && <p className="preview-note">{notice}</p>}
      {editavel && (
        <Popover
          label={`Editar ${label}`}
          triggerContent="Editar"
          triggerClassName="text-action"
          contentClassName={`editable-field__popover ${longo ? "editable-field__popover--longo" : ""}`.trim()}
        >
          <form
            onSubmit={(event) => { void submit(event); }}
            onReset={() => { setDraft(value); setError(null); }}
          >
            <label htmlFor={fieldId}>{label}</label>
            {kind === "textarea" ? (
              <textarea id={fieldId} value={draft} placeholder={placeholder} rows={longo ? 10 : undefined}
                aria-describedby={typeof limite === "number" ? contadorId : undefined} aria-invalid={passou || undefined}
                onChange={(event) => setDraft(event.target.value)} />
            ) : (
              <input
                id={fieldId}
                type={kind === "number" ? "number" : "text"}
                min={min}
                placeholder={placeholder}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            )}
            {typeof limite === "number" && (
              <small id={contadorId} className={passou ? "field-error" : "editable-field__contador"}>
                {caracteres.toLocaleString("pt-BR")} de {limite.toLocaleString("pt-BR")} caracteres{passou ? " — encurte o texto para salvar." : ""}
              </small>
            )}
            {exigeAprovacao && <p className="preview-note">Esta alteração será enviada para aprovação do Narrador.</p>}
            {error && <p role="alert">{error}</p>}
            <div className="confirmation__actions">
              <button type="reset" className="button button--ghost">Cancelar</button>
              <button type="submit" className="button button--primary" disabled={pending || passou}>
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </Popover>
      )}
    </div>
  );
}
