import { useId, useState, type FormEvent, type ReactNode } from "react";

import { Popover } from "../../../ui/primitives";
import { campoEditavel, campoExigeAprovacao } from "../fieldPolicy";
import type { PermissoesFicha } from "../types";

export interface Opcao { valor: string; rotulo: string }
export interface AlteracaoCampo { path: string; value: unknown }

export interface EscolhaAntesDeSalvar {
  pergunta: string;
  opcoes: { id: string; rotulo: string; extras: AlteracaoCampo[] }[];
}

/** O que acontece junto com a troca: outras alterações, uma escolha obrigatória ou um bloqueio. */
export interface Consequencias {
  detalhes?: ReactNode;
  extras?: AlteracaoCampo[];
  escolha?: EscolhaAntesDeSalvar;
  bloqueio?: string;
}

export interface SelectFieldProps {
  label: string;
  path: string;
  value: string;
  options: Opcao[];
  permissoes: PermissoesFicha | undefined;
  onSave: (alteracoes: AlteracaoCampo[]) => Promise<{ status: "salvo" | "pendente" }>;
  /** Texto mostrado no lugar do valor gravado (ex.: "💰 Ganância" para "Ganancia"). */
  exibicao?: ReactNode;
  /** Aviso do servidor para o valor atual (fora da lista ou do catálogo). */
  aviso?: string;
  somenteNarrador?: boolean;
  /** Rótulo da opção vazia; sem ele, o campo não pode ficar vazio. */
  vazio?: string;
  emptyLabel?: string;
  consequencias?: (novo: string) => Consequencias;
  /** Nome da ação quando há aviso; "Vincular" serve para valores fora do catálogo. */
  acaoComAviso?: string;
}

/**
 * Campo de lista com edição contextual, no mesmo padrão do `EditableField`: o valor aparece como
 * texto e a edição abre numa superfície flutuante. Um valor antigo fora da lista continua visível,
 * com o aviso, e a ação passa a ser "Vincular".
 */
export function SelectField({
  label, path, value, options, permissoes, onSave, exibicao, aviso, somenteNarrador = false, vazio,
  emptyLabel = "Não informado", consequencias, acaoComAviso = "Vincular",
}: SelectFieldProps) {
  const editavel = campoEditavel(path, permissoes) && (!somenteNarrador || permissoes?.papel === "narrador");
  const exigeAprovacao = permissoes ? campoExigeAprovacao(path, permissoes) : false;
  const naLista = value === "" || options.some((o) => o.valor === value);
  const [draft, setDraft] = useState(naLista ? value : "");
  const [escolhaId, setEscolhaId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fieldId = useId();
  const avisoId = useId();

  const mudou = draft !== value;
  const efeito = mudou && consequencias ? consequencias(draft) : {};
  const escolha = efeito.escolha?.opcoes.find((o) => o.id === escolhaId);
  const faltaEscolha = Boolean(efeito.escolha) && !escolha;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mudou || efeito.bloqueio || faltaEscolha) return;
    setPending(true);
    setError(null);
    try {
      const resultado = await onSave([{ path, value: draft }, ...(efeito.extras ?? []), ...(escolha?.extras ?? [])]);
      setNotice(resultado.status === "pendente" ? "Alteração enviada para aprovação do Narrador." : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a alteração.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="editable-field">
      <span className="eyebrow">{label}</span>
      <strong aria-describedby={aviso ? avisoId : undefined}>{value ? (exibicao ?? value) : emptyLabel}</strong>
      {aviso && <small id={avisoId} className="field-warning">{aviso}</small>}
      {notice && <p className="preview-note">{notice}</p>}
      {editavel && (
        <Popover
          label={`${aviso ? acaoComAviso : "Editar"} ${label}`}
          triggerContent={aviso ? acaoComAviso : "Editar"}
          triggerClassName="text-action"
          contentClassName="editable-field__popover"
        >
          <form
            onSubmit={(event) => { void submit(event); }}
            onReset={() => { setDraft(naLista ? value : ""); setEscolhaId(null); setError(null); }}
          >
            <label htmlFor={fieldId}>{label}</label>
            <select id={fieldId} value={draft} onChange={(event) => { setDraft(event.target.value); setEscolhaId(null); }}>
              {(vazio !== undefined || !naLista) && <option value="">{vazio ?? "Escolha…"}</option>}
              {options.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
            {!naLista && <p className="preview-note">Valor atual fora da lista: “{value}”. Escolha uma opção para vincular.</p>}
            {efeito.detalhes}
            {efeito.escolha && (
              <fieldset className="field-choice">
                <legend>{efeito.escolha.pergunta}</legend>
                {efeito.escolha.opcoes.map((opcao) => (
                  <label key={opcao.id}>
                    <input type="radio" name={`${fieldId}-escolha`} checked={escolhaId === opcao.id}
                      onChange={() => setEscolhaId(opcao.id)} />
                    {opcao.rotulo}
                  </label>
                ))}
              </fieldset>
            )}
            {efeito.bloqueio && <p role="alert">{efeito.bloqueio}</p>}
            {exigeAprovacao && <p className="preview-note">Esta alteração será enviada para aprovação do Narrador.</p>}
            {error && <p role="alert">{error}</p>}
            <div className="confirmation__actions">
              <button type="reset" className="button button--ghost">Cancelar</button>
              <button type="submit" className="button button--primary"
                disabled={pending || !mudou || Boolean(efeito.bloqueio) || faltaEscolha}>
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </Popover>
      )}
    </div>
  );
}
