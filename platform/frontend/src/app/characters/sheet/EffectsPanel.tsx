import { Popover } from "../../../ui/primitives";
import type { EfeitoResumo } from "../types";

const symbolByIndex = ["✧", "◈", "◇", "✦", "❖", "◆"];

function toneByIndex(index: number): "violet" | "gold" | "teal" {
  const tones = ["violet", "gold", "teal"] as const;
  return tones[index % tones.length]!;
}

function comSinal(valor: number): string {
  return valor >= 0 ? `+${valor}` : `${valor}`;
}

const fonteTipoLabel: Record<string, string> = {
  equipamento: "Equipamento",
  importacao: "Código importado",
  narrador: "Aplicado pelo Narrador",
};

/**
 * Ícone de um efeito ativo ou suspenso, com todo o conteúdo (nome, descrição,
 * estado, duração, fontes e modificadores, inclusive situacionais com seu
 * contexto) acessível por hover, foco de teclado, clique ou toque através de
 * um popover — nunca dependente apenas de hover. Efeitos suspensos aparecem
 * esmaecidos e rotulados como tal, tanto no gatilho quanto no conteúdo.
 */
export function EffectDetailIcon({ efeito, index }: { efeito: EfeitoResumo; index: number }) {
  const suspenso = efeito.estado === "suspenso";
  const modificadoresDiretos = (efeito.modificadores ?? []).filter((mod) => !mod.contexto);
  const situacionais = (efeito.modificadores ?? []).filter((mod) => mod.contexto);
  return (
    <Popover
      label={suspenso ? `${efeito.nome} (suspenso)` : efeito.nome}
      triggerContent={<span aria-hidden="true">{symbolByIndex[index % symbolByIndex.length]}</span>}
      triggerClassName={`effect-icon effect-icon--${toneByIndex(index)}${suspenso ? " effect-icon--suspenso" : ""}`}
    >
      <dl>
        <dt>Nome</dt>
        <dd>{efeito.nome}</dd>
        <dt>Estado</dt>
        <dd>{suspenso ? "Suspenso" : "Ativo"}</dd>
        <dt>Descrição</dt>
        <dd>{efeito.descricao}</dd>
        <dt>Duração</dt>
        <dd>{efeito.duracao_rodadas ? `${efeito.duracao_rodadas} rodada${efeito.duracao_rodadas > 1 ? "s" : ""}` : "Sem duração limitada"}</dd>
        {efeito.ativacao && (<><dt>Ativação</dt><dd>{efeito.ativacao === "enquanto_equipado" ? "Enquanto o item de origem estiver equipado" : efeito.ativacao}</dd></>)}
        {(efeito.fontes ?? []).map((fonte, i) => (
          <div key={`fonte-${i}`}>
            <dt>Origem</dt>
            <dd>{fonteTipoLabel[fonte.tipo] ?? fonte.tipo}{fonte.descricao ? ` — ${fonte.descricao}` : ""}</dd>
          </div>
        ))}
        {modificadoresDiretos.map((mod, i) => (
          <div key={`mod-${i}`}>
            <dt>Modificador — {mod.alvo}</dt>
            <dd>{comSinal(mod.valor)}</dd>
          </div>
        ))}
      </dl>
      {situacionais.length > 0 && (
        <>
          <p className="eyebrow">Situacionais</p>
          <dl>
            {situacionais.map((mod, i) => (
              <div key={`sit-${i}`}>
                <dt>{mod.alvo} · {mod.contexto}</dt>
                <dd>{comSinal(mod.valor)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </Popover>
  );
}

export function EffectsPanel({ efeitos }: { efeitos: EfeitoResumo[] }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div><span className="eyebrow">ESTADO ATIVO</span><h2>Efeitos</h2></div>
      </div>
      {efeitos.length === 0 ? (
        <p className="preview-note">Nenhum efeito ativo ou suspenso no momento.</p>
      ) : (
        <div className="effect-strip">
          {efeitos.map((efeito, index) => <EffectDetailIcon key={efeito.id} efeito={efeito} index={index} />)}
          <span className="effect-strip__hint">Foque, toque ou clique para ver detalhes</span>
        </div>
      )}
    </section>
  );
}
