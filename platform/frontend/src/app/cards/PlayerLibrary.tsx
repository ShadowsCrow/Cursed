import { useState } from "react";

import { Dialog } from "../../ui/primitives";
import { usePersonagens } from "../characters/api";
import type { ApiClient } from "../characters/types";
import { useApresentacoes, useMarcarApresentacaoVista, useOfertas } from "./api";
import { CardFace } from "./cardView";
import { OfferChooser } from "./OfferChooser";
import type { OfertaResumo } from "./types";
import { useReducedMotion } from "./useReducedMotion";

/** Ofertas pendentes dos personagens do jogador; o catálogo do Narrador nunca aparece aqui. */
export function PlayerLibrary({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  const ofertas = useOfertas(api, mesaId);
  const personagens = usePersonagens(api, mesaId, false);
  const [escolhendo, setEscolhendo] = useState<{ oferta: OfertaResumo; personagemId: string } | null>(null);
  const nomes = new Map((personagens.data ?? []).map((p) => [p.id, p.nome]));
  const pendentes = (ofertas.data ?? []).flatMap((oferta) =>
    oferta.estado === "aberta" && !oferta.expirada
      ? oferta.destinatarios.filter((d) => d.estado === "pendente").map((d) => ({ oferta, personagemId: d.personagem_id }))
      : [],
  );
  return (
    <div className="screen-content card-library">
      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">OFERTAS</span><h2>Cartas oferecidas a você</h2></div></div>
        {ofertas.isError && <p role="alert">{ofertas.error.message}</p>}
        {ofertas.isSuccess && pendentes.length === 0 && <p>Nenhuma oferta aguardando sua escolha.</p>}
        <ul className="offer-list">
          {pendentes.map(({ oferta, personagemId }) => (
            <li key={`${oferta.id}-${personagemId}`} className="offer-list__item">
              <strong>{oferta.titulo}</strong> — {oferta.candidatas.length} carta(s) para {nomes.get(personagemId) ?? "seu personagem"}
              {oferta.expira_em && <span> · até {new Date(oferta.expira_em).toLocaleString("pt-BR")}</span>}{" "}
              <button type="button" className="button" onClick={() => setEscolhendo({ oferta, personagemId })}>
                Escolher cartas
              </button>
            </li>
          ))}
        </ul>
      </section>
      {escolhendo && (
        <Dialog open title="Escolher cartas" onClose={() => setEscolhendo(null)} className="offer-dialog">
          <OfferChooser
            api={api} mesaId={mesaId} oferta={escolhendo.oferta} personagemId={escolhendo.personagemId}
            personagemNome={nomes.get(escolhendo.personagemId) ?? "seu personagem"} onDone={() => setEscolhendo(null)}
          />
        </Dialog>
      )}
    </div>
  );
}

/**
 * Cartas apresentadas pelo Narrador: mostradas sem posse e uma vez só. Fechar esconde na hora e avisa o
 * servidor, que não a apresenta de novo a este participante (nem depois de recarregar a página).
 */
export function PresentationOverlay({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  const apresentacoes = useApresentacoes(api, mesaId);
  const marcarVista = useMarcarApresentacaoVista(api, mesaId);
  const reduzido = useReducedMotion();
  const [fechadas, setFechadas] = useState<string[]>([]);
  const visivel = (apresentacoes.data ?? []).find((a) => !fechadas.includes(a.id));
  if (!visivel) return null;
  const fechar = () => {
    setFechadas((atual) => [...atual, visivel.id]);
    marcarVista.mutate(visivel.id);
  };
  return (
    <Dialog open title="Carta apresentada" onClose={fechar} className="presentation-dialog">
      <div className="presentation" data-movimento={reduzido ? "reduzido" : "normal"}>
        <CardFace tipo={visivel.carta.tipo} conteudo={visivel.carta.conteudo} api={api} mesaId={mesaId} />
        <p>O Narrador está mostrando esta carta. Ela não foi adicionada à sua ficha.</p>
      </div>
    </Dialog>
  );
}
