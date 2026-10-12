import { describe, expect, it } from "vitest";
import { areaDeInteresse, casaLivre, enquadrar, pontoFixoNoZoom, proximoZoom } from "./viewport";

describe("visão do mapa", () => {
  it("limita o zoom e mantém o ponto sob o cursor no mesmo lugar", () => {
    expect(proximoZoom(2.9, 2)).toBe(3);
    expect(proximoZoom(0.5, 0.1)).toBe(0.4);
    const antes = { x: 20, y: 40 };
    const foco = { x: 120, y: 140 };
    const depois = pontoFixoNoZoom(antes, 1, 2, foco);
    expect(depois).toEqual({ x: -80, y: -60 });
    expect((foco.x - depois.x) / 2).toBe(foco.x - antes.x);
    expect((foco.y - depois.y) / 2).toBe(foco.y - antes.y);
  });

  it("enquadra um mapa maior que a área: reduz até caber e centraliza", () => {
    const { escala, x, y } = enquadrar({ largura: 1000, altura: 600 }, { largura: 960, altura: 720 }, 20);
    expect(escala).toBeCloseTo(560 / 720);
    expect(x).toBeCloseTo((1000 - 960 * escala) / 2);
    expect(y).toBeCloseTo(20);
  });

  it("enquadra um mapa menor que a área: amplia até caber, pelo lado que limita", () => {
    const { escala, x, y } = enquadrar({ largura: 1248, altura: 800 }, { largura: 960, altura: 720 }, 24);
    expect(escala).toBeCloseTo(752 / 720);
    expect(y).toBeCloseTo(24);
    expect(x).toBeCloseTo((1248 - 960 * escala) / 2);
  });

  it("um mapa largo é limitado pela largura e centralizado na altura", () => {
    const { escala, x, y } = enquadrar({ largura: 800, altura: 800 }, { largura: 1520, altura: 380 }, 0);
    expect(escala).toBeCloseTo(800 / 1520);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo((800 - 380 * escala) / 2);
  });

  it("respeita os limites de zoom", () => {
    expect(enquadrar({ largura: 2000, altura: 2000 }, { largura: 96, altura: 96 }).escala).toBe(3);
    expect(enquadrar({ largura: 200, altura: 200 }, { largura: 4800, altura: 4800 }).escala).toBe(0.4);
  });

  it("aceita margens diferentes na horizontal e na vertical", () => {
    const { escala, y } = enquadrar({ largura: 2000, altura: 900 }, { largura: 960, altura: 720 }, { x: 24, y: 72 });
    expect(escala).toBeCloseTo(756 / 720);
    expect(y).toBeCloseTo(72);
  });

  it("com o painel aberto, centraliza a cena na parte que ele não cobre", () => {
    const { escala, x } = enquadrar({ largura: 1600, altura: 900 }, { largura: 960, altura: 720 }, { x: 24, y: 72 }, 352);
    expect(escala).toBeCloseTo(756 / 720);
    expect(x).toBeCloseTo((1600 - 352 - 960 * escala) / 2);
  });

  it("enquadra um retângulo fora da origem, inclusive em coordenadas negativas (cena sem bordas)", () => {
    const { escala, x, y } = enquadrar({ largura: 1000, altura: 1000 }, { x: -480, y: 96, largura: 480, altura: 480 }, 20);
    expect(escala).toBeCloseTo(2);
    // O centro do retângulo (-240, 336) cai no centro da área (500, 500).
    expect(x + -240 * escala).toBeCloseTo(500);
    expect(y + 336 * escala).toBeCloseTo(500);
  });

  it("a área de interesse junta o mapa e os tokens; sem nenhum dos dois, não há área", () => {
    const tokens = [{ x: -3, y: 2, tamanho: 1 }, { x: 25, y: -1, tamanho: 2 }];
    expect(areaDeInteresse({ colunas: 20, linhas: 15, tokens: [] }, false, 48)).toBeNull();
    expect(areaDeInteresse({ colunas: 20, linhas: 15, tokens: [] }, true, 48)).toEqual({ x: 0, y: 0, largura: 960, altura: 720 });
    expect(areaDeInteresse({ colunas: 20, linhas: 15, tokens }, false, 48)).toEqual({ x: -144, y: -48 - 3 * 48, largura: 30 * 48, altura: 10 * 48 });
    expect(areaDeInteresse({ colunas: 20, linhas: 15, tokens }, true, 48)).toEqual({ x: -144, y: -48, largura: 30 * 48, altura: 16 * 48 });
    // Um token sozinho ganha a área mínima (16 x 10 casas) em volta dele.
    expect(areaDeInteresse({ colunas: 20, linhas: 15, tokens: [{ x: -6, y: -3, tamanho: 1 }] }, false, 48))
      .toEqual({ x: (-6 - 7.5) * 48, y: (-3 - 4.5) * 48, largura: 16 * 48, altura: 10 * 48 });
  });

  it("acha a casa livre mais próxima do centro, sem cair em cima de outro token", () => {
    expect(casaLivre({ x: 0, y: 0 }, [])).toEqual({ x: 0, y: 0 });
    const livre = casaLivre({ x: -6, y: -3 }, [{ x: -6, y: -3, tamanho: 1 }]);
    expect(Math.max(Math.abs(livre.x + 6), Math.abs(livre.y + 3))).toBe(1);
    // Um token grande ocupa várias casas.
    const perto = casaLivre({ x: 1, y: 1 }, [{ x: 0, y: 0, tamanho: 3 }]);
    expect(perto.x < 0 || perto.x > 2 || perto.y < 0 || perto.y > 2).toBe(true);
  });
});
