import { useId, useState, type ReactNode } from "react";

import { Pergaminho } from "../../../../ui/Tema";
import { exibir } from "../../creation/modelo";
import type { FichaContrato, PermissoesFicha, ValorDerivadoResumo } from "../../types";
import { FontesDoValor } from "../DerivedValueGroup";
import { CantoDaFolha, FlorDaBorda } from "../resumo/ornamentos";
import { chaveDerivada } from "../sheetCatalog";
import { gruposComExtras, useEdicaoEmLote, type Alteracao, type TipoValor } from "../useEdicaoEmLote";
import { apresentacaoDoGrupo, FRASE_DA_ABA, GRAVURA_DOS_GRUPOS, type ApresentacaoDoGrupo } from "./apresentacao";
import { Estrelinha, IconeAtributo, IconeGrupo, IconePena, MedalhaoGrupo } from "./icones";
import { ICONES_DOS_ATRIBUTOS, type NomeIconeAtributo } from "./nomesDosIcones";
import "./atributos.css";

export interface AtributosFichaProps {
  grupos: { titulo: string; nomes: string[] }[];
  ficha: FichaContrato;
  valores: ValorDerivadoResumo[];
  permissoes: PermissoesFicha | undefined;
  onSave: (alteracoes: Alteracao[]) => Promise<{ status: "salvo" | "pendente" }>;
  /** Personagens seguem os limites do valor base; NPCs e monstros, não. */
  aplicarLimites?: boolean;
}

type Edicao = ReturnType<typeof useEdicaoEmLote>;

/** "−1" com o sinal de menos tipográfico; "+2"; "0". */
function comSinal(valor: number): string {
  if (valor > 0) return `+${valor}`;
  if (valor < 0) return `−${Math.abs(valor)}`;
  return "0";
}

function iconeDe(nome: string): NomeIconeAtributo | undefined {
  const slug = chaveDerivada("atributo", nome).slice("atributo:".length);
  return (ICONES_DOS_ATRIBUTOS as readonly string[]).includes(slug) ? (slug as NomeIconeAtributo) : undefined;
}

/** Pintura decorativa opcional: some sem deixar imagem quebrada, e o fallback aparece só se ela falhar. */
export function PinturaOpcional({ src, className, reserva }: { src?: string; className: string; reserva?: ReactNode }) {
  const [falhou, setFalhou] = useState(!src);
  if (falhou) return <>{reserva}</>;
  return <img className={className} src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" onError={() => setFalhou(true)} />;
}

/** Emblema a traço no lugar da vinheta pintada: sol de raios finos, estrelas e o ícone do grupo. */
function EmblemaDaVinheta({ grupo }: { grupo: ApresentacaoDoGrupo }) {
  return (
    <span className="atributos-vinheta__emblema">
      <svg viewBox="0 0 160 120" aria-hidden="true" focusable="false">
        <g stroke="currentColor" fill="none" opacity=".55">
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180;
            const fora = i % 2 ? 44 : 52;
            return <path key={i} d={`M${80 + Math.cos(a) * 34} ${58 + Math.sin(a) * 34}L${80 + Math.cos(a) * fora} ${58 + Math.sin(a) * fora}`} strokeWidth=".8" />;
          })}
          <circle cx="80" cy="58" r="31" strokeWidth="1" />
          <circle cx="80" cy="58" r="55" strokeWidth=".6" strokeDasharray="2 3" />
        </g>
        <g opacity=".75"><Estrelinha x={26} y={30} r={6} /><Estrelinha x={136} y={24} r={5} /><Estrelinha x={140} y={88} r={4} /><Estrelinha x={20} y={86} r={4} /></g>
      </svg>
      <IconeGrupo nome={grupo.chave} tamanho={44} />
    </span>
  );
}

/** Faixa de pergaminho com a legenda da vinheta. */
function FaixaDaLegenda({ titulo, frase }: { titulo: string; frase?: string }) {
  return (
    <figcaption className="atributos-legenda">
      <svg className="atributos-legenda__fita" viewBox="0 0 240 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M26 16 2 20l11 15-9 17 24-1Z" className="atributos-legenda__ponta" />
        <path d="M214 16l24 4-11 15 9 17-24-1Z" className="atributos-legenda__ponta" />
        <path d="M20 46c-2-2-2-5 0-6M220 46c2-2 2-5 0-6" fill="none" stroke="#7a5a26" strokeWidth="1.2" />
        <path d="M18 10Q120 -4 222 10v48Q120 44 18 58Z" className="atributos-legenda__corpo" />
        <path d="M25 14.5Q120 1.5 215 14.5M25 53.5Q120 40.5 215 53.5" fill="none" stroke="#b08a45" strokeWidth=".9" />
      </svg>
      <span className="atributos-legenda__titulo">{titulo}</span>
      {frase && <span className="atributos-legenda__frase">{frase}</span>}
    </figcaption>
  );
}

/** Nó de filigrana que liga duas fitas de legenda. */
function NoDeFiligrana({ n }: { n: 1 | 2 }) {
  return (
    <svg className={`atributos-vinhetas__no atributos-vinhetas__no--${n}`} viewBox="0 0 52 52" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M26 6c-6 6-6 14 0 20 6-6 6-14 0-20Z" />
        <path d="M26 26c-8-2-14 2-16 8 4 4 11 2 12-3 0-3-3-4-5-2M26 26c8-2 14 2 16 8-4 4-11 2-12-3 0-3 3-4 5-2" />
        <path d="M26 26v20M20 40c3 3 9 3 12 0" />
      </g>
      <path d="m26 20 3.2 3.2L26 26.4l-3.2-3.2Z" fill="currentColor" />
    </svg>
  );
}

/** Gravura das três figuras com as fitas de legenda; sem ela, um emblema a traço sobre cada fita. */
function Vinhetas({ grupos }: { grupos: ApresentacaoDoGrupo[] }) {
  const [estado, setEstado] = useState<"carregando" | "pronta" | "falhou">("carregando");
  return (
    <div className={`atributos-vinhetas atributos-vinhetas--${estado}`} aria-hidden="true">
      {estado !== "falhou" && (
        <img className="atributos-vinhetas__gravura" src={GRAVURA_DOS_GRUPOS} alt="" decoding="async"
          onLoad={() => setEstado("pronta")} onError={() => setEstado("falhou")} />
      )}
      {grupos.map((grupo) => (
        <figure key={grupo.chave} className={`atributos-vinheta atributos-vinheta--${grupo.chave}`}>
          {estado === "falhou" && <EmblemaDaVinheta grupo={grupo} />}
          <FaixaDaLegenda titulo={grupo.subtitulo ?? ""} frase={grupo.frase} />
        </figure>
      ))}
      {grupos.length === 3 && <><NoDeFiligrana n={1} /><NoDeFiligrana n={2} /></>}
    </div>
  );
}

/** Voluta dourada nos cantos de cima da faixa. */
export function VolutaDaFaixa({ lado }: { lado: "se" | "sd" }) {
  return (
    <svg className={`atributos-cartao__ornato atributos-cartao__ornato--${lado}`} viewBox="0 0 46 46" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M9 44V18C9 13 13 9 18 9h26" strokeWidth="3" />
        <path d="M5 30c0-15 10-25 25-25" strokeWidth="1.8" />
        <path d="M14 30c-6-1-9-6-7-11 2-4 7-4 8 0 1 3-2 5-4 3" strokeWidth="2.2" />
        <path d="M30 14c-1-6-6-9-11-7-4 2-4 7 0 8 3 1 5-2 3-4" strokeWidth="2.2" />
      </g>
      <path d="m9 9 3.4-3.4L15.8 9l-3.4 3.4Z" fill="currentColor" />
      <circle cx="18" cy="18" r="2.2" fill="currentColor" />
    </svg>
  );
}

/** Filigrana gótica que sobe dos cantos de baixo da faixa. */
export function ArcoDaFaixa({ lado }: { lado: "ie" | "id" }) {
  return (
    <svg className={`atributos-cartao__ornato atributos-cartao__ornato--${lado}`} viewBox="0 0 84 60" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 58V38c0-9 5-16 13-20" />
        <path d="M4 40c7 0 11 4 11 10 0 5-5 7-8 5-2-2-1-5 2-5" />
        <path d="M16 58c0-15 9-26 22-29 10-2 17 3 17 10 0 6-6 8-9 5-3-2-1-6 2-5" />
        <path d="M24 30 29 12l5 17" />
        <path d="M29 12v-6M26.5 20h5" />
        <path d="M44 58c3-7 10-10 18-9 7 1 11 5 11 9" />
        <path d="M58 49c1-5 5-8 10-7" />
      </g>
      <path d="m29 3 2.2 3L29 9l-2.2-3Z" fill="currentColor" />
    </svg>
  );
}

/** Braços de filigrana que saem do medalhão pela borda de cima da faixa. */
export function FiligranaDoMedalhao() {
  const braco = "M124 30c-18 0-26-9-38-11-13-2-20 7-32 7-9 0-12-7-7-10 4-3 9 1 6 5M86 19c-14-8-34-9-54-2M54 26c-8 5-18 6-28 3";
  return (
    <svg className="atributos-cartao__filigrana" viewBox="0 0 248 38" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d={braco} />
        <path d={braco} transform="matrix(-1 0 0 1 248 0)" />
      </g>
      <path d="m24 29 3-3 3 3-3 3ZM218 29l3-3 3 3-3 3Z" fill="currentColor" />
    </svg>
  );
}

function Valor({ tipo, nome, rotulo, edicao }: { tipo: TipoValor; nome: string; rotulo: string; edicao: Edicao }) {
  const path = edicao.caminho(tipo, nome);
  const classe = tipo === "valores" ? "atributos-base" : "atributos-ajuste";
  const nomeAcessivel = `${tipo === "valores" ? "Base" : "Ajuste manual"} de ${rotulo}`;
  if (edicao.editando && edicao.podeEditar(tipo, nome)) {
    const erro = edicao.erroDe(path);
    const limite = tipo === "valores" ? edicao.limiteBase : null;
    return (
      <input
        type="number" step={1} className={`${classe} ${classe}--campo`} aria-label={nomeAcessivel}
        min={limite?.min} max={limite?.max}
        aria-invalid={erro ? true : undefined} aria-describedby={erro ? `erro-${path}` : undefined}
        value={edicao.valorAtual(tipo, nome)}
        onChange={(event) => edicao.alterar(path, event.target.value)}
      />
    );
  }
  const gravado = edicao.gravado(tipo, nome);
  const texto = gravado === null || (tipo === "ajustes" && gravado === 0) ? "—" : tipo === "ajustes" ? comSinal(gravado) : String(gravado);
  return <span className={classe} aria-label={nomeAcessivel}>{texto}</span>;
}

function CartaoDoGrupo({ titulo, nomes, derivados, edicao }: {
  titulo: string; nomes: string[]; derivados: Map<string, ValorDerivadoResumo>; edicao: Edicao;
}) {
  const id = useId();
  const grupo = apresentacaoDoGrupo(titulo);
  return (
    <section className={`atributos-cartao atributos-cartao--${grupo.chave}`} aria-labelledby={id}>
      <span className="atributos-cartao__cantos" aria-hidden="true">
        <CantoDaFolha posicao="se" /><CantoDaFolha posicao="sd" /><CantoDaFolha posicao="ie" /><CantoDaFolha posicao="id" />
      </span>
      <header className="atributos-cartao__faixa">
        <span className="atributos-cartao__cena" aria-hidden="true">
          <PinturaOpcional src={grupo.faixa} className="atributos-cartao__pintura" />
        </span>
        <span className="atributos-cartao__ornatos" aria-hidden="true">
          <VolutaDaFaixa lado="se" /><VolutaDaFaixa lado="sd" /><ArcoDaFaixa lado="ie" /><ArcoDaFaixa lado="id" />
          <FiligranaDoMedalhao />
        </span>
        <span className="atributos-cartao__medalhao" aria-hidden="true">
          <MedalhaoGrupo nome={grupo.chave} />
          <IconeGrupo nome={grupo.chave} tamanho={30} />
        </span>
        <h3 id={id} className="atributos-cartao__titulo">{titulo}</h3>
        {grupo.subtitulo && <p className="atributos-cartao__subtitulo">{grupo.subtitulo}</p>}
      </header>
      <table className="atributos-tabela" aria-labelledby={id}>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Base</th>
            <th scope="col">Ajuste <br />manual</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {nomes.flatMap((nome) => {
            const derivado = derivados.get(chaveDerivada("atributo", nome));
            const rotulo = exibir(derivado?.rotulo || nome);
            const icone = iconeDe(nome);
            const erros = (["valores", "ajustes"] as const)
              .map((tipo) => [edicao.caminho(tipo, nome), edicao.erroDe(edicao.caminho(tipo, nome))] as const)
              .filter(([, erro]) => erro);
            const linha = (
              <tr key={nome} className="atributos-linha">
                <th scope="row">
                  <span className="atributos-linha__nome">
                    <span className="atributos-linha__icone">{icone && <IconeAtributo nome={icone} />}</span>
                    <span>{rotulo}</span>
                  </span>
                </th>
                <td><Valor tipo="valores" nome={nome} rotulo={rotulo} edicao={edicao} /></td>
                <td><Valor tipo="ajustes" nome={nome} rotulo={rotulo} edicao={edicao} /></td>
                <td className="atributos-linha__total">{derivado ? <FontesDoValor valor={derivado} /> : <b className="atributos-total-vazio">—</b>}</td>
              </tr>
            );
            if (!erros.length) return [linha];
            return [linha, (
              <tr key={`${nome}-erro`} className="atributos-linha__erros">
                <td colSpan={4}>
                  {erros.map(([path, erro]) => <small key={path} id={`erro-${path}`} className="field-error" role="alert">{erro}</small>)}
                </td>
              </tr>
            )];
          })}
        </tbody>
      </table>
    </section>
  );
}

/**
 * Aba Atributos da ficha (redesenhar-aba-atributos): folha de pergaminho com cabeçalho ilustrado e um
 * cartão por grupo. Base e ajuste editáveis em lote (mesma regra da tabela de Perícias) e o total do
 * servidor com as fontes.
 */
export function AtributosFicha({ grupos, ficha, valores, permissoes, onSave, aplicarLimites = true }: AtributosFichaProps) {
  const idTitulo = useId();
  const todosGrupos = gruposComExtras("atributo", ficha, grupos);
  const derivados = new Map(valores.filter((v) => v.grupo === "atributo").map((v) => [v.chave, v]));
  const edicao = useEdicaoEmLote({
    categoria: "atributo", ficha, permissoes, onSave, aplicarLimites, nomes: todosGrupos.flatMap((g) => g.nomes),
  });
  const { editando, podeEditarAlgum, aviso, erro, invalidos, exigeAprovacao, alteracoes, pendente } = edicao;
  const vinhetas = grupos.map((g) => apresentacaoDoGrupo(g.titulo)).filter((g) => g.subtitulo);

  return (
    <div className="atributos-conteiner">
      <Pergaminho as="section" className="atributos-folha" aria-labelledby={idTitulo}>
        <span className="atributos-folha__moldura" aria-hidden="true">
          <CantoDaFolha posicao="se" /><CantoDaFolha posicao="sd" /><CantoDaFolha posicao="ie" /><CantoDaFolha posicao="id" />
          <FlorDaBorda lado="esquerda" /><FlorDaBorda lado="direita" />
        </span>

        <header className="atributos-cabecalho">
          <div className="atributos-cabecalho__titulos">
            <p className="atributos-cabecalho__sobretitulo">Base mecânica</p>
            <h2 id={idTitulo} className="atributos-cabecalho__titulo">Atributos</h2>
            <p className="atributos-cabecalho__frase">{FRASE_DA_ABA}</p>
          </div>
          <Vinhetas grupos={vinhetas} />
          <div className="atributos-cabecalho__acoes">
            {podeEditarAlgum && !editando && (
              <button type="button" className="atributos-editar" onClick={edicao.iniciar}>
                <IconePena /><span>Editar valores</span>
              </button>
            )}
          </div>
        </header>

        {aviso && <p role="status" className="atributos-aviso">{aviso}</p>}

        <div className="atributos-cartoes">
          {todosGrupos.map((grupo) => (
            <CartaoDoGrupo key={grupo.titulo} titulo={grupo.titulo} nomes={grupo.nomes} derivados={derivados} edicao={edicao} />
          ))}
        </div>

        {editando && (
          <div className="atributos-acoes">
            {exigeAprovacao && <p className="atributos-aviso">Algumas alterações serão enviadas para aprovação do Narrador.</p>}
            {invalidos && <p className="atributos-aviso">Corrija os valores marcados antes de salvar.</p>}
            {erro && <p role="alert" className="atributos-aviso atributos-aviso--erro">{erro}</p>}
            <button type="button" className="button button--ghost" onClick={edicao.cancelar}>Cancelar</button>
            <button type="button" className="button" disabled={pendente || invalidos || alteracoes.length === 0} onClick={() => void edicao.salvar()}>
              {pendente ? "Salvando…" : `Salvar alterações (${alteracoes.length})`}
            </button>
          </div>
        )}
      </Pergaminho>
    </div>
  );
}
