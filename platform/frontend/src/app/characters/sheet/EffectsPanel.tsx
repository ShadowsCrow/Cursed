import { useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Glyph } from "../../../ui/Display";
import { Dialog, Popover } from "../../../ui/primitives";
import type { ApiClient, EfeitoResumo, ModificadorResumo } from "../types";
import { ImageUpload } from "../../assets/ImageUpload";
import { useEfeitosDefault, type EfeitoDefault } from "./catalogoApi";
import { EffectImage } from "./EffectImage";
import { sheetKeys, useAjustarEfeito, useAplicarEfeito, useTransicionarEfeito } from "./sheetApi";

function comSinal(valor: number): string {
  return valor >= 0 ? `+${valor}` : `${valor}`;
}

const fonteTipoLabel: Record<string, string> = {
  equipamento: "Equipamento",
  importacao: "Código importado",
  narrador: "Aplicado pelo Narrador",
  catalogo: "Condição do catálogo",
};

/**
 * Ícone de um efeito ativo ou suspenso, com todo o conteúdo (nome, descrição,
 * estado, duração, fontes e modificadores, inclusive situacionais com seu
 * contexto) acessível por hover, foco de teclado, clique ou toque através de
 * um popover — nunca dependente apenas de hover. Efeitos suspensos aparecem
 * esmaecidos e rotulados como tal, tanto no gatilho quanto no conteúdo.
 */
export function EffectDetailIcon({ efeito, api, mesaId }: { efeito: EfeitoResumo; api?: ApiClient; mesaId?: string }) {
  const suspenso = efeito.estado === "suspenso";
  const modificadoresDiretos = (efeito.modificadores ?? []).filter((mod) => !mod.contexto);
  const situacionais = (efeito.modificadores ?? []).filter((mod) => mod.contexto);
  return (
    <Popover
      label={suspenso ? `${efeito.nome} (suspenso)` : efeito.nome}
      triggerContent={<EffectImage icone={efeito.icone} api={api} mesaId={mesaId} />}
      triggerClassName={`effect-icon effect-icon--imagem${suspenso ? " effect-icon--suspenso" : ""}`}
    >
      <dl>
        <dt>Nome</dt>
        <dd>{efeito.nome}</dd>
        <dt>Estado</dt>
        <dd>{suspenso ? "Suspenso" : "Ativo"}</dd>
        <dt>Descrição</dt>
        <dd>{efeito.descricao}</dd>
        <dt>Duração</dt>
        <dd>{efeito.duracao_rodadas ? `${efeito.duracao_rodadas} rodada${efeito.duracao_rodadas > 1 ? "s" : ""}` : "Sem duração limitada"}</dd>
        {efeito.ativacao && (<><dt>Ativação</dt><dd>{efeito.ativacao === "enquanto_equipado" ? "Enquanto o item de origem estiver equipado" : efeito.ativacao}</dd></>)}
        {(efeito.fontes ?? []).map((fonte, i) => (
          <div key={`fonte-${i}`}>
            <dt>Origem</dt>
            <dd>{fonteTipoLabel[fonte.tipo] ?? fonte.tipo}{fonte.descricao ? ` — ${fonte.descricao}` : ""}</dd>
          </div>
        ))}
        {modificadoresDiretos.map((mod, i) => (
          <div key={`mod-${i}`}>
            <dt>Modificador — {mod.alvo}</dt>
            <dd>{comSinal(mod.valor)}</dd>
          </div>
        ))}
      </dl>
      {situacionais.length > 0 && (
        <>
          <p className="eyebrow">Situacionais</p>
          <dl>
            {situacionais.map((mod, i) => (
              <div key={`sit-${i}`}>
                <dt>{mod.alvo} · {mod.contexto}</dt>
                <dd>{comSinal(mod.valor)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </Popover>
  );
}

export function ModifiersEditor({ value, onChange, idPrefix }: { value: ModificadorResumo[]; onChange: (next: ModificadorResumo[]) => void; idPrefix: string }) {
  function updateRow(index: number, patch: Partial<ModificadorResumo>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }
  return (
    <fieldset className="modifiers-editor">
      <legend>Modificadores (opcional)</legend>
      {value.map((row, index) => (
        <div key={index} className="modifiers-editor__row">
          <label htmlFor={`${idPrefix}-alvo-${index}`}>Alvo</label>
          <input id={`${idPrefix}-alvo-${index}`} value={row.alvo} onChange={(event) => updateRow(index, { alvo: event.target.value })} />
          <label htmlFor={`${idPrefix}-valor-${index}`}>Valor</label>
          <input
            id={`${idPrefix}-valor-${index}`}
            type="number"
            value={row.valor}
            onChange={(event) => updateRow(index, { valor: Number(event.target.value) })}
          />
          <label htmlFor={`${idPrefix}-contexto-${index}`}>Contexto (opcional)</label>
          <input
            id={`${idPrefix}-contexto-${index}`}
            value={row.contexto ?? ""}
            onChange={(event) => updateRow(index, { contexto: event.target.value || null })}
          />
          <button type="button" className="button button--ghost" onClick={() => removeRow(index)}>Remover modificador</button>
        </div>
      ))}
      <button type="button" className="button button--secondary" onClick={() => onChange([...value, { alvo: "", valor: 0, contexto: null }])}>
        Adicionar modificador
      </button>
    </fieldset>
  );
}

export interface AplicarEfeitoPayload {
  associacao: string | null;
  nome: string | null;
  descricao: string | null;
  modificadores?: ModificadorResumo[];
  duracaoRodadas: number | null;
  origem: string | null;
  motivo: string | null;
}

function comSinalModificador(m: { alvo: string; valor: number; quando?: string | null }): string {
  return `${m.alvo} ${comSinal(m.valor)}${m.quando ? ` (${m.quando})` : ""}`;
}

/** Efeitos default agrupados como nas regras, com prévia e o aviso de substituição. */
function DefaultEffectList({
  defaults, ativos, escolhido, onEscolher,
}: {
  defaults: EfeitoDefault[] | undefined; ativos: EfeitoResumo[]; escolhido: string; onEscolher: (associacao: string) => void;
}) {
  if (!defaults) return <p>Carregando condições…</p>;
  const grupos = [...new Set(defaults.map((e) => e.grupo ?? "Outros"))];
  const selecionado = defaults.find((e) => e.associacao === escolhido);
  const encerrados = selecionado
    ? ativos.filter((e) => e.estado !== "encerrado" && e.associacao && selecionado.substitui?.includes(e.associacao))
    : [];
  return (
    <div className="default-effects">
      {grupos.map((grupo) => (
        <fieldset key={grupo} className="default-effects__group">
          <legend>{grupo}</legend>
          {defaults.filter((e) => (e.grupo ?? "Outros") === grupo).map((efeito) => (
            <label key={efeito.associacao} className="default-effects__item">
              <input type="radio" name="aplicar-efeito-default" checked={escolhido === efeito.associacao}
                onChange={() => onEscolher(efeito.associacao)} />
              <EffectImage icone={efeito.icone} />
              <span>
                <strong>{efeito.nome}</strong>
                <small>{efeito.descricao}</small>
                {(efeito.modificadores ?? []).length > 0 && (
                  <small className="default-effects__mods">{(efeito.modificadores ?? []).map(comSinalModificador).join(" · ")}</small>
                )}
                {(efeito.substitui_nomes ?? []).length > 0 && (
                  <small>Substitui {(efeito.substitui_nomes ?? []).join(", ")}.</small>
                )}
              </span>
            </label>
          ))}
        </fieldset>
      ))}
      {selecionado && encerrados.length > 0 && (
        <p role="status" className="field-warning">
          {selecionado.nome} substitui {encerrados.map((e) => e.nome).join(", ")}: ao aplicar, {encerrados.length > 1 ? "eles serão encerrados" : `${encerrados[0]!.nome} será encerrado`}.
        </p>
      )}
    </div>
  );
}

function ApplyEffectDialog({
  onClose,
  onSubmit,
  pending,
  error,
  defaults,
  ativos,
  permitirPersonalizado,
}: {
  onClose: () => void;
  onSubmit: (payload: AplicarEfeitoPayload) => void;
  pending: boolean;
  error: string | null;
  defaults: EfeitoDefault[] | undefined;
  ativos: EfeitoResumo[];
  /** Só o Narrador cria efeitos personalizados. */
  permitirPersonalizado: boolean;
}) {
  const [modo, setModo] = useState<"catalogo" | "personalizado">("catalogo");
  const [associacao, setAssociacao] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modificadores, setModificadores] = useState<ModificadorResumo[]>([]);
  const [duracao, setDuracao] = useState("");
  const [origem, setOrigem] = useState("");
  const [motivo, setMotivo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const semEscolha = modo === "catalogo" && !associacao;

  return (
    <Dialog
      open
      onClose={onClose}
      title={permitirPersonalizado ? "Aplicar efeito" : "Aplicar condição"}
      description={permitirPersonalizado
        ? "Escolha uma condição do sistema ou descreva um efeito personalizado."
        : "Escolha a condição do sistema que vale para o seu personagem agora."}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            associacao: modo === "catalogo" ? (associacao || null) : null,
            nome: modo === "personalizado" ? (nome.trim() || null) : null,
            descricao: modo === "personalizado" ? (descricao.trim() || null) : null,
            modificadores: modo === "personalizado" && modificadores.length > 0 ? modificadores : undefined,
            duracaoRodadas: duracao.trim() ? Number(duracao) : null,
            origem: origem.trim() || null,
            motivo: motivo.trim() || null,
          });
        }}
      >
        {permitirPersonalizado && (
          <fieldset>
            <legend>Origem do efeito</legend>
            <label>
              <input type="radio" name="aplicar-efeito-modo" checked={modo === "catalogo"} onChange={() => setModo("catalogo")} /> Condição do sistema
            </label>
            <label>
              <input type="radio" name="aplicar-efeito-modo" checked={modo === "personalizado"} onChange={() => setModo("personalizado")} /> Efeito personalizado
            </label>
          </fieldset>
        )}

        {modo === "catalogo" ? (
          <DefaultEffectList defaults={defaults} ativos={ativos} escolhido={associacao} onEscolher={setAssociacao} />
        ) : (
          <>
            <label htmlFor="efeito-nome">Nome</label>
            <input id="efeito-nome" ref={inputRef} value={nome} onChange={(event) => setNome(event.target.value)} />
            <label htmlFor="efeito-descricao">Descrição</label>
            <textarea id="efeito-descricao" value={descricao} onChange={(event) => setDescricao(event.target.value)} />
            <ModifiersEditor value={modificadores} onChange={setModificadores} idPrefix="aplicar" />
          </>
        )}

        <label htmlFor="efeito-duracao">Duração (rodadas, opcional)</label>
        <input id="efeito-duracao" type="number" min={1} value={duracao} onChange={(event) => setDuracao(event.target.value)} />

        <label htmlFor="efeito-origem">Origem (o que causou o efeito na ficção)</label>
        <input id="efeito-origem" value={origem} onChange={(event) => setOrigem(event.target.value)} />

        <label htmlFor="efeito-motivo">Motivo (opcional)</label>
        <input id="efeito-motivo" value={motivo} onChange={(event) => setMotivo(event.target.value)} />

        {error && <p role="alert">{error}</p>}
        <div className="confirmation__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button button--primary" disabled={pending || semEscolha}>
            {pending ? "Aplicando…" : permitirPersonalizado ? "Aplicar efeito" : "Aplicar condição"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export interface AjustarEfeitoPayload {
  descricao?: string;
  duracaoRodadas: number | null;
  modificadores: ModificadorResumo[];
  motivo: string | null;
}

function AdjustEffectDialog({
  efeito,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  efeito: EfeitoResumo;
  onClose: () => void;
  onSubmit: (payload: AjustarEfeitoPayload) => void;
  pending: boolean;
  error: string | null;
}) {
  const [descricao, setDescricao] = useState(efeito.descricao);
  const [duracao, setDuracao] = useState(efeito.duracao_rodadas ? String(efeito.duracao_rodadas) : "");
  const [modificadores, setModificadores] = useState<ModificadorResumo[]>(efeito.modificadores ?? []);
  const [motivo, setMotivo] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Dialog open onClose={onClose} title={`Ajustar ${efeito.nome}`} initialFocusRef={inputRef}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            descricao,
            duracaoRodadas: duracao.trim() ? Number(duracao) : null,
            modificadores,
            motivo: motivo.trim() || null,
          });
        }}
      >
        <label htmlFor="ajustar-efeito-descricao">Descrição</label>
        <textarea id="ajustar-efeito-descricao" ref={inputRef} value={descricao} onChange={(event) => setDescricao(event.target.value)} />

        <label htmlFor="ajustar-efeito-duracao">Duração (rodadas; vazio remove a duração)</label>
        <input id="ajustar-efeito-duracao" type="number" min={1} value={duracao} onChange={(event) => setDuracao(event.target.value)} />

        <ModifiersEditor value={modificadores} onChange={setModificadores} idPrefix="ajustar" />

        <label htmlFor="ajustar-efeito-motivo">Motivo (opcional)</label>
        <input id="ajustar-efeito-motivo" value={motivo} onChange={(event) => setMotivo(event.target.value)} />

        {error && <p role="alert">{error}</p>}
        <div className="confirmation__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button button--primary" disabled={pending}>
            {pending ? "Salvando…" : "Salvar ajuste"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

type TransicaoAcao = "suspender" | "retomar" | "encerrar";

const acaoLabel: Record<TransicaoAcao, string> = { suspender: "Suspender", retomar: "Retomar", encerrar: "Encerrar" };
const acaoDescricao: Record<TransicaoAcao, string> = {
  suspender: "O efeito para de valer até ser retomado, mas continua registrado.",
  retomar: "O efeito volta a valer normalmente.",
  encerrar: "O efeito é encerrado; essa ação não pode ser desfeita por aqui.",
};

function TransitionEffectDialog({
  efeito,
  acao,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  efeito: EfeitoResumo;
  acao: TransicaoAcao;
  onClose: () => void;
  onSubmit: (motivo: string | null) => void;
  pending: boolean;
  error: string | null;
}) {
  const [motivo, setMotivo] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${acaoLabel[acao]} ${efeito.nome}?`}
      description={acaoDescricao[acao]}
      initialFocusRef={cancelRef}
      className="confirmation"
    >
      <label htmlFor="transicao-efeito-motivo">Motivo (opcional)</label>
      <input id="transicao-efeito-motivo" value={motivo} onChange={(event) => setMotivo(event.target.value)} />
      {error && <p role="alert">{error}</p>}
      <div className="confirmation__actions">
        <button type="button" ref={cancelRef} className="button button--ghost" onClick={onClose}>Cancelar</button>
        <button
          type="button"
          className={`button ${acao === "encerrar" ? "button--danger" : "button--primary"}`}
          onClick={() => onSubmit(motivo.trim() || null)}
          disabled={pending}
        >
          {pending ? "Enviando…" : acaoLabel[acao]}
        </button>
      </div>
    </Dialog>
  );
}

function EffectAdminList({
  efeitos,
  onAjustar,
  onTransicionar,
  narrador,
  imagem,
}: {
  efeitos: EfeitoResumo[];
  onAjustar: (efeito: EfeitoResumo) => void;
  onTransicionar: (efeito: EfeitoResumo, acao: TransicaoAcao) => void;
  narrador: boolean;
  /** Envio da imagem de um efeito personalizado (os do catálogo usam o ícone da mesa). */
  imagem?: (efeito: EfeitoResumo) => ReactNode;
}) {
  const administraveis = efeitos.filter((efeito) => efeito.estado !== "encerrado" && !efeito.derivado);
  if (administraveis.length === 0) return null;
  if (!narrador) {
    return (
      <div className="effect-admin-list">
        <span className="eyebrow">EFEITOS DO SEU PERSONAGEM</span>
        {administraveis.map((efeito) => (
          <div key={efeito.id} className="effect-admin-list__row">
            <span>{efeito.nome}</span>
            <div className="effect-admin-list__actions">
              {efeito.associacao
                ? <button type="button" className="button button--ghost" onClick={() => onTransicionar(efeito, "encerrar")}>Encerrar {efeito.nome}</button>
                : imagem?.(efeito)}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="effect-admin-list">
      <span className="eyebrow">ADMINISTRAÇÃO DO NARRADOR</span>
      {administraveis.map((efeito) => (
        <div key={efeito.id} className="effect-admin-list__row">
          <span>{efeito.nome}{efeito.estado === "suspenso" ? " (suspenso)" : ""}</span>
          <div className="effect-admin-list__actions">
            <button type="button" className="button button--ghost" onClick={() => onAjustar(efeito)}>Ajustar</button>
            {efeito.estado === "ativo" && (
              <button type="button" className="button button--ghost" onClick={() => onTransicionar(efeito, "suspender")}>Suspender</button>
            )}
            {efeito.estado === "suspenso" && (
              <button type="button" className="button button--ghost" onClick={() => onTransicionar(efeito, "retomar")}>Retomar</button>
            )}
            <button type="button" className="button button--ghost" onClick={() => onTransicionar(efeito, "encerrar")}>Encerrar</button>
            {!efeito.associacao && imagem?.(efeito)}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface EffectsAdmin {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  /** Versão atual do personagem, compartilhada por todos os comandos de efeito. */
  versao: number;
  onVersaoConfirmada: (versao: number) => void;
  /** O Narrador administra tudo; o jogador aplica e encerra condições do catálogo no próprio personagem. */
  papel?: "narrador" | "jogador";
}

type DialogState =
  | { kind: "aplicar" }
  | { kind: "ajustar"; efeito: EfeitoResumo }
  | { kind: "transicao"; efeito: EfeitoResumo; acao: TransicaoAcao };

/**
 * Painel de efeitos: sempre mostra o estado visível (6.5). Quando `admin` é
 * informado — só para o Narrador (8.3) — também oferece aplicar, ajustar,
 * suspender, retomar e encerrar efeitos. O jogador nunca recebe `admin`, então
 * nenhum desses controles chega a ser renderizado para ele.
 */
export function EffectsPanel({ efeitos, admin, api, mesaId, semTitulo = false }: {
  efeitos: EfeitoResumo[]; admin?: EffectsAdmin; api?: ApiClient; mesaId?: string;
  /** Dentro da moldura da seção, que já traz o título. */
  semTitulo?: boolean;
}) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const queryClient = useQueryClient();
  const narrador = (admin?.papel ?? "narrador") === "narrador";
  const defaults = useEfeitosDefault(admin?.api as ApiClient, admin?.mesaId ?? "", Boolean(admin) && dialog?.kind === "aplicar");

  const aplicarMutation = useAplicarEfeito(admin?.api as ApiClient, admin?.mesaId ?? "", admin?.personagemId ?? "");
  const ajustarMutation = useAjustarEfeito(admin?.api as ApiClient, admin?.mesaId ?? "", admin?.personagemId ?? "");
  const transicionarMutation = useTransicionarEfeito(admin?.api as ApiClient, admin?.mesaId ?? "", admin?.personagemId ?? "");

  function closeDialog() {
    setDialog(null);
    aplicarMutation.reset();
    ajustarMutation.reset();
    transicionarMutation.reset();
  }

  function handleAplicar(payload: AplicarEfeitoPayload) {
    if (!admin) return;
    aplicarMutation.mutate(
      { ...payload, versaoEsperada: admin.versao },
      { onSuccess: (data) => { admin.onVersaoConfirmada(data.versao); closeDialog(); } },
    );
  }

  function handleAjustar(payload: AjustarEfeitoPayload) {
    if (!admin || dialog?.kind !== "ajustar") return;
    ajustarMutation.mutate(
      { efeitoId: dialog.efeito.id, ...payload, versaoEsperada: admin.versao },
      { onSuccess: (data) => { admin.onVersaoConfirmada(data.versao); closeDialog(); } },
    );
  }

  function handleTransicionar(motivo: string | null) {
    if (!admin || dialog?.kind !== "transicao") return;
    transicionarMutation.mutate(
      { efeitoId: dialog.efeito.id, acao: dialog.acao, motivo, versaoEsperada: admin.versao },
      { onSuccess: (data) => { admin.onVersaoConfirmada(data.versao); closeDialog(); } },
    );
  }

  return (
    <section className="panel" aria-label="Efeitos">
      <div className="section-heading">
        {semTitulo ? <div /> : <div><span className="eyebrow">ESTADO ATIVO</span><h2>Efeitos</h2></div>}
        {admin && (
          <button type="button" className="button button--primary" onClick={() => setDialog({ kind: "aplicar" })}>
            <Glyph name="spark" size={16} /> {narrador ? "Aplicar efeito" : "Aplicar condição"}
          </button>
        )}
      </div>
      {efeitos.length === 0 ? (
        <p className="preview-note">Nenhum efeito ativo ou suspenso no momento.</p>
      ) : (
        <>
          <ul className="effect-strip">
            {efeitos.map((efeito) => (
              <li key={efeito.id} className={`effect-chip ${efeito.estado === "suspenso" ? "effect-chip--suspenso" : ""}`.trim()}>
                <EffectDetailIcon efeito={efeito} api={api ?? admin?.api} mesaId={mesaId ?? admin?.mesaId} />
                <span aria-hidden="true">{efeito.nome}{efeito.estado === "suspenso" ? " · suspenso" : ""}</span>
              </li>
            ))}
          </ul>
          <p className="effect-strip__hint">Toque ou passe o cursor em um efeito para ver origem, duração e modificadores.</p>
        </>
      )}

      {admin && <EffectAdminList efeitos={efeitos} narrador={narrador}
        onAjustar={(efeito) => setDialog({ kind: "ajustar", efeito })}
        onTransicionar={(efeito, acao) => setDialog({ kind: "transicao", efeito, acao })}
        imagem={(efeito) => (
          <ImageUpload api={admin.api} mesaId={admin.mesaId} destino="efeito" alvo={efeito.id} versao={admin.versao}
            rotulo={`imagem de ${efeito.nome}`} temImagem={efeito.icone?.origem === "efeito"}
            onConcluido={(resposta) => {
              if (resposta.versao != null) admin.onVersaoConfirmada(resposta.versao);
              void queryClient.invalidateQueries({ queryKey: sheetKeys.efeitos(admin.mesaId, admin.personagemId) });
            }} />
        )} />}

      {admin && dialog?.kind === "aplicar" && (
        <ApplyEffectDialog
          defaults={defaults.data}
          ativos={efeitos}
          permitirPersonalizado={narrador}
          onClose={closeDialog}
          onSubmit={handleAplicar}
          pending={aplicarMutation.isPending}
          error={aplicarMutation.isError ? aplicarMutation.error.message : null}
        />
      )}
      {admin && dialog?.kind === "ajustar" && (
        <AdjustEffectDialog
          efeito={dialog.efeito}
          onClose={closeDialog}
          onSubmit={handleAjustar}
          pending={ajustarMutation.isPending}
          error={ajustarMutation.isError ? ajustarMutation.error.message : null}
        />
      )}
      {admin && dialog?.kind === "transicao" && (
        <TransitionEffectDialog
          efeito={dialog.efeito}
          acao={dialog.acao}
          onClose={closeDialog}
          onSubmit={handleTransicionar}
          pending={transicionarMutation.isPending}
          error={transicionarMutation.isError ? transicionarMutation.error.message : null}
        />
      )}
    </section>
  );
}
