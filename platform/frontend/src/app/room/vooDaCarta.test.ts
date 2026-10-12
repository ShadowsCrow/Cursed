import { describe, expect, it } from "vitest";

import {
  ARCO_PX, duracaoDoVoo, MAXIMO_DE_ALVOS_ANIMADOS, PAUSA_MS, quadroDoVoo, SUBIDA_MS, SUBIDA_PX, SUMIDA_MS, VOLTA_MS, VOO_MS,
} from "./vooDaCarta";

const origem = { x: 100, y: 200 };

describe("voo da carta (cartas-na-cena, D7)", () => {
  it("sobe da origem, chega a cada alvo em sequência e some no último", () => {
    const alvos = [{ x: 400, y: 200 }, { x: 400, y: 500 }];
    const comeco = quadroDoVoo(0, origem, alvos);
    expect(comeco.posicao).toEqual(origem);
    expect(comeco.alpha).toBe(0);
    const topo = quadroDoVoo(SUBIDA_MS, origem, alvos);
    expect(topo.posicao).toEqual({ x: origem.x, y: origem.y - SUBIDA_PX });
    // No meio do voo até o primeiro alvo, a carta está entre os dois e acima da reta (arco).
    const meio = quadroDoVoo(SUBIDA_MS + VOO_MS / 2, origem, alvos);
    expect(meio.posicao.x).toBeCloseTo(250, 0);
    expect(meio.posicao.y).toBeLessThan(origem.y - SUBIDA_PX);
    expect(meio.posicao.y).toBeGreaterThanOrEqual(origem.y - SUBIDA_PX - ARCO_PX - 1);
    // Chega e para no primeiro alvo.
    const chegada = quadroDoVoo(SUBIDA_MS + VOO_MS + PAUSA_MS / 2, origem, alvos);
    expect(chegada.posicao).toEqual({ x: 400, y: 200 - SUBIDA_PX / 2 });
    // Depois do segundo alvo, some.
    const fim = quadroDoVoo(duracaoDoVoo(2), origem, alvos);
    expect(fim.terminou).toBe(true);
    expect(fim.alpha).toBe(0);
    expect(fim.posicao).toEqual({ x: 400, y: 500 - SUBIDA_PX / 2 });
    expect(quadroDoVoo(duracaoDoVoo(2) - 1, origem, alvos).terminou).toBe(false);
  });

  it("sem alvo, dá uma volta sobre a origem e some ali", () => {
    expect(duracaoDoVoo(0)).toBe(SUBIDA_MS + VOLTA_MS + SUMIDA_MS);
    const metade = quadroDoVoo(SUBIDA_MS + VOLTA_MS / 2, origem, []);
    expect(metade.posicao.x).toBeCloseTo(origem.x, 5);
    expect(metade.posicao.y).toBeLessThan(origem.y - SUBIDA_PX);
    const fim = quadroDoVoo(duracaoDoVoo(0), origem, []);
    expect(fim.terminou).toBe(true);
    expect(fim.posicao).toEqual({ x: origem.x, y: origem.y - SUBIDA_PX });
  });

  it("visita no máximo seis alvos; o resto só entra no registro", () => {
    const alvos = Array.from({ length: 9 }, (_, i) => ({ x: 100 * (i + 2), y: 100 }));
    expect(duracaoDoVoo(9)).toBe(SUBIDA_MS + MAXIMO_DE_ALVOS_ANIMADOS * (VOO_MS + PAUSA_MS) + SUMIDA_MS);
    const fim = quadroDoVoo(duracaoDoVoo(9), origem, alvos);
    expect(fim.terminou).toBe(true);
    expect(fim.posicao.x).toBe(alvos[MAXIMO_DE_ALVOS_ANIMADOS - 1]!.x);
  });
});
