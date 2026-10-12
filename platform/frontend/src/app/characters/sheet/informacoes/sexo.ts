import type { NomeIconeInformacao } from "./icones";

/**
 * Símbolo do sexo pelo valor gravado, sem inferir nada além do texto: masculino e feminino têm o seu; qualquer
 * outro valor (ou nenhum) usa o símbolo neutro.
 */
export function iconeDoSexo(valor: string): NomeIconeInformacao {
  const texto = valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
  if (texto.startsWith("masc")) return "sexo-masculino";
  if (texto.startsWith("femi")) return "sexo-feminino";
  return "sexo-outro";
}
