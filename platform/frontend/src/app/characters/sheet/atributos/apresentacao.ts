import { TITULO_OUTROS } from "../useEdicaoEmLote";
import type { NomeGrupo } from "./icones";

/*
 * Textos e pinturas de apresentação da aba Atributos (redesenhar-aba-atributos, design D7). São texto de
 * interface, não regra: os grupos e os nomes continuam em `sheetCatalog.ts`.
 */

export interface ApresentacaoDoGrupo {
  chave: NomeGrupo;
  /** Subtítulo em versalete da faixa do cartão e legenda da vinheta. */
  subtitulo?: string;
  /** Frase curta da faixa de legenda da vinheta. */
  frase?: string;
  /** Pintura da faixa do cartão (opcional). */
  faixa?: string;
}

const PASTA = "/arte/atributos";

const GRUPOS: Record<string, ApresentacaoDoGrupo> = {
  "Físicos": {
    chave: "fisicos", subtitulo: "Força do corpo", frase: "Supera desafios físicos.",
    faixa: `${PASTA}/atributos-faixa-fisicos.webp`,
  },
  "Sociais": {
    chave: "sociais", subtitulo: "Presença social", frase: "Conecta pessoas.",
    faixa: `${PASTA}/atributos-faixa-sociais.webp`,
  },
  "Mentais": {
    chave: "mentais", subtitulo: "Foco mental", frase: "Compreende o mundo.",
    faixa: `${PASTA}/atributos-faixa-mentais.webp`,
  },
  [TITULO_OUTROS]: { chave: "outros" },
};

/** Gravura a traço com as três figuras (Físicos, Sociais e Mentais, da esquerda para a direita), opcional. */
export const GRAVURA_DOS_GRUPOS = `${PASTA}/atributos-gravura.webp`;

export function apresentacaoDoGrupo(titulo: string): ApresentacaoDoGrupo {
  return GRUPOS[titulo] ?? { chave: "outros" };
}

export const FRASE_DA_ABA =
  "Os atributos representam os pilares fundamentais do seu personagem, influenciando suas capacidades dentro e fora de combate.";
