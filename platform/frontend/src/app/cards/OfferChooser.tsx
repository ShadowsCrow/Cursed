import { useRef, useState, type KeyboardEvent } from "react";

import { Confirmation } from "../../ui/primitives";
import type { ApiClient } from "../characters/types";
import { useResponderOferta } from "./api";
import { CardFace } from "./cardView";
import type { EstadoCarta, OfertaResumo } from "./types";
import { useReducedMotion } from "./useReducedMotion";

const ROTULO_ESTADO: Record<EstadoCarta, string> = {
  disponivel: "Disponível para aprender",
  em_aprendizado: "Em aprendizado",
  aprendida: "Aprendida",
  no_inventario: "No inventário",
  aplicada: "Efeito aplicado",
  removida: "Removida",
};

function limites(oferta: OfertaResumo): string {
  return oferta.min_escolhas === oferta.max_escolhas
    ? `exatamente ${oferta.max_escolhas}`
    : `de ${oferta.min_escolhas} a ${oferta.max_escolhas}`;
}

export interface OfferChooserProps {
  api: ApiClient;
  mesaId: string;
  oferta: OfertaResumo;
  personagemId: string;
  personagemNome: string;
  onDone?: () => void;
}

/**
 * Escolha de cartas (9.8): cartas entram com animação (desligada com movimento
 * reduzido), são marcadas por clique, toque ou teclado (setas + Espaço/Enter) e
 * só podem ser confirmadas dentro dos limites da oferta, após confirmação explícita.
 */
export function OfferChooser({ api, mesaId, oferta, personagemId, personagemNome, onDone }: OfferChooserProps) {
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [foco, setFoco] = useState(0);
  const [confirmando, setConfirmando] = useState(false);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const reduzido = useReducedMotion();
  const responder = useResponderOferta(api, mesaId);
  const candidatas = oferta.candidatas;
  const dentroDosLimites = escolhidas.length >= oferta.min_escolhas && escolhidas.length <= oferta.max_escolhas;

  function alternar(versaoId: string) {
    setEscolhidas((atual) => (atual.includes(versaoId) ? atual.filter((id) => id !== versaoId) : [...atual, versaoId]));
  }

  function mover(indice: number) {
    const proximo = (indice + candidatas.length) % candidatas.length;
    setFoco(proximo);
    botoes.current[proximo]?.focus();
  }

  function teclado(event: KeyboardEvent<HTMLButtonElement>, indice: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); mover(indice + 1); }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); mover(indice - 1); }
    if (event.key === "Home") { event.preventDefault(); mover(0); }
    if (event.key === "End") { event.preventDefault(); mover(candidatas.length - 1); }
  }

  if (responder.isSuccess) {
    return (
      <section className="offer-chooser" aria-live="polite">
        <h3>Escolha confirmada para {personagemNome}</h3>
        <ul className="offer-chooser__result">
          {responder.data.cartas.map((carta) => (
            <li key={carta.id}><strong>{String(carta.carta.conteudo.titulo)}</strong> — {ROTULO_ESTADO[carta.estado]}</li>
          ))}
        </ul>
        {responder.data.cartas.some((c) => c.estado === "disponivel") && (
          <p>Habilidades e magias escolhidas ficam disponíveis para aprender; o aprendizado segue as regras da mesa.</p>
        )}
        {onDone && <button type="button" className="button" onClick={onDone}>Fechar</button>}
      </section>
    );
  }

  return (
    <section className="offer-chooser" data-movimento={reduzido ? "reduzido" : "normal"} aria-labelledby={`oferta-${oferta.id}`}>
      <h3 id={`oferta-${oferta.id}`}>{oferta.titulo}</h3>
      <p>Escolha {limites(oferta)} carta(s) para {personagemNome}.</p>
      <div role="group" aria-label="Cartas oferecidas" className="offer-chooser__cards">
        {candidatas.map((carta, indice) => {
          const marcada = escolhidas.includes(carta.versao_id);
          return (
            <button
              key={carta.versao_id}
              ref={(el) => { botoes.current[indice] = el; }}
              type="button"
              className={`offer-card ${marcada ? "offer-card--selected" : ""}`}
              style={{ ["--ordem" as string]: indice }}
              aria-pressed={marcada}
              aria-label={`${String(carta.conteudo.titulo)}${marcada ? ", escolhida" : ""}`}
              tabIndex={indice === foco ? 0 : -1}
              onFocus={() => setFoco(indice)}
              onClick={() => alternar(carta.versao_id)}
              onKeyDown={(event) => teclado(event, indice)}
            >
              <CardFace tipo={carta.tipo} conteudo={carta.conteudo} api={api} mesaId={mesaId} />
            </button>
          );
        })}
      </div>
      <div className="offer-chooser__footer">
        <p className="offer-chooser__counter" aria-live="polite">
          Escolhidas {escolhidas.length} de {oferta.max_escolhas} (mínimo {oferta.min_escolhas})
        </p>
        {responder.isError && <p role="alert">{responder.error.message}</p>}
        <button type="button" className="button" disabled={!dentroDosLimites || responder.isPending} onClick={() => setConfirmando(true)}>
          Confirmar escolha
        </button>
      </div>
      <Confirmation
        open={confirmando}
        title="Confirmar escolha?"
        description={`Depois de confirmar, a oferta não pode ser respondida de novo para ${personagemNome}.`}
        confirmLabel="Confirmar"
        pending={responder.isPending}
        onConfirm={() => {
          setConfirmando(false);
          responder.mutate({ ofertaId: oferta.id, personagemId, escolhas: escolhidas });
        }}
        onCancel={() => setConfirmando(false)}
      />
    </section>
  );
}
