import type { ImgHTMLAttributes } from "react";

import { useImagemAjustada } from "./recorteDeImagem";

/**
 * `<img>` de item ou carta com o ajuste automático (`recorteDeImagem.ts`): sem o fundo liso e sem a sobra em
 * volta do objeto, para ele ocupar a célula da bolsa, a faixa da carta ou o quadro do livro. Enquanto o ajuste
 * roda (uma vez por imagem), nada é desenhado, para a imagem não aparecer pequena e depois saltar.
 */
export function ImagemAjustada({ src, alt = "", ...resto }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const ajustada = useImagemAjustada(src);
  if (!ajustada) return null;
  return <img {...resto} src={ajustada} alt={alt} />;
}
