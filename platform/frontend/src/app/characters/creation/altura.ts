import type { components } from "../../../api/generated/schema";
import type { RacaCatalogo } from "../sheet/catalogoApi";
import { chaveCatalogo } from "../sheet/catalogoApi";

/**
 * Altura e Tamanho fora da média (design D12). Intervalos por raça e faixas por Tamanho vêm dos
 * dados do sistema; aqui só se escolhe qual deles vale. O servidor valida de novo ao criar.
 */

export type ForaDaMedia = "" | "acima" | "abaixo";
export type FaixaAltura = components["schemas"]["FaixaAlturaResumo"];

export interface IntervaloAplicavel {
  tamanho: string;
  minima: number;
  maxima: number | null;
  foraDaMedia: boolean;
}

export function formatarMetros(valor: number): string {
  return `${valor.toFixed(2).replace(".", ",")} m`;
}

export function textoIntervalo({ minima, maxima }: { minima: number; maxima?: number | null }): string {
  return maxima == null ? `acima de ${formatarMetros(minima)}` : `de ${formatarMetros(minima)} a ${formatarMetros(maxima)}`;
}

/** Altura digitada em metros, com vírgula ou ponto. */
export function lerAltura(texto: string): { vazia: true } | { vazia: false; valor: number | null } {
  const limpo = texto.trim().replace(/\s*m$/i, "");
  if (!limpo) return { vazia: true };
  const numero = /^\d+([.,]\d+)?$/.test(limpo) ? Number(limpo.replace(",", ".")) : NaN;
  return { vazia: false, valor: Number.isFinite(numero) && numero > 0 ? numero : null };
}

function indiceDoTamanho(faixas: FaixaAltura[], tamanho: string | null | undefined): number {
  return faixas.findIndex((f) => chaveCatalogo(f.tamanho) === chaveCatalogo(tamanho));
}

/** Faixa do Tamanho vizinho (um passo), ou `null` quando não existe (abaixo de Minúsculo, acima de Colossal). */
export function tamanhoVizinho(faixas: FaixaAltura[], tamanhoDaRaca: string | null | undefined, direcao: "acima" | "abaixo"): FaixaAltura | null {
  const indice = indiceDoTamanho(faixas, tamanhoDaRaca);
  if (indice < 0) return null;
  return faixas[indice + (direcao === "acima" ? 1 : -1)] ?? null;
}

/** Intervalo que vale para a altura: o típico da raça na média, a faixa do vizinho fora dela. */
export function intervaloAplicavel(raca: RacaCatalogo | undefined, foraDaMedia: ForaDaMedia, faixas: FaixaAltura[]): IntervaloAplicavel | null {
  if (!raca?.tamanho) return null;
  if (!foraDaMedia) {
    return raca.altura ? { tamanho: raca.tamanho, minima: raca.altura.minima, maxima: raca.altura.maxima ?? null, foraDaMedia: false } : null;
  }
  const vizinho = tamanhoVizinho(faixas, raca.tamanho, foraDaMedia);
  return vizinho ? { tamanho: vizinho.tamanho, minima: vizinho.minima, maxima: vizinho.maxima ?? null, foraDaMedia: true } : null;
}

/** Mensagem de erro da altura, com o mesmo sentido da validação do servidor; `null` quando vale. */
export function problemaDeAltura(texto: string, raca: RacaCatalogo | undefined, foraDaMedia: ForaDaMedia, faixas: FaixaAltura[]): string | null {
  const lida = lerAltura(texto);
  if (lida.vazia) return null;
  if (lida.valor === null) return "A altura precisa ser um número em metros maior que zero, como 1,75.";
  const intervalo = intervaloAplicavel(raca, foraDaMedia, faixas);
  if (!intervalo) return null;
  const dentro = lida.valor >= intervalo.minima && (intervalo.maxima === null || lida.valor <= intervalo.maxima);
  if (dentro) return null;
  return intervalo.foraDaMedia
    ? `A altura de um personagem ${intervalo.tamanho} vai ${textoIntervalo(intervalo)}.`
    : `Na média, a altura de um ${raca?.nome} vai ${textoIntervalo(intervalo)}; para ir além, marque que o personagem é fora da média.`;
}
