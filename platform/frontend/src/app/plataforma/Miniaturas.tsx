import type { ApiClient } from "../characters/types";
import type { AcervoPersonagem, MesaResumo } from "./dados";
import { useCapa, useRetrato } from "./imagens";

export function MiniaturaDaCapa({ api, mesa }: { api: ApiClient; mesa: MesaResumo }) {
  const src = useCapa(api, mesa, "miniatura");
  return <img className="item-lateral__miniatura" src={src} width={48} height={64} alt="" />;
}

export function MiniaturaDoRetrato({ api, personagem }: { api: ApiClient; personagem: AcervoPersonagem }) {
  const src = useRetrato(api, personagem.mesa_id, personagem.retrato_objeto, personagem.tipo, true);
  return <img className="item-lateral__miniatura item-lateral__miniatura--redonda" src={src} width={52} height={52} alt="" />;
}
