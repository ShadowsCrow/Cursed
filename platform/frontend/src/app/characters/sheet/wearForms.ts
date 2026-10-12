import type { ColapsoMentalEntrada, ConsequenciaEntrada, ConsequenciaResumo } from "./sheetApi";

/** Rótulos e regras de preenchimento dos formulários de desgaste e consequências. */

export type Trilha = "exaustao" | "estresse";
export type Categoria = ConsequenciaEntrada["categoria"];

export const ROTULO_TRILHA: Record<Trilha, string> = { exaustao: "Exaustão", estresse: "Estresse" };
export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  trauma: "Trauma", ferimento_grave: "Ferimento Grave", sequela: "Sequela", aflicao: "Aflição", outro: "Outra Consequência",
};

export interface ConsequenciaForm {
  categoria: Categoria;
  nome: string;
  descricao: string;
  efeito: string;
  gatilho: string;
  tratamentoRegra: string;
  origem: string;
}

export function consequenciaVazia(categoria: Categoria): ConsequenciaForm {
  return { categoria, nome: "", descricao: "", efeito: "", gatilho: "", tratamentoRegra: "", origem: "" };
}

/** Campos mínimos das regras: nome, descrição, efeito, regra de tratamento e, no Trauma, o gatilho. */
export function consequenciaValida(form: ConsequenciaForm): boolean {
  const preenchido = (texto: string) => texto.trim() !== "";
  return preenchido(form.nome) && preenchido(form.descricao) && preenchido(form.efeito) && preenchido(form.tratamentoRegra)
    && (form.categoria !== "trauma" || preenchido(form.gatilho));
}

export function consequenciaEntrada(form: ConsequenciaForm): ConsequenciaEntrada {
  return {
    categoria: form.categoria, nome: form.nome.trim(), descricao: form.descricao.trim(), efeito: form.efeito.trim(),
    gatilho: form.gatilho.trim() || null, tratamento_regra: form.tratamentoRegra.trim(),
    origem: form.origem.trim() ? { tipo: "mestre", nome: form.origem.trim() } : null,
  };
}

export interface ColapsoForm {
  manifestacao: string;
  outra: string;
  modo: "novo" | "existente";
  traumaId: string;
  trauma: ConsequenciaForm;
}

export function colapsoInicial(traumas: ConsequenciaResumo[]): ColapsoForm {
  return { manifestacao: "", outra: "", modo: "novo", traumaId: traumas[0]?.id ?? "", trauma: consequenciaVazia("trauma") };
}

function manifestacaoDe(form: ColapsoForm): string {
  return (form.manifestacao === "outra" ? form.outra : form.manifestacao).trim();
}

export function colapsoValido(form: ColapsoForm): boolean {
  if (!manifestacaoDe(form)) return false;
  return form.modo === "existente" ? Boolean(form.traumaId) : consequenciaValida(form.trauma);
}

export function colapsoEntrada(form: ColapsoForm): ColapsoMentalEntrada {
  return form.modo === "existente"
    ? { manifestacao: manifestacaoDe(form), trauma_id: form.traumaId, trauma: null }
    : { manifestacao: manifestacaoDe(form), trauma_id: null, trauma: consequenciaEntrada(form.trauma) };
}
