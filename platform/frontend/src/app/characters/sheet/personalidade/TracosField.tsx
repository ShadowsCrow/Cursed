import { useId, useState, type FormEvent, type KeyboardEvent } from "react";

import { Popover } from "../../../../ui/primitives";
import { campoEditavel, campoExigeAprovacao } from "../../fieldPolicy";
import type { PermissoesFicha } from "../../types";
import type { AlteracaoCampo } from "../SelectField";
import { problemaDoTraco } from "./tracos";
import "./tracos.css";

/**
 * Editor da lista de traços (reformular-personalidade-da-ficha, D3): campo com "Adicionar" (Enter também
 * adiciona), cada traço com "Remover" e o contador. Controlado: serve à aba (dentro do popover) e à criação guiada.
 */
export function EditorDeTracos({ id, rotulo, valor, maximo, limite, onChange, dica }: {
  id: string; rotulo: string; valor: string[]; maximo: number; limite?: number | null;
  onChange: (tracos: string[]) => void; dica?: string;
}) {
  const [novo, setNovo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const contadorId = `${id}-contador`;
  const erroId = `${id}-erro`;

  function adicionar() {
    const problema = problemaDoTraco(novo, valor, maximo, limite);
    setErro(problema);
    if (problema) return;
    onChange([...valor, novo.trim()]);
    setNovo("");
  }

  function tecla(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      adicionar();
    }
  }

  return (
    <div className="editor-tracos">
      <label htmlFor={id}>{rotulo}</label>
      <div className="editor-tracos__entrada">
        <input id={id} type="text" value={novo} placeholder={dica} maxLength={typeof limite === "number" ? limite + 10 : undefined}
          aria-describedby={[contadorId, erro ? erroId : ""].filter(Boolean).join(" ")} aria-invalid={erro ? true : undefined}
          onChange={(e) => { setNovo(e.target.value); setErro(null); }} onKeyDown={tecla} />
        <button type="button" className="button button--secondary" onClick={adicionar} disabled={valor.length >= maximo}>Adicionar</button>
      </div>
      <small id={contadorId} className="editor-tracos__contador">{valor.length} de {maximo}</small>
      {erro && <small id={erroId} className="field-error" role="alert">{erro}</small>}
      {valor.length > 0 && (
        <ul className="editor-tracos__lista">
          {valor.map((traco) => (
            <li key={traco}>
              <span>{traco}</span>
              <button type="button" className="editor-tracos__remover" aria-label={`Remover ${traco}`}
                onClick={() => onChange(valor.filter((t) => t !== traco))}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Traços da ficha: as etiquetas em leitura e, para quem edita, "Editar", que abre o editor numa superfície
 * flutuante, como os outros campos. A lista vai inteira numa única gravação.
 */
export function TracosField({ rotulo, path, valor, maximo, limite, dica, permissoes, onSave, aviso }: {
  rotulo: string; path: string; valor: string[]; maximo: number; limite?: number | null; dica?: string;
  permissoes: PermissoesFicha | undefined;
  onSave: (alteracoes: AlteracaoCampo[]) => Promise<{ status: "salvo" | "pendente" }>;
  aviso?: string;
}) {
  const editavel = campoEditavel(path, permissoes);
  const exigeAprovacao = permissoes ? campoExigeAprovacao(path, permissoes) : false;
  const [rascunho, setRascunho] = useState(valor);
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nota, setNota] = useState<string | null>(null);
  const id = useId();
  const mudou = rascunho.length !== valor.length || rascunho.some((t, i) => t !== valor[i]);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mudou) return;
    setPendente(true);
    setErro(null);
    try {
      const resultado = await onSave([{ path, value: rascunho }]);
      setNota(resultado.status === "pendente" ? "Alteração enviada para aprovação do Narrador." : null);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível salvar a alteração.");
    } finally {
      setPendente(false);
    }
  }

  return (
    <div className="personalidade-etiquetas-campo">
      {valor.length > 0 ? (
        <ul className="personalidade-etiquetas" aria-label={rotulo}>
          {valor.map((traco) => <li key={traco} className="personalidade-etiqueta">{traco}</li>)}
        </ul>
      ) : editavel ? <p className="personalidade-etiquetas__vazio">{dica || `Sem ${rotulo.toLowerCase()}`}</p> : null}
      {aviso && <small className="field-warning">{aviso}</small>}
      {nota && <p className="preview-note">{nota}</p>}
      {editavel && (
        <Popover label={`Editar ${rotulo}`} triggerContent="Editar" triggerClassName="text-action"
          contentClassName="editable-field__popover">
          <form onSubmit={(event) => { void enviar(event); }} onReset={() => { setRascunho(valor); setErro(null); }}>
            <EditorDeTracos id={id} rotulo={rotulo} valor={rascunho} maximo={maximo} limite={limite} dica={dica} onChange={setRascunho} />
            {exigeAprovacao && <p className="preview-note">Esta alteração será enviada para aprovação do Narrador.</p>}
            {erro && <p role="alert">{erro}</p>}
            <div className="confirmation__actions">
              <button type="reset" className="button button--ghost">Cancelar</button>
              <button type="submit" className="button button--primary" disabled={pendente || !mudou}>{pendente ? "Salvando…" : "Salvar"}</button>
            </div>
          </form>
        </Popover>
      )}
    </div>
  );
}
