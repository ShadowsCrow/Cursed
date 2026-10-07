/** Rolagens e usos de carta juntos no histórico da aba Dados (cartas-na-cena), na ordem de chegada. */
import type { Rolagem } from "./dados";
import { LIMITE_DO_HISTORICO } from "./useRolador";
import type { UsoNoHistorico } from "./useUsoDeCartas";

export type Acontecimento = { ordem: number; rolagem: Rolagem } | { ordem: number; uso: UsoNoHistorico };

/** Do mais recente ao mais antigo, até o limite do histórico. */
export function acontecimentos(historico: Rolagem[], usos: UsoNoHistorico[]): Acontecimento[] {
  const itens: Acontecimento[] = [
    ...historico.map((rolagem) => ({ ordem: rolagem.ordem ?? 0, rolagem })),
    ...usos.map((uso) => ({ ordem: uso.ordem, uso })),
  ];
  return itens.sort((a, b) => b.ordem - a.ordem).slice(0, LIMITE_DO_HISTORICO);
}
