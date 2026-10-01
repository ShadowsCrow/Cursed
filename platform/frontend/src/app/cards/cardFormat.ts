import type { CardCost } from "../../ui/Display";
import type { CatalogoItens } from "../characters/sheet/catalogoApi";
import { categoriaDoItem } from "../inventory/filtro";
import type { TipoCarta } from "./types";

type Conteudo = Record<string, unknown>;

export const EMBLEMA: Record<TipoCarta, string> = { habilidade: "✦", magia: "✧", item: "⚔", efeito: "◈" };
/** Custo de Aprendizado e Descansos Mínimos são só do Narrador (redesenhar-aba-cartas, D2). */
const CUSTOS_DO_NARRADOR: [string, string][] = [
  ["custo_aprendizado", "Custo de aprendizado"],
  ["descansos_minimos", "Descansos mínimos"],
];
const CUSTOS_DE_USO: [string, string][] = [
  ["potencia_uso", "Potência de uso"],
  ["custo_uso", "Custo de uso"],
];

export function texto(valor: unknown, padrao = ""): string {
  return typeof valor === "string" && valor.trim() ? valor : padrao;
}

/**
 * Custos exibidos separadamente; ausentes aparecem como "Não definido", nunca como zero. O papel decide
 * quais aparecem, e não a presença da chave: para o jogador, os dois custos do Narrador nem entram.
 */
export function custosDaCarta(tipo: TipoCarta, conteudo: Conteudo, { narrador = false }: { narrador?: boolean } = {}): CardCost[] {
  if (tipo !== "habilidade" && tipo !== "magia") return [];
  const custos = [...(narrador ? CUSTOS_DO_NARRADOR : []), ...CUSTOS_DE_USO].map(([campo, label]) => {
    const valor = conteudo[campo];
    return { label, value: typeof valor === "number" ? String(valor) : "Não definido" };
  });
  const adicionais = Array.isArray(conteudo.custos_adicionais) ? conteudo.custos_adicionais : [];
  for (const adicional of adicionais as Conteudo[]) {
    const valor = typeof adicional.valor === "number" ? String(adicional.valor) : "Não definido";
    custos.push({ label: texto(adicional.recurso, "Custo adicional"), value: valor });
  }
  return custos;
}

export function metaDaCarta(tipo: TipoCarta, conteudo: Conteudo, numero?: number): string {
  const partes: string[] = [];
  if (tipo === "magia") {
    if (texto(conteudo.escola)) partes.push(texto(conteudo.escola));
    if (typeof conteudo.grau === "number") partes.push(`Grau ${conteudo.grau}`);
  }
  if (tipo === "item" && texto(conteudo.item_tipo)) partes.push(texto(conteudo.item_tipo));
  if (tipo === "efeito" && typeof conteudo.duracao_rodadas === "number") partes.push(`${conteudo.duracao_rodadas} rodada(s)`);
  const tags = Array.isArray(conteudo.tags) ? (conteudo.tags as unknown[]).filter((t): t is string => typeof t === "string") : [];
  partes.push(...tags);
  if (numero !== undefined) partes.push(`versão ${numero}`);
  return partes.join(" · ");
}

/** Campo vazio vira `null`: um custo não informado continua indefinido, nunca zero. */
export function inteiroOuNulo(entrada: string): number | null {
  const limpo = entrada.trim();
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isInteger(numero) ? numero : null;
}

/** Categoria do filtro de tipo: a mesma regra da aba Cartas da ficha (habilidades, magias, efeitos ou a categoria do item). */
export function categoriaDoConteudo(tipo: TipoCarta, conteudo: Conteudo, catalogo: CatalogoItens | undefined): string {
  if (tipo === "habilidade") return "habilidades";
  if (tipo === "magia") return "magias";
  if (tipo === "efeito") return "efeitos";
  const formato = (conteudo.formato ?? {}) as Conteudo;
  const item = {
    id: "", nome: texto(conteudo.titulo), tipo: texto(conteudo.item_tipo) || null,
    subtipo: texto(formato.subtipo) || null, categoria: texto(formato.categoria) || null,
  };
  return catalogo ? categoriaDoItem(item, catalogo) : "diversos";
}
