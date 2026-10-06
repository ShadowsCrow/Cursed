/** Desenho da prévia do movimento no modo turno (modo-de-turno, D8b), na camada `rastro` do grid. */
import { Container, Graphics, Text } from "pixi.js";

import type { Casa, MedidaDoArraste } from "./medidaDoArraste";

/** Lado da casa da grade, em pixels do mundo; o `RoomCanvas` usa o mesmo. */
export const CELULA = 48;

/** Linha tracejada em segmentos curtos: o PixiJS não tem tracejado nativo. */
export function tracejar(linha: Graphics, x1: number, y1: number, x2: number, y2: number, traco = 8, espaco = 6) {
  const distancia = Math.hypot(x2 - x1, y2 - y1);
  for (let andado = 0; andado < distancia; andado += traco + espaco) {
    const inicio = andado / distancia;
    const fim = Math.min(andado + traco, distancia) / distancia;
    linha.moveTo(x1 + (x2 - x1) * inicio, y1 + (y2 - y1) * inicio).lineTo(x1 + (x2 - x1) * fim, y1 + (y2 - y1) * fim);
  }
}

export const COR_DA_PREVIA = { cabe: 0xffd27a, excede: 0xff8b97 } as const;

/**
 * Contorno tracejado da casa de origem, linha tracejada até o destino e o rótulo com os metros. Sem medida (fora da
 * disputa ou token que não é de participante), não desenha nada.
 */
/** Tamanho da legenda na tela, em pixels, igual em qualquer zoom (pedido do usuário, 2026-10-05). */
export const FONTE_DA_LEGENDA = 18;

export function desenharRastro(rastro: Container, origem: Casa, destino: Casa, tamanho: number, medida: MedidaDoArraste | null,
  escala = 1) {
  for (const filho of rastro.removeChildren()) filho.destroy({ children: true });
  if (!medida) return;
  const cor = medida.excede ? COR_DA_PREVIA.excede : COR_DA_PREVIA.cabe;
  const lado = tamanho * CELULA;
  const ox = origem.x * CELULA;
  const oy = origem.y * CELULA;
  const contorno = new Graphics();
  tracejar(contorno, ox + 2, oy + 2, ox + lado - 2, oy + 2);
  tracejar(contorno, ox + lado - 2, oy + 2, ox + lado - 2, oy + lado - 2);
  tracejar(contorno, ox + lado - 2, oy + lado - 2, ox + 2, oy + lado - 2);
  tracejar(contorno, ox + 2, oy + lado - 2, ox + 2, oy + 2);
  contorno.stroke({ color: cor, width: 2, alpha: 0.9 });
  const centroOrigem = { x: ox + lado / 2, y: oy + lado / 2 };
  const centroDestino = { x: destino.x * CELULA + lado / 2, y: destino.y * CELULA + lado / 2 };
  const linha = new Graphics();
  tracejar(linha, centroOrigem.x, centroOrigem.y, centroDestino.x, centroDestino.y, 10, 7);
  linha.stroke({ color: cor, width: 3, alpha: 0.85 });

  // A legenda fica num grupo próprio, acima do destino, com a escala inversa do zoom: o mesmo tamanho na tela.
  const texto = new Text({
    text: medida.texto,
    style: { fontFamily: "sans-serif", fontSize: FONTE_DA_LEGENDA, fontWeight: "bold", fill: cor },
  });
  texto.anchor.set(0.5);
  const largura = texto.width + 24;
  const altura = texto.height + 12;
  const fundo = new Graphics().roundRect(-largura / 2, -altura / 2, largura, altura, 10)
    .fill({ color: 0x0b1118, alpha: 0.92 }).stroke({ color: cor, width: 1.5, alpha: 0.8 });
  const legenda = new Container();
  legenda.addChild(fundo, texto);
  const fator = 1 / Math.max(0.1, escala);
  legenda.scale.set(fator);
  legenda.position.set(centroDestino.x, destino.y * CELULA - (altura / 2 + 8) * fator);
  rastro.addChild(contorno, linha, legenda);
}
