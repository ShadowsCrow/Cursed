import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import type { GlyphName } from "../../ui/Display";
import { Glyph } from "../../ui/Display";
import { Dialog } from "../../ui/primitives";
import { usePersonagens, useParticipantes } from "../characters/api";
import type { ApiClient, ParticipanteResumo, PersonagemResumo } from "../characters/types";
import {
  CATEGORIAS_AUDITORIA,
  RELEVANCIAS_AUDITORIA,
  useCorrigirEvento,
  useEventosAuditoria,
  type AuditFiltros,
  type CategoriaAuditoria,
  type EventoAuditoriaResumo,
  type RelevanciaAuditoria,
} from "./api";

const categoriaLabel: Record<CategoriaAuditoria, string> = {
  mesa: "Mesa",
  permissao: "Permissão",
  personagem: "Personagem",
  ficha: "Ficha",
  inventario: "Inventário",
  efeito: "Efeito",
};

const categoriaIcon: Record<CategoriaAuditoria, GlyphName> = {
  mesa: "grid",
  permissao: "shield",
  personagem: "users",
  ficha: "scroll",
  inventario: "bag",
  efeito: "bolt",
};

const relevanciaLabel: Record<RelevanciaAuditoria, string> = {
  mecanica: "Mecânica",
  narrativa: "Narrativa",
  organizacional: "Organizacional",
};

const FILTER_PARAM_KEYS = ["sessao_id", "ator_id", "personagem_id", "categoria", "relevancia"] as const;

function isCategoria(value: string | null): value is CategoriaAuditoria {
  return CATEGORIAS_AUDITORIA.includes(value as CategoriaAuditoria);
}

function isRelevancia(value: string | null): value is RelevanciaAuditoria {
  return RELEVANCIAS_AUDITORIA.includes(value as RelevanciaAuditoria);
}

function filtrosFromParams(params: URLSearchParams): AuditFiltros {
  const categoria = params.get("categoria");
  const relevancia = params.get("relevancia");
  return {
    sessaoId: params.get("sessao_id") ?? undefined,
    atorId: params.get("ator_id") ?? undefined,
    personagemId: params.get("personagem_id") ?? undefined,
    categoria: isCategoria(categoria) ? categoria : undefined,
    relevancia: isRelevancia(relevancia) ? relevancia : undefined,
  };
}

function formatarQuando(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined) return "(vazio)";
  if (typeof valor === "string") return valor.trim() === "" ? "(vazio)" : valor;
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
}

/** Rótulo curto para uma sessão, já que a mesa não expõe um catálogo de sessões — só os ids vistos no log. */
function rotularSessao(id: string): string {
  return id.length > 10 ? `Sessão ${id.slice(0, 8)}…` : `Sessão ${id}`;
}

function EventoDetalhes({
  evento,
  eventosCarregados,
  onFocarEvento,
}: {
  evento: EventoAuditoriaResumo;
  eventosCarregados: Set<number>;
  onFocarEvento: (id: number) => void;
}) {
  const mudancas = evento.mudancas ?? [];
  const corrigidoPor = evento.corrigido_por ?? [];
  const temMudancas = mudancas.length > 0;
  const temVinculos = evento.corrige_evento_id != null || corrigidoPor.length > 0;
  if (!temMudancas && !evento.motivo && !temVinculos) return null;

  return (
    <details className="audit-event__details">
      <summary>Ver detalhes</summary>
      {temMudancas && (
        <dl className="audit-changes">
          {mudancas.map((mudanca, index) => (
            <div key={`${mudanca.campo}-${index}`}>
              <dt>{mudanca.rotulo ?? mudanca.campo}</dt>
              <dd>{mudanca.completo ? `${formatarValor(mudanca.antes)} → ${formatarValor(mudanca.depois)}` : "valor extenso omitido"}</dd>
            </div>
          ))}
        </dl>
      )}
      {evento.motivo && <p className="audit-event__motivo"><strong>Motivo:</strong> {evento.motivo}</p>}
      {temVinculos && (
        <p className="audit-event__links">
          {evento.corrige_evento_id != null && (
            eventosCarregados.has(evento.corrige_evento_id) ? (
              <button type="button" className="text-action" onClick={() => onFocarEvento(evento.corrige_evento_id!)}>
                Corrige o evento #{evento.corrige_evento_id}
              </button>
            ) : (
              <span>Corrige o evento #{evento.corrige_evento_id}</span>
            )
          )}
          {corrigidoPor.map((id) => (
            eventosCarregados.has(id) ? (
              <button key={id} type="button" className="text-action" onClick={() => onFocarEvento(id)}>
                Corrigido pelo evento #{id}
              </button>
            ) : (
              <span key={id}>Corrigido pelo evento #{id}</span>
            )
          ))}
        </p>
      )}
    </details>
  );
}

function CorrectionDialog({
  evento,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  evento: EventoAuditoriaResumo;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const mudancas = evento.mudancas ?? [];
  return (
    <Dialog
      open
      onClose={onCancel}
      title="Corrigir evento"
      description="Cria um novo evento vinculado que reverte a alteração abaixo. O evento original permanece no registro, sem ser apagado ou substituído."
      className="audit-correction-dialog"
    >
      <div className="audit-correction-preview">
        <p>{evento.resumo}</p>
        {mudancas.length > 0 && (
          <dl className="audit-changes">
            {mudancas.map((mudanca, index) => (
              <div key={`${mudanca.campo}-${index}`}>
                <dt>{mudanca.rotulo ?? mudanca.campo}</dt>
                <dd>{mudanca.completo ? `${formatarValor(mudanca.depois)} → ${formatarValor(mudanca.antes)}` : "valor extenso omitido"}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(motivo);
        }}
      >
        <label htmlFor="correcao-motivo">Motivo (opcional)</label>
        <textarea id="correcao-motivo" maxLength={300} value={motivo} onChange={(event) => setMotivo(event.target.value)} />
        {error && <p role="alert">{error}</p>}
        <div className="confirmation__actions">
          <button type="button" className="button button--ghost" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="button button--danger" disabled={pending}>
            {pending ? "Corrigindo…" : "Corrigir"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export interface AuditLogProps {
  api: ApiClient;
  mesaId: string;
  role: "narrador" | "jogador";
}

/**
 * Linha do tempo de auditoria da mesa (7.4), com filtros combináveis refletidos
 * na URL e correção rastreável (7.5) para o Narrador. O mesmo componente serve
 * a visão do jogador (7.6): a API já sanitiza o que cada participante pode ver,
 * então aqui só escondemos os filtros e a ação exclusivos do Narrador — nunca
 * inventamos nome para um personagem que não está na lista de quem está vendo.
 */
export function AuditLog({ api, mesaId, role }: AuditLogProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [corrigindo, setCorrigindo] = useState<EventoAuditoriaResumo | null>(null);

  const filtros = filtrosFromParams(searchParams);

  const personagensAtivos = usePersonagens(api, mesaId, false);
  const personagensExcluidos = usePersonagens(api, mesaId, true, { enabled: role === "narrador" });
  const participantes = useParticipantes(api, mesaId, { enabled: role === "narrador" });

  const personagensPorId = useMemo(() => {
    const mapa = new Map<string, PersonagemResumo>();
    for (const personagem of personagensAtivos.data ?? []) mapa.set(personagem.id, personagem);
    if (role === "narrador") {
      for (const personagem of personagensExcluidos.data ?? []) mapa.set(personagem.id, personagem);
    }
    return mapa;
  }, [personagensAtivos.data, personagensExcluidos.data, role]);

  const personagensFiltraveis = useMemo(
    () => [...personagensPorId.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [personagensPorId],
  );

  const eventosQuery = useEventosAuditoria(api, mesaId, filtros);
  const corrigir = useCorrigirEvento(api, mesaId);

  const eventos = useMemo(
    () => eventosQuery.data?.pages.flatMap((pagina) => pagina.eventos) ?? [],
    [eventosQuery.data],
  );
  const sessoesConhecidas = useMemo(
    () => [...new Set(eventos.map((evento) => evento.sessao_id).filter((id): id is string => Boolean(id)))].sort(),
    [eventos],
  );
  const eventosCarregados = useMemo(() => new Set(eventos.map((evento) => evento.id)), [eventos]);

  function setFiltro(chave: (typeof FILTER_PARAM_KEYS)[number], valor: string) {
    const next = new URLSearchParams(searchParams);
    if (valor) next.set(chave, valor); else next.delete(chave);
    setSearchParams(next, { replace: false });
  }

  function limparFiltros() {
    const next = new URLSearchParams(searchParams);
    for (const chave of FILTER_PARAM_KEYS) next.delete(chave);
    setSearchParams(next, { replace: false });
  }

  function focarEvento(id: number) {
    setHighlightId(id);
    const alvo = document.getElementById(`evento-auditoria-${id}`);
    alvo?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    if (alvo instanceof HTMLElement) alvo.focus();
  }

  function abrirCorrecao(evento: EventoAuditoriaResumo) {
    corrigir.reset();
    setCorrigindo(evento);
  }

  function confirmarCorrecao(motivo: string) {
    if (!corrigindo || !corrigindo.personagem_id) return;
    const personagem = personagensPorId.get(corrigindo.personagem_id);
    if (!personagem) return;
    corrigir.mutate(
      { eventoId: corrigindo.id, motivo, versaoEsperada: personagem.versao },
      { onSuccess: () => setCorrigindo(null) },
    );
  }

  const temFiltroAtivo = Boolean(
    filtros.sessaoId || filtros.atorId || filtros.personagemId || filtros.categoria || filtros.relevancia,
  );

  return (
    <section className="panel panel--wide audit-log" aria-label={role === "narrador" ? "Registro de alterações da mesa" : "Registro visível a você"}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">REGISTRO</span>
          <h2>{role === "narrador" ? "Ações confirmadas da mesa" : "Ações confirmadas que você pode ver"}</h2>
        </div>
      </div>

      <form className="audit-filters" onSubmit={(event) => event.preventDefault()}>
        {role === "narrador" && sessoesConhecidas.length > 0 && (
          <label>
            Sessão
            <select value={filtros.sessaoId ?? ""} onChange={(event) => setFiltro("sessao_id", event.target.value)}>
              <option value="">Todas</option>
              {sessoesConhecidas.map((id) => <option key={id} value={id}>{rotularSessao(id)}</option>)}
            </select>
          </label>
        )}
        {role === "narrador" && (
          <label>
            Ator
            <select value={filtros.atorId ?? ""} onChange={(event) => setFiltro("ator_id", event.target.value)}>
              <option value="">Todos</option>
              {(participantes.data ?? []).map((participante: ParticipanteResumo) => (
                <option key={participante.usuario_id} value={participante.usuario_id}>
                  {participante.papel === "narrador" ? "Narrador" : "Jogador"} · {participante.usuario_id}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Personagem
          <select value={filtros.personagemId ?? ""} onChange={(event) => setFiltro("personagem_id", event.target.value)}>
            <option value="">Todos</option>
            {personagensFiltraveis.map((personagem) => <option key={personagem.id} value={personagem.id}>{personagem.nome}</option>)}
          </select>
        </label>
        <label>
          Categoria
          <select value={filtros.categoria ?? ""} onChange={(event) => setFiltro("categoria", event.target.value)}>
            <option value="">Todas</option>
            {CATEGORIAS_AUDITORIA.map((categoria) => <option key={categoria} value={categoria}>{categoriaLabel[categoria]}</option>)}
          </select>
        </label>
        <label>
          Relevância
          <select value={filtros.relevancia ?? ""} onChange={(event) => setFiltro("relevancia", event.target.value)}>
            <option value="">Todas</option>
            {RELEVANCIAS_AUDITORIA.map((relevancia) => <option key={relevancia} value={relevancia}>{relevanciaLabel[relevancia]}</option>)}
          </select>
        </label>
        {temFiltroAtivo && (
          <button type="button" className="button button--ghost audit-filters__clear" onClick={limparFiltros}>
            Limpar filtros
          </button>
        )}
      </form>

      {eventosQuery.isPending && <p>Carregando registro…</p>}
      {eventosQuery.isError && <p role="alert">{eventosQuery.error.message}</p>}
      {eventosQuery.isSuccess && eventos.length === 0 && (
        <p className="preview-note">Nenhuma alteração com esses filtros.</p>
      )}

      {eventos.length > 0 && (
        <ol className="audit-timeline character-list-reset">
          {eventos.map((evento) => {
            const nomePersonagem = evento.personagem_id ? personagensPorId.get(evento.personagem_id)?.nome : undefined;
            const podeCorrigir = role === "narrador" && evento.corrigivel
              && Boolean(evento.personagem_id) && personagensPorId.has(evento.personagem_id ?? "");
            return (
              <li
                key={evento.id}
                id={`evento-auditoria-${evento.id}`}
                tabIndex={-1}
                className={`audit-event${highlightId === evento.id ? " audit-event--highlight" : ""}`}
              >
                <span className="audit-event__icon" aria-hidden="true"><Glyph name={categoriaIcon[evento.categoria]} size={18} /></span>
                <div className="audit-event__body">
                  <div className="audit-event__meta">
                    <time dateTime={evento.ocorrido_em}>{formatarQuando(evento.ocorrido_em)}</time>
                    <span className="tag">{categoriaLabel[evento.categoria]}</span>
                    <span className="tag tag--accent">{relevanciaLabel[evento.relevancia]}</span>
                    {evento.ator_id && <span>{evento.ator_id}</span>}
                    {evento.personagem_id && <span>{nomePersonagem ?? "Personagem"}</span>}
                  </div>
                  <p className="audit-event__resumo">{evento.resumo}</p>
                  <EventoDetalhes evento={evento} eventosCarregados={eventosCarregados} onFocarEvento={focarEvento} />
                  {podeCorrigir && (
                    <button type="button" className="button button--ghost audit-event__correct" onClick={() => abrirCorrecao(evento)}>
                      Corrigir
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {eventosQuery.hasNextPage && (
        <button
          type="button"
          className="button button--secondary audit-log__more"
          onClick={() => void eventosQuery.fetchNextPage()}
          disabled={eventosQuery.isFetchingNextPage}
        >
          {eventosQuery.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
        </button>
      )}

      {corrigindo && (
        <CorrectionDialog
          evento={corrigindo}
          pending={corrigir.isPending}
          error={corrigir.isError ? corrigir.error.message : null}
          onCancel={() => { setCorrigindo(null); corrigir.reset(); }}
          onConfirm={confirmarCorrecao}
        />
      )}
    </section>
  );
}
