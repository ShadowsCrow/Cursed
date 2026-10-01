import type { AcaoCarta, EstadoCarta } from "./types";

/** Ações de cada estado da carta por papel (9.4, 9.6 e 9.7): o jogador inicia e interrompe; o Narrador conclui. */
export const ACOES_JOGADOR: Partial<Record<EstadoCarta, { acao: AcaoCarta; rotulo: string }[]>> = {
  disponivel: [{ acao: "iniciar_aprendizado", rotulo: "Iniciar aprendizado" }],
  em_aprendizado: [{ acao: "interromper_aprendizado", rotulo: "Interromper aprendizado" }],
};
export const ACOES_NARRADOR: Partial<Record<EstadoCarta, { acao: AcaoCarta; rotulo: string }[]>> = {
  em_aprendizado: [{ acao: "concluir_aprendizado", rotulo: "Concluir aprendizado" }],
};
