import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Dialog } from "../../../ui/primitives";
import { MolduraOrnamentada } from "../../../ui/Ornamentos";
import { useAssetImage } from "../../assets/useAssetImage";
import { dimensoes, ROTULO_SUBTIPO, type ItemGrade } from "../../inventory/gridEngine";
import { IconeCategoria, IconeSubtipo, Moeda } from "../../inventory/iconesItem";
import type { ContextoPainel, ResumoGrade } from "../../inventory/InventoryGrid";
import { RegraLevantar } from "../../inventory/RegraLevantar";
import type { ApiClient, EfeitoResumo, ItemInventarioResumo } from "../types";
import { ImagemAjustada } from "../../assets/ImagemAjustada";
import type { CatalogoItens } from "./catalogoApi";
import { totalDaPilha } from "./gradeFicha";
import { ARTE_DA_TAMPA, arteDaBase, arteDoLado, tamanhoDaArte, usePinturas } from "./pinturasDaBolsa";

/*
 * Peças da aba Inventário da ficha (reformular-visual-da-ficha, D1–D5): placa de indicadores, painel do
 * item selecionado, categorias, busca e barra de moedas. A lógica da grade continua no InventoryGrid.
 */

function Barra({ valor, maximo, tom }: { valor: number; maximo: number; tom: "ouro" | "sangue" }) {
  const fracao = maximo > 0 ? Math.min(1, valor / maximo) : 0;
  return <span className={`placa__barra placa__barra--${tom}`} aria-hidden="true" style={{ "--fracao": fracao } as CSSProperties} />;
}

/** Placa escura no topo da bolsa: capacidade, mãos e estado da carga (sem peso, por decisão do usuário). */
export function PlacaIndicadores({ dados }: { dados: ResumoGrade }) {
  const estado = dados.sobrecarga ? "Sobrecarga" : "Normal";
  return (
    <div className="placa" role="group" aria-label="Carga">
      <div className="placa__bloco">
        <IconeCategoria icone="acessorios" tamanho={26} />
        <div>
          <span className="placa__rotulo">Capacidade</span>
          <strong className="placa__valor">{dados.celulasOcupadas} de {dados.celulasVerdes} células</strong>
          <Barra valor={dados.celulasOcupadas} maximo={dados.celulasVerdes} tom={dados.sobrecarga ? "sangue" : "ouro"} />
        </div>
      </div>
      <div className="placa__bloco">
        <svg className="placa__icone" viewBox="0 0 24 24" width={26} height={26} aria-hidden="true" focusable="false" fill="none"
          stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 21v-4.5L5.2 12.4a1.4 1.4 0 0 1 2.2-1.8L9 12.5V5.2a1.3 1.3 0 0 1 2.6 0V11" />
          <path d="M11.6 10.5V4.2a1.3 1.3 0 0 1 2.6 0v6.3M14.2 10.8V5.4a1.3 1.3 0 0 1 2.6 0v8.1c0 3.2-1.8 5.4-4.3 6.3V21" />
        </svg>
        <div>
          <span className="placa__rotulo">Mãos ocupadas</span>
          <strong className="placa__valor">{dados.maosOcupadas} de 2</strong>
          <span className="placa__maos" aria-hidden="true">
            {[0, 1].map((i) => <span key={i} className={`placa__mao${i < dados.maosOcupadas ? " placa__mao--cheia" : ""}`} />)}
          </span>
        </div>
      </div>
      <div className={`placa__bloco placa__bloco--estado${dados.sobrecarga ? " placa__bloco--sobrecarga" : ""}`}>
        <svg className="placa__icone" viewBox="0 0 24 24" width={24} height={24} aria-hidden="true" focusable="false" fill="none"
          stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          {dados.sobrecarga
            ? <><path d="M12 3.5 21.5 20h-19Z" /><path d="M12 10v4.5M12 17.2v.3" /></>
            : <path d="M12 3 4.5 5.8v5.7c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V5.8z" />}
        </svg>
        <div>
          <span className="placa__rotulo">Estado da carga</span>
          <strong className="placa__estado">{estado}</strong>
          {dados.celulasNoVermelho > 0 && <span className="placa__detalhe">{dados.celulasNoVermelho} na área vermelha</span>}
        </div>
        <RegraLevantar />
      </div>
      {(dados.ampliacoes.length > 0 || dados.mochila) && (
        <p className="placa__ampliacoes">
          {dados.ampliacoes.length > 0 && <>Ampliações: {dados.ampliacoes.join(" · ")}</>}
          {dados.mochila?.desequipar && (
            <button type="button" className="text-action" onClick={dados.mochila.desequipar}>Desequipar {dados.mochila.nome}</button>
          )}
        </p>
      )}
    </div>
  );
}

/** Peças de couro presas à bolsa: decorativas, somem quando a bolsa fica pequena (CSS). */
function Fivela() {
  return (
    <svg className="bolsa__fivela" viewBox="0 0 40 56" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="32" height="48" rx="5" fill="none" stroke="#b38a4c" strokeWidth="4" />
      <rect x="4" y="4" width="32" height="48" rx="5" fill="none" stroke="#e5c78a" strokeWidth="1.2" strokeOpacity=".7" />
      <path d="M20 6v44" stroke="#8a6630" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

function Pingente() {
  return (
    <svg className="bolsa__pingente" viewBox="0 0 64 96" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="pingente-ouro" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#f7df9d" /><stop offset=".55" stopColor="#b9893a" /><stop offset="1" stopColor="#5d3d10" />
        </radialGradient>
      </defs>
      <path d="M32 2v18" stroke="#8c6a35" strokeWidth="2" strokeDasharray="3 2" />
      <circle cx="32" cy="22" r="4" fill="none" stroke="#c9a15a" strokeWidth="2" />
      <circle cx="32" cy="58" r="30" fill="url(#pingente-ouro)" stroke="#4d330c" strokeWidth="1.5" />
      <circle cx="32" cy="58" r="23" fill="none" stroke="#4d330c" strokeOpacity=".6" strokeWidth="1.2" />
      <path d="M32 40l4 12.5L48.5 58 36 62.5 32 76l-4-13.5L15.5 58 28 52.5Z" fill="#4d330c" fillOpacity=".55" />
      <circle cx="32" cy="58" r="4" fill="#4d330c" fillOpacity=".7" />
    </svg>
  );
}

/**
 * Bolsa de couro em camadas (D1): couro em textura que se repete, borda costurada em SVG de 9 fatias,
 * alça lateral que acompanha a altura e peças de tamanho fixo presas aos cantos.
 */
/** Base de couro no pé da bolsa: pontas inteiras e o miolo repetido na largura (D1, item 5). */
function BasePintada() {
  return (
    <span className="bolsa__base" aria-hidden="true">
      <img src={arteDaBase("esquerda")} alt="" draggable={false} {...tamanhoDaArte(arteDaBase("esquerda"))} />
      <span className="bolsa__base-miolo" style={{ backgroundImage: `url("${arteDaBase("miolo")}")` }} />
      <img src={arteDaBase("direita")} alt="" draggable={false} {...tamanhoDaArte(arteDaBase("direita"))} />
    </span>
  );
}

function LateralPintada({ lado }: { lado: "esquerdo" | "direito" }) {
  return (
    <span className={`bolsa__lado bolsa__lado--${lado}`} aria-hidden="true">
      <img src={arteDoLado(lado, "topo")} alt="" draggable={false} {...tamanhoDaArte(arteDoLado(lado, "topo"))} />
      <span className="bolsa__lado-miolo" style={{ backgroundImage: `url("${arteDoLado(lado, "miolo")}")` }} />
      <img src={arteDoLado(lado, "base")} alt="" draggable={false} {...tamanhoDaArte(arteDoLado(lado, "base"))} />
    </span>
  );
}

export function Bolsa({ faixa, colunas, children }: { faixa: "compacta" | "media" | "larga"; colunas: number; children: ReactNode }) {
  const conteudo = useRef<HTMLDivElement>(null);
  const laterais = usePinturas("laterais");
  const tampaEBase = usePinturas("tampa-e-base");
  // No celular, uma grade larga rola dentro da bolsa: a borda que ainda esconde células fica esmaecida.
  const [rolagem, setRolagem] = useState<"nenhuma" | "mais" | "fim">("nenhuma");
  useEffect(() => {
    const el = conteudo.current;
    if (!el) return undefined;
    const medir = () => setRolagem(el.scrollWidth <= el.clientWidth + 1 ? "nenhuma"
      : el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 ? "fim" : "mais");
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    const observador = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(medir);
    observador?.observe(el);
    return () => { el.removeEventListener("scroll", medir); observador?.disconnect(); };
  }, [colunas]);
  return (
    <div className={`bolsa bolsa--${faixa}${colunas <= 3 ? " bolsa--mini" : ""}${laterais !== "ausentes" ? " bolsa--lateral" : ""}${tampaEBase !== "ausentes" ? " bolsa--tampa" : ""}`}>
      {tampaEBase === "prontas" && (
        <>
          {/* A tampa fica atrás da bolsa; a base, sob as laterais (que vêm depois no DOM). */}
          <img className="bolsa__tampa" src={ARTE_DA_TAMPA} alt="" aria-hidden="true" draggable={false} {...tamanhoDaArte(ARTE_DA_TAMPA)} />
          <BasePintada />
        </>
      )}
      {laterais === "prontas" && (
        <>
          <LateralPintada lado="esquerdo" />
          <LateralPintada lado="direito" />
        </>
      )}
      {laterais === "ausentes" && (
        <>
          <div className="bolsa__alca" aria-hidden="true"><Fivela /><span className="bolsa__alca-fim" /></div>
          <Pingente />
        </>
      )}
      {rolagem !== "nenhuma" && <p className="bolsa__dica">Deslize para ver a grade inteira.</p>}
      <div className="bolsa__conteudo" ref={conteudo} data-rolagem={rolagem}>{children}</div>
    </div>
  );
}

function ArteDoItem({ item, imagem, desenho }: { item: ItemGrade; imagem?: string; desenho?: string }) {
  const [falhou, setFalhou] = useState(false);
  return (
    <div className="item-painel__arte">
      {imagem && !falhou
        ? <ImagemAjustada src={imagem} alt="" onError={() => setFalhou(true)} />
        : desenho ? <IconeCategoria icone={desenho} tamanho={80} /> : <IconeSubtipo subtipo={item.subtipo} />}
    </div>
  );
}

function useArte(api: ApiClient, mesaId: string, caminho: string | undefined) {
  return useAssetImage(api, mesaId, caminho ?? "", { exibicao: true, enabled: Boolean(caminho) }).data;
}

/** Painel "Item selecionado" (D5): o que é o item e as ações que a grade já validou. */
export function PainelItem({ contexto, servidor, catalogo, efeitos, icone, api, mesaId }: {
  contexto: ContextoPainel; servidor: ItemInventarioResumo | undefined; catalogo: CatalogoItens | undefined;
  efeitos: EfeitoResumo[] | undefined; icone?: string; api: ApiClient; mesaId: string;
}) {
  const { selecionado, acoes, recusa, extras, somenteLeitura } = contexto;
  const dados = servidor?.dados ?? {};
  const arte = useArte(api, mesaId, typeof dados.imagem_ativo === "string" ? dados.imagem_ativo : undefined);
  const tituloId = useId();
  if (!selecionado) {
    return (
      <div className="item-painel item-painel--vazio">
        <h3 className="item-painel__cabecalho">Item selecionado</h3>
        <p className="item-painel__vazio">Toque num item da bolsa para ver o que ele é e o que dá para fazer com ele.</p>
      </div>
    );
  }
  const raridade = catalogo?.raridades.find((r) => r.id === (servidor?.raridade ?? "comum"));
  const categoria = catalogo?.categorias.find((c) => c.id === servidor?.categoria);
  const { largura, altura } = dimensoes(selecionado);
  const quantidade = selecionado.subtipo === "moedas" ? totalDaPilha(dados) : servidor?.quantidade ?? 1;
  const efeitosDoItem = (efeitos ?? []).filter((e) => servidor?.efeitos?.includes(e.id));
  const detalhes: Array<[string, string]> = [
    ["Tipo", ROTULO_SUBTIPO[selecionado.subtipo].replace(/^./, (l) => l.toUpperCase())],
    ["Tamanho", `${largura} × ${altura} célula${largura * altura > 1 ? "s" : ""}${selecionado.girado && largura !== altura ? " (girado)" : ""}`],
  ];
  if (selecionado.maos || selecionado.versatil) {
    detalhes.push(["Mãos", selecionado.versatil ? (selecionado.maos === 2 ? "Duas (versátil)" : "Uma (versátil)") : String(selecionado.maos)]);
  }
  if (quantidade > 1 || servidor?.pilha_max) {
    detalhes.push([selecionado.subtipo === "moedas" ? "Moedas" : "Quantidade",
      `${quantidade}${servidor?.pilha_max ? ` de ${servidor.pilha_max} por célula` : ""}`]);
  }
  if (servidor?.cargas_maximas != null) detalhes.push(["Cargas", `${servidor.cargas_atuais ?? 0} de ${servidor.cargas_maximas}`]);
  if (typeof dados.capacidade_flechas === "number") detalhes.push(["Flechas", `${Number(dados.flechas ?? 0)} de ${dados.capacidade_flechas}`]);
  detalhes.push(["Situação", selecionado.equipado ? "Equipado" : selecionado.coluna === null ? "Fora da grade" : "Guardado"]);

  return (
    <div className="item-painel" aria-labelledby={tituloId}>
      <h3 className="item-painel__cabecalho">Item selecionado</h3>
      <div className="item-painel__topo">
        <ArteDoItem item={selecionado} imagem={arte ?? icone} desenho={selecionado.subtipo === "outro" ? categoria?.icone : undefined} />
        <div className="item-painel__identidade">
          <h4 id={tituloId} className="item-painel__nome">{selecionado.nome}</h4>
          <div className="item-painel__etiquetas">
            {raridade && (
              <span className="etiqueta-raridade" style={{ "--cor-raridade": raridade.cor } as CSSProperties}>{raridade.rotulo}</span>
            )}
            {categoria && <span className="etiqueta-categoria"><IconeCategoria icone={categoria.icone} tamanho={14} />{categoria.rotulo}</span>}
          </div>
          <dl className="item-painel__detalhes">
            {detalhes.map(([rotulo, valor]) => <div key={rotulo}><dt>{rotulo}</dt><dd>{valor}</dd></div>)}
          </dl>
        </div>
      </div>
      {servidor?.descricao && <p className="item-painel__descricao">{servidor.descricao}</p>}
      {efeitosDoItem.length > 0 && (
        <ul className="item-painel__efeitos" aria-label="Efeitos do item">
          {efeitosDoItem.map((e) => <li key={e.id}><strong>{e.nome}</strong>{e.descricao ? ` — ${e.descricao}` : ""}</li>)}
        </ul>
      )}
      {recusa && <p className="item-painel__recusa" role="alert">{recusa}</p>}
      {!somenteLeitura && (
        <div className="item-painel__acoes" role="group" aria-label={`Ações para ${selecionado.nome}`}>
          {acoes.colocar && (
            <button type="button" className="button button--primary item-painel__principal" onClick={acoes.colocar}>
              Colocar na grade
            </button>
          )}
          {acoes.equipar && (
            <button type="button" className="button button--primary item-painel__principal" onClick={acoes.equipar}>
              {selecionado.equipado ? "Desequipar" : "Equipar"}
            </button>
          )}
          {acoes.empunhar && (
            <button type="button" className="button button--secondary item-painel__principal" onClick={acoes.empunhar}>
              {selecionado.maos === 2 ? "Empunhar com uma mão" : "Empunhar com duas mãos"}
            </button>
          )}
          {acoes.girar && <button type="button" className="button button--secondary" onClick={acoes.girar}>Girar</button>}
          {acoes.largar && <button type="button" className="button button--secondary" onClick={acoes.largar}>Largar no chão</button>}
          {acoes.remover && <button type="button" className="button button--secondary" onClick={acoes.remover}>Remover da grade</button>}
          {acoes.oferecer && <button type="button" className="button button--secondary" onClick={acoes.oferecer}>Oferecer…</button>}
        </div>
      )}
      {extras && <div className="item-painel__extras">{extras}</div>}
    </div>
  );
}

export interface CategoriaContada { id: string; rotulo: string; icone: string; total: number }

/**
 * Lista de categorias com contagem. No Inventário, escolher uma destaca os itens na grade (não esconde
 * nem move); a aba Cartas usa a mesma lista para filtrar, com título, rótulos e unidade próprios, e já
 * manda só as opções que devem aparecer (`manterVazias`).
 */
export function ListaCategorias({
  categorias, total, ativa, onEscolher, variante, titulo = "Categorias", rotuloTodos = "Todos",
  unidade = ["item", "itens"], manterVazias = false,
}: {
  categorias: CategoriaContada[]; total: number; ativa: string | null; onEscolher: (id: string | null) => void;
  variante: "lista" | "fileira"; titulo?: string; rotuloTodos?: string; unidade?: readonly [string, string];
  manterVazias?: boolean;
}) {
  const opcoes = [{ id: null, rotulo: rotuloTodos, icone: "todos", total }, ...categorias.filter((c) => manterVazias || c.total > 0)];
  return (
    <nav className={`categorias categorias--${variante}`} aria-label={titulo}>
      {variante === "lista" && <h3 className="categorias__titulo">{titulo}</h3>}
      <ul>
        {opcoes.map((c) => (
          <li key={c.id ?? "todos"}>
            <button type="button" className="categorias__opcao" aria-pressed={ativa === c.id} onClick={() => onEscolher(c.id)}>
              <IconeCategoria icone={c.icone} tamanho={variante === "lista" ? 20 : 16} />
              <span className="categorias__rotulo">{c.rotulo}</span>
              <span className="categorias__total" aria-label={`${c.total} ${c.total === 1 ? unidade[0] : unidade[1]}`}>{c.total}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function BuscaInventario({ valor, onChange, rotulo = "Buscar item", exemplo = "Buscar item…" }: {
  valor: string; onChange: (valor: string) => void; rotulo?: string; exemplo?: string;
}) {
  const id = useId();
  return (
    <div className="busca-inventario">
      <label htmlFor={id} className="sr-only">{rotulo}</label>
      <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5.5 5.5" />
      </svg>
      <input id={id} type="search" placeholder={exemplo} value={valor} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Barra de moedas (cobre, prata e ouro) com o gerenciador completo num diálogo. */
export function BarraMoedas({ totais, editavel, gerenciador }: {
  totais: { cobre: number; prata: number; ouro: number }; editavel: boolean; gerenciador: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <MolduraOrnamentada tipo="quadro" fundo="pergaminho" className="barra-moedas">
      <h3 className="barra-moedas__titulo">Moedas</h3>
      <dl className="barra-moedas__totais">
        {(["ouro", "prata", "cobre"] as const).map((tipo) => (
          <div key={tipo}>
            <dt><Moeda tipo={tipo} /><span className="sr-only">{tipo === "ouro" ? "Ouro" : tipo === "prata" ? "Prata" : "Cobre"}</span></dt>
            <dd>{totais[tipo]}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="button button--secondary barra-moedas__gerenciar" onClick={() => setAberto(true)}>
        {editavel ? "Gerenciar moedas" : "Ver pilhas"}
      </button>
      <Dialog open={aberto} onClose={() => setAberto(false)} title="Gerenciar moedas" className="dialogo-moedas">
        {gerenciador}
      </Dialog>
    </MolduraOrnamentada>
  );
}
