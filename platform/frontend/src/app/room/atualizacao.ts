/**
 * De quanto em quanto tempo a Sala reconsulta o servidor (item 12): sem tempo real, a cada 1 s, para o jogador ver
 * o que o Narrador mudou sem recarregar a página; com tempo real, os avisos chegam na hora e a consulta a cada 15 s
 * é só uma rede de segurança. Dados iguais não redesenham a tela.
 */
export function intervaloDaSala(comTempoReal: boolean): number {
  return comTempoReal ? 15_000 : 1_000;
}
