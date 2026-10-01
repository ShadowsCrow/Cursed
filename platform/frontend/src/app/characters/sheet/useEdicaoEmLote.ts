import { useState } from "react";

import { asRecord, type FichaContrato, type PermissoesFicha } from "../types";
import { campoEditavel, campoExigeAprovacao } from "../fieldPolicy";

export type Categoria = "atributo" | "pericia";
export type TipoValor = "valores" | "ajustes";
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

export function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

/**
 * Edição em lote de atributos ou perícias (base e ajuste manual): rascunho por caminho, limites da
 * base, aviso de aprovação do Narrador e uma única gravação. Compartilhada pela tabela de Perícias
 * e pela aba Atributos, para as duas seguirem a mesma regra.
 */
export function useEdicaoEmLote({ categoria, ficha, permissoes, onSave, aplicarLimites = true, nomes }: {
  categoria: Categoria;
  ficha: FichaContrato;
  permissoes: PermissoesFicha | undefined;
  onSave: (alteracoes: Alteracao[]) => Promise<{ status: "salvo" | "pendente" }>;
  /** Personagens seguem os limites do valor base; NPCs e monstros, não. */
  aplicarLimites?: boolean;
  /** Todos os nomes exibidos (oficiais e extras), para saber se há algo editável. */
  nomes: string[];
}) {
  const limiteBase = aplicarLimites ? LIMITES_BASE[categoria] : null;
  const secao = categoria === "atributo" ? "atributos" : "pericias";
  const dados = asRecord(asRecord(ficha)[secao]);
  const base = asRecord(dados.valores);
  const ajustes = asRecord(dados.ajustes);

  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const caminho = (tipo: TipoValor, nome: string) => `${secao}.${tipo}.${nome}`;
  const gravado = (tipo: TipoValor, nome: string) => numero((tipo === "valores" ? base : ajustes)[nome]);
  const podeEditar = (tipo: TipoValor, nome: string) => campoEditavel(caminho(tipo, nome), permissoes);
  const podeEditarAlgum = nomes.some((n) => podeEditar("valores", n) || podeEditar("ajustes", n));

  function valorAtual(tipo: TipoValor, nome: string): string {
    const chave = caminho(tipo, nome);
    if (chave in rascunho) return rascunho[chave] ?? "";
    const atual = gravado(tipo, nome);
    return atual === null ? "" : String(atual);
  }

  const alteracoes: Alteracao[] = Object.entries(rascunho).flatMap(([path, texto]) => {
    const [, tipo, ...resto] = path.split(".");
    const anterior = gravado(tipo as TipoValor, resto.join("."));
    const limpo = texto.trim();
    if (!limpo) return [];
    const novo = Number(limpo);
    return Number.isInteger(novo) && novo !== anterior ? [{ path, value: novo }] : [];
  });
  const erroDe = (path: string): string | null =>
    path in rascunho ? erroDoValor(rascunho[path] ?? "", path.split(".")[1] === "valores" ? limiteBase : null) : null;
  const invalidos = Object.keys(rascunho).some((path) => erroDe(path) !== null);
  const exigeAprovacao = alteracoes.some((a) => permissoes && campoExigeAprovacao(a.path, permissoes));

  function iniciar() { setEditando(true); setAviso(null); }
  function cancelar() { setRascunho({}); setEditando(false); setErro(null); }
  function alterar(path: string, texto: string) { setRascunho((atual) => ({ ...atual, [path]: texto })); }

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

  return {
    limiteBase, caminho, gravado, podeEditar, podeEditarAlgum, valorAtual, alteracoes, erroDe, invalidos, exigeAprovacao,
    editando, pendente, erro, aviso, iniciar, cancelar, alterar, salvar,
  };
}

/** Nomes oficiais na ordem do catálogo e, depois, os nomes extras gravados na ficha (em ordem alfabética). */
export function gruposComExtras(categoria: Categoria, ficha: FichaContrato, grupos: { titulo: string; nomes: string[] }[]) {
  const dados = asRecord(asRecord(ficha)[categoria === "atributo" ? "atributos" : "pericias"]);
  const oficiais = new Set(grupos.flatMap((g) => g.nomes));
  const extras = [...new Set([...Object.keys(asRecord(dados.valores)), ...Object.keys(asRecord(dados.ajustes))])]
    .filter((n) => !oficiais.has(n)).sort();
  return extras.length ? [...grupos, { titulo: TITULO_OUTROS, nomes: extras }] : grupos;
}

export const TITULO_OUTROS = "Outros registrados na ficha";
