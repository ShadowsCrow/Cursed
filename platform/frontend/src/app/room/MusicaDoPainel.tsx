import { useCallback, useEffect, useState } from "react";

import { Glyph } from "../../ui/Display";
import {
  CHAVE_FAVORITAS, minutos, opcaoDisponivel, passaNoFiltro, valoresPresentes, type Camada, type FaixaDeMusica,
  type FiltroDeMusica,
} from "./musica";
import type { CamadaDaSala, MusicaDaSala } from "./useMusicaDaSala";

const NOME: Record<Camada, string> = { ambiente: "Ambiente", musica: "Música" };
const NOME_DA_LISTA: Record<Camada, string> = { ambiente: "Ambientes", musica: "Músicas" };

/** Crédito exigido pela licença CC BY: autor, licença com link e origem (musica-da-sala). */
function Credito({ faixa }: { faixa: FaixaDeMusica }) {
  return <p className="musica__credito">
    {faixa.autor} · <a href={faixa.licenca_url} target="_blank" rel="noopener noreferrer">{faixa.licenca}</a>
    {" · "}<a href={faixa.origem_url} target="_blank" rel="noopener noreferrer">origem</a>
  </p>;
}

function Rotulos({ faixa }: { faixa: FaixaDeMusica }) {
  return <p className="musica__rotulos">
    {faixa.momento && <span className="musica__rotulo">{faixa.momento}</span>}
    {faixa.cenario && <span className="musica__rotulo">{faixa.cenario}</span>}
    {faixa.sem_emenda && <span className="musica__rotulo musica__rotulo--loop">repete sem emenda</span>}
  </p>;
}

/** Tempo tocado e duração, atualizados a cada segundo enquanto a camada toca. */
function useTempo(camada: CamadaDaSala) {
  const [, setTique] = useState(0);
  const tocando = Boolean(camada.estado?.tocando && camada.faixaAtual);
  useEffect(() => {
    if (!tocando) return;
    const tique = window.setInterval(() => setTique((n) => n + 1), 1000);
    return () => window.clearInterval(tique);
  }, [tocando]);
  return camada.posicao();
}

/** Quadro de uma camada em "Tocando agora": o que toca, o tempo, o volume da pessoa e, ao Narrador, os controles. */
function QuadroDaCamada({ camada, narrator, pendente }: { camada: CamadaDaSala; narrator: boolean; pendente: boolean }) {
  const { faixaAtual: faixa, estado } = camada;
  const posicao = useTempo(camada);
  const nome = NOME[camada.camada];
  const id = `musica-camada-${camada.camada}`;
  const volume = <label className="musica__volume-campo">
    <span>Volume</span>
    <input type="range" min={0} max={100} step={1} value={Math.round(camada.volume * 100)}
      aria-label={camada.camada === "ambiente" ? "Volume do ambiente" : "Volume da música"} aria-valuetext={`${Math.round(camada.volume * 100)}%`}
      onChange={(evento) => camada.mudarVolume(Number(evento.target.value) / 100)} />
  </label>;
  if (!faixa || !estado) {
    return <section className="musica__agora musica__agora--vazio" aria-labelledby={id}>
      <h4 id={id} className="musica__camada">{nome}</h4>
      <p className="musica__nada">{camada.camada === "ambiente" ? "Nenhum ambiente tocando." : "Nenhuma música tocando."}</p>
      {volume}
    </section>;
  }
  const situacao = posicao.terminou ? "Terminou" : estado.tocando ? null : camada.camada === "ambiente" ? "Pausado" : "Pausada";
  return <section className="musica__agora" aria-labelledby={id}>
    <h4 id={id} className="musica__camada">{nome}</h4>
    <p className="musica__titulo">{faixa.titulo}</p>
    <Rotulos faixa={faixa} />
    <Credito faixa={faixa} />
    <p className="musica__tempo">
      {situacao && <span className="musica__situacao">{situacao}</span>}
      <span>{minutos(posicao.segundos)} / {minutos(faixa.duracao_s)}</span>
    </p>
    {narrator && <div className="musica__controles">
      {estado.tocando && !posicao.terminou
        ? <button type="button" className="button" disabled={pendente} onClick={camada.pausar}>Pausar</button>
        : <button type="button" className="button" disabled={pendente} onClick={camada.continuar}>
          {posicao.terminou ? "Tocar de novo" : "Continuar"}</button>}
      <button type="button" className="button button--secondary" disabled={pendente} onClick={camada.parar}>Parar</button>
      <label className="chave">
        <input type="checkbox" role="switch" className="chave__entrada" checked={estado.repetir} disabled={pendente}
          aria-label={`Repetir ${nome.toLocaleLowerCase("pt-BR")}`} onChange={(evento) => camada.mudarRepetir(evento.target.checked)} />
        <span className="chave__trilho" aria-hidden="true"><span className="chave__botao" /></span>
        <span className="chave__rotulo chave__rotulo--texto" aria-hidden="true">Repetir</span>
      </label>
    </div>}
    {volume}
  </section>;
}

function Filtros({ titulo, campo, valores, faixas, filtro, onFiltro }: {
  titulo: string; campo: "momento" | "cenario"; valores: string[]; faixas: FaixaDeMusica[];
  filtro: FiltroDeMusica; onFiltro: (filtro: FiltroDeMusica) => void;
}) {
  return <fieldset className="musica__filtro">
    <legend>{titulo}</legend>
    <div className="musica__opcoes">{valores.map((valor) => {
      const escolhido = filtro[campo] === valor;
      return <button key={valor} type="button" className="musica__opcao" aria-pressed={escolhido}
        disabled={!escolhido && !opcaoDisponivel(faixas, campo, valor, filtro)}
        onClick={() => onFiltro({ ...filtro, [campo]: escolhido ? null : valor })}>{valor}</button>;
    })}</div>
  </fieldset>;
}

type FiltroDaBiblioteca = FiltroDeMusica & { favoritas: boolean };
const SEM_FILTRO: FiltroDaBiblioteca = { momento: null, cenario: null, favoritas: false };

function lerFavoritas(): Set<string> {
  try {
    const salvas: unknown = JSON.parse(window.localStorage?.getItem(CHAVE_FAVORITAS) ?? "[]");
    return new Set(Array.isArray(salvas) ? salvas.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

/** Favoritas de cada pessoa, guardadas neste navegador; sem acesso ao armazenamento, valem até recarregar. */
function useFavoritas(): [Set<string>, (id: string) => void] {
  const [favoritas, setFavoritas] = useState(lerFavoritas);
  const alternar = useCallback((id: string) => {
    setFavoritas((atual) => {
      const proximas = new Set(atual);
      if (proximas.has(id)) proximas.delete(id); else proximas.add(id);
      try {
        window.localStorage?.setItem(CHAVE_FAVORITAS, JSON.stringify([...proximas]));
      } catch {
        // Armazenamento bloqueado: a escolha vale só até recarregar.
      }
      return proximas;
    });
  }, []);
  return [favoritas, alternar];
}

/** Seletor de uma opção entre poucas, no visual dos botões Ambientes/Músicas. */
function Seletor<T extends string>({ rotulo, opcoes, escolhida, nome, onEscolher }: {
  rotulo: string; opcoes: readonly T[]; escolhida: T; nome: (opcao: T) => string; onEscolher: (opcao: T) => void;
}) {
  return <div className="musica__tipos" role="group" aria-label={rotulo}>
    {opcoes.map((item) => <button key={item} type="button" className="musica__tipo" aria-pressed={escolhida === item}
      onClick={() => onEscolher(item)}>{nome(item)}</button>)}
  </div>;
}

/**
 * Biblioteca do Narrador: primeiro o tipo (Ambientes ou Músicas) e o Estilo de jogo (Medieval, Moderno, Ficção
 * científica); depois os filtros por Momento (só músicas) e Cenário, com só os valores que existem ali.
 */
function Biblioteca({ musica }: { musica: MusicaDaSala }) {
  const [tipo, setTipo] = useState<Camada>("ambiente");
  const [estiloEscolhido, setEstilo] = useState<string | null>(null);
  const estilo = estiloEscolhido && musica.estilos.includes(estiloEscolhido) ? estiloEscolhido : (musica.estilos[0] ?? "");
  // Cada combinação de tipo e estilo guarda o próprio filtro.
  const [filtros, setFiltros] = useState<Record<string, FiltroDaBiblioteca>>({});
  const [favoritas, alternarFavorita] = useFavoritas();
  const chave = `${tipo}:${estilo}`;
  const filtro = filtros[chave] ?? SEM_FILTRO;
  const camada = musica[tipo];
  const doEstilo = musica.faixas.filter((faixa) => faixa.tipo === tipo && (faixa.estilos ?? []).includes(estilo));
  // Com "Favoritas", os outros filtros valem só entre as favoritas.
  const base = filtro.favoritas ? doEstilo.filter((faixa) => favoritas.has(faixa.id)) : doEstilo;
  const visiveis = base.filter((faixa) => passaNoFiltro(faixa, filtro));
  const mudarFiltro = (novo: FiltroDeMusica) => setFiltros((atual) => ({ ...atual, [chave]: { ...filtro, ...novo } }));
  const momentos = valoresPresentes(doEstilo, "momento", musica.momentos);
  const cenarios = valoresPresentes(doEstilo, "cenario", musica.cenarios);
  return <section className="musica__biblioteca" aria-labelledby="musica-biblioteca-titulo">
    <h3 id="musica-biblioteca-titulo" className="musica__secao">Biblioteca</h3>
    <Seletor rotulo="Tipo de som" opcoes={["ambiente", "musica"] as const} escolhida={tipo}
      nome={(item) => NOME_DA_LISTA[item]} onEscolher={setTipo} />
    {musica.estilos.length > 0 && <Seletor rotulo="Estilo de jogo" opcoes={musica.estilos} escolhida={estilo}
      nome={(item) => item} onEscolher={setEstilo} />}
    <div className="musica__opcoes">
      <button type="button" className="musica__opcao musica__opcao--favoritas" aria-pressed={filtro.favoritas}
        onClick={() => setFiltros((atual) => ({ ...atual, [chave]: { ...filtro, favoritas: !filtro.favoritas } }))}>
        <Glyph name="star" size={13} /> Favoritas
      </button>
    </div>
    {tipo === "musica" && momentos.length > 0 && <Filtros titulo="Momento" campo="momento" valores={momentos}
      faixas={base} filtro={filtro} onFiltro={mudarFiltro} />}
    {cenarios.length > 0 && <Filtros titulo="Cenário" campo="cenario" valores={cenarios} faixas={base}
      filtro={filtro} onFiltro={mudarFiltro} />}
    {visiveis.length === 0 && <p className="musica__nada">{filtro.favoritas && base.length === 0
      ? "Nenhuma favorita aqui. Use a estrela de uma faixa para favoritá-la." : "Nada com esse filtro."}</p>}
    <ul className="musica__lista" aria-label={NOME_DA_LISTA[tipo]}>{visiveis.map((faixa) => {
      const atual = camada.faixaAtual?.id === faixa.id;
      const tocando = atual && Boolean(camada.estado?.tocando) && !camada.posicao().terminou;
      const acao = tocando ? "Pausar" : atual ? "Continuar" : "Tocar";
      return <li key={faixa.id} className={`musica__faixa${atual ? " musica__faixa--atual" : ""}`}>
        <div className="musica__faixa-texto">
          <p className="musica__titulo">{faixa.titulo} <small className="musica__duracao">{minutos(faixa.duracao_s)}</small></p>
          <Rotulos faixa={faixa} />
          <Credito faixa={faixa} />
        </div>
        <div className="musica__acoes">
          <button type="button" className="musica__favorita" aria-pressed={favoritas.has(faixa.id)}
            aria-label={`Favoritar ${faixa.titulo}`} title={favoritas.has(faixa.id) ? "Tirar das favoritas" : "Favoritar"}
            onClick={() => alternarFavorita(faixa.id)}><Glyph name="star" size={17} /></button>
          <button type="button" className="button" disabled={musica.pendente} aria-label={`${acao} ${faixa.titulo}`}
            onClick={() => (tocando ? camada.pausar() : atual ? camada.continuar() : camada.tocar(faixa.id))}>{acao}</button>
        </div>
      </li>;
    })}</ul>
  </section>;
}

/**
 * Aba Música da Sala (musica-da-sala): duas camadas que tocam juntas, Ambiente e Música. O Narrador escolhe na
 * biblioteca o que a mesa ouve em cada uma; o jogador vê o que toca. Volume de cada camada e "Silenciar" são de
 * cada pessoa.
 */
export function MusicaDoPainel({ musica, narrator }: { musica: MusicaDaSala; narrator: boolean }) {
  return <div className="musica">
    {musica.bloqueado && <div className="musica__bloqueio" role="status">
      <p>O navegador pausou o som até você interagir com a página.</p>
      <button type="button" className="button" onClick={musica.ativarSom}><Glyph name="music" size={16} /> Ativar som</button>
    </div>}
    <section className="musica__tocando" aria-labelledby="musica-agora-titulo">
      <div className="musica__tocando-topo">
        <h3 id="musica-agora-titulo" className="musica__secao">Tocando agora</h3>
        <button type="button" className="button button--secondary" aria-pressed={musica.silenciada}
          onClick={() => musica.silenciar(!musica.silenciada)}>{musica.silenciada ? "Ouvir" : "Silenciar"}</button>
      </div>
      <QuadroDaCamada camada={musica.ambiente} narrator={narrator} pendente={musica.pendente} />
      <QuadroDaCamada camada={musica.musica} narrator={narrator} pendente={musica.pendente} />
    </section>
    {musica.erro && <p role="alert">{musica.erro}</p>}
    {narrator && <Biblioteca musica={musica} />}
  </div>;
}
