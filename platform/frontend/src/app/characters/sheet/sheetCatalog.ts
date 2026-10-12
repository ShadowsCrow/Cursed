/**
 * Atributos e perícias da ficha. Os nomes são as chaves gravadas pela aplicação
 * Streamlit (algumas sem acento, como "Proposito"), preservadas para que fichas
 * existentes continuem compatíveis; os grupos seguem "Atributos e Perícias.md".
 */
export const GRUPOS_ATRIBUTOS: { titulo: string; nomes: string[] }[] = [
  { titulo: "Físicos", nomes: ["Força", "Destreza", "Vigor"] },
  { titulo: "Sociais", nomes: ["Carisma", "Manipulação", "Proposito"] },
  { titulo: "Mentais", nomes: ["Percepção", "Inteligência", "Raciocínio"] },
];

export const GRUPOS_PERICIAS: { titulo: string; nomes: string[] }[] = [
  { titulo: "Talentos", nomes: ["Prontidão", "Esportes", "Briga", "Esquiva", "Empatia", "Expressão", "Intimidação", "Liderança", "Conhecimento urbano", "Lábia"] },
  { titulo: "Técnicas", nomes: ["Lidar com animais", "Oficios", "Pilotagem", "Etiqueta", "Longo alcance", "Armas Brancas", "Performance", "Prestidigitação", "Furtividade", "Sobrevivência"] },
  { titulo: "Conhecimentos", nomes: ["Acadêmicos", "Arcanismo", "Finanças", "Investigação", "Direito", "Linguistica", "Medicina", "Ocultismo", "Politica", "Natureza"] },
];

/** Mesma normalização de `cursed_platform.ficha_viva.chave`, para achar o valor derivado de cada nome. */
export function chaveDerivada(categoria: "atributo" | "pericia", nome: string): string {
  const slug = nome.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().split(/\s+/).join("_");
  return `${categoria}:${slug}`;
}
