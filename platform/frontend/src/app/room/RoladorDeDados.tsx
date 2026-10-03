import type { ReactNode } from "react";

import {
  descreverMontagem, LIMITE_DO_MODIFICADOR, MAXIMO_POR_DADO, quantidadeDeDados, TIPOS_DE_DADO, type Faces, type Rolagem,
} from "./dados";
import type { EstadoDoRolador } from "./useRolador";
import type { MostrarRolagens } from "./rolagensDaMesa";
import type { OpcaoDaFicha } from "./useOpcoesDaFicha";
import type { TermoDaFicha } from "./dados";
import { usePintura } from "../characters/sheet/cartas/pinturasDasCartas";

/** Pintura de cada dado (gerada pelo Codex, preparada por `preparar_arte.py`). */
const arteDoDado = (faces: Faces) => `/arte/sala/dados-d${faces}.webp`;

/** Silhueta de cada dado, em traço: reserva enquanto a pintura carrega ou se ela faltar. */
const SILHUETAS: Record<Faces, ReactNode> = {
  4: <path d="M12 3 21 19H3L12 3Z" />,
  6: <rect x="4.5" y="4.5" width="15" height="15" rx="2" />,
  8: <><path d="M12 2.5 20.5 12 12 21.5 3.5 12 12 2.5Z" /><path d="M3.5 12h17" /></>,
  10: <><path d="M12 2.5 21 10l-9 11.5L3 10l9-7.5Z" /><path d="m3 10 9 3.5 9-3.5M12 13.5v8" /></>,
  12: <path d="m12 2.5 9 6.5-3.4 10.5H6.4L3 9l9-6.5Z" />,
  20: <><path d="m12 2 8.7 5v10L12 22l-8.7-5V7L12 2Z" /><path d="M12 7.5 16.5 15h-9L12 7.5Z" /></>,
  100: <><circle cx="8.5" cy="12" r="5.5" /><circle cx="16" cy="12" r="5.5" /></>,
};

function Silhueta({ faces }: { faces: Faces }) {
  return <svg className="rolador__silhueta" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">{SILHUETAS[faces]}</svg>;
}

/** A pintura do dado, quando pronta; antes disso, a silhueta, no mesmo espaço. */
function ImagemDoDado({ faces }: { faces: Faces }) {
  const url = arteDoDado(faces);
  return usePintura(url) === "pronta"
    ? <img className="rolador__pintura" src={url} alt="" draggable={false} />
    : <Silhueta faces={faces} />;
}

function ValoresDaRolagem({ rolagem }: { rolagem: Rolagem }) {
  return (
    <ul className="rolador__grupos">
      {rolagem.grupos.map((grupo) => (
        <li key={grupo.faces}>
          <span className="rolador__grupo-tipo">d{grupo.faces}</span>
          <span className="rolador__valores">
            {grupo.valores.map((valor, indice) => <span key={indice} className="rolador__valor">{valor}</span>)}
          </span>
        </li>
      ))}
      {rolagem.modificador !== 0 && (
        <li>
          <span className="rolador__grupo-tipo">mod</span>
          <span className="rolador__valor rolador__valor--mod">{rolagem.modificador > 0 ? `+${rolagem.modificador}` : `−${-rolagem.modificador}`}</span>
        </li>
      )}
    </ul>
  );
}

/** Opções de cada pessoa, guardadas neste navegador (item 3). */
export interface OpcoesDaAbaDados {
  mostrar: MostrarRolagens;
  aoMostrar: (valor: MostrarRolagens) => void;
  animacao: boolean;
  aoAnimar: (ligada: boolean) => void;
  /** Só para o Narrador (item 5): as próprias rolagens saem ocultas dos jogadores. */
  rolarOculto?: { ligado: boolean; aoMudar: (ligado: boolean) => void };
}

/**
 * Aba Dados do painel da Sala (melhorias-da-sala, itens 1 e 3): rolador parecido com o do Google.
 * Cada toque num dado o acrescenta à rolagem; o resultado não traz leitura mecânica (sucesso, crítico, CD).
 */
/** Rolar pela ficha (item 8): a faixa de retratos e os Atributos e Perícias da ficha escolhida. */
export interface FichaDaAbaDados {
  faixa: ReactNode;
  atributos: OpcaoDaFicha[];
  pericias: OpcaoDaFicha[];
  termos: TermoDaFicha[];
  carregando: boolean;
}

const comSinal = (valor: number) => (valor >= 0 ? `+${valor}` : `−${-valor}`);

function SeletorDaFicha({ rotulo, nenhum, valor, opcoesDaFicha, onMudar }: {
  rotulo: string; nenhum: string; valor: string | null; opcoesDaFicha: OpcaoDaFicha[]; onMudar: (chave: string | null) => void;
}) {
  return (
    <label className="rolador__seletor">
      <span>{rotulo}</span>
      <select value={valor ?? ""} onChange={(evento) => onMudar(evento.target.value || null)}>
        <option value="">{nenhum}</option>
        {opcoesDaFicha.map((opcao) => (
          <option key={opcao.chave} value={opcao.chave} disabled={opcao.valor === null}>
            {opcao.rotulo} ({opcao.valor === null ? "sem valor" : comSinal(opcao.valor)})
          </option>
        ))}
      </select>
    </label>
  );
}

export function RoladorDeDados({ rolador, opcoes, ficha }: {
  rolador: EstadoDoRolador; opcoes?: OpcoesDaAbaDados; ficha?: FichaDaAbaDados;
}) {
  const { montagem, ultima, historico, rolando } = rolador;
  const escolha = rolador.ficha;
  const expressao = descreverMontagem(montagem, escolha?.personagemId ? ficha?.termos ?? [] : []);
  const semDados = quantidadeDeDados(montagem) === 0;
  const modificador = montagem.modificador;
  return (
    <div className="rolador">
      {ficha && (
        <section className="rolador__ficha" aria-label="Rolar pela ficha">
          {ficha.faixa}
          {escolha?.personagemId && (
            <div className="rolador__ficha-campos">
              {ficha.carregando ? <p className="rolador__aviso">Carregando a ficha…</p> : <>
                <SeletorDaFicha rotulo="Atributo" nenhum="Nenhum" valor={escolha.atributo} opcoesDaFicha={ficha.atributos}
                  onMudar={(atributo) => rolador.escolherFicha({ ...escolha, atributo })} />
                <SeletorDaFicha rotulo="Perícia" nenhum="Nenhuma" valor={escolha.pericia} opcoesDaFicha={ficha.pericias}
                  onMudar={(pericia) => rolador.escolherFicha({ ...escolha, pericia })} />
              </>}
            </div>
          )}
        </section>
      )}
      <div className="rolador__visor">
        <p className="rolador__expressao" data-vazia={expressao ? undefined : ""}>
          <span className="sr-only">Rolagem montada: </span>{expressao || "Escolha ao menos um dado."}
        </p>
        <div className="rolador__resultado" role="status" aria-live="polite" aria-atomic="true">
          {rolando ? <span className="rolador__total rolador__total--rolando">Rolando…</span> : ultima ? (
            <>
              <span className="sr-only">Resultado de {ultima.expressao}: </span>
              <span key={ultima.id} className="rolador__total">{ultima.total}</span>
              {/* A expressão rolada só aparece quando a montagem já mudou desde a rolagem. */}
              {ultima.expressao !== expressao && <span className="rolador__rolada" aria-hidden="true">{ultima.expressao}</span>}
              {ultima.oculta && <span className="rolador__oculta">oculta dos jogadores</span>}
            </>
          ) : <span className="rolador__total rolador__total--vazio" aria-hidden="true">—</span>}
        </div>
        {ultima && !rolando && <ValoresDaRolagem rolagem={ultima} />}
        {rolador.erro && <p className="rolador__erro" role="alert">{rolador.erro}</p>}
      </div>

      <div className="rolador__dados" role="group" aria-label="Dados">
        {TIPOS_DE_DADO.map((faces) => {
          const quantidade = montagem.dados[faces] ?? 0;
          // Clique acrescenta; botão direito (ou Delete/Backspace com o foco no dado) tira um (item 10).
          // Não fica desativado no máximo: o botão direito ainda precisa tirar.
          return (
            <button key={faces} type="button" className="rolador__dado"
              aria-label={quantidade > 0 ? `Acrescentar d${faces} (${quantidade} na rolagem)` : `Acrescentar d${faces}`}
              aria-keyshortcuts="Delete"
              title={quantidade > 0 ? "Clique: acrescentar · Botão direito ou Delete: tirar um" : "Clique: acrescentar"}
              aria-disabled={quantidade >= MAXIMO_POR_DADO || undefined}
              onClick={() => rolador.acrescentar(faces)}
              onContextMenu={(evento) => { evento.preventDefault(); rolador.remover(faces); }}
              onKeyDown={(evento) => {
                if (evento.key === "Delete" || evento.key === "Backspace") { evento.preventDefault(); rolador.remover(faces); }
              }}>
              <ImagemDoDado faces={faces} />
              <span className="rolador__dado-nome">d{faces}</span>
              {quantidade > 0 && <span className="rolador__contagem" aria-hidden="true">×{quantidade}</span>}
            </button>
          );
        })}
      </div>

      <div className="rolador__linha">
        <div className="rolador__modificador" role="group" aria-label="Modificador">
          <button type="button" aria-label="Diminuir modificador" title="Diminuir modificador"
            disabled={modificador <= -LIMITE_DO_MODIFICADOR} onClick={() => rolador.modificar(-1)}>−</button>
          <span className="rolador__modificador-valor" aria-live="polite">
            <span className="sr-only">Modificador </span>{modificador > 0 ? `+${modificador}` : modificador < 0 ? `−${-modificador}` : "0"}
          </span>
          <button type="button" aria-label="Aumentar modificador" title="Aumentar modificador"
            disabled={modificador >= LIMITE_DO_MODIFICADOR} onClick={() => rolador.modificar(1)}>+</button>
        </div>
        <button type="button" className="button button--ghost rolador__limpar"
          disabled={semDados && modificador === 0 && !ultima && !rolando} onClick={rolador.limpar}>Limpar</button>
        <button type="button" className="button button--primary rolador__rolar" disabled={semDados}
          onClick={rolador.rolarMontagem}>Rolar</button>
      </div>

      {/* Opções num bloco que abre e fecha, fechado por padrão: deixa espaço para o histórico (item 7). */}
      {opcoes && (
        <details className="rolador__opcoes">
          <summary className="rolador__opcoes-titulo">Opções</summary>
          <fieldset className="rolador__opcoes-campos">
          <legend className="sr-only">Opções dos dados</legend>
          <div className="rolador__opcao" role="radiogroup" aria-labelledby="rolador-mostrar">
            <span id="rolador-mostrar" className="rolador__opcao-nome">Mostrar rolagens</span>
            <div className="rolador__segmentos">
              {([["minhas", "Só as minhas"], ["todas", "De toda a mesa"]] as const).map(([valor, rotulo]) => (
                <label key={valor} className="rolador__segmento">
                  <input type="radio" name="rolador-mostrar" value={valor} checked={opcoes.mostrar === valor}
                    onChange={() => opcoes.aoMostrar(valor)} />
                  <span>{rotulo}</span>
                </label>
              ))}
            </div>
          </div>
          {opcoes.rolarOculto && (
            <label className="rolador__opcao rolador__chave">
              <span className="rolador__opcao-nome">Rolar oculto dos jogadores</span>
              <input type="checkbox" role="switch" checked={opcoes.rolarOculto.ligado}
                onChange={(evento) => opcoes.rolarOculto?.aoMudar(evento.target.checked)} />
              <span className="rolador__chave-trilho" aria-hidden="true" />
            </label>
          )}
          <label className="rolador__opcao rolador__chave">
            <span className="rolador__opcao-nome">Animação dos dados</span>
            <input type="checkbox" role="switch" checked={opcoes.animacao} onChange={(evento) => opcoes.aoAnimar(evento.target.checked)} />
            <span className="rolador__chave-trilho" aria-hidden="true" />
          </label>
          <p className="rolador__aviso">{opcoes.rolarOculto?.ligado
            ? "As rolagens são sorteadas pelo servidor. As suas ficam ocultas: só você as vê."
            : "As rolagens são sorteadas pelo servidor e vão para a mesa; cada pessoa escolhe se vê as dos outros."}</p>
          </fieldset>
        </details>
      )}

      {historico.length > 0 && (
        <section className="rolador__historico" aria-labelledby="rolador-historico-titulo">
          <div className="rolador__historico-topo">
            <h3 id="rolador-historico-titulo">Histórico</h3>
            <button type="button" className="rolador__texto" onClick={rolador.limparHistorico}>Limpar histórico</button>
          </div>
          {/* Rolagem própria do histórico (item 7); focável para rolar pelo teclado. */}
          <ol className="rolador__lista" tabIndex={0} aria-labelledby="rolador-historico-titulo">
            {historico.map((rolagem) => (
              <li key={rolagem.id} className="rolador__item">
                {(rolagem.autor || rolagem.oculta || rolagem.personagem) && <span className="rolador__item-autor">
                  {[rolagem.autor, rolagem.personagem, rolagem.oculta ? "oculta" : null].filter(Boolean).join(" · ")}</span>}
                <div className="rolador__item-cabeca">
                  <span className="rolador__item-expressao">{rolagem.expressao}</span>
                  <strong className="rolador__item-total">{rolagem.total}</strong>
                </div>
                <ValoresDaRolagem rolagem={rolagem} />
                <button type="button" className="rolador__texto" aria-label={`Rolar de novo ${rolagem.expressao}`}
                  onClick={() => rolador.rolarDeNovo(rolagem)}>Rolar de novo</button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
