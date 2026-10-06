/** Textos das estatísticas da Sala (gamificacao-da-sala), comuns às abas Mestre e Jogador. */
import type { EstatisticasDoPeriodo, SessaoDeJogo } from "./useGamificacaoDaSala";

export type Periodo = "sessao" | "campanha";

export const ROTULO_DA_SORTE: Record<EstatisticasDoPeriodo["rotulo_sorte"], string> = {
  quentes: "Dados quentes",
  na_media: "Na média",
  frios: "Dados frios",
  poucos_dados: "Poucos dados ainda",
};

/** "+12 pontos" ou "−4 pontos" acima ou abaixo da média esperada; nada com poucos dados. */
export function desvioDaSorte(sorte: number | null | undefined): string | null {
  if (sorte === null || sorte === undefined) return null;
  const arredondado = Math.round(sorte);
  if (arredondado === 0) return "na média esperada";
  return `${arredondado > 0 ? "+" : "−"}${Math.abs(arredondado)} pontos ${arredondado > 0 ? "acima" : "abaixo"} da média`;
}

export function descreverSessao(sessao: SessaoDeJogo | null | undefined): string {
  if (!sessao) return "Nenhuma sessão em andamento";
  const hora = new Date(sessao.iniciada_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return sessao.encerrada_em ? `Sessão ${sessao.numero} encerrada` : `Sessão ${sessao.numero} em andamento desde ${hora}`;
}
