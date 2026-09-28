import { Popover } from "../../../ui/primitives";
import type { ApiClient, EfeitoResumo } from "../types";
import { EffectDetailIcon } from "./EffectsPanel";
import type { ConsequenciaResumo, TrilhaDesgaste } from "./sheetApi";
import { useControlesDesgaste, type ControlesDesgaste } from "./useControlesDesgaste";
import { ROTULO_CATEGORIA } from "./wearForms";

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
 * Faixa de estado ativo (design, decisão 7): desgaste, consequências persistentes e efeitos
 * ativos visíveis em qualquer seção da ficha, porque são a informação mais urgente durante o
 * jogo. Estados usam texto além da cor; detalhes completos ficam no popover. Com `controles`,
 * o Narrador altera as trilhas e quem controla o personagem usa o Esforço.
 */
export function ActiveStateStrip({ desgaste, efeitos, consequencias, api, mesaId, controles }: {
  desgaste: TrilhaDesgaste[] | undefined; efeitos: EfeitoResumo[] | undefined;
  consequencias?: ConsequenciaResumo[]; api?: ApiClient; mesaId?: string; controles?: ControlesDesgaste;
}) {
  const ativos = (efeitos ?? []).filter((efeito) => efeito.estado === "ativo");
  const suspensos = (efeitos ?? []).filter((efeito) => efeito.estado === "suspenso").length;
  const persistentes = (consequencias ?? []).filter((c) => c.tratamento.estado !== "encerrado");
  const { botoesTrilha, acoes, dialogo } = useControlesDesgaste(controles, desgaste);
  return (
    <section className="active-state" aria-label="Estado ativo">
      <div className="active-state__wear">
        {(desgaste ?? []).map((trilha) => (
          <span key={trilha.recurso} className="wear-track">
            <Trilha trilha={trilha} />
            {botoesTrilha(trilha.recurso)}
          </span>
        ))}
        {acoes}
      </div>
      {persistentes.length > 0 && (
        <div className="active-state__consequences">
          <span className="eyebrow">Consequências</span>
          <ul className="effect-strip">
            {persistentes.map((c) => (
              <li key={c.id} className="consequence-chip">
                {ROTULO_CATEGORIA[c.categoria]}: {c.nome}{c.intensidade > 1 ? ` (intensidade ${c.intensidade})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
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
      {dialogo}
    </section>
  );
}
