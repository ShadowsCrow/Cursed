import { Popover } from "../../../ui/primitives";
import type { ApiClient, EfeitoResumo } from "../types";
import { EffectDetailIcon } from "./EffectsPanel";
import type { TrilhaDesgaste } from "./sheetApi";

const ROTULO: Record<TrilhaDesgaste["recurso"], string> = { exaustao: "Exaustão", estresse: "Estresse" };

function Trilha({ trilha }: { trilha: TrilhaDesgaste }) {
  const nome = ROTULO[trilha.recurso];
  const semPenalidade = trilha.faixa.min === 0;
  return (
    <Popover
      label={`${nome}: ${trilha.atual} de ${trilha.maximo}, ${trilha.faixa.nome}`}
      triggerClassName={`wear-chip ${semPenalidade ? "" : "wear-chip--penalty"}`.trim()}
      triggerContent={
        <>
          <span className="wear-chip__label">{nome}</span>
          <strong>{trilha.atual}/{trilha.maximo}</strong>
          <span className="wear-chip__band">{trilha.faixa.nome}</span>
        </>
      }
    >
      <div className="wear-detail">
        <strong>{nome} — {trilha.faixa.nome}</strong>
        <p>{trilha.faixa.efeito}</p>
        {trilha.proxima_faixa && (
          <p>Próxima faixa: <b>{trilha.proxima_faixa.nome}</b> em {trilha.pontos_ate_proxima} ponto(s).</p>
        )}
        {!trilha.registrado && <p className="preview-note">Ainda não registrado nesta ficha; valor 0 presumido.</p>}
      </div>
    </Popover>
  );
}

/**
 * Faixa de estado ativo (design, decisão 7): desgaste e efeitos ativos visíveis em
 * qualquer seção da ficha, porque são a informação mais urgente durante o jogo.
 * Estados usam texto além da cor; detalhes completos ficam no popover.
 */
export function ActiveStateStrip({ desgaste, efeitos, api, mesaId }: {
  desgaste: TrilhaDesgaste[] | undefined; efeitos: EfeitoResumo[] | undefined; api?: ApiClient; mesaId?: string;
}) {
  const ativos = (efeitos ?? []).filter((efeito) => efeito.estado === "ativo");
  const suspensos = (efeitos ?? []).filter((efeito) => efeito.estado === "suspenso").length;
  return (
    <section className="active-state" aria-label="Estado ativo">
      <div className="active-state__wear">
        {(desgaste ?? []).map((trilha) => <Trilha key={trilha.recurso} trilha={trilha} />)}
      </div>
      <div className="active-state__effects">
        <span className="eyebrow">Efeitos ativos</span>
        {ativos.length === 0 ? (
          <span className="active-state__empty">Nenhum</span>
        ) : (
          <ul className="effect-strip">
            {ativos.map((efeito) => (
              <li key={efeito.id} className="effect-chip">
                <EffectDetailIcon efeito={efeito} api={api} mesaId={mesaId} />
                <span aria-hidden="true">{efeito.nome}</span>
              </li>
            ))}
          </ul>
        )}
        {suspensos > 0 && <span className="active-state__empty">{suspensos} suspenso(s)</span>}
      </div>
    </section>
  );
}
