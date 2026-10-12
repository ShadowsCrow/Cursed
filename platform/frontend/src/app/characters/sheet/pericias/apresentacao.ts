import type { NomeGrupo } from "../atributos/icones";
import { chaveDerivada } from "../sheetCatalog";
import { TITULO_OUTROS } from "../useEdicaoEmLote";
import { ICONES_DAS_PERICIAS, type NomeIconePericia } from "./nomesDosIcones";

/*
 * Textos, cores e pinturas de apresentação da aba Perícias (redesenhar-aba-pericias, design D3). São texto
 * de interface, não regra: os grupos e os nomes continuam em `sheetCatalog.ts`.
 */

export type ChaveGrupoPericia = "talentos" | "tecnicas" | "conhecimentos" | "outros";

export interface ApresentacaoDoGrupo {
  chave: ChaveGrupoPericia;
  /** Lema em versalete sob o nome do grupo. */
  lema?: string;
  /** Pintura do estandarte (opcional). */
  estandarte?: string;
  /** Medalhão da aba Atributos que empresta o símbolo (braço, livro ou pergaminho); Técnicas tem o próprio. */
  simbolo: NomeGrupo | "tecnicas";
}

const PASTA = "/arte/pericias";

const GRUPOS: Record<string, ApresentacaoDoGrupo> = {
  "Talentos": { chave: "talentos", lema: "Instinto e ação", estandarte: `${PASTA}/pericias-talentos.webp`, simbolo: "fisicos" },
  "Técnicas": { chave: "tecnicas", lema: "Prática e ofício", estandarte: `${PASTA}/pericias-tecnicas.webp`, simbolo: "tecnicas" },
  "Conhecimentos": { chave: "conhecimentos", lema: "Sabedoria e mundo", estandarte: `${PASTA}/pericias-conhecimentos.webp`, simbolo: "mentais" },
  [TITULO_OUTROS]: { chave: "outros", simbolo: "outros" },
};

export function apresentacaoDoGrupo(titulo: string): ApresentacaoDoGrupo {
  return GRUPOS[titulo] ?? { chave: "outros", simbolo: "outros" };
}

/** Paisagem em sépia atrás do cabeçalho (opcional). */
export const CENA_DO_CABECALHO = `${PASTA}/pericias-cena.webp`;

export const FRASE_DA_ABA = "As perícias representam o que seu personagem sabe, pratica e é capaz de fazer no mundo.";

export function iconeDaPericia(nome: string): NomeIconePericia | undefined {
  const slug = chaveDerivada("pericia", nome).slice("pericia:".length);
  return (ICONES_DAS_PERICIAS as readonly string[]).includes(slug) ? (slug as NomeIconePericia) : undefined;
}

/**
 * Perícias com a maior base da ficha, para o selo (decisão do usuário, 2026-09-29): todas as empatadas;
 * nenhuma quando a maior base é 0 ou não há base gravada. Só leitura rápida, sem efeito mecânico.
 */
export function maioresBases(bases: Iterable<[string, number | null]>): Set<string> {
  const lista = [...bases].filter((par): par is [string, number] => par[1] !== null);
  const maior = Math.max(0, ...lista.map(([, valor]) => valor));
  return new Set(maior > 0 ? lista.filter(([, valor]) => valor === maior).map(([nome]) => nome) : []);
}
