/**
 * Mão de cartas na parte de baixo da Sala (cartas-na-cena; pedido do usuário de 2026-10-06): as cartas jogáveis do
 * personagem, em leque, como se a pessoa as segurasse. O jogador vê a mão do próprio personagem; o Narrador, a de
 * quem está com a vez (e a dos jogadores só se quiser, pela aba Mestre). Clicar numa carta abre o quadro de uso:
 * alvos marcados no grid, custo, avisos e "Usar". O que está apagado e por quê vem do servidor.
 */
import { useEffect, useRef, type CSSProperties } from "react";

import type { ApiClient } from "../characters/types";
import { useArteDaCarta } from "./useArteDaCarta";
import { Glyph } from "../../ui/Display";
import { ROTULO_DA_ACAO, type CartaDaMao, type MaoDeCartas as Mao } from "./useUsoDeCartas";

/** Personagem que pode ter a mão à mostra (os do jogador com token na cena; para o Narrador, o da vez ou o escolhido). */
export interface OpcaoDePersonagem { id: string; nome: string }

export interface AlvoMarcado { tokenId: string; rotulo: string }

function CartaNaMao({ api, mesaId, carta, indice, total, aberta, onAbrir, aoCarregarArte }: {
  api: ApiClient; mesaId: string; carta: CartaDaMao; indice: number; total: number; aberta: boolean;
  onAbrir: () => void; aoCarregarArte: (versaoId: string, arte: string) => void;
}) {
  const arte = useArteDaCarta(api, mesaId, carta);
  useEffect(() => { if (arte) aoCarregarArte(carta.versao_id, arte); }, [arte, carta.versao_id, aoCarregarArte]);
  const centro = (total - 1) / 2;
  const estilo = { "--ang": `${(indice - centro) * 5}deg`, "--sobe": `${Math.abs(indice - centro) * 5}px` } as CSSProperties;
  const indisponivel = Boolean(carta.motivo_indisponivel);
  const descricao = [`${carta.custo_uso} PP`, ROTULO_DA_ACAO[carta.acao], carta.motivo_indisponivel].filter(Boolean).join(" · ");
  return (
    <li className="mao__posicao" style={estilo}>
      <button type="button" className={`mao__carta${indisponivel ? " mao__carta--apagada" : ""}${aberta ? " mao__carta--aberta" : ""}`}
        aria-pressed={aberta} aria-disabled={indisponivel || undefined} title={`${carta.titulo}: ${descricao}`}
        aria-label={`${carta.titulo}, ${descricao}`} onClick={onAbrir}>
        {arte ? <img className="mao__arte" src={arte} alt="" draggable={false} decoding="async" />
          : <span className="mao__iniciais" aria-hidden="true">{carta.titulo.slice(0, 2).toLocaleUpperCase("pt-BR")}</span>}
        <span className="mao__custo" aria-hidden="true">{carta.custo_uso} PP</span>
        {carta.ativacao === "reacao" && <span className="mao__reacao" aria-hidden="true">R</span>}
        <span className="mao__titulo" aria-hidden="true">{carta.titulo}</span>
      </button>
    </li>
  );
}

/** Quadro de uso de uma carta: o texto, o que ela pede, os alvos marcados no grid e "Usar". */
function QuadroDeUso({ carta, alvos, pendente, erro, onUsar, onFechar, onTirarAlvo, onLimparAlvos }: {
  carta: CartaDaMao; alvos: AlvoMarcado[]; pendente: boolean; erro: string | null;
  onUsar: () => void; onFechar: () => void; onTirarAlvo: (tokenId: string) => void; onLimparAlvos: () => void;
}) {
  const indisponivel = Boolean(carta.motivo_indisponivel);
  const titulo = `mao-quadro-${carta.versao_id}`;
  return (
    <div className="mao__quadro" role="dialog" aria-labelledby={titulo}>
      <div className="mao__quadro-cabeca">
        <h3 id={titulo} className="mao__quadro-titulo">{carta.titulo}</h3>
        <button type="button" className="mao__fechar" aria-label="Fechar" onClick={onFechar}><Glyph name="close" size={14} /></button>
      </div>
      <p className="mao__quadro-texto">{carta.texto}</p>
      <dl className="mao__quadro-dados">
        <div><dt>Custo</dt><dd>{carta.custo_uso} PP{carta.custo_extra && <small> + {carta.custo_extra}</small>}</dd></div>
        <div><dt>Ação</dt><dd>{ROTULO_DA_ACAO[carta.acao]}{carta.lancamento && <small> ({carta.lancamento})</small>}</dd></div>
        {carta.alvo_area && <div><dt>Alvo ou área</dt><dd>{carta.alvo_area}</dd></div>}
      </dl>
      {carta.custo_extra && <p className="mao__aviso">Custo extra: {carta.custo_extra}. Só o PP é debitado; o resto fica com a mesa.</p>}
      {carta.aviso_lancamento && <p className="mao__aviso">O Lançamento foi lido como Ação Padrão, por falta de encaixe.</p>}
      {indisponivel ? <p className="mao__motivo" role="status">{carta.motivo_indisponivel}</p> : (
        <div className="mao__alvos" role="group" aria-label="Alvos">
          {alvos.length === 0
            ? <p className="mao__dica">Clique nos tokens do grid para marcar os alvos, ou use sem alvo.</p>
            : <ul className="mao__alvos-lista">
              {alvos.map((alvo) => (
                <li key={alvo.tokenId}>
                  <span>{alvo.rotulo}</span>
                  <button type="button" className="mao__fechar" aria-label={`Tirar alvo ${alvo.rotulo}`} onClick={() => onTirarAlvo(alvo.tokenId)}>
                    <Glyph name="close" size={12} /></button>
                </li>
              ))}
            </ul>}
          {alvos.length > 0 && <button type="button" className="rolador__texto" onClick={onLimparAlvos}>Limpar alvos</button>}
        </div>
      )}
      {erro && <p className="mao__erro" role="alert">{erro}</p>}
      <div className="mao__quadro-acoes">
        <button type="button" className="button button--ghost" onClick={onFechar}>Cancelar</button>
        {!indisponivel && <button type="button" className="button button--primary" disabled={pendente} onClick={onUsar}>
          Usar{alvos.length > 0 ? ` em ${alvos.length === 1 ? alvos[0]!.rotulo : `${alvos.length} alvos`}` : ""}</button>}
      </div>
    </div>
  );
}

export function MaoDeCartas({ api, mesaId, mao, carregando, narrador, personagens, personagemId, onEscolherPersonagem,
  aberta, onAlternar, cartaAberta, onAbrirCarta, onFechar, alvos, onTirarAlvo, onLimparAlvos, onUsar, pendente, erro,
  desfazer, aoCarregarArte }: {
  api: ApiClient; mesaId: string;
  mao: Mao | null | undefined;
  carregando: boolean;
  narrador: boolean;
  /** Personagens que podem ter a mão à mostra; com mais de um, a pessoa escolhe. */
  personagens: OpcaoDePersonagem[];
  personagemId: string | null;
  onEscolherPersonagem: (id: string) => void;
  aberta: boolean;
  onAlternar: () => void;
  /** Carta com o quadro de uso aberto (id da versão). */
  cartaAberta: string | null;
  onAbrirCarta: (versaoId: string | null) => void;
  onFechar: () => void;
  alvos: AlvoMarcado[];
  onTirarAlvo: (tokenId: string) => void;
  onLimparAlvos: () => void;
  onUsar: (carta: CartaDaMao) => void;
  pendente: boolean;
  erro: string | null;
  /** Só o Narrador: desfazer o último uso do personagem da mão, quando houver um que ainda possa ser desfeito. */
  desfazer?: { titulo: string; onDesfazer: () => void } | null;
  aoCarregarArte: (versaoId: string, arte: string) => void;
}) {
  const quadro = useRef<HTMLDivElement>(null);
  // Ao abrir o quadro de uso, o foco vai para ele (o primeiro botão é "Fechar"); trocar de carta refaz o foco.
  const ultimaAberta = useRef<string | null>(null);
  useEffect(() => {
    if (cartaAberta && ultimaAberta.current !== cartaAberta) quadro.current?.querySelector<HTMLElement>("button")?.focus();
    ultimaAberta.current = cartaAberta;
  }, [cartaAberta]);
  if (!personagemId) return null;
  const cartas = mao?.cartas ?? [];
  const carta = cartas.find((c) => c.versao_id === cartaAberta) ?? null;
  const nome = mao?.personagem_nome ?? personagens.find((p) => p.id === personagemId)?.nome ?? "Personagem";
  const pp = mao && mao.pp_atual !== null && mao.pp_atual !== undefined
    ? `${mao.pp_atual}${mao.pp_maximo !== null && mao.pp_maximo !== undefined ? ` de ${mao.pp_maximo}` : ""} PP` : null;
  return (
    <section className={`mao${aberta ? "" : " mao--recolhida"}`} aria-label={`Mão de cartas de ${nome}`}>
      <div className="mao__cabeca">
        {personagens.length > 1 ? (
          <label className="mao__escolha">
            <span className="sr-only">Personagem da mão</span>
            <select value={personagemId} onChange={(evento) => onEscolherPersonagem(evento.target.value)}>
              {personagens.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
        ) : <span className="mao__nome">{nome}</span>}
        {pp && <span className="mao__pp" aria-label={`${pp} de ${nome}`}>{pp}</span>}
        {narrador && desfazer && <button type="button" className="rolador__texto mao__desfazer" disabled={pendente}
          onClick={desfazer.onDesfazer} aria-label="Desfazer último uso"
          title={`Devolve o PP e a ação de ${desfazer.titulo}`}>Desfazer último uso</button>}
        <button type="button" className="mao__alternar" aria-expanded={aberta} onClick={onAlternar}>
          <span>{aberta ? "Recolher" : `Mão (${cartas.length})`}</span>
          <Glyph name="chevron" size={14} className="mao__seta" />
        </button>
      </div>
      {aberta && (carregando && !mao ? <p className="mao__dica">Carregando a mão…</p>
        : cartas.length === 0 ? <p className="mao__dica">{nome} não tem cartas com custo em PP para jogar.</p> : (
          <div className="mao__leque" ref={quadro}>
            {carta && <QuadroDeUso carta={carta} alvos={alvos} pendente={pendente} erro={erro} onUsar={() => onUsar(carta)}
              onFechar={onFechar} onTirarAlvo={onTirarAlvo} onLimparAlvos={onLimparAlvos} />}
            <ul className="mao__cartas" aria-label={`Cartas de ${nome}`}>
              {cartas.map((item, indice) => (
                <CartaNaMao key={item.posse_id} api={api} mesaId={mesaId} carta={item} indice={indice} total={cartas.length}
                  aberta={item.versao_id === cartaAberta} aoCarregarArte={aoCarregarArte}
                  onAbrir={() => onAbrirCarta(item.versao_id === cartaAberta ? null : item.versao_id)} />
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
}
