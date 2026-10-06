/**
 * Peças das estatísticas da Sala (gamificacao-da-sala), comuns às abas Mestre e Jogador: o seletor de período, o
 * quadro de um jogador e o placar do grupo. Os números vêm prontos do servidor; aqui só se apresentam.
 */
import { useId, type ReactNode } from "react";

import { desvioDaSorte, ROTULO_DA_SORTE, type Periodo } from "./textosDasEstatisticas";
import type { EstatisticasDoJogador, EstatisticasDoPeriodo, SessaoDeJogo } from "./useGamificacaoDaSala";


export function SeletorDePeriodo({ periodo, onMudar, sessao }: {
  periodo: Periodo; onMudar: (periodo: Periodo) => void; sessao: SessaoDeJogo | null | undefined;
}) {
  const nome = useId();
  const opcoes: [Periodo, string][] = [
    ["sessao", sessao?.encerrada_em ? `Sessão ${sessao.numero}` : "Esta sessão"],
    ["campanha", "Campanha"],
  ];
  return (
    <div className="estatisticas__periodo rolador__segmentos" role="radiogroup" aria-label="Período">
      {opcoes.map(([valor, rotulo]) => (
        <label key={valor} className="rolador__segmento">
          <input type="radio" name={nome} value={valor} checked={periodo === valor} onChange={() => onMudar(valor)} />
          <span>{rotulo}</span>
        </label>
      ))}
    </div>
  );
}

function Numero({ rotulo, valor, tom }: { rotulo: string; valor: ReactNode; tom?: "perda" | "ganho" | "critico" | "falha" }) {
  return (
    <div className={`estatisticas__numero${tom ? ` estatisticas__numero--${tom}` : ""}`}>
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

/** Os números de um período, ou o aviso de que não há sessão para mostrar. */
export function QuadroDoPeriodo({ periodo, vazio = "Ainda não houve sessão." }: {
  periodo: EstatisticasDoPeriodo | null | undefined; vazio?: string;
}) {
  if (!periodo) return <p className="estatisticas__vazio">{vazio}</p>;
  const desvio = desvioDaSorte(periodo.sorte);
  return (
    <div className="estatisticas__quadro">
      <dl className="estatisticas__numeros">
        <Numero rotulo="Vida perdida" valor={periodo.vida_perdida} tom="perda" />
        <Numero rotulo="Vida recuperada" valor={periodo.vida_recuperada} tom="ganho" />
        <Numero rotulo="Rolagens" valor={periodo.rolagens} />
        {periodo.criticos !== null && periodo.criticos !== undefined
          && <Numero rotulo="Críticos" valor={periodo.criticos} tom="critico" />}
        {periodo.falhas_criticas !== null && periodo.falhas_criticas !== undefined
          && <Numero rotulo="Falhas críticas" valor={periodo.falhas_criticas} tom="falha" />}
      </dl>
      <p className={`estatisticas__sorte estatisticas__sorte--${periodo.rotulo_sorte}`}>
        <span className="estatisticas__sorte-nome">Sorte nos dados</span>
        <strong>{ROTULO_DA_SORTE[periodo.rotulo_sorte]}</strong>
        {desvio && <span className="estatisticas__sorte-desvio">{desvio}</span>}
      </p>
    </div>
  );
}

/** Placar do grupo: um quadro por jogador, lado a lado. */
export function PlacarDaMesa({ jogadores, periodo, titulo }: {
  jogadores: EstatisticasDoJogador[]; periodo: Periodo; titulo?: string;
}) {
  if (jogadores.length === 0) return <p className="estatisticas__vazio">Nenhum jogador na mesa ainda.</p>;
  return (
    <ul className="estatisticas__placar" aria-label={titulo}>
      {jogadores.map((jogador) => (
        <li key={jogador.usuario_id} className="estatisticas__jogador">
          <h4 className="estatisticas__apelido">{jogador.apelido}</h4>
          <QuadroDoPeriodo periodo={periodo === "sessao" ? jogador.sessao : jogador.campanha} />
        </li>
      ))}
    </ul>
  );
}
