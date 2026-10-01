import { type FichaContrato, type PermissoesFicha, type ValorDerivadoResumo } from "../types";
import { campoEditavel } from "../fieldPolicy";
import { FontesDoValor } from "./DerivedValueGroup";
import { chaveDerivada } from "./sheetCatalog";
import { gruposComExtras, useEdicaoEmLote, type Alteracao, type Categoria } from "./useEdicaoEmLote";

export type { Alteracao } from "./useEdicaoEmLote";

export interface AttributeTableProps {
  categoria: Categoria;
  titulo: string;
  eyebrow: string;
  grupos: { titulo: string; nomes: string[] }[];
  ficha: FichaContrato;
  valores: ValorDerivadoResumo[];
  permissoes: PermissoesFicha | undefined;
  onSave: (alteracoes: Alteracao[]) => Promise<{ status: "salvo" | "pendente" }>;
  /** Personagens seguem os limites do valor base; NPCs e monstros, não. */
  aplicarLimites?: boolean;
  /** Dentro da moldura da seção, que já traz o título: fica só a ação de editar. */
  semTitulo?: boolean;
}

/**
 * Atributos ou perícias: valor base e ajuste manual editáveis em lote (uma única
 * gravação e um único evento de auditoria) e o total com suas fontes. Nomes
 * oficiais aparecem mesmo quando ainda não existem na ficha; nomes extras da
 * ficha são preservados em "Outros".
 */
export function AttributeTable({ categoria, titulo, eyebrow, grupos, ficha, valores, permissoes, onSave, aplicarLimites = true, semTitulo = false }: AttributeTableProps) {
  const todosGrupos = gruposComExtras(categoria, ficha, grupos);
  const derivados = new Map(valores.filter((v) => v.grupo === categoria).map((v) => [v.chave, v]));
  const {
    limiteBase, caminho, podeEditarAlgum, valorAtual, alteracoes, erroDe, invalidos, exigeAprovacao,
    editando, pendente, erro, aviso, iniciar, cancelar, alterar, salvar,
  } = useEdicaoEmLote({ categoria, ficha, permissoes, onSave, aplicarLimites, nomes: todosGrupos.flatMap((g) => g.nomes) });

  return (
    <section className="panel" aria-label={titulo}>
      <div className="section-heading">
        {semTitulo ? <div /> : <div><span className="eyebrow">{eyebrow}</span><h2>{titulo}</h2></div>}
        {podeEditarAlgum && !editando && (
          <button type="button" className="button button--secondary" onClick={iniciar}>Editar valores</button>
        )}
      </div>
      {aviso && <p role="status" className="preview-note">{aviso}</p>}
      <div className="attribute-table__grupos">
        {todosGrupos.map((grupo) => (
          <div key={grupo.titulo} className="attribute-table__wrap">
            <table className="attribute-table">
              <caption>{grupo.titulo}</caption>
              <thead>
                <tr><th scope="col">Nome</th><th scope="col">Base</th><th scope="col">Ajuste manual</th><th scope="col">Total</th></tr>
              </thead>
              <tbody>
                {grupo.nomes.map((nome) => {
                  const derivado = derivados.get(chaveDerivada(categoria, nome));
                  return (
                    <tr key={nome}>
                      <th scope="row">{nome}</th>
                      {(["valores", "ajustes"] as const).map((tipo) => {
                        const path = caminho(tipo, nome);
                        const rotulo = `${tipo === "valores" ? "Base" : "Ajuste manual"} de ${nome}`;
                        return (
                          <td key={tipo}>
                            {editando && campoEditavel(path, permissoes) ? (
                              <>
                                <input
                                  type="number" step={1} aria-label={rotulo} className="attribute-table__input"
                                  min={tipo === "valores" ? limiteBase?.min : undefined}
                                  max={tipo === "valores" ? limiteBase?.max : undefined}
                                  aria-invalid={erroDe(path) ? true : undefined}
                                  aria-describedby={erroDe(path) ? `erro-${path}` : undefined}
                                  value={valorAtual(tipo, nome)}
                                  onChange={(event) => alterar(path, event.target.value)}
                                />
                                {erroDe(path) && <small id={`erro-${path}`} className="field-error" role="alert">{erroDe(path)}</small>}
                              </>
                            ) : (
                              <span aria-label={rotulo}>{valorAtual(tipo, nome) || "—"}</span>
                            )}
                          </td>
                        );
                      })}
                      <td>{derivado ? <FontesDoValor valor={derivado} /> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {editando && (
        <div className="attribute-table__actions">
          {exigeAprovacao && <p className="preview-note">Algumas alterações serão enviadas para aprovação do Narrador.</p>}
          {invalidos && <p className="preview-note">Corrija os valores marcados antes de salvar.</p>}
          {erro && <p role="alert">{erro}</p>}
          <button type="button" className="button button--ghost" onClick={cancelar}>Cancelar</button>
          <button type="button" className="button" disabled={pendente || invalidos || alteracoes.length === 0} onClick={() => void salvar()}>
            {pendente ? "Salvando…" : `Salvar alterações (${alteracoes.length})`}
          </button>
        </div>
      )}
    </section>
  );
}
