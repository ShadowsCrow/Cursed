import type { ReactNode } from "react";
import { NavLink } from "react-router";

import { MolduraOrnamentada } from "../../ui/Ornamentos";

/**
 * Item da lista lateral (campanha ou personagem): link com endereço próprio. O selecionado tem
 * moldura vermelha, fundo avermelhado e `aria-current="page"`, não só a cor.
 */
export function ItemLateral({ para, imagem, titulo, subtitulo }: {
  para: string; imagem: ReactNode; titulo: string; subtitulo: string;
}) {
  return (
    <NavLink to={para} className="item-lateral">
      {({ isActive }) => (
        <MolduraOrnamentada selecionada={isActive}>
          <span className="item-lateral__corpo">
            {imagem}
            <span className="item-lateral__texto">
              <strong>{titulo}</strong>
              <small>{subtitulo}</small>
            </span>
          </span>
        </MolduraOrnamentada>
      )}
    </NavLink>
  );
}
