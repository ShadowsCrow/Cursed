import type { CardCost } from "../../ui/Display";
import type { TipoCarta } from "./types";

type Conteudo = Record<string, unknown>;

export const EMBLEMA: Record<TipoCarta, string> = { habilidade: "✦", magia: "✧", item: "⚔", efeito: "◈" };
const CUSTOS: [string, string][] = [
  ["custo_aprendizado", "Custo de Aprendizado"],
  ["descansos_minimos", "Descansos Mínimos"],
  ["potencia_uso", "Potência de Uso"],
  ["custo_uso", "Custo de Uso"],
];

export function texto(valor: unknown, padrao = ""): string {
  return typeof valor === "string" && valor.trim() ? valor : padrao;
}

/** Custos exibidos separadamente; ausentes aparecem como "Não definido", nunca como zero. */
export function custosDaCarta(tipo: TipoCarta, conteudo: Conteudo): CardCost[] {
  if (tipo !== "habilidade" && tipo !== "magia") return [];
  const custos = CUSTOS.map(([campo, label]) => {
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
