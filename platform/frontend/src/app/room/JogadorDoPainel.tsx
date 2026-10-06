/**
 * Aba Jogador do painel da Sala (gamificacao-da-sala): a sessão em andamento, a votação de MVP aberta, as próprias
 * estatísticas da sessão e da campanha e, quando o Narrador mostra, o placar do grupo.
 */
import { useState, type ReactNode } from "react";

import { PlacarDaMesa, QuadroDoPeriodo, SeletorDePeriodo } from "./EstatisticasDaSala";
import { descreverSessao, type Periodo } from "./textosDasEstatisticas";
import type { GamificacaoDaSala } from "./useGamificacaoDaSala";

function VotacaoDoJogador({ gamificacao, retrato }: {
  gamificacao: GamificacaoDaSala; retrato?: (usuarioId: string) => ReactNode;
}) {
  const votacao = gamificacao.mvp?.votacao;
  if (votacao?.estado !== "aberta") return null;
  const apelidos = gamificacao.mvp?.apelidos ?? {};
  return (
    <section className="jogador__votacao" aria-labelledby="jogador-votacao-titulo">
      <h3 id="jogador-votacao-titulo" className="jogador__titulo">Quem foi o MVP?</h3>
      <p className="mestre__dica">Seu voto é secreto. Dá para trocar enquanto a votação estiver aberta.</p>
      <div className="jogador__candidatos" role="group" aria-labelledby="jogador-votacao-titulo">
        {votacao.candidatos.map((id) => {
          const nome = apelidos[id] ?? id;
          const escolhido = votacao.meu_voto === id;
          return (
            <button key={id} type="button" className="jogador__candidato" aria-pressed={escolhido}
              disabled={gamificacao.pendente} onClick={() => gamificacao.votar(id)}>
              <span className="jogador__candidato-retrato" aria-hidden="true">
                {retrato?.(id) ?? nome.slice(0, 2).toLocaleUpperCase("pt-BR")}</span>
              <span className="jogador__candidato-nome">{nome}</span>
              {escolhido && <span className="jogador__candidato-voto">seu voto</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function JogadorDoPainel({ gamificacao, userId, retrato }: {
  gamificacao: GamificacaoDaSala; userId: string; retrato?: (usuarioId: string) => ReactNode;
}) {
  const [periodo, setPeriodo] = useState<Periodo>("sessao");
  const { estatisticas, sessoes } = gamificacao;
  const minhas = estatisticas?.jogadores.find((j) => j.usuario_id === userId);
  const referencia = estatisticas?.sessao;
  return (
    <div className="jogador">
      <p className="mestre__estado jogador__sessao">{descreverSessao(sessoes?.atual)}</p>
      <VotacaoDoJogador gamificacao={gamificacao} retrato={retrato} />
      <section className="estatisticas" aria-labelledby="jogador-minhas-titulo">
        <h3 id="jogador-minhas-titulo" className="jogador__titulo">Minhas estatísticas</h3>
        <SeletorDePeriodo periodo={periodo} onMudar={setPeriodo} sessao={referencia} />
        {!estatisticas ? <p className="estatisticas__vazio">Carregando…</p>
          : <QuadroDoPeriodo periodo={periodo === "sessao" ? minhas?.sessao : minhas?.campanha} />}
      </section>
      {estatisticas?.placar_visivel && (
        <section className="estatisticas" aria-labelledby="jogador-placar-titulo">
          <h3 id="jogador-placar-titulo" className="jogador__titulo">Placar da mesa</h3>
          <PlacarDaMesa jogadores={estatisticas.jogadores} periodo={periodo} titulo="Placar da mesa" />
        </section>
      )}
      {gamificacao.erro && <p role="alert">{gamificacao.erro}</p>}
    </div>
  );
}
