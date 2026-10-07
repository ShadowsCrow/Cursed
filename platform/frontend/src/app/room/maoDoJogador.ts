/**
 * De quem é a mão de cartas do jogador (cartas-na-cena; decisão do usuário de 2026-10-06): todos os personagens que
 * ele controla com token na cena, não só a ficha própria. Um companion criado pelo Narrador e liberado para o
 * jogador (controlador do token) entra também, com o nome do token quando a ficha não está na lista.
 */
import type { components } from "../../api/generated/schema";
import type { OpcaoDePersonagem } from "./MaoDeCartas";

type Token = Pick<components["schemas"]["TokenSala"], "personagem_id" | "rotulo" | "controlador">;
type Personagem = { id: string; nome: string; proprietario_id?: string | null };

export function personagensControlados(tokens: readonly Token[], personagens: readonly Personagem[], userId: string): OpcaoDePersonagem[] {
  const porId = new Map(personagens.map((p) => [p.id, p]));
  const vistos = new Map<string, OpcaoDePersonagem>();
  for (const token of tokens) {
    if (!token.personagem_id || vistos.has(token.personagem_id)) continue;
    const personagem = porId.get(token.personagem_id);
    const controla = token.controlador === true || personagem?.proprietario_id === userId;
    if (!controla) continue;
    vistos.set(token.personagem_id, { id: token.personagem_id, nome: personagem?.nome ?? token.rotulo });
  }
  return [...vistos.values()];
}
