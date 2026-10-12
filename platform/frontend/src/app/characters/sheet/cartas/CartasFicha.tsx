import { useId, useMemo, useRef, useState } from "react";

import { Glyph } from "../../../../ui/Display";
import { Confirmation } from "../../../../ui/primitives";
import { useCartasDoPersonagem, useTransicaoCarta } from "../../../cards/api";
import { ConcederDialog, MigrarDialog } from "../../../cards/dialogosDeCartas";
import type { AcaoCarta } from "../../../cards/types";
import { Pergaminho } from "../../../../ui/Tema";
import type { ApiClient } from "../../types";
import { useCatalogoItens } from "../catalogoApi";
import { BuscaInventario } from "../InventarioFicha";
import { CantoDaFolha, FlorDaBorda, RosaDosVentos } from "../resumo/ornamentos";
import { filtrarCartas, ordenarCartas, ORDENS, SECOES, SEM_FILTROS, type Carta, type Filtros, type Ordem } from "./apresentacao";
import { CartaDaFicha } from "./CartaDaFicha";
import { DetalheDaCarta } from "./DetalheDaCarta";
import { FiltrosDasCartas } from "./FiltrosDasCartas";
import { ARTE_DA_GRAVURA, usePintura } from "./pinturasDasCartas";
import "../atributos/atributos.css";
import "./cartas.css";

/*
 * Aba Cartas da ficha (redesenhar-aba-cartas): folha de pergaminho com a gravura no cabeçalho, busca e
 * ordem, a barra de filtros de origem e tipo, e a grade de cartas separada por estado. As ações ficam no
 * detalhe de cada carta, com as mesmas permissões do painel antigo.
 */

/** Estrela de quatro pontas da gravura sem pintura. */
function Estrela({ tamanho }: { tamanho: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true" focusable="false">
      <path d="M12 1.5 13.6 10.4 22.5 12 13.6 13.6 12 22.5 10.4 13.6 1.5 12 10.4 10.4Z" fill="currentColor" />
    </svg>
  );
}

/** Gravura em sépia do cabeçalho; sem ela, a rosa dos ventos e estrelas desbotadas. */
function Gravura() {
  const estado = usePintura(ARTE_DA_GRAVURA);
  return (
    <div className="cartas-gravura" aria-hidden="true">
      {estado === "pronta"
        ? <img className="cartas-gravura__pintura" src={ARTE_DA_GRAVURA} alt="" decoding="async" />
        : (
          <span className="cartas-gravura__reserva">
            <Estrela tamanho={34} /><RosaDosVentos tamanho={92} /><Estrela tamanho={46} />
          </span>
        )}
    </div>
  );
}

function OrdemDasCartas({ valor, onChange }: { valor: Ordem; onChange: (ordem: Ordem) => void }) {
  const id = useId();
  return (
    <div className="cartas-ordem">
      <label htmlFor={id} className="sr-only">Ordem das cartas</label>
      <svg className="cartas-ordem__icone" viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false"
        fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 4v16M4.5 7.5 8 4l3.5 3.5M16 20V4M12.5 16.5 16 20l3.5-3.5" />
      </svg>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value as Ordem)}>
        {ORDENS.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
      </select>
      <svg className="cartas-ordem__seta" viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false"
        fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export interface HabilidadeLegada { nome?: unknown; tipo?: unknown; dano?: unknown }

export interface CartasFichaProps {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  versao: number;
  papel: "narrador" | "jogador";
  podeEditar: boolean;
  /** Anotações de habilidades trazidas da ficha antiga, fora do sistema de cartas. */
  habilidadesLegadas?: HabilidadeLegada[];
}

export function CartasFicha({ api, mesaId, personagemId, versao, papel, podeEditar, habilidadesLegadas = [] }: CartasFichaProps) {
  const idTitulo = useId();
  const narrador = papel === "narrador";
  const cartas = useCartasDoPersonagem(api, mesaId, personagemId);
  const catalogo = useCatalogoItens(api, mesaId).data;
  const transicao = useTransicaoCarta(api, mesaId, personagemId);
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTROS);
  const [ordem, setOrdem] = useState<Ordem>("nome-az");
  const [aberta, setAberta] = useState<string | null>(null);
  const [concedendo, setConcedendo] = useState(false);
  const [migrando, setMigrando] = useState<Carta | null>(null);
  const [removendo, setRemovendo] = useState<Carta | null>(null);
  const botoes = useRef(new Map<string, HTMLButtonElement>());

  const todas = useMemo(() => cartas.data ?? [], [cartas.data]);
  const visiveis = useMemo(() => ordenarCartas(filtrarCartas(todas, filtros, catalogo), ordem), [todas, filtros, catalogo, ordem]);
  const cartaAberta = todas.find((c) => c.id === aberta) ?? null;
  const comFiltro = filtros.origem !== null || filtros.tipo !== null || filtros.busca.trim() !== "";

  // A carta pode mudar de seção (e de botão) depois da ação: o foco volta para o botão novo dela.
  function executar(carta: Carta, acao: AcaoCarta) {
    transicao.mutate({ cartaId: carta.id, acao, versao }, {
      onSuccess: () => {
        setAberta(null);
        window.setTimeout(() => botoes.current.get(carta.id)?.focus(), 0);
      },
    });
  }

  return (
    <div className="cartas-conteiner">
      <Pergaminho as="section" className="atributos-folha cartas-folha" aria-labelledby={idTitulo}>
        <span className="atributos-folha__moldura" aria-hidden="true">
          <CantoDaFolha posicao="se" /><CantoDaFolha posicao="sd" /><CantoDaFolha posicao="ie" /><CantoDaFolha posicao="id" />
          <FlorDaBorda lado="esquerda" /><FlorDaBorda lado="direita" />
        </span>

        <header className="cartas-cabecalho">
          <div className="cartas-cabecalho__titulos">
            <p className="cartas-cabecalho__sobretitulo">Cartas</p>
            <h2 id={idTitulo} className="cartas-cabecalho__titulo">Habilidades, magias, itens e efeitos</h2>
          </div>
          <Gravura />
          <div className="cartas-cabecalho__ferramentas">
            {narrador && (
              <button type="button" className="cartas-conceder" onClick={() => setConcedendo(true)}>
                <Glyph name="cards" size={16} /><span>Conceder carta</span>
              </button>
            )}
            <BuscaInventario valor={filtros.busca} onChange={(busca) => setFiltros({ ...filtros, busca })}
              rotulo="Buscar cartas" exemplo="Buscar cartas…" />
            <OrdemDasCartas valor={ordem} onChange={setOrdem} />
          </div>
        </header>

        {cartas.isPending && <p className="cartas-mensagem">Carregando cartas…</p>}
        {cartas.isError && <p role="alert" className="cartas-mensagem">{cartas.error.message}</p>}
        {cartas.isSuccess && todas.length === 0 && <p className="cartas-mensagem">Este personagem ainda não possui cartas.</p>}

        {todas.length > 0 && (
          <div className="cartas-corpo">
            <aside className="cartas-corpo__lateral" aria-label="Filtros das cartas">
              <FiltrosDasCartas cartas={todas} catalogo={catalogo} filtros={filtros} onMudar={setFiltros} />
            </aside>
            <div className="cartas-corpo__grade cartas-corpo__grade--rola" role="region" aria-label="Cartas do personagem" tabIndex={0}>
              {visiveis.length === 0 && comFiltro && (
                <div className="cartas-vazio" role="status">
                  <p>Nenhuma carta atende os filtros escolhidos.</p>
                  <button type="button" className="button button--secondary" onClick={() => setFiltros(SEM_FILTROS)}>Limpar filtros</button>
                </div>
              )}
              {SECOES.map((secao) => {
                const daSecao = visiveis.filter((c) => secao.estados.includes(c.estado));
                if (!daSecao.length) return null;
                const idSecao = `${idTitulo}-${secao.id}`;
                return (
                  <section key={secao.id} className={`cartas-secao cartas-secao--${secao.id}`} aria-labelledby={idSecao}>
                    <h3 id={idSecao} className="cartas-secao__titulo">{secao.titulo}</h3>
                    {secao.nota && <p className="cartas-secao__nota">{secao.nota}</p>}
                    <ul className="cartas-secao__lista">
                      {daSecao.map((carta) => (
                        <li key={carta.id}>
                          <CartaDaFicha
                            ref={(botao) => { if (botao) botoes.current.set(carta.id, botao); else botoes.current.delete(carta.id); }}
                            carta={carta} catalogo={catalogo} narrador={narrador} api={api} mesaId={mesaId}
                            onAbrir={() => { transicao.reset(); setAberta(carta.id); }}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {habilidadesLegadas.length > 0 && (
          <section className="cartas-legado" aria-label="Habilidades registradas na ficha antiga">
            <h3 className="cartas-secao__titulo">Habilidades anotadas</h3>
            <p className="cartas-secao__nota">Anotações trazidas da ficha anterior. Não fazem parte do sistema de cartas e serão revisadas na migração de dados.</p>
            <ul className="cartas-legado__lista">
              {habilidadesLegadas.map((habilidade, indice) => (
                <li key={indice}>
                  <Glyph name="book" size={18} />
                  <strong>{String(habilidade.nome ?? "Sem nome")}</strong>
                  {habilidade.tipo !== undefined && <small>{String(habilidade.tipo)}</small>}
                  {habilidade.dano !== undefined && <b>{String(habilidade.dano)}</b>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </Pergaminho>

      {cartaAberta && (
        <DetalheDaCarta
          carta={cartaAberta} catalogo={catalogo} narrador={narrador} podeEditar={podeEditar} api={api} mesaId={mesaId}
          pendente={transicao.isPending} erro={transicao.isError ? transicao.error.message : null}
          onAcao={(acao) => executar(cartaAberta, acao)}
          onMigrar={() => { setAberta(null); setMigrando(cartaAberta); }}
          onRemover={() => { setAberta(null); setRemovendo(cartaAberta); }}
          onFechar={() => setAberta(null)}
        />
      )}
      {concedendo && <ConcederDialog api={api} mesaId={mesaId} personagemId={personagemId} versao={versao} onClose={() => setConcedendo(false)} />}
      {migrando && <MigrarDialog api={api} mesaId={mesaId} personagemId={personagemId} carta={migrando} versao={versao} onClose={() => setMigrando(null)} />}
      <Confirmation
        open={removendo !== null}
        title="Remover carta?"
        description={removendo?.tipo === "item"
          ? "O item sai do inventário e seus efeitos são encerrados."
          : removendo?.tipo === "efeito" ? "O efeito é encerrado." : "A carta deixa de estar disponível para o personagem."}
        confirmLabel="Remover"
        tone="danger"
        onConfirm={() => { if (removendo) transicao.mutate({ cartaId: removendo.id, acao: "remover", versao }); setRemovendo(null); }}
        onCancel={() => setRemovendo(null)}
      />
    </div>
  );
}
