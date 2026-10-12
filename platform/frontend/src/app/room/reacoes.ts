/**
 * Reações da Sala (gamificacao-da-sala, D9): seis figuras pintadas, lançadas pelo botão do grid e vistas por toda a
 * mesa como balões passageiros. Chegam pelo canal efêmero da Sala e não ficam guardadas em lugar nenhum.
 */

export const REACOES = [
  { id: "aplausos", nome: "Aplausos" },
  { id: "risada", nome: "Risada" },
  { id: "susto", nome: "Susto" },
  { id: "caveira", nome: "Caveira" },
  { id: "chama", nome: "Chama" },
  { id: "coracao", nome: "Coração" },
] as const;

export type Reacao = (typeof REACOES)[number]["id"];

export const EVENTO_DE_REACAO = "sala.reacao";
/** Uma reação por segundo por pessoa: as demais são ignoradas, no envio e na recepção. */
export const INTERVALO_MINIMO_MS = 1000;
export const MAXIMO_DE_BALOES = 8;
export const DURACAO_DO_BALAO_MS = 3000;

/** Pintura da reação (gerada pelo Codex, preparada por `preparar_arte.py`). */
export const arteDaReacao = (reacao: Reacao) => `/arte/sala/reacao-${reacao}.webp`;

export function reacaoValida(valor: unknown): valor is Reacao {
  return typeof valor === "string" && REACOES.some((reacao) => reacao.id === valor);
}

export const nomeDaReacao = (reacao: Reacao) => REACOES.find((item) => item.id === reacao)!.nome;

export interface Balao { id: string; usuarioId: string; reacao: Reacao; criadoEm: number }

/** Guarda o último lançamento de cada pessoa e diz se o próximo passa no limite de um por segundo. */
export class LimiteDeReacoes {
  private readonly ultimas = new Map<string, number>();

  permitir(usuarioId: string, agora: number): boolean {
    const ultima = this.ultimas.get(usuarioId);
    if (ultima !== undefined && agora - ultima < INTERVALO_MINIMO_MS) return false;
    this.ultimas.set(usuarioId, agora);
    return true;
  }
}

/** Acrescenta o balão; acima do máximo, os mais antigos saem primeiro. */
export function comBalao(baloes: readonly Balao[], novo: Balao): Balao[] {
  return [...baloes, novo].slice(-MAXIMO_DE_BALOES);
}
