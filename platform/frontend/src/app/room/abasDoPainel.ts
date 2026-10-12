import type { GlyphName } from "../../ui/Display";

/**
 * Abas do painel da Sala (experiencia-da-mesa, itens 4 e 8; Dados em melhorias-da-sala, item 1). A terceira é a aba
 * do papel (gamificacao-da-sala): Mestre para o Narrador e Jogador para os jogadores, no lugar do antigo Chat.
 */
export type AbaDoPainel = "cena" | "dados" | "papel" | "fichas" | "bolsa" | "cartas" | "musica";

/** Aba guardada neste navegador; a aberta ou fechada continua em `CHAVE_PAINEL_DA_CENA`. */
export const CHAVE_ABA_DO_PAINEL = "cursed:mesa:aba-do-painel";

export interface DescricaoDaAba { id: AbaDoPainel; rotulo: string; icone: GlyphName }

export function abasDoPainel(narrador: boolean): DescricaoDaAba[] {
  return [
    { id: "cena", rotulo: "Cena", icone: "map" },
    { id: "dados", rotulo: "Dados", icone: "dice" },
    narrador ? { id: "papel", rotulo: "Mestre", icone: "star" } : { id: "papel", rotulo: "Jogador", icone: "users" },
    { id: "fichas", rotulo: "Fichas", icone: "book" },
    { id: "bolsa", rotulo: "Bolsa", icone: "bag" },
    { id: "cartas", rotulo: "Cartas", icone: "cards" },
    { id: "musica", rotulo: "Música", icone: "music" },
  ];
}

/** A aba "chat" guardada de antes abre a aba do papel, que ficou no lugar dela. */
export function abaValida(valor: string | null | undefined): AbaDoPainel {
  if (valor === "chat") return "papel";
  return abasDoPainel(false).find((aba) => aba.id === valor)?.id ?? "cena";
}
