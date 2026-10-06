/**
 * Aba Mestre do painel da Sala (gamificacao-da-sala), só do Narrador, em sub-abas: a sessão de jogo, as preferências
 * da Sala (destaque de críticos e placar visível), o MVP (votação e MVPs anteriores) e as estatísticas de cada jogador.
 */
import { useState } from "react";

import { usePreferenciaTexto } from "../shells/usePreferenciaLocal";
import { PlacarDaMesa, SeletorDePeriodo } from "./EstatisticasDaSala";
import { SubAbas } from "./SubAbas";
import { descreverSessao, type Periodo } from "./textosDasEstatisticas";
import type { GamificacaoDaSala } from "./useGamificacaoDaSala";

function Chave({ rotulo, dica, ligada, desativada, onMudar }: {
  rotulo: string; dica: string; ligada: boolean; desativada: boolean; onMudar: (ligada: boolean) => void;
}) {
  return (
    <label className="mestre__chave rolador__opcao rolador__chave">
      <span className="rolador__opcao-nome">{rotulo}<small className="mestre__dica">{dica}</small></span>
      <input type="checkbox" role="switch" checked={ligada} disabled={desativada} onChange={(evento) => onMudar(evento.target.checked)} />
      <span className="rolador__chave-trilho" aria-hidden="true" />
    </label>
  );
}

const dataCurta = (valor: string | null | undefined) =>
  valor ? new Date(valor).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";

function VotacaoDoMestre({ gamificacao }: { gamificacao: GamificacaoDaSala }) {
  const { mvp, pendente } = gamificacao;
  const votacao = mvp?.votacao;
  const apelidos = mvp?.apelidos ?? {};
  const jogadores = gamificacao.estatisticas?.jogadores.length ?? 0;
  const nome = (id: string) => apelidos[id] ?? id;
  if (votacao?.estado === "aberta") {
    return (
      <div className="mestre__votacao">
        <p className="mestre__estado" role="status">{votacao.votaram} de {votacao.total} votaram</p>
        <p className="mestre__dica">Os votos são secretos: ninguém vê em quem cada um votou.</p>
        <button type="button" className="button button--primary" disabled={pendente} onClick={gamificacao.encerrarVotacao}>
          Encerrar votação</button>
      </div>
    );
  }
  if (votacao?.estado === "desempate") {
    return (
      <div className="mestre__votacao" role="group" aria-labelledby="mestre-empate">
        <p id="mestre-empate" className="mestre__estado">Empate. Escolha o MVP entre os empatados:</p>
        <div className="mestre__empatados">
          {(votacao.empatados ?? []).map((id) => (
            <button key={id} type="button" className="button" disabled={pendente} onClick={() => gamificacao.desempatar(id)}>
              {nome(id)}</button>
          ))}
        </div>
      </div>
    );
  }
  const poucos = jogadores < 2;
  return (
    <div className="mestre__votacao">
      {votacao?.estado === "encerrada" && <p className="mestre__estado">{votacao.vencedor_id
        ? `Último MVP: ${nome(votacao.vencedor_id)}` : "A última votação terminou sem votos."}</p>}
      <button type="button" className="button button--primary" disabled={pendente || poucos} onClick={gamificacao.abrirVotacao}>
        Abrir votação de MVP</button>
      {poucos && <p className="mestre__dica">São precisos ao menos dois jogadores na mesa para votar.</p>}
    </div>
  );
}

type Tema = "sessao" | "preferencias" | "mvp" | "estatisticas";

const TEMAS: Tema[] = ["sessao", "preferencias", "mvp", "estatisticas"];

/** Sub-aba da aba Mestre, lembrada neste navegador. */
export const CHAVE_SUBABA_DO_MESTRE = "cursed:mesa:subaba-do-mestre";

const temaValido = (valor: string): Tema => TEMAS.find((tema) => tema === valor) ?? "sessao";

/** Entrar e sair do modo turno (modo-de-turno), na sub-aba Sessão. */
export interface ControleDoModoTurno {
  aberto: boolean;
  /** Por que não dá para entrar agora (sem sessão, sem cena ativa…); nulo quando dá. */
  motivo: string | null;
  entrar: () => void;
  sair: () => void;
  pendente: boolean;
  erro: string | null;
}

export function MestreDoPainel({ gamificacao, modoTurno }: { gamificacao: GamificacaoDaSala; modoTurno?: ControleDoModoTurno }) {
  const [periodo, setPeriodo] = useState<Periodo>("sessao");
  const [guardada, setAba] = usePreferenciaTexto(CHAVE_SUBABA_DO_MESTRE, "sessao");
  const aba = temaValido(guardada);
  const { preferencias, sessoes, estatisticas, mvp, pendente } = gamificacao;
  const atual = sessoes?.atual ?? null;
  const historico = mvp?.historico ?? [];
  const apelidos = mvp?.apelidos ?? {};
  const votacaoAberta = mvp?.votacao?.estado === "aberta" || mvp?.votacao?.estado === "desempate";
  return (
    <div className="mestre">
      <SubAbas rotulo="Temas do Mestre" prefixo="mestre" aba={aba} onTrocar={setAba} itens={[
        { id: "sessao", rotulo: "Sessão" },
        { id: "preferencias", rotulo: "Preferências" },
        { id: "mvp", rotulo: "MVP", aviso: votacaoAberta ? "votação aberta" : undefined },
        { id: "estatisticas", rotulo: "Estatísticas" },
      ]}>
        {aba === "sessao" && (
          <div className="mestre__sessao">
            <p className="mestre__estado">{descreverSessao(atual)}</p>
            {atual
              ? <button type="button" className="button" disabled={pendente} onClick={gamificacao.encerrarSessao}>Encerrar sessão</button>
              : <button type="button" className="button button--primary" disabled={pendente} onClick={gamificacao.iniciarSessao}>
                Iniciar sessão</button>}
            <p className="mestre__dica">Rolagens e mudanças de vida durante a sessão contam nas estatísticas dela.</p>
            {modoTurno && (
              <div className="mestre__bloco mestre__turno">
                <h3 className="jogador__titulo">Modo turno</h3>
                {modoTurno.aberto
                  ? <button type="button" className="button" disabled={modoTurno.pendente} onClick={modoTurno.sair}>Sair do modo turno</button>
                  : <button type="button" className="button button--primary" disabled={modoTurno.pendente || Boolean(modoTurno.motivo)}
                    onClick={modoTurno.entrar} aria-describedby={modoTurno.motivo ? "mestre-turno-motivo" : undefined}>
                    Entrar em modo turno</button>}
                <p id="mestre-turno-motivo" className="mestre__dica">{modoTurno.aberto
                  ? "A ordem e a vez aparecem na barra no topo do grid."
                  : modoTurno.motivo ?? "Todos os personagens com token na cena ativa rolam iniciativa: 1d20 + Raciocínio + Prontidão."}</p>
                {modoTurno.erro && <p role="alert">{modoTurno.erro}</p>}
              </div>
            )}
          </div>
        )}

        {aba === "preferencias" && (
          <div className="mestre__preferencias">
            <Chave rotulo="Destaque de críticos" dica="O d20 crítico ou de falha crítica brilha para toda a mesa."
              ligada={preferencias.destaque_criticos} desativada={pendente}
              onMudar={(ligada) => gamificacao.mudarPreferencias({ destaque_criticos: ligada })} />
            <Chave rotulo="Mostrar estatísticas da mesa" dica="Os jogadores veem o placar do grupo na aba Jogador."
              ligada={preferencias.estatisticas_visiveis} desativada={pendente}
              onMudar={(ligada) => gamificacao.mudarPreferencias({ estatisticas_visiveis: ligada })} />
          </div>
        )}

        {aba === "mvp" && <>
          <section className="mestre__bloco" aria-labelledby="mestre-votacao-titulo">
            <h3 id="mestre-votacao-titulo" className="jogador__titulo">Votação de MVP</h3>
            <VotacaoDoMestre gamificacao={gamificacao} />
          </section>
          <section className="mestre__bloco" aria-labelledby="mestre-mvps-titulo">
            <h3 id="mestre-mvps-titulo" className="jogador__titulo">MVPs anteriores</h3>
            {historico.length === 0 ? <p className="estatisticas__vazio">Nenhum MVP ainda.</p> : (
              <ol className="mestre__mvps">
                {historico.map((item) => (
                  <li key={item.votacao_id}>
                    <strong>{apelidos[item.vencedor_id] ?? item.vencedor_id}</strong>
                    <span>{[item.sessao_numero ? `Sessão ${item.sessao_numero}` : null, dataCurta(item.encerrada_em),
                      `${item.votos} voto${item.votos === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>}

        {aba === "estatisticas" && (
          <div className="estatisticas">
            <SeletorDePeriodo periodo={periodo} onMudar={setPeriodo} sessao={estatisticas?.sessao} />
            {estatisticas ? <PlacarDaMesa jogadores={estatisticas.jogadores} periodo={periodo} titulo="Estatísticas dos jogadores" />
              : <p className="estatisticas__vazio">Carregando…</p>}
          </div>
        )}
      </SubAbas>

      {gamificacao.erro && <p role="alert">{gamificacao.erro}</p>}
    </div>
  );
}
