import { useId, type DragEvent } from "react";

import type { components } from "../../api/generated/schema";
import type { ApiClient } from "../characters/types";
import { useRetrato } from "../plataforma/imagens";
import { Glyph } from "../../ui/Display";
import { ARRASTE_DE_PERSONAGEM } from "./arrastes";
import { instanciasPorModelo } from "./instanciasDaLista";

type Personagem = components["schemas"]["PersonagemResumo"];

const ROTULO_DO_TIPO: Record<Personagem["tipo"], string> = { personagem: "Personagem", npc: "NPC", monstro: "Monstro" };

/** Ações sobre instâncias (instancias-de-personagem, D4), só do Narrador. */
export interface AcoesDeInstancias {
  pendente: boolean;
  erro: string | null;
  onExcluir: (instancia: Personagem) => void;
  onPromover: (instancia: Personagem) => void;
  /** Envia à lixeira as instâncias do modelo sem token na cena aberta. */
  onLimpar: (modelo: Personagem) => void;
}

function Linha({ api, mesaId, personagem, naCena, comTipo, onColocar, instancia }: {
  api: ApiClient; mesaId: string; personagem: Personagem; naCena: boolean; comTipo: boolean; onColocar: (oculto?: boolean) => void;
  /** Linha de uma instância: Excluir e Promover no lugar do tipo. */
  instancia?: AcoesDeInstancias;
}) {
  const retrato = useRetrato(api, mesaId, personagem.retrato_objeto, personagem.tipo, true);
  function iniciar(evento: DragEvent<HTMLLIElement>) {
    evento.dataTransfer.setData(ARRASTE_DE_PERSONAGEM, personagem.id);
    evento.dataTransfer.effectAllowed = "copy";
  }
  return (
    <li className={`personagens-cena__item${instancia ? " personagens-cena__item--instancia" : ""}`} draggable onDragStart={iniciar}
      title={`Arraste ${personagem.nome} para o grid`}>
      <img className="personagens-cena__retrato" src={retrato} alt="" width={40} height={40} />
      <span className="personagens-cena__nome">
        {personagem.nome}
        {comTipo && !instancia && <small className="personagens-cena__tipo">{ROTULO_DO_TIPO[personagem.tipo]}</small>}
      </span>
      <span className="personagens-cena__marcas">
        {personagem.visibilidade === "narrador" && !instancia && <span className="personagens-cena__marca personagens-cena__marca--oculto"
          title="A ficha está oculta dos jogadores; o token aparece com o nome público">ficha oculta</span>}
        {naCena && <span className="personagens-cena__marca">na cena</span>}
      </span>
      {instancia && <span className="personagens-cena__instancia-acoes">
        <button type="button" className="personagens-cena__texto" disabled={instancia.pendente}
          aria-label={`Promover ${personagem.nome} a ficha`} title="Vira uma ficha comum: sai de baixo do modelo e entra no acervo"
          onClick={() => instancia.onPromover(personagem)}>Promover</button>
        <button type="button" className="personagens-cena__texto personagens-cena__texto--excluir" disabled={instancia.pendente}
          aria-label={`Excluir ${personagem.nome}`} title="Envia a instância à lixeira e tira os tokens dela das cenas" onClick={() => instancia.onExcluir(personagem)}>
          Excluir</button>
      </span>}
      <button type="button" className="personagens-cena__colocar" aria-label={`Colocar ${personagem.nome}`} onClick={() => onColocar()}>Colocar</button>
      {/* Já oculto, token a token, sem mexer na chave (melhorias-da-sala, item 4). */}
      <button type="button" className="personagens-cena__colocar personagens-cena__colocar--oculto"
        aria-label={`Colocar ${personagem.nome} oculto dos jogadores`} title="Colocar oculto dos jogadores"
        onClick={() => onColocar(true)}><Glyph name="eye-off" size={15} /></button>
    </li>
  );
}

const numero = (p: Personagem) => p.numero_da_instancia ?? 0;

/** As instâncias de um modelo, sob ele, com "na cena", Excluir e Promover; e a limpeza das que ficaram fora da cena. */
function Instancias({ api, mesaId, modelo, instancias, naCena, onColocar, acoes }: {
  api: ApiClient; mesaId: string; modelo: Personagem | null; instancias: readonly Personagem[]; naCena: ReadonlySet<string>;
  onColocar: (personagem: Personagem, oculto?: boolean) => void; acoes: AcoesDeInstancias;
}) {
  if (instancias.length === 0) return null;
  const foraDaCena = instancias.filter((p) => !naCena.has(p.id));
  const nome = modelo?.nome ?? "modelo excluído";
  return (
    <div className="personagens-cena__instancias" role="group" aria-label={`Instâncias de ${nome}`}>
      <ul className="personagens-cena__lista personagens-cena__lista--instancias">
        {[...instancias].sort((a, b) => numero(a) - numero(b)).map((p) => (
          <Linha key={p.id} api={api} mesaId={mesaId} personagem={p} naCena={naCena.has(p.id)} comTipo={false}
            onColocar={(oculto) => onColocar(p, oculto)} instancia={acoes} />
        ))}
      </ul>
      {modelo && foraDaCena.length > 0 && (
        <button type="button" className="personagens-cena__texto personagens-cena__limpar" disabled={acoes.pendente}
          onClick={() => acoes.onLimpar(modelo)} title="Envia à lixeira as instâncias deste modelo sem token na cena aberta (e tira os tokens que elas tenham em outras cenas)">
          Excluir as instâncias fora da cena ({foraDaCena.length})</button>
      )}
    </div>
  );
}

/** Uma lista de personagens para o Narrador pôr na cena, arrastando o retrato ou com "Colocar". */
function ListaDePersonagens({ api, mesaId, id, titulo, vazio, personagens, naCena, comTipo, onColocar, instancias, acoes }: {
  api: ApiClient; mesaId: string; id: string; titulo: string; vazio: string; personagens: readonly Personagem[];
  naCena: ReadonlySet<string>; comTipo: boolean; onColocar: (personagem: Personagem, oculto?: boolean) => void;
  /** Instâncias por modelo (instancias-de-personagem); as de modelo excluído ficam sob a chave vazia. */
  instancias?: ReadonlyMap<string, Personagem[]>; acoes?: AcoesDeInstancias;
}) {
  const idTitulo = `${useId()}-${id}`;
  const orfas = instancias?.get("") ?? [];
  return (
    <section className="personagens-cena__secao" aria-labelledby={idTitulo}>
      <h3 id={idTitulo} className="personagens-cena__titulo">
        {titulo}<span className="sub-abas__contagem" aria-hidden="true">{personagens.length}</span>
      </h3>
      {personagens.length === 0 && orfas.length === 0
        ? <p className="room-view__hint">{vazio}</p>
        : <ul className="personagens-cena__lista">
          {personagens.map((p) => (
            <li key={p.id} className="personagens-cena__modelo">
              <ul className="personagens-cena__lista">
                <Linha api={api} mesaId={mesaId} personagem={p} naCena={naCena.has(p.id)} comTipo={comTipo}
                  onColocar={(oculto) => onColocar(p, oculto)} />
              </ul>
              {instancias && acoes && <Instancias api={api} mesaId={mesaId} modelo={p} instancias={instancias.get(p.id) ?? []}
                naCena={naCena} onColocar={onColocar} acoes={acoes} />}
            </li>
          ))}
          {orfas.length > 0 && acoes && <li className="personagens-cena__modelo">
            <p className="room-view__hint">Instâncias de um modelo excluído:</p>
            <Instancias api={api} mesaId={mesaId} modelo={null} instancias={orfas} naCena={naCena} onColocar={onColocar} acoes={acoes} />
          </li>}
        </ul>}
    </section>
  );
}

/**
 * As listas do Narrador na sub-aba "Personagens" da aba Cena (experiencia-da-mesa, itens 9 e 10; sub-abas pedidas pelo
 * usuário em 2026-10-04): personagens dos jogadores e, separados, NPCs e monstros (os sem dono). "Colocar" usa a casa livre mais próxima do centro da vista.
 * Com modelo e instâncias (instancias-de-personagem), "NPCs e monstros" lista os modelos e, sob cada um, as instâncias.
 */
export function PersonagensDosJogadores({ api, mesaId, personagens, naCena, onColocar, instancias }: {
  api: ApiClient; mesaId: string; personagens: readonly Personagem[]; naCena: ReadonlySet<string>;
  /** `oculto` vem do botão "Colocar oculto"; "Colocar" e o arraste põem o token visível. */
  onColocar: (personagem: Personagem, oculto?: boolean) => void;
  instancias?: AcoesDeInstancias;
}) {
  const semDono = personagens.filter((p) => !p.proprietario_id);
  const porModelo = instanciasPorModelo(semDono);
  return (
    <div className="personagens-cena__grupos">
      <p className="room-view__hint">Arraste um retrato para o grid, ou use “Colocar” para pô-lo perto do centro da vista; o olho cortado coloca já oculto dos jogadores.</p>
      {/* Quem decide se o jogador vê o token é o Narrador: ao colocar, pelo olho cortado de cada personagem
          (a chave geral saiu em melhorias-da-sala, item 4); depois, pelo olho da lista de tokens. */}
      <ListaDePersonagens api={api} mesaId={mesaId} id="jogadores" titulo="Personagens dos jogadores" comTipo={false}
        vazio="Nenhum jogador tem personagem nesta mesa ainda." personagens={personagens.filter((p) => p.proprietario_id)}
        naCena={naCena} onColocar={onColocar} />
      <ListaDePersonagens api={api} mesaId={mesaId} id="npcs" titulo="NPCs e monstros" comTipo
        vazio="Nenhum NPC ou monstro nesta mesa ainda." personagens={semDono.filter((p) => !p.instancia_de)}
        naCena={naCena} onColocar={onColocar} instancias={porModelo} acoes={instancias} />
      {instancias?.erro && <p role="alert">{instancias.erro}</p>}
    </div>
  );
}
