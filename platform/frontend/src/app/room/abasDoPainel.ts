import type { GlyphName } from "../../ui/Display";

/** Abas do painel da Sala (experiencia-da-mesa, itens 4 e 8). */
export type AbaDoPainel = "cena" | "chat" | "fichas" | "bolsa" | "cartas" | "musica";

/** Aba guardada neste navegador; a aberta ou fechada continua em `CHAVE_PAINEL_DA_CENA`. */
export const CHAVE_ABA_DO_PAINEL = "cursed:mesa:aba-do-painel";

export const ABAS_DO_PAINEL: { id: AbaDoPainel; rotulo: string; icone: GlyphName }[] = [
  { id: "cena", rotulo: "Cena", icone: "map" },
  { id: "chat", rotulo: "Chat", icone: "scroll" },
  { id: "fichas", rotulo: "Fichas", icone: "book" },
  { id: "bolsa", rotulo: "Bolsa", icone: "bag" },
  { id: "cartas", rotulo: "Cartas", icone: "cards" },
  { id: "musica", rotulo: "Música", icone: "music" },
];

export function abaValida(valor: string | null | undefined): AbaDoPainel {
  return ABAS_DO_PAINEL.find((aba) => aba.id === valor)?.id ?? "cena";
}
