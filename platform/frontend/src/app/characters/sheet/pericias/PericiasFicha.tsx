import { useId } from "react";

import { Pergaminho } from "../../../../ui/Tema";
import { exibir } from "../../creation/modelo";
import type { FichaContrato, PermissoesFicha, ValorDerivadoResumo } from "../../types";
import { ArcoDaFaixa, FiligranaDoMedalhao, PinturaOpcional, VolutaDaFaixa } from "../atributos/AtributosFicha";
import { IconeGrupo, IconePena, MedalhaoGrupo } from "../atributos/icones";
import { FontesDoValor } from "../DerivedValueGroup";
import { CantoDaFolha, FlorDaBorda, RosaDosVentos } from "../resumo/ornamentos";
import { chaveDerivada } from "../sheetCatalog";
import { gruposComExtras, useEdicaoEmLote, type Alteracao, type TipoValor } from "../useEdicaoEmLote";
import { apresentacaoDoGrupo, CENA_DO_CABECALHO, FRASE_DA_ABA, iconeDaPericia, maioresBases } from "./apresentacao";
import { IconePericia, IconeTecnicas } from "./icones";
import "../atributos/atributos.css";
import "./pericias.css";

/*
 * Aba Perícias (redesenhar-aba-pericias). O cartão é o mesmo da aba Atributos (classes `atributos-*`, a
 * faixa com volutas e o medalhão), para as duas abas ficarem iguais; `pericias.css` só ajusta a densidade
 * das dez linhas, a base em número simples com o selo da maior base e a paisagem do cabeçalho.
 */

export interface PericiasFichaProps {
  grupos: { titulo: string; nomes: string[] }[];
  ficha: FichaContrato;
  valores: ValorDerivadoResumo[];
  permissoes: PermissoesFicha | undefined;
  onSave: (alteracoes: Alteracao[]) => Promise<{ status: "salvo" | "pendente" }>;
  /** Personagens seguem os limites do valor base; NPCs e monstros, não. */
  aplicarLimites?: boolean;
}

type Edicao = ReturnType<typeof useEdicaoEmLote>;

/** Ajuste gravado: "—" sem ajuste; "3" ou "−1", como na referência. */
function textoDoAjuste(valor: number | null): string {
  if (valor === null || valor === 0) return "—";
  return valor < 0 ? `−${Math.abs(valor)}` : String(valor);
}

function Valor({ tipo, nome, rotulo, edicao, selo }: { tipo: TipoValor; nome: string; rotulo: string; edicao: Edicao; selo: boolean }) {
  const path = edicao.caminho(tipo, nome);
  const nomeAcessivel = `${tipo === "valores" ? "Base" : "Ajuste manual"} de ${rotulo}`;
  if (edicao.editando && edicao.podeEditar(tipo, nome)) {
    const erro = edicao.erroDe(path);
    const limite = tipo === "valores" ? edicao.limiteBase : null;
    return (
      <input
        type="number" step={1} className={`pericias-campo pericias-campo--${tipo === "valores" ? "base" : "ajuste"}`}
        aria-label={nomeAcessivel} min={limite?.min} max={limite?.max}
        aria-invalid={erro ? true : undefined} aria-describedby={erro ? `erro-${path}` : undefined}
        value={edicao.valorAtual(tipo, nome)}
        onChange={(event) => edicao.alterar(path, event.target.value)}
      />
    );
  }
  const gravado = edicao.gravado(tipo, nome);
  if (tipo === "ajustes") return <span className="atributos-ajuste pericias-ajuste" aria-label={nomeAcessivel}>{textoDoAjuste(gravado)}</span>;
  // Perícia sem valor gravado vale 0: "as Perícias não escolhidas durante a criação começam com valor 0".
  const base = gravado ?? 0;
  return selo
    ? <span className="atributos-base pericias-base pericias-base--selo" aria-label={`${nomeAcessivel}, maior base`}>{base}</span>
    : <span className="pericias-base" aria-label={nomeAcessivel}>{base}</span>;
}

function SimboloDoGrupo({ simbolo }: { simbolo: ReturnType<typeof apresentacaoDoGrupo>["simbolo"] }) {
  return simbolo === "tecnicas" ? <IconeTecnicas tamanho={30} /> : <IconeGrupo nome={simbolo} tamanho={30} />;
}

function CartaoDoGrupo({ titulo, nomes, derivados, edicao, destaques }: {
  titulo: string; nomes: string[]; derivados: Map<string, ValorDerivadoResumo>; edicao: Edicao; destaques: Set<string>;
}) {
  const id = useId();
  const grupo = apresentacaoDoGrupo(titulo);
  return (
    <section className={`atributos-cartao pericias-cartao pericias-cartao--${grupo.chave}`} aria-labelledby={id}>
      <span className="atributos-cartao__cantos" aria-hidden="true">
        <CantoDaFolha posicao="se" /><CantoDaFolha posicao="sd" /><CantoDaFolha posicao="ie" /><CantoDaFolha posicao="id" />
      </span>
      <header className="atributos-cartao__faixa">
        <span className="atributos-cartao__cena" aria-hidden="true">
          <PinturaOpcional src={grupo.estandarte} className="atributos-cartao__pintura" />
        </span>
        <span className="atributos-cartao__ornatos" aria-hidden="true">
          <VolutaDaFaixa lado="se" /><VolutaDaFaixa lado="sd" /><ArcoDaFaixa lado="ie" /><ArcoDaFaixa lado="id" />
          <FiligranaDoMedalhao />
        </span>
        <span className="atributos-cartao__medalhao" aria-hidden="true">
          <MedalhaoGrupo nome={grupo.simbolo === "tecnicas" ? "sociais" : grupo.simbolo} />
          <SimboloDoGrupo simbolo={grupo.simbolo} />
        </span>
        <h3 id={id} className="atributos-cartao__titulo">{titulo}</h3>
        {grupo.lema && <p className="atributos-cartao__subtitulo">{grupo.lema}</p>}
      </header>
      <table className="atributos-tabela pericias-tabela" aria-labelledby={id}>
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
            const derivado = derivados.get(chaveDerivada("pericia", nome));
            const rotulo = exibir(derivado?.rotulo || nome);
            const icone = iconeDaPericia(nome);
            const erros = (["valores", "ajustes"] as const)
              .map((tipo) => [edicao.caminho(tipo, nome), edicao.erroDe(edicao.caminho(tipo, nome))] as const)
              .filter(([, erro]) => erro);
            const linha = (
              <tr key={nome} className="atributos-linha pericias-linha">
                <th scope="row">
                  <span className={`atributos-linha__nome pericias-linha__nome${rotulo.length > 15 ? " pericias-linha__nome--longo" : ""}`}>
                    <span className="pericias-linha__icone">{icone && <IconePericia nome={icone} />}</span>
                    <span>{rotulo}</span>
                  </span>
                </th>
                <td><Valor tipo="valores" nome={nome} rotulo={rotulo} edicao={edicao} selo={destaques.has(nome)} /></td>
                <td><Valor tipo="ajustes" nome={nome} rotulo={rotulo} edicao={edicao} selo={false} /></td>
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

/** Paisagem em sépia do cabeçalho; sem ela, duas rosas dos ventos desbotadas. */
function Cena() {
  return (
    <div className="pericias-cena" aria-hidden="true">
      <PinturaOpcional src={CENA_DO_CABECALHO} className="pericias-cena__pintura" reserva={(
        <span className="pericias-cena__reserva"><RosaDosVentos tamanho={120} /><RosaDosVentos tamanho={96} /></span>
      )} />
    </div>
  );
}

/**
 * Aba Perícias da ficha (redesenhar-aba-perícias): folha de pergaminho com a paisagem no cabeçalho e um
 * cartão por grupo. Base e ajuste editáveis em lote (mesma regra da aba Atributos), o total do servidor
 * com as fontes e o selo na maior base.
 */
export function PericiasFicha({ grupos, ficha, valores, permissoes, onSave, aplicarLimites = true }: PericiasFichaProps) {
  const idTitulo = useId();
  const todosGrupos = gruposComExtras("pericia", ficha, grupos);
  const todosNomes = todosGrupos.flatMap((g) => g.nomes);
  const derivados = new Map(valores.filter((v) => v.grupo === "pericia").map((v) => [v.chave, v]));
  const edicao = useEdicaoEmLote({ categoria: "pericia", ficha, permissoes, onSave, aplicarLimites, nomes: todosNomes });
  const { editando, podeEditarAlgum, aviso, erro, invalidos, exigeAprovacao, alteracoes, pendente } = edicao;
  const destaques = maioresBases(todosNomes.map((nome) => [nome, edicao.gravado("valores", nome)]));

  return (
    <div className="atributos-conteiner pericias-conteiner">
      <Pergaminho as="section" className="atributos-folha pericias-folha" aria-labelledby={idTitulo}>
        <span className="atributos-folha__moldura" aria-hidden="true">
          <CantoDaFolha posicao="se" /><CantoDaFolha posicao="sd" /><CantoDaFolha posicao="ie" /><CantoDaFolha posicao="id" />
          <FlorDaBorda lado="esquerda" /><FlorDaBorda lado="direita" />
        </span>

        <header className="atributos-cabecalho pericias-cabecalho">
          <div className="atributos-cabecalho__titulos">
            <p className="atributos-cabecalho__sobretitulo">Especialidades</p>
            <h2 id={idTitulo} className="atributos-cabecalho__titulo">Perícias</h2>
            <p className="atributos-cabecalho__frase">{FRASE_DA_ABA}</p>
          </div>
          <Cena />
          <div className="atributos-cabecalho__acoes">
            {podeEditarAlgum && !editando && (
              <button type="button" className="atributos-editar" onClick={edicao.iniciar}>
                <IconePena /><span>Editar valores</span>
              </button>
            )}
          </div>
        </header>

        {aviso && <p role="status" className="atributos-aviso">{aviso}</p>}

        <div className="atributos-cartoes pericias-cartoes">
          {todosGrupos.map((grupo) => (
            <CartaoDoGrupo key={grupo.titulo} titulo={grupo.titulo} nomes={grupo.nomes} derivados={derivados} edicao={edicao} destaques={destaques} />
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
