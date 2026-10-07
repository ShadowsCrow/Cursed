import type { ApiClient } from "../characters/types";
import { useAssetImage } from "../assets/useAssetImage";
import { arteDaCategoria, usePintura } from "../characters/sheet/cartas/pinturasDasCartas";
import type { CartaDaMao } from "./useUsoDeCartas";

/** Arte da carta: a imagem própria enviada pelo Narrador, ou a pintura da categoria; `undefined` enquanto carrega. */
export function useArteDaCarta(api: ApiClient, mesaId: string, carta: Pick<CartaDaMao, "tipo" | "ativos">): string | undefined {
  const propria = (carta.ativos ?? []).find((a) => typeof a === "string" && a.length > 0);
  const imagem = useAssetImage(api, mesaId, propria ?? "", { exibicao: true, enabled: Boolean(propria) });
  const pintura = arteDaCategoria(carta.tipo === "magia" ? "magias" : "habilidades");
  const estado = usePintura(pintura);
  return imagem.data ?? (estado === "pronta" ? pintura : undefined);
}

