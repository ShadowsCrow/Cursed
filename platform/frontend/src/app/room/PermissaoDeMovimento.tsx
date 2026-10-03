import { useState, type FormEvent } from "react";

import type { components } from "../../api/generated/schema";
import { Dialog } from "../../ui/primitives";

type Participante = components["schemas"]["ParticipanteResumo"];
export type ModoDePermissao = components["schemas"]["PermissoesEmLoteRequest"]["modo"];

const MODOS: readonly { modo: ModoDePermissao; rotulo: string; dica: string }[] = [
  { modo: "bloquear_todos", rotulo: "Bloquear todos", dica: "Só o Narrador move os tokens desta cena" },
  { modo: "so_principais", rotulo: "Só personagens principais", dica: "Libera os personagens dos jogadores e bloqueia NPCs, monstros e objetos" },
  { modo: "liberar_todos", rotulo: "Liberar todos", dica: "Libera todos os tokens desta cena" },
];

/** As três ações em lote da permissão de movimento (experiencia-da-mesa, item 13). */
export function PermissoesEmLote({ pendente, onEscolher }: { pendente: boolean; onEscolher: (modo: ModoDePermissao) => void }) {
  return (
    <div className="permissao-lote" role="group" aria-label="Movimento dos jogadores">
      <span className="permissao-lote__titulo" aria-hidden="true">Movimento dos jogadores</span>
      <div className="permissao-lote__botoes">
        {MODOS.map(({ modo, rotulo, dica }) => (
          <button key={modo} type="button" className="permissao-lote__botao" title={dica} disabled={pendente}
            onClick={() => onEscolher(modo)}>{rotulo}</button>
        ))}
      </div>
    </div>
  );
}

/**
 * Para liberar um token sem dono (NPC, monstro ou objeto), o Narrador escolhe quais jogadores podem movê-lo
 * (opção B do usuário, item 13). Sem ninguém marcado, não há o que liberar.
 */
export function EscolherJogadores({ rotulo, jogadores, iniciais, pendente, onConfirmar, onFechar }: {
  rotulo: string; jogadores: readonly Participante[]; iniciais: readonly string[]; pendente: boolean;
  onConfirmar: (controladores: string[]) => void; onFechar: () => void;
}) {
  const [escolhidos, setEscolhidos] = useState<ReadonlySet<string>>(() => new Set(iniciais));
  function alternar(id: string, marcado: boolean) {
    const proximo = new Set(escolhidos);
    if (marcado) proximo.add(id); else proximo.delete(id);
    setEscolhidos(proximo);
  }
  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (escolhidos.size) onConfirmar(jogadores.map((j) => j.usuario_id).filter((id) => escolhidos.has(id)));
  }
  return (
    <Dialog open title={`Quem pode mover ${rotulo}`} onClose={onFechar}
      description="Só os jogadores marcados movem este token; o Narrador sempre move.">
      <form className="escolher-jogadores" onSubmit={enviar}>
        {jogadores.length === 0
          ? <p>Nenhum jogador participa desta mesa ainda.</p>
          : <fieldset className="escolher-jogadores__lista">
            <legend className="sr-only">Jogadores</legend>
            {jogadores.map((jogador) => (
              <label key={jogador.usuario_id} className="escolher-jogadores__item">
                <input type="checkbox" checked={escolhidos.has(jogador.usuario_id)}
                  onChange={(e) => alternar(jogador.usuario_id, e.target.checked)} />
                {jogador.nome || "Jogador sem nome"}
              </label>
            ))}
          </fieldset>}
        <div className="escolher-jogadores__acoes">
          <button type="button" className="button button--secondary" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="button" disabled={pendente || escolhidos.size === 0}>Liberar movimento</button>
        </div>
      </form>
    </Dialog>
  );
}
