import { useId, useState, type FormEvent } from "react";

import { Glyph } from "../../../ui/Display";
import { Dialog } from "../../../ui/primitives";
import type { ApiClient } from "../types";
import {
  useCriarConsequencia, useEditarConsequencia, useTransicionarConsequencia,
  type AcaoConsequencia, type ConsequenciaResumo, type EditarConsequenciaVariaveis,
} from "./sheetApi";
import { ConsequenciaCampos } from "./WearControls";
import { ROTULO_CATEGORIA, consequenciaEntrada, consequenciaValida, consequenciaVazia } from "./wearForms";

const ESTADO: Record<ConsequenciaResumo["tratamento"]["estado"], string> = {
  ativo: "Ativo", mitigado: "Mitigado", em_tratamento: "Em tratamento", encerrado: "Encerrado",
};

const ACOES: { acao: AcaoConsequencia; rotulo: string; descricao: string; quando: (c: ConsequenciaResumo) => boolean }[] = [
  { acao: "intensificar", rotulo: "Intensificar", descricao: "A consequência se agrava e volta a ficar ativa.",
    quando: (c) => c.tratamento.estado !== "encerrado" },
  { acao: "iniciar_tratamento", rotulo: "Iniciar tratamento", descricao: "O tratamento começou; a consequência continua valendo.",
    quando: (c) => c.tratamento.estado === "ativo" || c.tratamento.estado === "mitigado" },
  { acao: "mitigar", rotulo: "Mitigar", descricao: "Adaptação ou apoio reduzem o efeito, conforme a regra da consequência.",
    quando: (c) => c.tratamento.estado === "ativo" || c.tratamento.estado === "em_tratamento" },
  { acao: "reativar", rotulo: "Reativar", descricao: "A consequência volta a valer integralmente.",
    quando: (c) => c.tratamento.estado !== "ativo" },
  { acao: "encerrar", rotulo: "Encerrar", descricao: "A consequência deixa de produzir efeitos e fica no registro como encerrada.",
    quando: (c) => c.tratamento.estado !== "encerrado" },
  { acao: "remover", rotulo: "Remover", descricao: "Apaga o registro, por exemplo quando foi lançado por engano. Fica no histórico da mesa.",
    quando: () => true },
];

export interface ConsequencesAdmin {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  versao: number;
}

function Justificativa({ value, onChange }: { value: string; onChange: (texto: string) => void }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>Justificativa</label>
      <input id={id} value={value} placeholder="Por que isto mudou" onChange={(e) => onChange(e.target.value)} />
    </>
  );
}

function Acoes({ pendente, erro, rotulo, valido, onClose, perigo = false }: {
  pendente: boolean; erro: string | null; rotulo: string; valido: boolean; onClose: () => void; perigo?: boolean;
}) {
  return (
    <>
      {erro && <p role="alert">{erro}</p>}
      <div className="confirmation__actions">
        <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" className={`button ${perigo ? "button--danger" : "button--primary"}`} disabled={!valido || pendente}>
          {pendente ? "Registrando…" : rotulo}
        </button>
      </div>
    </>
  );
}

function DialogoCriar({ admin, onClose }: { admin: ConsequencesAdmin; onClose: () => void }) {
  const [form, setForm] = useState(consequenciaVazia("ferimento_grave"));
  const [justificativa, setJustificativa] = useState("");
  const criar = useCriarConsequencia(admin.api, admin.mesaId, admin.personagemId);
  const valido = consequenciaValida(form) && justificativa.trim() !== "";
  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valido) return;
    criar.mutate({ consequencia: consequenciaEntrada(form), justificativa: justificativa.trim(), versaoEsperada: admin.versao },
      { onSuccess: onClose });
  }
  return (
    <Dialog open onClose={onClose} title="Registrar consequência"
      description="Trauma, Ferimento Grave, Sequela, Aflição ou Outra Consequência. Uma equivalente (mesma categoria, nome e origem) é intensificada.">
      <form onSubmit={enviar}>
        <ConsequenciaCampos value={form} onChange={setForm} categorias={["trauma", "ferimento_grave", "sequela", "aflicao", "outro"]} mostrarOrigem />
        <Justificativa value={justificativa} onChange={setJustificativa} />
        <Acoes pendente={criar.isPending} erro={criar.isError ? criar.error.message : null} rotulo="Registrar" valido={valido} onClose={onClose} />
      </form>
    </Dialog>
  );
}

function DialogoEditar({ admin, consequencia, onClose }: { admin: ConsequencesAdmin; consequencia: ConsequenciaResumo; onClose: () => void }) {
  const inicial = {
    nome: consequencia.nome, descricao: consequencia.descricao, gatilho: consequencia.gatilho ?? "",
    efeito: consequencia.efeito_atual ?? "", tratamento_regra: consequencia.tratamento.regra ?? "",
    progresso: String(consequencia.tratamento.progresso ?? 0), objetivo: consequencia.tratamento.objetivo != null ? String(consequencia.tratamento.objetivo) : "",
  };
  const [valores, setValores] = useState(inicial);
  const [justificativa, setJustificativa] = useState("");
  const editar = useEditarConsequencia(admin.api, admin.mesaId, admin.personagemId);
  const id = useId();
  const trauma = consequencia.categoria === "trauma";
  const campos: EditarConsequenciaVariaveis["campos"] = {};
  for (const chave of ["nome", "descricao", "gatilho", "efeito", "tratamento_regra"] as const) {
    if (valores[chave].trim() !== inicial[chave].trim()) campos[chave] = valores[chave].trim();
  }
  if (valores.progresso !== inicial.progresso) campos.progresso = Number(valores.progresso);
  if (valores.objetivo !== inicial.objetivo && valores.objetivo.trim() !== "") campos.objetivo = Number(valores.objetivo);
  const obrigatoriosOk = ["nome", "descricao", "efeito", "tratamento_regra"].every((c) => valores[c as keyof typeof valores].trim() !== "")
    && (!trauma || valores.gatilho.trim() !== "");
  const valido = Object.keys(campos).length > 0 && obrigatoriosOk && justificativa.trim() !== "";
  const campo = (chave: keyof typeof valores) => (texto: string) => setValores({ ...valores, [chave]: texto });

  return (
    <Dialog open onClose={onClose} title={`Editar ${consequencia.nome}`} description="Só os campos alterados são enviados; o valor anterior fica no histórico.">
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!valido) return;
        editar.mutate({ consequenciaId: consequencia.id, campos, justificativa: justificativa.trim(), versaoEsperada: admin.versao }, { onSuccess: onClose });
      }}>
        <label htmlFor={`${id}-nome`}>Nome</label>
        <input id={`${id}-nome`} value={valores.nome} onChange={(e) => campo("nome")(e.target.value)} />
        <label htmlFor={`${id}-descricao`}>Descrição</label>
        <textarea id={`${id}-descricao`} value={valores.descricao} onChange={(e) => campo("descricao")(e.target.value)} />
        {trauma && (
          <>
            <label htmlFor={`${id}-gatilho`}>Gatilho</label>
            <input id={`${id}-gatilho`} value={valores.gatilho} onChange={(e) => campo("gatilho")(e.target.value)} />
          </>
        )}
        <label htmlFor={`${id}-efeito`}>{trauma ? "Manifestação" : "Efeito ou limitação"}</label>
        <textarea id={`${id}-efeito`} value={valores.efeito} onChange={(e) => campo("efeito")(e.target.value)} />
        <label htmlFor={`${id}-regra`}>Tratamento ou encerramento</label>
        <input id={`${id}-regra`} value={valores.tratamento_regra} onChange={(e) => campo("tratamento_regra")(e.target.value)} />
        <label htmlFor={`${id}-progresso`}>Progresso do tratamento</label>
        <input id={`${id}-progresso`} type="number" min={0} value={valores.progresso} onChange={(e) => campo("progresso")(e.target.value)} />
        <label htmlFor={`${id}-objetivo`}>Objetivo do tratamento (opcional)</label>
        <input id={`${id}-objetivo`} type="number" min={0} value={valores.objetivo} onChange={(e) => campo("objetivo")(e.target.value)} />
        <Justificativa value={justificativa} onChange={setJustificativa} />
        <Acoes pendente={editar.isPending} erro={editar.isError ? editar.error.message : null} rotulo="Salvar" valido={valido} onClose={onClose} />
      </form>
    </Dialog>
  );
}

function DialogoTransicao({ admin, consequencia, acao, onClose }: {
  admin: ConsequencesAdmin; consequencia: ConsequenciaResumo; acao: (typeof ACOES)[number]; onClose: () => void;
}) {
  const [justificativa, setJustificativa] = useState("");
  const transicionar = useTransicionarConsequencia(admin.api, admin.mesaId, admin.personagemId);
  return (
    <Dialog open onClose={onClose} title={`${acao.rotulo} ${consequencia.nome}?`} description={acao.descricao} className="confirmation">
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!justificativa.trim()) return;
        transicionar.mutate({ consequenciaId: consequencia.id, acao: acao.acao, justificativa: justificativa.trim(), versaoEsperada: admin.versao },
          { onSuccess: onClose });
      }}>
        <Justificativa value={justificativa} onChange={setJustificativa} />
        <Acoes pendente={transicionar.isPending} erro={transicionar.isError ? transicionar.error.message : null}
          rotulo={acao.rotulo} valido={justificativa.trim() !== ""} onClose={onClose} perigo={acao.acao === "remover"} />
      </form>
    </Dialog>
  );
}

function Cartao({ consequencia, admin, onEditar, onAcao }: {
  consequencia: ConsequenciaResumo; admin?: ConsequencesAdmin;
  onEditar: () => void; onAcao: (acao: (typeof ACOES)[number]) => void;
}) {
  const { tratamento } = consequencia;
  const encerrada = tratamento.estado === "encerrado";
  return (
    <li className={`consequence-card${encerrada ? " consequence-card--encerrada" : ""}`}>
      <div className="consequence-card__head">
        <div>
          <span className="eyebrow">{ROTULO_CATEGORIA[consequencia.categoria]}</span>
          <h3>{consequencia.nome}</h3>
        </div>
        <span>{ESTADO[tratamento.estado]}{consequencia.intensidade > 1 ? ` · intensidade ${consequencia.intensidade}` : ""}</span>
      </div>
      <p>{consequencia.descricao}</p>
      <dl>
        {consequencia.gatilho && (<><dt>Gatilho</dt><dd>{consequencia.gatilho}</dd></>)}
        <dt>{consequencia.categoria === "trauma" ? "Manifestação" : "Efeito"}</dt><dd>{consequencia.efeito_atual}</dd>
        <dt>Origem</dt><dd>{consequencia.origem.nome || "Não informada"}</dd>
        <dt>Tratamento</dt>
        <dd>
          {tratamento.regra || "Não definido"}
          {(tratamento.progresso > 0 || tratamento.objetivo != null) && ` — progresso ${tratamento.progresso}${tratamento.objetivo != null ? ` de ${tratamento.objetivo}` : ""}`}
        </dd>
      </dl>
      {(consequencia.historico ?? []).length > 0 && (
        <details>
          <summary>Histórico desta consequência</summary>
          <ol>
            {(consequencia.historico ?? []).map((registro, i) => (
              <li key={i}>{registro.acao.replace(/_/g, " ")}{registro.justificativa ? ` — ${registro.justificativa}` : ""}</li>
            ))}
          </ol>
        </details>
      )}
      {admin && (
        <div className="effect-admin-list__actions">
          {!encerrada && <button type="button" className="button button--ghost" onClick={onEditar}>Editar</button>}
          {ACOES.filter((a) => a.quando(consequencia)).map((a) => (
            <button key={a.acao} type="button" className="button button--ghost" onClick={() => onAcao(a)}>{a.rotulo}</button>
          ))}
        </div>
      )}
    </li>
  );
}

type Aberto =
  | { kind: "criar" }
  | { kind: "editar"; consequencia: ConsequenciaResumo }
  | { kind: "acao"; consequencia: ConsequenciaResumo; acao: (typeof ACOES)[number] };

/**
 * Consequências persistentes: separadas das trilhas, não somem com descanso e
 * explicam de onde vieram, o que causam e como o tratamento progride. Só o
 * Narrador recebe `admin` e, portanto, as ações.
 */
export function ConsequencesPanel({ consequencias, admin }: { consequencias: ConsequenciaResumo[]; admin?: ConsequencesAdmin }) {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const fechar = () => setAberto(null);
  const ordenadas = [...consequencias].sort((a, b) =>
    Number(a.tratamento.estado === "encerrado") - Number(b.tratamento.estado === "encerrado"));
  return (
    <section className="panel" aria-labelledby="titulo-consequencias">
      <div className="section-heading">
        <div><span className="eyebrow">PERSISTENTES</span><h2 id="titulo-consequencias">Consequências</h2></div>
        {admin && (
          <button type="button" className="button button--primary" onClick={() => setAberto({ kind: "criar" })}>
            <Glyph name="spark" size={16} /> Registrar consequência
          </button>
        )}
      </div>
      {ordenadas.length === 0 ? (
        <p className="preview-note">Nenhum Trauma, Ferimento Grave, Sequela ou Aflição registrado.</p>
      ) : (
        <ul className="consequence-list">
          {ordenadas.map((c) => (
            <Cartao key={c.id} consequencia={c} admin={admin}
              onEditar={() => setAberto({ kind: "editar", consequencia: c })}
              onAcao={(acao) => setAberto({ kind: "acao", consequencia: c, acao })} />
          ))}
        </ul>
      )}
      {admin && aberto?.kind === "criar" && <DialogoCriar admin={admin} onClose={fechar} />}
      {admin && aberto?.kind === "editar" && <DialogoEditar admin={admin} consequencia={aberto.consequencia} onClose={fechar} />}
      {admin && aberto?.kind === "acao" && (
        <DialogoTransicao admin={admin} consequencia={aberto.consequencia} acao={aberto.acao} onClose={fechar} />
      )}
    </section>
  );
}
