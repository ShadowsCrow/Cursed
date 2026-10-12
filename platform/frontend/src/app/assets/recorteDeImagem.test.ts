import { describe, expect, it } from "vitest";

import { analisarImagem } from "./recorteDeImagem";

/** Imagem RGBA sintética: `cor(x, y)` decide a cor de cada pixel. */
function imagem(largura: number, altura: number, cor: (x: number, y: number) => [number, number, number, number]) {
  const dados = new Uint8ClampedArray(largura * altura * 4);
  for (let y = 0; y < altura; y += 1) for (let x = 0; x < largura; x += 1) dados.set(cor(x, y), (y * largura + x) * 4);
  return dados;
}

describe("ajuste automático das imagens de itens", () => {
  it("espada alta sobre fundo branco: apaga o fundo e recorta a sobra com margem pequena", () => {
    const espada = (x: number, y: number) => x >= 45 && x < 55 && y >= 20 && y < 180;
    const dados = imagem(100, 200, (x, y) => (espada(x, y) ? [120, 125, 130, 255] : [245, 243, 238, 255]));
    const analise = analisarImagem(dados, 100, 200)!;
    // Objeto de 10 × 160; margem de 4% do maior lado (6 px).
    expect(analise.recorte).toEqual({ x: 39, y: 14, largura: 22, altura: 172, fundoRemovido: true });
    expect(analise.fundo[0]).toBe(1);
    expect(analise.fundo[100 * 100 + 50]).toBe(0);
  });

  it("um fundo claro cercado pelo objeto (o miolo de um anel) não é apagado", () => {
    const anel = (x: number, y: number) => { const d = Math.hypot(x - 50, y - 50); return d >= 20 && d <= 30; };
    const dados = imagem(100, 100, (x, y) => (anel(x, y) ? [200, 160, 40, 255] : [250, 250, 250, 255]));
    const analise = analisarImagem(dados, 100, 100)!;
    expect(analise.fundo[50 * 100 + 50]).toBe(0);
    expect(analise.fundo[0]).toBe(1);
  });

  it("fundo já transparente: só recorta", () => {
    const dados = imagem(80, 80, (x, y) => (x >= 30 && x < 50 && y >= 30 && y < 50 ? [10, 10, 10, 255] : [0, 0, 0, 0]));
    const analise = analisarImagem(dados, 80, 80)!;
    expect(analise.recorte.fundoRemovido).toBe(false);
    expect(analise.recorte).toMatchObject({ x: 29, y: 29, largura: 22, altura: 22 });
  });

  it("uma cena sem fundo liso fica como está", () => {
    const dados = imagem(60, 60, (x, y) => [(x * 37 + y * 11) % 256, (x * 7 + y * 53) % 256, (x * y) % 256, 255]);
    expect(analisarImagem(dados, 60, 60)).toBeNull();
  });

  it("imagem só de fundo fica como está", () => {
    expect(analisarImagem(imagem(20, 20, () => [255, 255, 255, 255]), 20, 20)).toBeNull();
  });
});
