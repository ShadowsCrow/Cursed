import { ARTE } from "../../ui/Arte";
import { useAssetImage } from "../assets/useAssetImage";
import type { ApiClient } from "../characters/types";
import type { AcervoPersonagem, MesaResumo } from "./dados";

/*
 * Imagens privadas da navegação: capa da campanha e retrato do personagem, lidas pela API com a
 * autorização da mesa. Sem imagem enviada (ou se a leitura falhar), a arte padrão do tema.
 */

export const CAPA_PADRAO = {
  faixa: `${ARTE}/capa-campanha-padrao-1536.webp`,
  miniatura: `${ARTE}/capa-campanha-padrao-miniatura.webp`,
};

export function retratoPadrao(tipo: AcervoPersonagem["tipo"], quadrado = false): string {
  const base = tipo === "npc" ? "retrato-vazio-npc" : tipo === "monstro" ? "retrato-vazio-monstro" : "retrato-vazio";
  return `${ARTE}/${base}${quadrado ? "-256" : ""}.webp`;
}

export function useCapa(api: ApiClient, mesa: Pick<MesaResumo, "id" | "capa_objeto"> | undefined, formato: "faixa" | "miniatura") {
  const objeto = mesa?.capa_objeto ?? "";
  const enviada = useAssetImage(api, mesa?.id ?? "", objeto, { exibicao: true, enabled: Boolean(mesa && objeto) });
  return enviada.data ?? CAPA_PADRAO[formato];
}

export function useRetrato(api: ApiClient, mesaId: string, objeto: string | null | undefined, tipo: AcervoPersonagem["tipo"], quadrado = false) {
  const enviado = useAssetImage(api, mesaId, objeto ?? "", { exibicao: true, enabled: Boolean(objeto) });
  return enviado.data ?? retratoPadrao(tipo, quadrado);
}
