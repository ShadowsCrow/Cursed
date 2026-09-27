import { useState } from "react";

import { asRecord, type FichaContrato, type PermissoesFicha, type ValorDerivadoResumo } from "../types";
import { campoEditavel, campoExigeAprovacao } from "../fieldPolicy";
import { FontesDoValor } from "./DerivedValueGroup";
import { chaveDerivada } from "./sheetCatalog";

type Categoria = "atributo" | "pericia";
export interface Alteracao { path: string; value: number }

/** Limites do valor base (Criação de Personagem e Progressão e Proficiência); o ajuste não tem limite. */
const LIMITES_BASE: Record<Categoria, { min: number; max: number }> = {
  atributo: { min: 1, max: 5 },
  pericia: { min: 0, max: 5 },
};

function erroDoValor(texto: string, limite: { min: number; max: number } | null): string | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const valor = Number(limpo);
  if (!Number.isInteger(valor)) return "Use um número inteiro.";
  if (limite && (valor < limite.min || valor > limite.max)) {
    return valor > limite.max
      ? `Vai de ${limite.min} a ${limite.max}; acima disso, use o ajuste.`
      : `Vai de ${limite.min} a ${limite.max}.`;
  }
  return null;
}

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

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
}

/**
 * Atributos ou perícias: valor base e ajuste manual editáveis em lote (uma única
 * gravação e um único evento de auditoria) e o total com suas fontes. Nomes
 * oficiais aparecem mesmo quando ainda não existem na ficha; nomes extras da
 * ficha são preservados em "Outros".
 */
export function AttributeTable({ categoria, titulo, eyebrow, grupos, ficha, valores, permissoes, onSave, aplicarLimites = true }: AttributeTableProps) {
  const limiteBase = aplicarLimites ? LIMITES_BASE[categoria] : null;
  const secao = categoria === "atributo" ? "atributos" : "pericias";
  const dados = asRecord(asRecord(ficha)[secao]);
  const base = asRecord(dados.valores);
  const ajustes = asRecord(dados.ajustes);
  const oficiais = new Set(grupos.flatMap((g) => g.nomes));
  const extras = [...new Set([...Object.keys(base), ...Object.keys(ajustes)])].filter((n) => !oficiais.has(n)).sort();
  const todosGrupos = extras.length ? [...grupos, { titulo: "Outros registrados na ficha", nomes: extras }] : grupos;
  const derivados = new Map(valores.filter((v) => v.grupo === categoria).map((v) => [v.chave, v]));

  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const caminho = (tipo: "valores" | "ajustes", nome: string) => `${secao}.${tipo}.${nome}`;
  const podeEditarAlgum = todosGrupos.some((g) => g.nomes.some((n) =>
    campoEditavel(caminho("valores", n), permissoes) || campoEditavel(caminho("ajustes", n), permissoes)));

  function valorAtual(tipo: "valores" | "ajustes", nome: string): string {
    const chave = caminho(tipo, nome);
    if (chave in rascunho) return rascunho[chave] ?? "";
    const atual = numero((tipo === "valores" ? base : ajustes)[nome]);
    return atual === null ? "" : String(atual);
  }

  const alteracoes: Alteracao[] = Object.entries(rascunho).flatMap(([path, texto]) => {
    const [, tipo, ...resto] = path.split(".");
    const nome = resto.join(".");
    const anterior = numero((tipo === "valores" ? base : ajustes)[nome]);
    const limpo = texto.trim();
    if (!limpo) return [];
    const novo = Number(limpo);
    return Number.isInteger(novo) && novo !== anterior ? [{ path, value: novo }] : [];
  });
  const erroDe = (path: string): string | null =>
    path in rascunho ? erroDoValor(rascunho[path] ?? "", path.split(".")[1] === "valores" ? limiteBase : null) : null;
  const invalidos = Object.keys(rascunho).some((path) => erroDe(path) !== null);
  const exigeAprovacao = alteracoes.some((a) => permissoes && campoExigeAprovacao(a.path, permissoes));

  async function salvar() {
    setPendente(true);
    setErro(null);
    try {
      const resultado = await onSave(alteracoes);
      setAviso(resultado.status === "pendente" ? "Alterações enviadas para aprovação do Narrador." : "Alterações salvas.");
      setRascunho({});
      setEditando(false);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível salvar as alterações.");
    } finally {
      setPendente(false);
    }
  }

  return (
    <section className="panel" aria-label={titulo}>
      <div className="section-heading">
        <div><span className="eyebrow">{eyebrow}</span><h2>{titulo}</h2></div>
        {podeEditarAlgum && !editando && (
          <button type="button" className="button button--secondary" onClick={() => { setEditando(true); setAviso(null); }}>Editar valores</button>
        )}
      </div>
      {aviso && <p role="status" className="preview-note">{aviso}</p>}
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
                                onChange={(event) => setRascunho((atual) => ({ ...atual, [path]: event.target.value }))}
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
      {editando && (
        <div className="attribute-table__actions">
          {exigeAprovacao && <p className="preview-note">Algumas alterações serão enviadas para aprovação do Narrador.</p>}
          {invalidos && <p className="preview-note">Corrija os valores marcados antes de salvar.</p>}
          {erro && <p role="alert">{erro}</p>}
          <button type="button" className="button button--ghost" onClick={() => { setRascunho({}); setEditando(false); setErro(null); }}>Cancelar</button>
          <button type="button" className="button" disabled={pendente || invalidos || alteracoes.length === 0} onClick={() => void salvar()}>
            {pendente ? "Salvando…" : `Salvar alterações (${alteracoes.length})`}
          </button>
        </div>
      )}
    </section>
  );
}
