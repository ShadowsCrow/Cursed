/**
 * A carta que voa pelo tabuleiro (cartas-na-cena, D7): um cartão de 46 × 64 px do mundo com a arte da carta
 * recortada, ou as iniciais do título enquanto a arte não chega. A geometria do voo fica em `vooDaCarta.ts`.
 */
import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";

export const LARGURA_DA_CARTA = 46;
export const ALTURA_DA_CARTA = 64;
const COR_DA_BORDA = 0xe6bd81;

export interface CartaVoadora { container: Container; cancelar: () => void }

/** Cria o cartão centrado no próprio pivô; se `arte` vier, troca as iniciais pela imagem quando ela carregar. */
export function criarCartaVoadora(titulo: string, arte?: string): CartaVoadora {
  const container = new Container();
  container.eventMode = "none";
  const fundo = new Graphics().roundRect(0, 0, LARGURA_DA_CARTA, ALTURA_DA_CARTA, 6).fill(0x1b1b27)
    .stroke({ color: COR_DA_BORDA, width: 2 });
  const iniciais = new Text({
    text: titulo.slice(0, 2).toLocaleUpperCase("pt-BR"),
    style: { fontFamily: "sans-serif", fontSize: 20, fontWeight: "bold", fill: 0xffd27a },
  });
  iniciais.anchor.set(0.5);
  iniciais.position.set(LARGURA_DA_CARTA / 2, ALTURA_DA_CARTA / 2);
  container.addChild(fundo, iniciais);
  container.pivot.set(LARGURA_DA_CARTA / 2, ALTURA_DA_CARTA / 2);
  let cancelado = false;
  if (arte && typeof Image !== "undefined") {
    const imagem = new Image();
    imagem.onload = () => {
      if (cancelado || container.destroyed) return;
      const textura = Texture.from(imagem);
      const foto = new Sprite(textura);
      const escala = Math.max((LARGURA_DA_CARTA - 4) / textura.width, (ALTURA_DA_CARTA - 4) / textura.height);
      foto.scale.set(escala);
      foto.anchor.set(0.5);
      foto.position.set(LARGURA_DA_CARTA / 2, ALTURA_DA_CARTA / 2);
      const mascara = new Graphics().roundRect(2, 2, LARGURA_DA_CARTA - 4, ALTURA_DA_CARTA - 4, 5).fill(0xffffff);
      foto.mask = mascara;
      iniciais.visible = false;
      container.addChild(foto, mascara);
      container.addChild(new Graphics().roundRect(0, 0, LARGURA_DA_CARTA, ALTURA_DA_CARTA, 6).stroke({ color: COR_DA_BORDA, width: 2 }));
    };
    imagem.src = arte;
  }
  return { container, cancelar: () => { cancelado = true; } };
}
