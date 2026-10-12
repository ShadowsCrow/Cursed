import { describe, expect, it, vi } from "vitest";

// PixiJS de mentira que registra os círculos: o jsdom não desenha WebGL.
vi.mock("pixi.js", () => {
  class Graphics {
    circulos: { raio: number; tipo: string; cor: number }[] = [];
    eventMode = "auto";
    private ultimo = 0;
    circle(_x: number, _y: number, raio: number) { this.ultimo = raio; return this; }
    fill(estilo: { color: number }) { this.circulos.push({ raio: this.ultimo, tipo: "halo", cor: estilo.color }); return this; }
    stroke(estilo: { color: number }) { this.circulos.push({ raio: this.ultimo, tipo: "aro", cor: estilo.color }); return this; }
  }
  return { Graphics };
});

import { COR_DO_BRILHO } from "./brilhoDaVez";
import { COR_DA_SELECAO, criarAroDeSelecao } from "./selecaoDoToken";

describe("destaque do token escolhido", () => {
  it("é um aro azul-gelo por fora do token, sem receber eventos, de cor diferente do brilho da vez", () => {
    const aro = criarAroDeSelecao(48) as unknown as { circulos: { raio: number; tipo: string; cor: number }[]; eventMode: string };
    expect(aro.circulos.map((c) => c.tipo)).toEqual(["halo", "aro"]);
    expect(aro.circulos.every((c) => c.raio > 48 / 2 - 3 && c.cor === COR_DA_SELECAO)).toBe(true);
    expect(aro.eventMode).toBe("none");
    expect(COR_DA_SELECAO).not.toBe(COR_DO_BRILHO);
  });
});
