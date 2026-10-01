/** Atributos com ícone próprio na aba (chave de `chaveDerivada` sem o prefixo "atributo:"). */
export const ICONES_DOS_ATRIBUTOS = [
  "forca", "destreza", "vigor", "carisma", "manipulacao", "proposito", "percepcao", "inteligencia", "raciocinio",
] as const;

export type NomeIconeAtributo = (typeof ICONES_DOS_ATRIBUTOS)[number];
