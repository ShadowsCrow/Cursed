import { describe, expect, it } from "vitest";

import { PALETA_PERSONALIDADE, type CorDaPaleta } from "./paleta";

/*
 * Contraste da paleta medida na referência (reformular-personalidade-da-ficha, tarefa 4.2): todo texto da folha
 * precisa de 4,5:1 sobre o fundo em que aparece, inclusive nas bordas mais escuras do pergaminho.
 */

const cor = (nome: CorDaPaleta): string => PALETA_PERSONALIDADE[nome];

function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * canais[0]! + 0.7152 * canais[1]! + 0.0722 * canais[2]!;
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro! + 0.05) / (escuro! + 0.05);
}

// Pergaminho dos quadros e o tom mais escuro das bordas da folha (referencia/medidas.md).
const FUNDOS = { quadro: cor("pers-quadro"), borda: "#edd1a2" };

describe("contraste da folha da Personalidade", () => {
  it.each<CorDaPaleta>(["pers-titulo", "pers-eyebrow", "pers-subtitulo", "pers-citacao", "pers-rotulo", "pers-valor", "pers-vazio", "pers-historia"])(
    "%s tem 4,5:1 sobre o pergaminho e sobre a borda mais escura",
    (nome) => {
      for (const fundo of Object.values(FUNDOS)) expect(contraste(cor(nome), fundo)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("etiquetas e botão Editar têm 4,5:1 sobre o próprio fundo", () => {
    expect(contraste(cor("pers-etiqueta-texto"), cor("pers-etiqueta-fundo"))).toBeGreaterThanOrEqual(4.5);
    expect(contraste(cor("pers-botao-texto"), cor("pers-botao-fundo"))).toBeGreaterThanOrEqual(4.5);
  });
});
