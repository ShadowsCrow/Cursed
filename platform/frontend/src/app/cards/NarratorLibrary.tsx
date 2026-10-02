import { useMemo, useState } from "react";

import { Icone } from "../../ui/Ornamentos";
import { Confirmation, Dialog } from "../../ui/primitives";
import { useParticipantes, usePersonagens } from "../characters/api";
import type { ApiClient } from "../characters/types";
import { useCatalogoFramework, useCatalogoItens, type CatalogoItens } from "../characters/sheet/catalogoApi";
import { BuscaInventario } from "../characters/sheet/InventarioFicha";
import {
  filtrarCartas, ORIGENS, SEM_FILTROS, type CartaFiltravel, type Filtros, type OpcaoDeOrigem,
} from "../characters/sheet/cartas/apresentacao";
import { FiltrosDasCartas } from "../characters/sheet/cartas/FiltrosDasCartas";
import "../characters/sheet/cartas/cartas.css";
import {
  useApresentarCarta, useCancelarOferta, useCatalogo, useCriarOferta,
  ofertaAceita, useEnviarCarta, useOfertas,
} from "./api";
import { CardEditor } from "./CardEditor";
import { ImportarCartaDialog } from "./RevelacaoDaImportacao";
import { CatalogStatusNotice } from "./CatalogStatusNotice";
import { EffectIconsPanel } from "./EffectIconsPanel";
import { Grimorio } from "../characters/sheet/cartas/DetalheDaCarta";
import { dadosDoConteudo, dataDoQuadro, marcacoesDoConteudo } from "../characters/sheet/cartas/dadosDoGrimorio";
import { calculadosDoConteudo } from "./criacao";
import { categoriaDoConteudo } from "./cardFormat";
import { CardFace } from "./cardView";
import {
  ROTULO_TIPO, type CartaDefinicaoResumo, type CartaVersaoResumo, type TipoCarta,
} from "./types";

/** No catálogo, o que não veio de classe nem de raça é da própria mesa: criado pelo Narrador ou corpo padrão. */
const ORIGENS_DO_CATALOGO: readonly OpcaoDeOrigem[] = ORIGENS.map((o) => (o.id === "concedidas" ? { ...o, rotulo: "Outras" } : o));

type CartaDoCatalogo = CartaFiltravel & { definicao: CartaDefinicaoResumo; conteudo: Record<string, unknown>; padrao: boolean };

/** Lê a definição como a aba Cartas lê a carta do personagem: "classes/X/…" é da classe, "racas/X/…", da raça. */
function comoCartaFiltravel(definicao: CartaDefinicaoResumo): CartaDoCatalogo {
  const conteudo = (definicao.publicada?.conteudo ?? definicao.rascunho ?? {}) as Record<string, unknown>;
  const [pasta, nome = ""] = (definicao.origem_sistema ?? "").split("/");
  const concedida = pasta === "classes" ? `classe:${nome}` : pasta === "racas" ? `raca:${nome}` : null;
  // Corpos padrão: vêm do sistema sem ser do catálogo de classes e raças.
  const padrao = definicao.procedencia_rascunho?.origem === "sistema" && !definicao.origem_sistema;
  return { id: definicao.id, tipo: definicao.tipo, concedida_por: concedida, carta: { conteudo }, definicao, conteudo, padrao };
}

/** Origem da carta no catálogo da mesa, para o quadro do grimório. */
function origemNoCatalogo(definicao: CartaDefinicaoResumo, padrao: boolean): string {
  if (padrao) return "Padrão do sistema";
  const partes = (definicao.origem_sistema ?? "").split("/");
  if (partes[0] === "racas") return `Raça: ${partes[1]}`;
  if (partes[0] === "classes") return partes[2] === "arquetipos" ? `Arquétipo: ${partes[3]}` : `Classe: ${partes[1]}`;
  return "Criada na mesa";
}

/** O grimório da ficha para a carta do catálogo: os mesmos quadros e, no pé, as ações da biblioteca. */
function DetalheDoCatalogo({ api, mesaId, carta, catalogo, onEditar, onEnviar, onApresentar, onFechar }: {
  api: ApiClient; mesaId: string; carta: CartaDoCatalogo; catalogo: CatalogoItens | undefined;
  onEditar?: () => void; onEnviar: () => void; onApresentar: () => void; onFechar: () => void;
}) {
  const { definicao, conteudo, padrao } = carta;
  const publicada = definicao.publicada;
  const framework = useCatalogoFramework(api, mesaId).data;
  const dados = [
    marcacoesDoConteudo(conteudo),
    { icone: "origem", rotulo: "Origem", valor: origemNoCatalogo(definicao, padrao) } as const,
    { icone: "versao", rotulo: "Versão", valor: publicada ? String(publicada.numero) : "Rascunho, sem versão publicada" } as const,
    { icone: "recebida", rotulo: "Publicada em", valor: publicada ? dataDoQuadro(publicada.publicado_em) : "—" } as const,
    ...dadosDoConteudo(definicao.tipo, conteudo, true, { calculados: calculadosDoConteudo(framework, definicao.tipo, conteudo), framework }),
  ];
  return (
    <Grimorio
      tipo={definicao.tipo} conteudo={conteudo} titulo={String(conteudo.titulo ?? "") || "Sem título"}
      categoria={categoriaDoConteudo(definicao.tipo, conteudo, catalogo)} catalogo={catalogo} dados={dados}
      api={api} mesaId={mesaId} onFechar={onFechar}
    >
      <div className="grimorio-acoes">
        {publicada && <button type="button" className="grimorio-acao grimorio-acao--principal" onClick={onEnviar}>Enviar</button>}
        {publicada && <button type="button" className="grimorio-acao" onClick={onApresentar}>Apresentar</button>}
        {onEditar && <button type="button" className="grimorio-acao" onClick={onEditar}>Editar</button>}
      </div>
    </Grimorio>
  );
}

/** Selo no canto da carta: só o que foge do caso comum (carta publicada e editável). */
function seloDaCarta(definicao: CartaDefinicaoResumo, padrao: boolean): string | undefined {
  if (padrao) return "Padrão do sistema";
  if (!definicao.publicada) return "Rascunho";
  return definicao.publicada.revisao_pendente?.length ? "Revisão pendente" : undefined;
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
            {p.nome ?? p.usuario_id}
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

const DESTINO_DO_ENVIO: Record<TipoCarta, string> = {
  item: "O item entra no inventário do personagem fora da grade; o jogador o arruma quando quiser.",
  habilidade: "A habilidade entra nas cartas do personagem como disponível para aprender.",
  magia: "A magia entra nas cartas do personagem como disponível para aprender.",
  efeito: "O efeito é aplicado ao personagem na hora.",
};

function EnviarCartaDialog({ api, mesaId, versao, onEnviada, onClose }: {
  api: ApiClient; mesaId: string; versao: CartaVersaoResumo; onEnviada: (aviso: string) => void; onClose: () => void;
}) {
  const personagens = usePersonagens(api, mesaId, false);
  const enviar = useEnviarCarta(api, mesaId);
  const [personagemId, setPersonagemId] = useState("");
  const titulo = String(versao.conteudo.titulo ?? "");
  return (
    <Dialog open title={`Enviar “${titulo}”`} onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        const nome = personagens.data?.find((p) => p.id === personagemId)?.nome ?? "o personagem";
        enviar.mutate({ personagemId, versaoId: versao.id }, { onSuccess: () => onEnviada(`“${titulo}” enviada para ${nome}.`) });
      }}>
        <p>{DESTINO_DO_ENVIO[versao.tipo]}</p>
        <fieldset>
          <legend>Personagem</legend>
          {personagens.isSuccess && personagens.data.length === 0 && <p>Nenhum personagem na mesa ainda.</p>}
          {(personagens.data ?? []).map((p) => (
            <label key={p.id} className="checkbox-row">
              <input type="radio" name="personagem" value={p.id} checked={personagemId === p.id} onChange={() => setPersonagemId(p.id)} />
              {p.nome}
            </label>
          ))}
        </fieldset>
        {enviar.isError && <p role="alert">{enviar.error.message}</p>}
        <div className="dialog__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button" disabled={!personagemId || enviar.isPending}>Enviar</button>
        </div>
      </form>
    </Dialog>
  );
}

/** Biblioteca do Narrador: catálogo e ofertas; apresentar uma carta parte do catálogo. A aplicação não decide quando oferecer. */
export function NarratorLibrary({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  const catalogo = useCatalogo(api, mesaId);
  const ofertas = useOfertas(api, mesaId);
  const personagens = usePersonagens(api, mesaId, false);
  const cancelar = useCancelarOferta(api, mesaId);
  const [editando, setEditando] = useState<CartaDefinicaoResumo | "nova" | null>(null);
  const [dialogo, setDialogo] = useState<"importar" | "oferta" | null>(null);
  const [apresentando, setApresentando] = useState<CartaVersaoResumo | null>(null);
  const [enviando, setEnviando] = useState<CartaVersaoResumo | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTROS);
  const catalogoItens = useCatalogoItens(api, mesaId).data;

  const definicoes = useMemo(() => catalogo.data ?? [], [catalogo.data]);
  const cartas = useMemo(() => definicoes.map(comoCartaFiltravel), [definicoes]);
  const visiveis = useMemo(() => filtrarCartas(cartas, filtros, catalogoItens), [cartas, filtros, catalogoItens]);
  const cartaAberta = cartas.find((c) => c.id === aberta) ?? null;
  const comFiltro = filtros.origem !== null || filtros.tipo !== null || filtros.busca.trim() !== "";
  const publicadas = definicoes.map((d) => d.publicada).filter((v): v is CartaVersaoResumo => Boolean(v));
  const nomes = new Map((personagens.data ?? []).map((p) => [p.id, p.nome]));
  const enviadas = (ofertas.data ?? []).filter((oferta) => !ofertaAceita(oferta));

  return (
    <div className="screen-content card-library">
      <CatalogStatusNotice api={api} mesaId={mesaId} />
      <section className="panel biblioteca-painel">
        <div className="section-heading">
          <div><span className="eyebrow">CATÁLOGO</span><h2>Suas cartas</h2></div>
          <div className="section-heading__actions">
            <button type="button" className="button" onClick={() => setEditando("nova")}>Nova carta</button>
            <button type="button" className="button button--secondary" onClick={() => setDialogo("importar")}>Importar código</button>
            <button type="button" className="button button--secondary" disabled={!publicadas.length} onClick={() => setDialogo("oferta")}>Nova oferta</button>
            <BuscaInventario valor={filtros.busca} onChange={(busca) => setFiltros({ ...filtros, busca })}
              rotulo="Buscar cartas" exemplo="Buscar cartas…" />
          </div>
        </div>
        {aviso && <p role="status" className="biblioteca-aviso">{aviso}</p>}
        {catalogo.isError && <p role="alert">{catalogo.error.message}</p>}
        {catalogo.isSuccess && definicoes.length === 0 && <p>Nenhuma carta no catálogo ainda.</p>}
        {cartas.length > 0 && (
          <div className="cartas-corpo">
            <aside className="cartas-corpo__lateral" aria-label="Filtros das cartas">
              <FiltrosDasCartas cartas={cartas} catalogo={catalogoItens} filtros={filtros} onMudar={setFiltros} origens={ORIGENS_DO_CATALOGO} />
            </aside>
            <div className="cartas-corpo__grade">
              {visiveis.length === 0 && comFiltro && (
                <div className="cartas-vazio" role="status">
                  <p>Nenhuma carta atende os filtros escolhidos.</p>
                  <button type="button" className="button button--secondary" onClick={() => setFiltros(SEM_FILTROS)}>Limpar filtros</button>
                </div>
              )}
              <ul className="card-catalog">
                {visiveis.map(({ definicao, conteudo, padrao }) => {
                  // Corpos padrão e cartas do catálogo de classes e raças não se editam: a fonte delas é o sistema
                  // (cartas-do-catalogo-somente-leitura).
                  const editavel = !padrao && !definicao.origem_sistema;
                  return (
                    <li key={definicao.id} className="card-catalog__item">
                      <div className="carta-biblioteca">
                        <CardFace tipo={definicao.tipo} conteudo={conteudo} numero={definicao.publicada?.numero} api={api} mesaId={mesaId} narrador
                          selo={seloDaCarta(definicao, padrao)}
                          rodape={definicao.publicada
                            ? `Versão ${definicao.publicada.numero}${definicao.origem_sistema ? " · Catálogo do sistema" : ""}`
                            : undefined}
                          onAbrir={() => setAberta(definicao.id)}
                          rotulo={`${ROTULO_TIPO[definicao.tipo]}: ${String(conteudo.titulo ?? "") || "Sem título"}`} />
                        {editavel && (
                          <button type="button" className="carta-biblioteca__editar" onClick={() => setEditando(definicao)}
                            aria-label={`Editar ${String(conteudo.titulo ?? "")}`} title="Editar">
                            <Icone nome="lapis" tamanho={20} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">OFERTAS</span><h2>Ofertas enviadas</h2></div></div>
        {enviadas.length === 0 && <p>Nenhuma oferta aguardando resposta.</p>}
        <ul className="offer-list">
          {enviadas.map((oferta) => (
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

      {dialogo === "importar" && <ImportarCartaDialog api={api} mesaId={mesaId} onClose={() => setDialogo(null)} />}
      {dialogo === "oferta" && <NovaOfertaDialog api={api} mesaId={mesaId} publicadas={publicadas} onClose={() => setDialogo(null)} />}
      <EffectIconsPanel api={api} mesaId={mesaId} />
      {editando && (
        // "Nova carta" abre direto o editor; a carta só é criada no primeiro salvamento (simplificar-criacao-de-cartas).
        <CardEditor api={api} mesaId={mesaId} definicao={editando === "nova" ? null : editando} onClose={() => setEditando(null)} />
      )}
      {cartaAberta && (
        <DetalheDoCatalogo api={api} mesaId={mesaId} carta={cartaAberta} catalogo={catalogoItens} onFechar={() => setAberta(null)}
          onEditar={!cartaAberta.padrao && !cartaAberta.definicao.origem_sistema
            ? () => { setAberta(null); setEditando(cartaAberta.definicao); } : undefined}
          onEnviar={() => { setAberta(null); setAviso(null); setEnviando(cartaAberta.definicao.publicada ?? null); }}
          onApresentar={() => { setAberta(null); setApresentando(cartaAberta.definicao.publicada ?? null); }} />
      )}
      {enviando && (
        <EnviarCartaDialog api={api} mesaId={mesaId} versao={enviando} onClose={() => setEnviando(null)}
          onEnviada={(texto) => { setEnviando(null); setAviso(texto); }} />
      )}
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
