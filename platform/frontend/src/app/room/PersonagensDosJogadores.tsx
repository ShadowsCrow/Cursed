import type { DragEvent } from "react";

import type { components } from "../../api/generated/schema";
import type { ApiClient } from "../characters/types";
import { useRetrato } from "../plataforma/imagens";
import { ARRASTE_DE_PERSONAGEM } from "./arrastes";
import { SecaoRetratil } from "./SecaoRetratil";

type Personagem = components["schemas"]["PersonagemResumo"];

const ROTULO_DO_TIPO: Record<Personagem["tipo"], string> = { personagem: "Personagem", npc: "NPC", monstro: "Monstro" };

function Linha({ api, mesaId, personagem, naCena, comTipo, onColocar }: {
  api: ApiClient; mesaId: string; personagem: Personagem; naCena: boolean; comTipo: boolean; onColocar: () => void;
}) {
  const retrato = useRetrato(api, mesaId, personagem.retrato_objeto, personagem.tipo, true);
  function iniciar(evento: DragEvent<HTMLLIElement>) {
    evento.dataTransfer.setData(ARRASTE_DE_PERSONAGEM, personagem.id);
    evento.dataTransfer.effectAllowed = "copy";
  }
  return (
    <li className="personagens-cena__item" draggable onDragStart={iniciar} title={`Arraste ${personagem.nome} para o grid`}>
      <img className="personagens-cena__retrato" src={retrato} alt="" width={40} height={40} />
      <span className="personagens-cena__nome">
        {personagem.nome}
        {comTipo && <small className="personagens-cena__tipo">{ROTULO_DO_TIPO[personagem.tipo]}</small>}
      </span>
      <span className="personagens-cena__marcas">
        {personagem.visibilidade === "narrador" && <span className="personagens-cena__marca personagens-cena__marca--oculto"
          title="A ficha está oculta dos jogadores; o token aparece com o nome público">ficha oculta</span>}
        {naCena && <span className="personagens-cena__marca">na cena</span>}
      </span>
      <button type="button" className="personagens-cena__colocar" aria-label={`Colocar ${personagem.nome}`} onClick={onColocar}>Colocar</button>
    </li>
  );
}

/** Uma lista de personagens para o Narrador pôr na cena, arrastando o retrato ou com "Colocar". */
function ListaDePersonagens({ api, mesaId, id, titulo, vazio, personagens, naCena, comTipo, onColocar }: {
  api: ApiClient; mesaId: string; id: string; titulo: string; vazio: string; personagens: readonly Personagem[];
  naCena: ReadonlySet<string>; comTipo: boolean; onColocar: (personagem: Personagem) => void;
}) {
  return (
    <SecaoRetratil id={id} titulo={titulo} contagem={personagens.length} interna>
      {personagens.length === 0
        ? <p>{vazio}</p>
        : <ul className="personagens-cena__lista">
          {personagens.map((p) => (
            <Linha key={p.id} api={api} mesaId={mesaId} personagem={p} naCena={naCena.has(p.id)} comTipo={comTipo}
              onColocar={() => onColocar(p)} />
          ))}
        </ul>}
    </SecaoRetratil>
  );
}

/**
 * As listas do Narrador na seção "Tokens" da aba Cena (experiencia-da-mesa, itens 9, 10 e 15): personagens dos
 * jogadores e, separados, NPCs e monstros (os sem dono). "Colocar" usa a casa livre mais próxima do centro da vista.
 */
export function PersonagensDosJogadores({ api, mesaId, personagens, naCena, colocarOculto, onColocarOculto, onColocar }: {
  api: ApiClient; mesaId: string; personagens: readonly Personagem[]; naCena: ReadonlySet<string>;
  colocarOculto: boolean; onColocarOculto: (oculto: boolean) => void;
  onColocar: (personagem: Personagem) => void;
}) {
  return (
    <div className="personagens-cena__grupos">
      <p className="room-view__hint">Arraste um retrato para o grid, ou use “Colocar” para pô-lo perto do centro da vista.</p>
      {/* Quem decide se o jogador vê o token é o Narrador, ao colocar (item 12); depois, pelo olho da lista de tokens. */}
      <label className="chave personagens-cena__oculto" title="Ligada, os tokens entram ocultos dos jogadores">
        <input type="checkbox" role="switch" className="chave__entrada" checked={colocarOculto}
          onChange={(e) => onColocarOculto(e.target.checked)} aria-label="Colocar oculto dos jogadores" />
        <span className="chave__trilho" aria-hidden="true"><span className="chave__botao" /></span>
        <span className="chave__rotulo chave__rotulo--texto" aria-hidden="true">Colocar oculto dos jogadores</span>
      </label>
      <ListaDePersonagens api={api} mesaId={mesaId} id="jogadores" titulo="Personagens dos jogadores" comTipo={false}
        vazio="Nenhum jogador tem personagem nesta mesa ainda." personagens={personagens.filter((p) => p.proprietario_id)}
        naCena={naCena} onColocar={onColocar} />
      <ListaDePersonagens api={api} mesaId={mesaId} id="npcs" titulo="NPCs e monstros" comTipo
        vazio="Nenhum NPC ou monstro nesta mesa ainda." personagens={personagens.filter((p) => !p.proprietario_id)}
        naCena={naCena} onColocar={onColocar} />
    </div>
  );
}
