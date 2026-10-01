import type { components } from "../../api/generated/schema";
import type { Subtipo } from "./gridEngine";

/** Formato do item na grade, definido na criação (carga-por-espacos 5.2). */
// O cliente gerado marca como obrigatório todo campo com padrão; aqui `versatil` e `raridade` ficam opcionais
// (sem raridade, o servidor grava Comum).
export type FormatoItem = Omit<components["schemas"]["FormatoItemGrade"], "versatil" | "raridade">
  & { versatil?: boolean; raridade?: string };
export type SubtipoCriavel = Exclude<Subtipo, "moedas" | "criatura">;

/**
 * A fila "O que é?" (simplificar-criacao-de-cartas, D8): um ícone por subtipo, na ordem do conceito aprovado.
 * Botões de opção nativos: as setas trocam a escolha, e o nome de cada um fica no rótulo acessível.
 */
export const SUBTIPOS_EM_FILA: Array<[SubtipoCriavel, string]> = [
  ["uma_mao", "Uma mão"], ["duas_maos", "Duas mãos"], ["peitoral", "Peitoral"], ["escudo", "Escudo"],
  ["capacete", "Capacete"], ["luvas", "Luvas"], ["botas", "Botas"], ["mochila", "Mochila"], ["aljava", "Aljava"],
  ["outro", "Outros (não se equipa, mas ocupa espaço)"],
];

/** O formato de um subtipo novo: a sugestão de dimensão, com o ícone, a raridade e a categoria preservados. */
export function formatoDoSubtipo(subtipo: SubtipoCriavel, anterior: FormatoItem | null | undefined): FormatoItem {
  return {
    ...SUGESTAO[subtipo],
    ...(anterior?.icone_grade ? { icone_grade: anterior.icone_grade } : {}),
    ...(anterior?.raridade ? { raridade: anterior.raridade } : {}),
    ...(subtipo === "outro" && anterior?.categoria ? { categoria: anterior.categoria } : {}),
  };
}

/** Dimensões de referência aprovadas na calibração (docs/regras/calibracao-carga-em-grade.md); o Narrador ajusta à vontade. */
const SUGESTAO: Record<SubtipoCriavel, FormatoItem> = {
  peitoral: { subtipo: "peitoral", largura: 2, altura: 3 },
  capacete: { subtipo: "capacete", largura: 1, altura: 1 },
  luvas: { subtipo: "luvas", largura: 1, altura: 1 },
  botas: { subtipo: "botas", largura: 1, altura: 2 },
  uma_mao: { subtipo: "uma_mao", largura: 1, altura: 3 },
  duas_maos: { subtipo: "duas_maos", largura: 1, altura: 4 },
  escudo: { subtipo: "escudo", largura: 2, altura: 2 },
  mochila: { subtipo: "mochila", largura: 2, altura: 2, mochila: { linhas: 1, colunas: 0, requisito_forca: 2 } },
  aljava: { subtipo: "aljava", largura: 1, altura: 2, aljava: { capacidade_flechas: 20 } },
  outro: { subtipo: "outro", largura: 1, altura: 1, maos: 0, pilha_max: 1 },
};

