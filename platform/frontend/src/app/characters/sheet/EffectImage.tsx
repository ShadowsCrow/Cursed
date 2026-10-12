import { useAssetImage } from "../../assets/useAssetImage";
import type { ApiClient } from "../types";
import type { IconeResumo } from "./catalogoApi";

export const ICONE_PADRAO = "/icones/efeitos/padrao.webp";

/** Ícone do armazenamento privado (mesa ou efeito personalizado), na versão reduzida. */
function IconePrivado({ api, mesaId, caminho }: { api: ApiClient; mesaId: string; caminho: string }) {
  const imagem = useAssetImage(api, mesaId, caminho, { exibicao: true });
  return <img src={imagem.data ?? ICONE_PADRAO} alt="" className="effect-image" />;
}

/**
 * Imagem estável do efeito: ícone da mesa, do efeito ou do catálogo e, sem nenhum deles, a
 * interrogação padrão. É decorativa (`alt=""`): o nome do efeito é o nome acessível do controle.
 */
export function EffectImage({ icone, api, mesaId }: { icone: IconeResumo | undefined; api?: ApiClient; mesaId?: string }) {
  if (icone && (icone.origem === "mesa" || icone.origem === "efeito")) {
    return api && mesaId ? <IconePrivado api={api} mesaId={mesaId} caminho={icone.caminho} /> : <img src={ICONE_PADRAO} alt="" className="effect-image" />;
  }
  return <img src={icone?.caminho ?? ICONE_PADRAO} alt="" className="effect-image" />;
}
