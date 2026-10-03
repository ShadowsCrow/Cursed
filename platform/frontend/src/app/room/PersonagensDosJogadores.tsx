import type { DragEvent } from "react";

import type { components } from "../../api/generated/schema";
import type { ApiClient } from "../characters/types";
import { Glyph } from "../../ui/Display";
import { useRetrato } from "../plataforma/imagens";
import { ARRASTE_DE_PERSONAGEM } from "./arrastes";
import { SecaoRetratil } from "./SecaoRetratil";

type Personagem = components["schemas"]["PersonagemResumo"];

const ROTULO_DO_TIPO: Record<Personagem["tipo"], string> = { personagem: "Personagem", npc: "NPC", monstro: "Monstro" };

function Linha({ api, mesaId, personagem, naCena, comTipo, onColocar }: {
  api: ApiClient; mesaId: string; personagem: Personagem; naCena: boolean; comTipo: boolean; onColocar: (oculto?: boolean) => void;
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
      <button type="button" className="personagens-cena__colocar" aria-label={`Colocar ${personagem.nome}`} onClick={() => onColocar()}>Colocar</button>
      {/* Já oculto, token a token, sem mexer na chave (melhorias-da-sala, item 4). */}
      <button type="button" className="personagens-cena__colocar personagens-cena__colocar--oculto"
        aria-label={`Colocar ${personagem.nome} oculto dos jogadores`} title="Colocar oculto dos jogadores"
        onClick={() => onColocar(true)}><Glyph name="eye-off" size={15} /></button>
    </li>
  );
}

/** Uma lista de personagens para o Narrador pôr na cena, arrastando o retrato ou com "Colocar". */
function ListaDePersonagens({ api, mesaId, id, titulo, vazio, personagens, naCena, comTipo, onColocar }: {
  api: ApiClient; mesaId: string; id: string; titulo: string; vazio: string; personagens: readonly Personagem[];
  naCena: ReadonlySet<string>; comTipo: boolean; onColocar: (personagem: Personagem, oculto?: boolean) => void;
}) {
  return (
    <SecaoRetratil id={id} titulo={titulo} contagem={personagens.length} interna>
      {personagens.length === 0
        ? <p>{vazio}</p>
        : <ul className="personagens-cena__lista">
          {personagens.map((p) => (
            <Linha key={p.id} api={api} mesaId={mesaId} personagem={p} naCena={naCena.has(p.id)} comTipo={comTipo}
              onColocar={(oculto) => onColocar(p, oculto)} />
          ))}
        </ul>}
    </SecaoRetratil>
  );
}

/**
 * As listas do Narrador na seção "Tokens" da aba Cena (experiencia-da-mesa, itens 9, 10 e 15): personagens dos
 * jogadores e, separados, NPCs e monstros (os sem dono). "Colocar" usa a casa livre mais próxima do centro da vista.
 */
export function PersonagensDosJogadores({ api, mesaId, personagens, naCena, onColocar }: {
  api: ApiClient; mesaId: string; personagens: readonly Personagem[]; naCena: ReadonlySet<string>;
  /** `oculto` vem do botão "Colocar oculto"; "Colocar" e o arraste põem o token visível. */
  onColocar: (personagem: Personagem, oculto?: boolean) => void;
}) {
  return (
    <div className="personagens-cena__grupos">
      <p className="room-view__hint">Arraste um retrato para o grid, ou use “Colocar” para pô-lo perto do centro da vista; o olho cortado coloca já oculto dos jogadores.</p>
      {/* Quem decide se o jogador vê o token é o Narrador: ao colocar, pelo olho cortado de cada personagem
          (a chave geral saiu em melhorias-da-sala, item 4); depois, pelo olho da lista de tokens. */}
      <ListaDePersonagens api={api} mesaId={mesaId} id="jogadores" titulo="Personagens dos jogadores" comTipo={false}
        vazio="Nenhum jogador tem personagem nesta mesa ainda." personagens={personagens.filter((p) => p.proprietario_id)}
        naCena={naCena} onColocar={onColocar} />
      <ListaDePersonagens api={api} mesaId={mesaId} id="npcs" titulo="NPCs e monstros" comTipo
        vazio="Nenhum NPC ou monstro nesta mesa ainda." personagens={personagens.filter((p) => !p.proprietario_id)}
        naCena={naCena} onColocar={onColocar} />
    </div>
  );
}
