import { useId, useState, type FormEvent } from "react";

import { Dialog } from "../../../ui/primitives";
import type { ApiClient } from "../types";
import {
  useAlterarDesgaste, useEncerrarColapso, useEsforco, usePreviaDesgaste,
  type ConsequenciaResumo, type OrigemConsequencia, type PreviaDesgaste,
} from "./sheetApi";
import {
  ROTULO_CATEGORIA, ROTULO_TRILHA, colapsoEntrada, colapsoInicial, colapsoValido, consequenciaEntrada,
  consequenciaValida, consequenciaVazia, type Categoria, type ColapsoForm, type ConsequenciaForm, type Trilha,
} from "./wearForms";

const ROTULO_ORIGEM: Record<OrigemConsequencia["tipo"] & string, string> = {
  mestre: "Decisão do Narrador", magia: "Magia", habilidade: "Habilidade", arma: "Arma", armadura: "Armadura",
  classe: "Classe", sistema: "Regra do sistema", outro: "Outra",
};
const MANIFESTACOES = ["Paralisar", "Fugir", "Render-se", "Dissociar"] as const;
const CATEGORIAS_EXCEDENTE: Categoria[] = ["ferimento_grave", "sequela", "aflicao", "outro"];

// ------------------------------------------------------------ consequência

export function ConsequenciaCampos({ value, onChange, categorias, mostrarOrigem = false }: {
  value: ConsequenciaForm;
  onChange: (next: ConsequenciaForm) => void;
  /** Categorias oferecidas; com uma só, a categoria fica fixa. */
  categorias: Categoria[];
  mostrarOrigem?: boolean;
}) {
  const id = useId();
  const campo = (chave: keyof ConsequenciaForm) => (texto: string) => onChange({ ...value, [chave]: texto });
  const trauma = value.categoria === "trauma";
  return (
    <fieldset className="consequence-fields">
      <legend>{categorias.length === 1 ? ROTULO_CATEGORIA[value.categoria] : "Consequência"}</legend>
      {categorias.length > 1 && (
        <>
          <label htmlFor={`${id}-categoria`}>Categoria</label>
          <select id={`${id}-categoria`} value={value.categoria} onChange={(e) => onChange({ ...value, categoria: e.target.value as Categoria })}>
            {categorias.map((c) => <option key={c} value={c}>{ROTULO_CATEGORIA[c]}</option>)}
          </select>
        </>
      )}
      <label htmlFor={`${id}-nome`}>Nome</label>
      <input id={`${id}-nome`} value={value.nome} placeholder={trauma ? "Ex.: Medo do Abismo" : "Ex.: Costelas Fraturadas"}
        onChange={(e) => campo("nome")(e.target.value)} />
      <label htmlFor={`${id}-descricao`}>Descrição</label>
      <textarea id={`${id}-descricao`} value={value.descricao} onChange={(e) => campo("descricao")(e.target.value)} />
      {trauma && (
        <>
          <label htmlFor={`${id}-gatilho`}>Gatilho</label>
          <input id={`${id}-gatilho`} value={value.gatilho} placeholder="Situação que desperta o Trauma"
            onChange={(e) => campo("gatilho")(e.target.value)} />
        </>
      )}
      <label htmlFor={`${id}-efeito`}>{trauma ? "Manifestação" : "Efeito ou limitação"}</label>
      <textarea id={`${id}-efeito`} value={value.efeito} onChange={(e) => campo("efeito")(e.target.value)} />
      <label htmlFor={`${id}-tratamento`}>Tratamento ou encerramento</label>
      <input id={`${id}-tratamento`} value={value.tratamentoRegra} placeholder="Como pode ser estabilizado, tratado ou encerrado"
        onChange={(e) => campo("tratamentoRegra")(e.target.value)} />
      {mostrarOrigem && (
        <>
          <label htmlFor={`${id}-origem`}>Origem na ficção (opcional)</label>
          <input id={`${id}-origem`} value={value.origem} placeholder="Ex.: Encontro no poço" onChange={(e) => campo("origem")(e.target.value)} />
        </>
      )}
    </fieldset>
  );
}

// ----------------------------------------------------------- Colapso Mental

export function ColapsoMentalCampos({ value, onChange, traumas }: {
  value: ColapsoForm; onChange: (next: ColapsoForm) => void; traumas: ConsequenciaResumo[];
}) {
  const id = useId();
  return (
    <div className="collapse-fields">
      <fieldset>
        <legend>Manifestação do Colapso Mental</legend>
        <p className="preview-note">Escolha uma reação coerente com a causa e a cena; o Narrador valida.</p>
        {MANIFESTACOES.map((opcao) => (
          <label key={opcao}>
            <input type="radio" name={`${id}-manifestacao`} checked={value.manifestacao === opcao}
              onChange={() => onChange({ ...value, manifestacao: opcao })} /> {opcao}
          </label>
        ))}
        <label>
          <input type="radio" name={`${id}-manifestacao`} checked={value.manifestacao === "outra"}
            onChange={() => onChange({ ...value, manifestacao: "outra" })} /> Outra
        </label>
        {value.manifestacao === "outra" && (
          <>
            <label htmlFor={`${id}-outra`}>Descreva a manifestação</label>
            <input id={`${id}-outra`} value={value.outra} onChange={(e) => onChange({ ...value, outra: e.target.value })} />
          </>
        )}
      </fieldset>
      <fieldset>
        <legend>Trauma</legend>
        <label>
          <input type="radio" name={`${id}-modo`} checked={value.modo === "novo"} onChange={() => onChange({ ...value, modo: "novo" })} /> Trauma novo
        </label>
        <label>
          <input type="radio" name={`${id}-modo`} checked={value.modo === "existente"} disabled={traumas.length === 0}
            onChange={() => onChange({ ...value, modo: "existente" })} /> Intensificar Trauma existente
        </label>
        {value.modo === "existente" ? (
          <>
            <label htmlFor={`${id}-trauma`}>Trauma equivalente</label>
            <select id={`${id}-trauma`} value={value.traumaId} onChange={(e) => onChange({ ...value, traumaId: e.target.value })}>
              {traumas.map((t) => <option key={t.id} value={t.id}>{t.nome} (intensidade {t.intensidade})</option>)}
            </select>
          </>
        ) : (
          <>
            <ConsequenciaCampos value={value.trauma} onChange={(trauma) => onChange({ ...value, trauma })} categorias={["trauma"]} mostrarOrigem />
            <p className="preview-note">Um Trauma de mesmo nome e origem de outro já registrado é intensificado, não duplicado.</p>
          </>
        )}
      </fieldset>
    </div>
  );
}

// -------------------------------------------------------------------- prévia

/** Antes e depois da trilha em texto: nada depende só de cor. */
export function PreviaDesgasteTexto({ previa }: { previa: PreviaDesgaste }) {
  const rotulo = ROTULO_TRILHA[previa.trilha];
  const limitado = previa.delta_aplicado !== previa.delta_solicitado;
  return (
    <div className="wear-preview" role="status">
      <p><strong>{rotulo} {previa.antes} → {previa.depois}</strong> de {previa.maximo}{limitado && " (limitado pela trilha)"}</p>
      {previa.mudou_faixa ? (
        <>
          <p>Faixa: <b>{previa.faixa_antes.nome}</b> → <b>{previa.faixa_depois.nome}</b></p>
          {previa.faixa_antes.min > 0 && <p>Deixa de valer: {previa.faixa_antes.efeito}</p>}
          {previa.faixa_depois.min > 0 && <p>Passa a valer: {previa.faixa_depois.efeito}</p>}
        </>
      ) : (
        <p>Permanece <b>{previa.faixa_depois.nome}</b>.</p>
      )}
      {previa.colapso_fisico && (
        <p className="field-warning">Colapso Físico: por si só, não cria Ferimento Grave, Sequela nem morte.</p>
      )}
      {previa.colapso_mental && (
        <p className="field-warning">Colapso Mental: registre a manifestação e o Trauma criado ou intensificado.</p>
      )}
      {previa.excedente_fisico && (
        <p className="field-warning">Já está em 15: a Exaustão não sobe. O Narrador aplica no máximo uma consequência física coerente com a fonte; nunca morte automática.</p>
      )}
    </div>
  );
}

export interface ControleBase {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  versao: number;
  consequencias: ConsequenciaResumo[];
  onClose: () => void;
}

function traumasDe(consequencias: ConsequenciaResumo[]) {
  return consequencias.filter((c) => c.categoria === "trauma");
}

// --------------------------------------------------- alteração do Narrador

export function DialogoAlteracaoDesgaste({ api, mesaId, personagemId, versao, consequencias, onClose, trilhaInicial, sentidoInicial }: ControleBase & {
  trilhaInicial: Trilha; sentidoInicial: 1 | -1;
}) {
  const [trilha, setTrilha] = useState<Trilha>(trilhaInicial);
  const [sentido, setSentido] = useState<1 | -1>(sentidoInicial);
  const [pontos, setPontos] = useState("1");
  const [tipoOrigem, setTipoOrigem] = useState<OrigemConsequencia["tipo"] & string>("mestre");
  const [origem, setOrigem] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [registrarExcedente, setRegistrarExcedente] = useState(false);
  const [excedente, setExcedente] = useState(consequenciaVazia("ferimento_grave"));
  const [colapso, setColapso] = useState(() => colapsoInicial(traumasDe(consequencias)));
  const ids = { trilha: useId(), pontos: useId(), tipo: useId(), origem: useId(), justificativa: useId() };
  const quantidade = Number(pontos);
  const pontosValidos = Number.isInteger(quantidade) && quantidade >= 1 && quantidade <= 15;
  const previa = usePreviaDesgaste(api, mesaId, personagemId, versao,
    pontosValidos ? { tipo: "alteracao", trilha, delta: sentido * quantidade } : null);
  const alterar = useAlterarDesgaste(api, mesaId, personagemId);
  const dados = previa.data;
  const excedenteAtivo = Boolean(dados?.excedente_fisico) && registrarExcedente;
  const valido = pontosValidos && origem.trim() !== "" && Boolean(dados)
    && (!dados?.colapso_mental || colapsoValido(colapso))
    && (!excedenteAtivo || consequenciaValida(excedente))
    && (dados?.delta_aplicado !== 0 || excedenteAtivo);

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valido || !dados) return;
    alterar.mutate({
      trilha, delta: sentido * quantidade, origem: { tipo: tipoOrigem, nome: origem.trim() },
      justificativa: justificativa.trim() || null,
      colapsoMental: dados.colapso_mental ? colapsoEntrada(colapso) : null,
      consequenciaExcedente: excedenteAtivo ? consequenciaEntrada(excedente) : null,
      versaoEsperada: versao,
    }, { onSuccess: onClose });
  }

  return (
    <Dialog open onClose={onClose} title="Alterar Exaustão ou Estresse"
      description="Veja o que muda antes de confirmar. A alteração fica no histórico da mesa com a origem informada.">
      <form onSubmit={enviar}>
        <label htmlFor={ids.trilha}>Trilha</label>
        <select id={ids.trilha} value={trilha} onChange={(e) => setTrilha(e.target.value as Trilha)}>
          <option value="exaustao">Exaustão</option>
          <option value="estresse">Estresse</option>
        </select>
        <fieldset>
          <legend>Sentido</legend>
          <label><input type="radio" name="sentido-desgaste" checked={sentido === 1} onChange={() => setSentido(1)} /> Aumentar</label>
          <label><input type="radio" name="sentido-desgaste" checked={sentido === -1} onChange={() => setSentido(-1)} /> Reduzir</label>
        </fieldset>
        <label htmlFor={ids.pontos}>Pontos</label>
        <input id={ids.pontos} type="number" min={1} max={15} step={1} value={pontos} onChange={(e) => setPontos(e.target.value)} />
        <label htmlFor={ids.tipo}>Tipo de origem</label>
        <select id={ids.tipo} value={tipoOrigem} onChange={(e) => setTipoOrigem(e.target.value as typeof tipoOrigem)}>
          {Object.entries(ROTULO_ORIGEM).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
        </select>
        <label htmlFor={ids.origem}>Origem</label>
        <input id={ids.origem} value={origem} placeholder="Ex.: Marcha forçada" onChange={(e) => setOrigem(e.target.value)} />
        <label htmlFor={ids.justificativa}>Justificativa (opcional)</label>
        <input id={ids.justificativa} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />

        {previa.isFetching && !dados && <p className="preview-note">Calculando prévia…</p>}
        {previa.isError && <p role="alert">{previa.error.message}</p>}
        {dados && <PreviaDesgasteTexto previa={dados} />}
        {dados?.colapso_mental && <ColapsoMentalCampos value={colapso} onChange={setColapso} traumas={traumasDe(consequencias)} />}
        {dados?.excedente_fisico && (
          <>
            <label>
              <input type="checkbox" checked={registrarExcedente} onChange={(e) => setRegistrarExcedente(e.target.checked)} /> Registrar consequência física do excedente
            </label>
            {registrarExcedente && <ConsequenciaCampos value={excedente} onChange={setExcedente} categorias={CATEGORIAS_EXCEDENTE} />}
          </>
        )}

        {alterar.isError && <p role="alert">{alterar.error.message}</p>}
        <div className="confirmation__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button button--primary" disabled={!valido || alterar.isPending}>
            {alterar.isPending ? "Registrando…" : "Confirmar alteração"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// ------------------------------------------------------------------ esforço

export function DialogoEsforco({ api, mesaId, personagemId, versao, consequencias, onClose }: ControleBase) {
  const [tipo, setTipo] = useState<"fisico" | "mental">("fisico");
  const [pontos, setPontos] = useState(1);
  const [movimento, setMovimento] = useState(0);
  const [acao, setAcao] = useState("");
  const [colapso, setColapso] = useState(() => colapsoInicial(traumasDe(consequencias)));
  const ids = { pontos: useId(), movimento: useId(), acao: useId() };
  const bonusMovimento = tipo === "fisico" ? Math.min(movimento, pontos) : 0;
  const previa = usePreviaDesgaste(api, mesaId, personagemId, versao,
    { tipo: "esforco", esforco: tipo, pontos, bonusMovimento });
  const esforco = useEsforco(api, mesaId, personagemId);
  const dados = previa.data;
  const valido = Boolean(dados) && acao.trim() !== "" && (!dados?.colapso_mental || colapsoValido(colapso));

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valido || !dados) return;
    esforco.mutate({
      tipo, pontos, bonusMovimento, acao: acao.trim(),
      colapsoMental: dados.colapso_mental ? colapsoEntrada(colapso) : null, versaoEsperada: versao,
    }, { onSuccess: onClose });
  }

  return (
    <Dialog open onClose={onClose} title="Esforço voluntário"
      description="Declare o esforço antes de resolver a ação. Resolva a ação com o bônus; o custo é aplicado ao confirmar, depois dela.">
      <form onSubmit={enviar}>
        <fieldset>
          <legend>Tipo de esforço</legend>
          <label><input type="radio" name="tipo-esforco" checked={tipo === "fisico"} onChange={() => setTipo("fisico")} /> Físico (custa Exaustão)</label>
          <label><input type="radio" name="tipo-esforco" checked={tipo === "mental"} onChange={() => setTipo("mental")} /> Mental ou social (custa Estresse)</label>
        </fieldset>
        <label htmlFor={ids.pontos}>Pontos assumidos</label>
        <select id={ids.pontos} value={pontos} onChange={(e) => setPontos(Number(e.target.value))}>
          {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {tipo === "fisico" && (
          <>
            <label htmlFor={ids.movimento}>Pontos convertidos em Movimento (+1 m cada)</label>
            <select id={ids.movimento} value={bonusMovimento} onChange={(e) => setMovimento(Number(e.target.value))}>
              {Array.from({ length: pontos + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </>
        )}
        <label htmlFor={ids.acao}>Ação ou teste</label>
        <input id={ids.acao} value={acao} placeholder="Ex.: Saltar o fosso" onChange={(e) => setAcao(e.target.value)} />
        <p className="preview-note">
          Uma vez por ação ou teste. O bônus não aumenta diretamente dano, cura ou Defesa
          {tipo === "mental" ? ", nem a CD de uma habilidade ou magia" : ""}.
        </p>

        {previa.isError && <p role="alert">{previa.error.message}</p>}
        {dados && (
          <>
            <p className="wear-bonus">
              Bônus nesta ação: {dados.bonus_teste ? `+${dados.bonus_teste} no teste` : "nenhum no teste"}
              {dados.bonus_movimento ? `, +${dados.bonus_movimento} m de Movimento` : ""}.
            </p>
            <PreviaDesgasteTexto previa={dados} />
          </>
        )}
        {dados?.colapso_mental && <ColapsoMentalCampos value={colapso} onChange={setColapso} traumas={traumasDe(consequencias)} />}

        {esforco.isError && <p role="alert">{esforco.error.message}</p>}
        <div className="confirmation__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button button--primary" disabled={!valido || esforco.isPending}>
            {esforco.isPending ? "Registrando…" : "Registrar custo"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// -------------------------------------------------------- fim do colapso

export function DialogoEncerrarColapso({ api, mesaId, personagemId, versao, onClose }: ControleBase) {
  const [motivo, setMotivo] = useState<"Auxílio pertinente" | "Fim do conflito imediato">("Fim do conflito imediato");
  const [detalhe, setDetalhe] = useState("");
  const idDetalhe = useId();
  const encerrar = useEncerrarColapso(api, mesaId, personagemId);
  return (
    <Dialog open onClose={onClose} title="Encerrar Colapso Mental"
      description="O Estresse volta a 8. O Trauma criado ou intensificado permanece.">
      <form onSubmit={(event) => {
        event.preventDefault();
        encerrar.mutate({ motivo: detalhe.trim() ? `${motivo}: ${detalhe.trim()}` : motivo, versaoEsperada: versao }, { onSuccess: onClose });
      }}>
        <fieldset>
          <legend>Motivo</legend>
          <label><input type="radio" name="motivo-colapso" checked={motivo === "Auxílio pertinente"} onChange={() => setMotivo("Auxílio pertinente")} /> Auxílio pertinente</label>
          <label><input type="radio" name="motivo-colapso" checked={motivo === "Fim do conflito imediato"} onChange={() => setMotivo("Fim do conflito imediato")} /> Fim do conflito imediato</label>
        </fieldset>
        <label htmlFor={idDetalhe}>Detalhe (opcional)</label>
        <input id={idDetalhe} value={detalhe} onChange={(e) => setDetalhe(e.target.value)} />
        {encerrar.isError && <p role="alert">{encerrar.error.message}</p>}
        <div className="confirmation__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button button--primary" disabled={encerrar.isPending}>
            {encerrar.isPending ? "Registrando…" : "Encerrar Colapso Mental"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
