import { describe, expect, it } from "vitest";
import { pontoFixoNoZoom, proximoZoom } from "./viewport";

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
});
