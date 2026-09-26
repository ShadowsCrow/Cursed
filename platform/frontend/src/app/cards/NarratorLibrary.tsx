import { useState } from "react";

import { Confirmation, Dialog } from "../../ui/primitives";
import { useParticipantes, usePersonagens } from "../characters/api";
import type { ApiClient } from "../characters/types";
import {
  useApresentacoes, useApresentarCarta, useCancelarOferta, useCatalogo, useCriarCarta, useCriarOferta,
  useImportarCarta, useOfertas, usePreviaImportacaoCarta, useRecolherCarta,
} from "./api";
import { CardEditor } from "./CardEditor";
import { CardFace } from "./cardView";
import {
  ROTULO_TIPO, TIPOS_CARTA, type CartaDefinicaoResumo, type CartaVersaoResumo, type ProblemaValidacao, type TipoCarta,
} from "./types";

function estadoCarta(definicao: CartaDefinicaoResumo): string {
  if (!definicao.publicada) return "Rascunho, ainda não publicada";
  return definicao.publicada.revisao_pendente?.length ? "Publicada · revisão pendente" : "Publicada";
}

function NovaCartaDialog({ api, mesaId, onCriada, onClose }: {
  api: ApiClient; mesaId: string; onCriada: (definicao: CartaDefinicaoResumo) => void; onClose: () => void;
}) {
  const [tipo, setTipo] = useState<TipoCarta>("habilidade");
  const [titulo, setTitulo] = useState("");
  const criar = useCriarCarta(api, mesaId);
  return (
    <Dialog open title="Nova carta" onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        criar.mutate({ tipo, rascunho: { titulo: titulo.trim() } }, { onSuccess: onCriada });
      }}>
        <label>Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCarta)}>
            {TIPOS_CARTA.map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
          </select>
        </label>
        <label>Título<input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></label>
        {criar.isError && <p role="alert">{criar.error.message}</p>}
        <div className="dialog__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button" disabled={criar.isPending}>Criar rascunho</button>
        </div>
      </form>
    </Dialog>
  );
}

function ImportarCartaDialog({ api, mesaId, onClose }: { api: ApiClient; mesaId: string; onClose: () => void }) {
  const [codigo, setCodigo] = useState("");
  const previa = usePreviaImportacaoCarta(api, mesaId);
  const importar = useImportarCarta(api, mesaId);
  const erro = (importar.error ?? previa.error) as (Error & { problemas?: ProblemaValidacao[] }) | null;
  return (
    <Dialog open title="Importar carta por código" onClose={onClose}>
      <label>Código E1, E2, EQ1 ou EQ2
        <textarea value={codigo} onChange={(e) => { setCodigo(e.target.value); previa.reset(); }} />
      </label>
      <div className="dialog__actions">
        <button type="button" className="button button--secondary" disabled={!codigo.trim() || previa.isPending} onClick={() => previa.mutate(codigo.trim())}>
          Pré-visualizar
        </button>
      </div>
      {erro && <p role="alert">{erro.message}</p>}
      {erro?.problemas?.length ? <ul>{erro.problemas.map((p) => <li key={p.campo}>{p.campo}: {p.mensagem}</li>)}</ul> : null}
      {previa.data && (
        <div className="import-preview">
          <CardFace tipo={previa.data.tipo} conteudo={previa.data.rascunho} />
          {!previa.data.validacao.valida && (
            <ul role="status">{previa.data.validacao.problemas?.map((p) => <li key={p.campo}>{p.campo}: {p.mensagem}</li>)}</ul>
          )}
          {(previa.data.avisos ?? []).map((aviso) => <p key={aviso} role="note">{aviso}</p>)}
          <p>A carta será criada como rascunho; publicar continua sendo uma decisão sua.</p>
          <div className="dialog__actions">
            <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="button" disabled={!previa.data.validacao.valida || importar.isPending}
              onClick={() => importar.mutate(codigo.trim(), { onSuccess: onClose })}>
              Criar rascunho
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function NovaOfertaDialog({ api, mesaId, publicadas, onClose }: {
  api: ApiClient; mesaId: string; publicadas: CartaVersaoResumo[]; onClose: () => void;
}) {
  const personagens = usePersonagens(api, mesaId, false);
  const criar = useCriarOferta(api, mesaId);
  const [titulo, setTitulo] = useState("");
  const [candidatas, setCandidatas] = useState<string[]>([]);
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [minimo, setMinimo] = useState(1);
  const [maximo, setMaximo] = useState(1);
  const [validade, setValidade] = useState("");
  const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);
  return (
    <Dialog open title="Nova oferta de cartas" onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        criar.mutate({
          titulo: titulo.trim(), versao_ids: candidatas, personagem_ids: destinatarios,
          min_escolhas: minimo, max_escolhas: maximo, expira_em: validade ? new Date(validade).toISOString() : null,
        }, { onSuccess: onClose });
      }}>
        <label>Título<input value={titulo} onChange={(e) => setTitulo(e.target.value)} required /></label>
        <fieldset>
          <legend>Cartas candidatas</legend>
          {publicadas.map((v) => (
            <label key={v.id} className="checkbox-row">
              <input type="checkbox" checked={candidatas.includes(v.id)} onChange={() => setCandidatas(alternar(candidatas, v.id))} />
              {String(v.conteudo.titulo)} ({ROTULO_TIPO[v.tipo]}, v{v.numero})
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Destinatários (cada um escolhe de forma independente)</legend>
          {(personagens.data ?? []).map((p) => (
            <label key={p.id} className="checkbox-row">
              <input type="checkbox" checked={destinatarios.includes(p.id)} onChange={() => setDestinatarios(alternar(destinatarios, p.id))} />
              {p.nome}
            </label>
          ))}
        </fieldset>
        <div className="form-row">
          <label>Mínimo de escolhas<input type="number" min={0} value={minimo} onChange={(e) => setMinimo(Number(e.target.value))} /></label>
          <label>Máximo de escolhas<input type="number" min={1} value={maximo} onChange={(e) => setMaximo(Number(e.target.value))} /></label>
          <label>Validade (opcional)<input type="datetime-local" value={validade} onChange={(e) => setValidade(e.target.value)} /></label>
        </div>
        {criar.isError && <p role="alert">{criar.error.message}</p>}
        <div className="dialog__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button" disabled={criar.isPending || !candidatas.length || !destinatarios.length}>Enviar oferta</button>
        </div>
      </form>
    </Dialog>
  );
}

function ApresentarDialog({ api, mesaId, versao, onClose }: { api: ApiClient; mesaId: string; versao: CartaVersaoResumo; onClose: () => void }) {
  const participantes = useParticipantes(api, mesaId);
  const apresentar = useApresentarCarta(api, mesaId);
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  return (
    <Dialog open title={`Apresentar “${String(versao.conteudo.titulo)}”`} onClose={onClose}>
      <p>A carta aparece para os destinatários sem entrar em nenhuma ficha. Sem seleção, toda a mesa vê.</p>
      <fieldset>
        <legend>Destinatários</legend>
        {(participantes.data ?? []).filter((p) => p.papel === "jogador").map((p) => (
          <label key={p.usuario_id} className="checkbox-row">
            <input type="checkbox" checked={destinatarios.includes(p.usuario_id)}
              onChange={() => setDestinatarios((atual) => (atual.includes(p.usuario_id) ? atual.filter((x) => x !== p.usuario_id) : [...atual, p.usuario_id]))} />
            Jogador · {p.usuario_id}
          </label>
        ))}
      </fieldset>
      {apresentar.isError && <p role="alert">{apresentar.error.message}</p>}
      <div className="dialog__actions">
        <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
        <button type="button" className="button" disabled={apresentar.isPending}
          onClick={() => apresentar.mutate({ versao_id: versao.id, destinatarios }, { onSuccess: onClose })}>
          Apresentar
        </button>
      </div>
    </Dialog>
  );
}

/** Biblioteca do Narrador: catálogo, ofertas e apresentações. A aplicação não decide quando oferecer. */
export function NarratorLibrary({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  const catalogo = useCatalogo(api, mesaId);
  const ofertas = useOfertas(api, mesaId);
  const apresentacoes = useApresentacoes(api, mesaId);
  const personagens = usePersonagens(api, mesaId, false);
  const cancelar = useCancelarOferta(api, mesaId);
  const recolher = useRecolherCarta(api, mesaId);
  const [editando, setEditando] = useState<CartaDefinicaoResumo | null>(null);
  const [dialogo, setDialogo] = useState<"nova" | "importar" | "oferta" | null>(null);
  const [apresentando, setApresentando] = useState<CartaVersaoResumo | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);

  const definicoes = catalogo.data ?? [];
  const publicadas = definicoes.map((d) => d.publicada).filter((v): v is CartaVersaoResumo => Boolean(v));
  const nomes = new Map((personagens.data ?? []).map((p) => [p.id, p.nome]));

  return (
    <div className="screen-content card-library">
      <section className="panel">
        <div className="section-heading">
          <div><span className="eyebrow">CATÁLOGO</span><h2>Suas cartas</h2></div>
          <div className="section-heading__actions">
            <button type="button" className="button" onClick={() => setDialogo("nova")}>Nova carta</button>
            <button type="button" className="button button--secondary" onClick={() => setDialogo("importar")}>Importar código</button>
            <button type="button" className="button button--secondary" disabled={!publicadas.length} onClick={() => setDialogo("oferta")}>Nova oferta</button>
          </div>
        </div>
        {catalogo.isError && <p role="alert">{catalogo.error.message}</p>}
        {catalogo.isSuccess && definicoes.length === 0 && <p>Nenhuma carta no catálogo ainda.</p>}
        <ul className="card-catalog">
          {definicoes.map((definicao) => {
            const conteudo = (definicao.publicada?.conteudo ?? definicao.rascunho ?? {}) as Record<string, unknown>;
            return (
              <li key={definicao.id} className="card-catalog__item">
                <CardFace tipo={definicao.tipo} conteudo={conteudo} numero={definicao.publicada?.numero} />
                <p className="card-catalog__state">{estadoCarta(definicao)}</p>
                <div className="card-catalog__actions">
                  <button type="button" className="button button--ghost" onClick={() => setEditando(definicao)}
                    aria-label={`Editar ${String(conteudo.titulo ?? "")}`}>
                    Editar
                  </button>
                  {definicao.publicada && (
                    <button type="button" className="button button--ghost" onClick={() => setApresentando(definicao.publicada ?? null)}>
                      Apresentar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">OFERTAS</span><h2>Ofertas enviadas</h2></div></div>
        {(ofertas.data ?? []).length === 0 && <p>Nenhuma oferta enviada.</p>}
        <ul className="offer-list">
          {(ofertas.data ?? []).map((oferta) => (
            <li key={oferta.id} className="offer-list__item">
              <strong>{oferta.titulo}</strong>{" "}
              <span>escolher {oferta.min_escolhas === oferta.max_escolhas ? oferta.max_escolhas : `${oferta.min_escolhas}–${oferta.max_escolhas}`} de {oferta.candidatas.length}</span>
              {" · "}<span>{oferta.expirada ? "expirada" : oferta.estado}</span>
              <ul>
                {oferta.destinatarios.map((d) => (
                  <li key={d.personagem_id}>{nomes.get(d.personagem_id) ?? "Personagem"}: {d.estado}{d.escolhas?.length ? ` (${d.escolhas.length} escolha(s))` : ""}</li>
                ))}
              </ul>
              {oferta.estado === "aberta" && (
                <button type="button" className="button button--ghost" onClick={() => setCancelando(oferta.id)}>Cancelar oferta</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">NA MESA</span><h2>Cartas apresentadas</h2></div></div>
        {(apresentacoes.data ?? []).length === 0 && <p>Nenhuma carta apresentada agora.</p>}
        <ul>
          {(apresentacoes.data ?? []).map((a) => (
            <li key={a.id}>
              {String(a.carta.conteudo.titulo)} — {a.destinatarios?.length ? `${a.destinatarios.length} destinatário(s)` : "toda a mesa"}{" "}
              <button type="button" className="button button--ghost" onClick={() => recolher.mutate(a.id)}>Recolher</button>
            </li>
          ))}
        </ul>
      </section>

      {dialogo === "nova" && (
        <NovaCartaDialog api={api} mesaId={mesaId} onClose={() => setDialogo(null)} onCriada={(d) => { setDialogo(null); setEditando(d); }} />
      )}
      {dialogo === "importar" && <ImportarCartaDialog api={api} mesaId={mesaId} onClose={() => setDialogo(null)} />}
      {dialogo === "oferta" && <NovaOfertaDialog api={api} mesaId={mesaId} publicadas={publicadas} onClose={() => setDialogo(null)} />}
      {editando && <CardEditor api={api} mesaId={mesaId} definicao={editando} onClose={() => setEditando(null)} />}
      {apresentando && <ApresentarDialog api={api} mesaId={mesaId} versao={apresentando} onClose={() => setApresentando(null)} />}
      <Confirmation
        open={cancelando !== null}
        title="Cancelar oferta?"
        description="Destinatários que ainda não escolheram não poderão mais responder."
        confirmLabel="Cancelar oferta"
        cancelLabel="Manter"
        tone="danger"
        onConfirm={() => { if (cancelando) cancelar.mutate(cancelando); setCancelando(null); }}
        onCancel={() => setCancelando(null)}
      />
    </div>
  );
}
