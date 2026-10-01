/** Traços gravados: só os textos da lista, sem espaços nas pontas. Um valor antigo que não é lista fica vazio. */
export function lerTracos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.trim()) : [];
}

const semAcento = (texto: string) => texto.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

/**
 * Problema de um traço novo antes de entrar na lista, com a mesma regra do servidor (validacao_ficha.py):
 * vazio, acima do limite, repetido sem diferenciar maiúsculas e acentos, ou lista cheia.
 */
export function problemaDoTraco(novo: string, lista: string[], maximo: number, limite: number | null | undefined): string | null {
  const texto = novo.trim();
  if (!texto) return "Escreva o traço antes de adicionar.";
  if (lista.length >= maximo) return `No máximo ${maximo} traços.`;
  if (typeof limite === "number" && texto.length > limite) return `O traço passa de ${limite} caracteres.`;
  if (lista.some((t) => semAcento(t) === semAcento(texto))) return `O traço "${texto}" já está na lista.`;
  return null;
}
