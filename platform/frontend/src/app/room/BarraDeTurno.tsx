/**
 * Modo turno na Sala (modo-de-turno): a barra de ordem no topo do grid, no estilo do Baldur's Gate 3, o quadro do
 * Narrador na fase de iniciativa e o aviso "Role iniciativa" dos jogadores. Os dados vêm prontos e filtrados pelo
 * servidor; aqui só se apresentam e se pedem as ações.
 */
import { useEffect, useRef, useState } from "react";

import type { CombateDoTurno, ParticipanteDoTurno } from "./useModoDeTurno";

function Retrato({ participante, url }: { participante: ParticipanteDoTurno; url?: string }) {
  return url
    ? <img className="turno__retrato" src={url} alt="" width={36} height={36} />
    : <span className="turno__retrato turno__retrato--iniciais" aria-hidden="true">
      {participante.nome.slice(0, 2).toLocaleUpperCase("pt-BR")}</span>;
}

const nomeCom = (p: ParticipanteDoTurno) => (p.tokens > 1 ? `${p.nome} (×${p.tokens})` : p.nome);

/** Anuncia a vez a leitores de tela quando ela muda: "Vez de Lion, rodada 2". */
function AnuncioDaVez({ combate }: { combate: CombateDoTurno }) {
  const vez = combate.participantes.find((p) => p.id === combate.vez_participante_id);
  const texto = combate.estado === "combate" && vez ? `Vez de ${vez.nome}, rodada ${combate.rodada}` : "";
  const [anunciado, setAnunciado] = useState(texto);
  const anterior = useRef(texto);
  useEffect(() => {
    if (texto !== anterior.current) {
      anterior.current = texto;
      setAnunciado(texto);
    }
  }, [texto]);
  return <p className="sr-only" role="status" aria-live="polite">{anunciado}</p>;
}

/**
 * Saldo de movimento da vez (modo-de-turno, D8), para o Narrador e o dono do personagem: "Deslocamento: 4 de 9 m",
 * "Correndo" e o botão "Correr" enquanto ele não correu.
 */
function SaldoDaVez({ participante, pendente, onCorrer }: {
  participante: ParticipanteDoTurno; pendente: boolean; onCorrer?: () => void;
}) {
  const movimento = participante.movimento;
  if (!movimento) return null;
  const resta = Math.max(0, movimento.limite - movimento.gasto);
  // Correr troca a Ação Padrão por outro movimento: com ela já gasta, não dá (cartas-na-cena).
  const semAcaoPadrao = participante.acoes ? !participante.acoes.padrao : false;
  return (
    <div className="turno__saldo" role="group" aria-label={`Deslocamento de ${participante.nome}`}>
      <span className="turno__saldo-texto">
        Deslocamento: <strong>{resta}</strong> de {movimento.limite} m{movimento.correndo && " · Correndo"}
      </span>
      <span className="turno__saldo-barra" aria-hidden="true">
        <span style={{ width: `${movimento.limite > 0 ? (resta / movimento.limite) * 100 : 0}%` }} />
      </span>
      {!movimento.correndo && onCorrer && (
        <button type="button" className="button button--ghost" disabled={pendente || semAcaoPadrao} onClick={onCorrer}
          title={semAcaoPadrao ? "Ação Padrão já usada nesta vez" : "Troca a Ação Padrão por outro movimento: o Deslocamento do turno dobra"}>
          Correr</button>
      )}
    </div>
  );
}

const ACOES_DO_TURNO = [["padrao", "Ação"], ["bonus", "Bônus"], ["reacao", "Reação"]] as const;
export type AcaoDoTurno = (typeof ACOES_DO_TURNO)[number][0];
const NOME_DA_ACAO: Record<AcaoDoTurno, string> = { padrao: "Ação Padrão", bonus: "Ação Bônus", reacao: "Reação" };

/**
 * Ações da vez (cartas-na-cena, D4): os selos de Ação Padrão, Ação Bônus e Reação, apagados quando gastos, para o
 * Narrador e o dono; o Narrador devolve uma ação gasta.
 */
export function AcoesDaVez({ participante, pendente, onDevolver }: {
  participante: ParticipanteDoTurno; pendente: boolean; onDevolver?: (acao: AcaoDoTurno) => void;
}) {
  const acoes = participante.acoes;
  if (!acoes) return null;
  return (
    <div className="turno__acoes-vez" role="group" aria-label={`Ações de ${participante.nome}`}>
      {ACOES_DO_TURNO.map(([acao, rotulo]) => {
        const disponivel = acoes[acao];
        return (
          <span key={acao} className={`turno__selo${disponivel ? "" : " turno__selo--gasta"}`}
            title={`${NOME_DA_ACAO[acao]}: ${disponivel ? "disponível" : "usada nesta vez"}`}>
            <span className="turno__selo-nome">{rotulo}</span>
            <span className="sr-only">: {disponivel ? "disponível" : "usada"}</span>
            {!disponivel && onDevolver && (
              <button type="button" className="turno__devolver" disabled={pendente} onClick={() => onDevolver(acao)}
                aria-label={`Devolver ${NOME_DA_ACAO[acao]} a ${participante.nome}`} title="Devolver">↺</button>
            )}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Chave do Narrador: com ela ligada, o movimento não gasta Deslocamento e pode mover quem está fora da vez; desligada,
 * fora da vez nada se move, para não mexer na peça errada sem querer (decisões do usuário, 2026-10-04 e 2026-10-05).
 */
function ChaveDoMovimentoLivre({ ligado, aoMudar }: { ligado: boolean; aoMudar: (ligado: boolean) => void }) {
  return (
    <label className="chave turno__livre"
      title="Mover sem gastar Deslocamento e mover quem está fora da vez (empurrão, queda, teleporte, correção). Também: segure Alt ao soltar o token.">
      <input type="checkbox" role="switch" className="chave__entrada" checked={ligado}
        onChange={(evento) => aoMudar(evento.target.checked)} />
      <span className="chave__trilho" aria-hidden="true"><span className="chave__botao" /></span>
      <span className="chave__rotulo chave__rotulo--texto">Movimento livre</span>
    </label>
  );
}

/** "Falta rolar a iniciativa de Kira, Lobo.": o motivo do Próximo turno travado, igual ao do servidor (D8c). */
function motivoDoTravamento(faltam: ParticipanteDoTurno[]): string | undefined {
  return faltam.length > 0 ? `Falta rolar a iniciativa de ${faltam.map((p) => p.nome).join(", ")}.` : undefined;
}

/** Quem falta rolar, com "Rolar por ele": na fase de iniciativa e, quando alguém entra no meio, durante a disputa. */
function PendentesDeIniciativa({ faltam, pendente, onRolarPor }: {
  faltam: ParticipanteDoTurno[]; pendente: boolean; onRolarPor: (participanteId: string) => void;
}) {
  return (
    <ul className="turno__pendentes">
      {faltam.map((p) => (
        <li key={p.id}>
          <span>{nomeCom(p)}</span>
          <button type="button" className="button button--ghost" disabled={pendente} onClick={() => onRolarPor(p.id)}
            aria-label={`Rolar por ${p.nome}`}>Rolar por ele</button>
        </li>
      ))}
    </ul>
  );
}

export function BarraDeTurno({ combate, narrador, retratos, pendente, onProximo, onSair, onComecar, onRolarPor, onRolarNpcs,
  onCorrer, onDevolver, movimentoLivre }: {
  combate: CombateDoTurno;
  narrador: boolean;
  /** Retrato de cada token (os mesmos do grid). */
  retratos: Record<string, string>;
  pendente: boolean;
  onProximo: () => void;
  onSair: () => void;
  onComecar: () => void;
  onRolarPor: (participanteId: string) => void;
  onRolarNpcs: () => void;
  onCorrer?: () => void;
  /** Só do Narrador: devolve uma ação gasta ao participante (cartas-na-cena, D4). */
  onDevolver?: (participanteId: string, acao: AcaoDoTurno) => void;
  /** Só do Narrador: movimento livre, que não gasta Deslocamento (empurrão, queda, teleporte, correção). */
  movimentoLivre?: { ligado: boolean; aoMudar: (ligado: boolean) => void };
}) {
  const naBarra = combate.participantes.filter((p) => !p.fora_da_cena);
  const iniciativa = combate.estado === "iniciativa";
  const faltam = naBarra.filter((p) => !p.rolou);
  const npcsFaltando = faltam.some((p) => !p.do_jogador);
  const daVez = iniciativa ? undefined : naBarra.find((p) => p.id === combate.vez_participante_id);
  const travado = iniciativa ? undefined : motivoDoTravamento(faltam);
  return (
    <section className={`turno${iniciativa ? " turno--iniciativa" : ""}`} aria-label="Modo turno">
      <AnuncioDaVez combate={combate} />
      <div className="turno__faixa">
        <p className="turno__rodada">{iniciativa ? "Iniciativa" : `Rodada ${combate.rodada}`}</p>
        <ol className="turno__ordem" aria-label="Ordem de iniciativa">
          {naBarra.map((p) => {
            const vez = !iniciativa && p.id === combate.vez_participante_id;
            return (
              <li key={p.id} className={`turno__participante${vez ? " turno__participante--vez" : ""}${p.rolou ? "" : " turno__participante--falta"}`}
                aria-current={vez ? "true" : undefined} title={nomeCom(p)}>
                <Retrato participante={p} url={p.token_id ? retratos[p.token_id] : undefined} />
                <span className="turno__nome">{p.nome}{p.tokens > 1 && <small> ×{p.tokens}</small>}</span>
                {p.rolou
                  ? p.total !== null && p.total !== undefined && <span className="turno__total">{p.total}</span>
                  : <span className="turno__falta">falta rolar</span>}
                {vez && <span className="sr-only"> (vez atual)</span>}
              </li>
            );
          })}
        </ol>
        {narrador && !iniciativa && (
          <div className="turno__acoes">
            <button type="button" className="button button--primary" disabled={pendente || Boolean(travado)} onClick={onProximo}
              title={travado}>Próximo turno</button>
            {movimentoLivre && <ChaveDoMovimentoLivre {...movimentoLivre} />}
            <button type="button" className="button button--ghost" disabled={pendente} onClick={onSair}>Sair do modo turno</button>
          </div>
        )}
      </div>
      {narrador && travado && (
        <div className="turno__quadro turno__quadro--travado" role="group" aria-label="Falta rolar a iniciativa">
          <p className="turno__dica turno__dica--travado">{travado} O Próximo turno volta quando rolar.</p>
          <PendentesDeIniciativa faltam={faltam} pendente={pendente} onRolarPor={onRolarPor} />
          {npcsFaltando && <div className="turno__acoes">
            <button type="button" className="button" disabled={pendente} onClick={onRolarNpcs}>Rolar todos os NPCs e monstros</button>
          </div>}
        </div>
      )}
      {daVez && (daVez.movimento || daVez.acoes || daVez.meu) && <div className="turno__vez">
        <SaldoDaVez participante={daVez} pendente={pendente} onCorrer={narrador || daVez.meu ? onCorrer : undefined} />
        <AcoesDaVez participante={daVez} pendente={pendente}
          onDevolver={narrador && onDevolver ? (acao) => onDevolver(daVez.id, acao) : undefined} />
        {/* O jogador encerra a própria vez (decisão do usuário, 2026-10-06); fica travado pelo mesmo motivo do Narrador. */}
        {!narrador && daVez.meu && (
          <button type="button" className="button button--primary turno__encerrar" disabled={pendente || Boolean(travado)}
            onClick={onProximo} title={travado ?? "Passa a vez ao próximo da ordem"}>Encerrar meu turno</button>
        )}
      </div>}
      {narrador && iniciativa && (
        <div className="turno__quadro" role="group" aria-label="Iniciativa">
          {faltam.length === 0 ? <p className="turno__dica">Todos rolaram.</p>
            : <PendentesDeIniciativa faltam={faltam} pendente={pendente} onRolarPor={onRolarPor} />}
          <div className="turno__acoes">
            {npcsFaltando && <button type="button" className="button" disabled={pendente} onClick={onRolarNpcs}>
              Rolar todos os NPCs e monstros</button>}
            <button type="button" className="button button--primary" disabled={pendente || naBarra.every((p) => !p.rolou)}
              onClick={onComecar}>Começar a disputa</button>
            {movimentoLivre && <ChaveDoMovimentoLivre {...movimentoLivre} />}
            <button type="button" className="button button--ghost" disabled={pendente} onClick={onSair}>Sair do modo turno</button>
          </div>
          {faltam.length > 0 && <p className="turno__dica">Quem não rolar fica no fim da fila, e o Próximo turno espera até rolar.</p>}
        </div>
      )}
    </section>
  );
}

/** Aviso do jogador: "Role iniciativa", com um botão por personagem dele que ainda não rolou. */
export function AvisoDeIniciativa({ combate, pendente, onRolar }: {
  combate: CombateDoTurno; pendente: boolean; onRolar: (participanteId: string) => void;
}) {
  const meus = combate.participantes.filter((p) => p.meu && !p.rolou && !p.fora_da_cena);
  if (meus.length === 0) return null;
  return (
    <section className="aviso-de-iniciativa" role="alertdialog" aria-labelledby="aviso-de-iniciativa-titulo"
      aria-describedby="aviso-de-iniciativa-texto">
      <h2 id="aviso-de-iniciativa-titulo" className="aviso-de-iniciativa__titulo">Role iniciativa</h2>
      <p id="aviso-de-iniciativa-texto" className="aviso-de-iniciativa__texto">1d20 + Raciocínio + Prontidão</p>
      <div className="aviso-de-iniciativa__botoes">
        {meus.map((p) => (
          <button key={p.id} type="button" className="button button--primary" disabled={pendente} onClick={() => onRolar(p.id)}>
            Rolar iniciativa de {p.nome}</button>
        ))}
      </div>
    </section>
  );
}
