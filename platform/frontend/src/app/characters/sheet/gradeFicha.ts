import type { ItemGrade, ParametrosGrade, Subtipo, Tamanho } from "../../inventory/gridEngine";
import type { GradeInventario, ItemInventarioResumo } from "../types";

export function paraGrade(item: ItemInventarioResumo): ItemGrade {
  const dados = item.dados ?? {};
  const ampliacao = dados.ampliacao as { linhas?: number; colunas?: number } | undefined;
  return {
    id: item.id,
    nome: item.nome,
    subtipo: (item.subtipo ?? "outro") as Subtipo,
    largura: item.largura ?? 1,
    altura: item.altura ?? 1,
    coluna: item.coluna ?? null,
    linha: item.linha ?? null,
    girado: item.girado,
    equipado: item.equipado,
    ...(item.maos != null ? { maos: item.maos as 0 | 1 | 2 } : {}),
    ...(dados.versatil === true ? { versatil: true } : {}),
    ...(typeof dados.requisito_forca === "number" ? { requisitoForca: dados.requisito_forca } : {}),
    ...(ampliacao ? { ampliacao: { linhas: ampliacao.linhas ?? 0, colunas: ampliacao.colunas ?? 0 } } : {}),
  };
}

export const temFormato = (item: ItemInventarioResumo) => item.subtipo != null && item.largura != null;

/** Parâmetros do motor a partir da grade do servidor; a ampliação da mochila sai do item equipado. */
export function parametrosDaGrade(grade: GradeInventario): ParametrosGrade {
  return {
    forca: grade.forca,
    tamanho: grade.tamanho as Tamanho,
    ampliacoes: (grade.ampliacoes ?? []).filter((a) => a.fonte !== "mochila"),
  };
}
