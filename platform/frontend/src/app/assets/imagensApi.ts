import type { components } from "../../api/generated/schema";

import { extractErrorMessage, type ApiClient } from "../characters/types";

export type DestinoImagem = "retrato" | "ilustracao" | "item" | "icone-grade" | "efeito" | "carta" | "mapa" | "icone-efeito" | "capa";
export type ImagemResposta = components["schemas"]["ImagemResposta"];

/** Limites do servidor por ponto de envio, conferidos antes de enviar para a mensagem chegar mais cedo. */
export const LIMITE_MB: Record<DestinoImagem, number> = {
  retrato: 5, ilustracao: 8, item: 5, "icone-grade": 5, efeito: 5, carta: 8, mapa: 15, "icone-efeito": 5, capa: 8,
};
export const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp"];

export async function enviarImagem(
  api: ApiClient, mesaId: string, destino: DestinoImagem, alvo: string, arquivo: File, versao?: number | null,
): Promise<ImagemResposta> {
  const formulario = new FormData();
  formulario.append("arquivo", arquivo);
  formulario.append("alvo", alvo);
  if (versao !== undefined && versao !== null) formulario.append("versao_esperada", String(versao));
  const { data, error } = await api.PUT("/mesas/{mesa_id}/imagens/{destino}", {
    params: { path: { mesa_id: mesaId, destino } },
    // O cliente gerado tipa o corpo como objeto; o envio real é o FormData como está.
    body: formulario as unknown as components["schemas"]["Body_enviar_imagem_mesas__mesa_id__imagens__destino__put"],
    bodySerializer: (corpo) => corpo as unknown as FormData,
  });
  if (error || !data) throw new Error(extractErrorMessage(error, "Não foi possível enviar a imagem."));
  return data;
}

export async function removerImagem(
  api: ApiClient, mesaId: string, destino: DestinoImagem, alvo: string, versao?: number | null,
): Promise<ImagemResposta> {
  const { data, error } = await api.DELETE("/mesas/{mesa_id}/imagens/{destino}", {
    params: { path: { mesa_id: mesaId, destino }, query: versao !== undefined && versao !== null ? { alvo, versao_esperada: versao } : { alvo } },
  });
  if (error || !data) throw new Error(extractErrorMessage(error, "Não foi possível remover a imagem."));
  return data;
}
