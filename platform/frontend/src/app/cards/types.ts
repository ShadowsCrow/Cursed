import type { components } from "../../api/generated/schema";

export type CartaDefinicaoResumo = components["schemas"]["CartaDefinicaoResumo"];
export type CartaVersaoResumo = components["schemas"]["CartaVersaoResumo"];
export type ValidacaoCarta = components["schemas"]["ValidacaoCarta"];
export type ProblemaValidacao = components["schemas"]["ProblemaValidacao"];
export type PreviaImportacaoCarta = components["schemas"]["PreviaImportacaoCarta"];
export type CartaVisivel = components["schemas"]["CartaVisivel"];
export type CartaPersonagemResumo = components["schemas"]["CartaPersonagemResumo"];
export type AquisicaoCartasResposta = components["schemas"]["AquisicaoCartasResposta"];
export type OfertaResumo = components["schemas"]["OfertaResumo"];
export type ApresentacaoResumo = components["schemas"]["ApresentacaoResumo"];
export type PreviaMigracaoCarta = components["schemas"]["PreviaMigracaoCarta"];

export type TipoCarta = CartaDefinicaoResumo["tipo"];
export type EstadoCarta = CartaPersonagemResumo["estado"];
export type AcaoCarta = "iniciar_aprendizado" | "interromper_aprendizado" | "concluir_aprendizado" | "remover";

export const TIPOS_CARTA: TipoCarta[] = ["habilidade", "magia", "item", "efeito"];
export const ROTULO_TIPO: Record<TipoCarta, string> = {
  habilidade: "Habilidade", magia: "Magia", item: "Item", efeito: "Efeito",
};

/** Erro de publicação/importação: `detail` pode ser texto ou `{mensagem, problemas}`. */
export class ErroComProblemas extends Error {
  constructor(message: string, readonly problemas: ProblemaValidacao[] = []) {
    super(message);
  }
}

export function erroDaApi(error: unknown, fallback: string): ErroComProblemas {
  const detail = error && typeof error === "object" && "detail" in error ? (error as { detail: unknown }).detail : undefined;
  if (typeof detail === "string" && detail.trim()) return new ErroComProblemas(detail);
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const { mensagem, problemas } = detail as { mensagem?: unknown; problemas?: unknown };
    return new ErroComProblemas(
      typeof mensagem === "string" ? mensagem : fallback,
      Array.isArray(problemas) ? (problemas as ProblemaValidacao[]) : [],
    );
  }
  if (Array.isArray(detail)) {
    const mensagens = detail
      .map((item) => (item && typeof item === "object" && "msg" in item ? String((item as { msg: unknown }).msg) : null))
      .filter((msg): msg is string => Boolean(msg));
    if (mensagens.length) return new ErroComProblemas(mensagens.join(" "));
  }
  return new ErroComProblemas(fallback);
}
