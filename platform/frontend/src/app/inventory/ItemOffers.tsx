import type { OfertaItem } from "../characters/sheet/sheetApi";

export interface ItemOffersProps {
  personagemId: string;
  ofertas: OfertaItem[];
  editavel: boolean;
  ocupado: boolean;
  /** Oferta cujo item está sendo colocado na grade por toque. */
  escolhendoLugar: string | null;
  onAceitar: (oferta: OfertaItem) => void;
  onEscolherLugar: (oferta: OfertaItem | null) => void;
  onRecusar: (oferta: OfertaItem) => void;
  onCancelar: (oferta: OfertaItem) => void;
}

const formato = (oferta: OfertaItem) =>
  oferta.largura != null && oferta.altura != null ? ` (${oferta.largura} x ${oferta.altura})` : " (sem dimensão)";

/** Trocas entre personagens (carga-por-espacos 6.3): recebidas para aceitar ou recusar, enviadas para cancelar. */
export function ItemOffers({
  personagemId, ofertas, editavel, ocupado, escolhendoLugar, onAceitar, onEscolherLugar, onRecusar, onCancelar,
}: ItemOffersProps) {
  const recebidas = ofertas.filter((o) => o.para_personagem_id === personagemId);
  const enviadas = ofertas.filter((o) => o.de_personagem_id === personagemId);
  if (recebidas.length === 0 && enviadas.length === 0) return null;
  return (
    <section className="panel trocas" aria-label="Trocas">
      <div className="section-heading"><div><span className="eyebrow">ENTRE PERSONAGENS</span><h2>Trocas</h2></div></div>
      {recebidas.length > 0 && (
        <ul className="trocas__lista" aria-label="Ofertas recebidas">
          {recebidas.map((oferta) => (
            <li key={oferta.id}>
              <span>{oferta.de_nome} oferece <strong>{oferta.item_nome}</strong>{formato(oferta)}.</span>
              {editavel && (
                <span className="trocas__acoes">
                  <button type="button" className="button" disabled={ocupado} onClick={() => onAceitar(oferta)}>
                    Aceitar {oferta.item_nome}
                  </button>
                  {oferta.largura != null && (escolhendoLugar === oferta.id
                    ? <button type="button" className="button button--ghost" onClick={() => onEscolherLugar(null)}>Não escolher lugar</button>
                    : <button type="button" className="button button--secondary" disabled={ocupado} onClick={() => onEscolherLugar(oferta)}>
                        Escolher lugar para {oferta.item_nome}
                      </button>)}
                  <button type="button" className="button button--ghost" disabled={ocupado} onClick={() => onRecusar(oferta)}>
                    Recusar {oferta.item_nome}
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {enviadas.length > 0 && (
        <ul className="trocas__lista" aria-label="Ofertas enviadas">
          {enviadas.map((oferta) => (
            <li key={oferta.id}>
              <span><strong>{oferta.item_nome}</strong> oferecido a {oferta.para_nome}; aguardando resposta.</span>
              {editavel && (
                <button type="button" className="button button--ghost" disabled={ocupado} onClick={() => onCancelar(oferta)}>
                  Cancelar oferta de {oferta.item_nome}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="preview-note">
        Aceitar sem escolher lugar deixa o item fora da grade, para arrumar depois. Enquanto a oferta estiver aberta, o item
        continua com quem ofereceu.
      </p>
    </section>
  );
}
