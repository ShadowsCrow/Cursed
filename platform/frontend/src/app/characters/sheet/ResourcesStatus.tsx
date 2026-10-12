import { useId, useState, type FormEvent } from "react";

import { ResourceBar } from "../../../ui/Display";
import { Dialog } from "../../../ui/primitives";
import { erroDaApi } from "../../cards/types";
import { asNumber, asRecord, type ApiClient, type FichaContrato, type ValorDerivadoResumo } from "../types";
import { FontesDoValor } from "./DerivedValueGroup";

const RECURSOS = [
  { chave: "pv", rotulo: "Pontos de Vida", kind: "life" },
  { chave: "pp", rotulo: "Pontos de Propósito", kind: "power" },
] as const;

const ALVOS = [
  { valor: "pv_maximo", rotulo: "PV máximo" },
  { valor: "pp_maximo", rotulo: "PP máximo" },
  { valor: "escala_pv", rotulo: "Escala de PV" },
  { valor: "escala_pp", rotulo: "Escala de PP" },
] as const;

export interface AjusteRecursoProps {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  versao: number;
  onAjustado: (novaVersao: number) => void;
}

function atualDe(ficha: FichaContrato, chave: string): number | undefined {
  return asNumber(asRecord(asRecord(asRecord(ficha).recursos)[chave]).atual);
}

/** PV ou PP: atual da ficha, máximo calculado pelas regras e as fontes do máximo sob demanda. */
function Recurso({ ficha, valores, chave, rotulo, kind }: {
  ficha: FichaContrato; valores: ValorDerivadoResumo[]; chave: string; rotulo: string; kind: "life" | "power";
}) {
  const maximo = valores.find((v) => v.chave === `recurso:${chave}_maximo`);
  const atual = atualDe(ficha, chave);
  if (!maximo || maximo.total === null) {
    return (
      <div className="resource resource--unregistered">
        <div className="resource__head"><span>{rotulo}</span></div>
        <p className="preview-note">Não calculável{maximo?.motivo ? `: ${maximo.motivo}` : "."}</p>
      </div>
    );
  }
  return (
    <div className="resource-status">
      {atual === undefined
        ? (
          <div className="resource resource--unregistered">
            <div className="resource__head"><span>{rotulo}</span><strong>— <span>/ {maximo.total}</span></strong></div>
            <p className="preview-note">Valor atual não registrado.</p>
          </div>
        )
        : <ResourceBar label={rotulo} current={atual} max={maximo.total} kind={kind} />}
      <span className="resource-status__sources">Máximo <FontesDoValor valor={maximo} /></span>
      {maximo.divergencia_legada != null && (
        <small className="field-warning">A ficha antiga registrava {maximo.divergencia_legada}; vale o calculado.</small>
      )}
    </div>
  );
}

function DialogoAjuste({ ajuste }: { ajuste: AjusteRecursoProps }) {
  const [aberto, setAberto] = useState(false);
  const [alvo, setAlvo] = useState<(typeof ALVOS)[number]["valor"]>("pv_maximo");
  const [valor, setValor] = useState("");
  const [origem, setOrigem] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);
  const ids = { alvo: useId(), valor: useId(), origem: useId(), justificativa: useId() };
  const numero = Number(valor);
  const valido = valor.trim() !== "" && Number.isInteger(numero) && numero !== 0 && origem.trim() !== "" && justificativa.trim() !== "";

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valido) return;
    setPendente(true);
    setErro(null);
    const { data, error } = await ajuste.api.POST("/mesas/{mesa_id}/personagens/{personagem_id}/recursos/ajustes", {
      params: { path: { mesa_id: ajuste.mesaId, personagem_id: ajuste.personagemId } },
      body: { versao_esperada: ajuste.versao, alvo, valor: numero, origem: origem.trim(), justificativa: justificativa.trim() },
    });
    setPendente(false);
    if (error || !data) {
      setErro(erroDaApi(error, "Não foi possível registrar o ajuste.").message);
      return;
    }
    ajuste.onAjustado(data.versao);
    setAberto(false);
    setValor(""); setOrigem(""); setJustificativa("");
  }

  return (
    <>
      <button type="button" className="text-action" onClick={() => setAberto(true)}>Ajustar PV/PP</button>
      <Dialog open={aberto} onClose={() => setAberto(false)} title="Ajuste de PV ou PP"
        description="Use quando uma regra específica de raça, classe ou campanha prevalecer. O ajuste aparece como fonte do valor e fica no histórico.">
        <form onSubmit={(event) => { void enviar(event); }}>
          <label htmlFor={ids.alvo}>Valor ajustado</label>
          <select id={ids.alvo} value={alvo} onChange={(e) => setAlvo(e.target.value as typeof alvo)}>
            {ALVOS.map((a) => <option key={a.valor} value={a.valor}>{a.rotulo}</option>)}
          </select>
          <label htmlFor={ids.valor}>Ajuste (positivo ou negativo)</label>
          <input id={ids.valor} type="number" step={1} value={valor} onChange={(e) => setValor(e.target.value)} />
          <label htmlFor={ids.origem}>Origem</label>
          <input id={ids.origem} value={origem} placeholder="Ex.: Bênção do Templo" onChange={(e) => setOrigem(e.target.value)} />
          <label htmlFor={ids.justificativa}>Justificativa</label>
          <textarea id={ids.justificativa} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
          {erro && <p role="alert">{erro}</p>}
          <div className="confirmation__actions">
            <button type="button" className="button button--ghost" onClick={() => setAberto(false)}>Cancelar</button>
            <button type="submit" className="button button--primary" disabled={!valido || pendente}>
              {pendente ? "Registrando…" : "Registrar ajuste"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export interface ResourcesStatusProps {
  ficha: FichaContrato;
  valores: ValorDerivadoResumo[] | undefined;
  /** Aviso de nível definido pela migração, quando houver. */
  avisoNivel?: string;
  /** Só para o Narrador: ajuste de PV/PP e confirmação do nível migrado. */
  ajuste?: AjusteRecursoProps;
  onConfirmarNivel?: () => Promise<unknown>;
}

export function ResourcesStatus({ ficha, valores, avisoNivel, ajuste, onConfirmarNivel }: ResourcesStatusProps) {
  if (!valores) return <p className="preview-note">Calculando PV e PP…</p>;
  return (
    <>
      {RECURSOS.map((r) => <Recurso key={r.chave} ficha={ficha} valores={valores} chave={r.chave} rotulo={r.rotulo} kind={r.kind} />)}
      {avisoNivel && (
        <p className="field-warning" role="note">
          {avisoNivel}
          {onConfirmarNivel && <> <button type="button" className="text-action" onClick={() => void onConfirmarNivel()}>Confirmar nível</button></>}
        </p>
      )}
      {ajuste && <DialogoAjuste ajuste={ajuste} />}
    </>
  );
}
