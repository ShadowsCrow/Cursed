import { describe, expect, it } from "vitest";

import {
  acrescentarDado, ajustarModificador, descreverMontagem, MONTAGEM_VAZIA, removerDado, rolar, sortearFace, type FonteAleatoria, type Montagem,
} from "./dados";

/** Fonte que devolve os valores dados, em ordem. */
function sequencia(...valores: number[]): FonteAleatoria {
  let indice = 0;
  return () => valores[indice++]!;
}

describe("sortearFace", () => {
  it("dá sempre um valor entre 1 e o número de faces", () => {
    for (const faces of [4, 6, 8, 10, 12, 20, 100]) {
      for (let i = 0; i < 500; i += 1) {
        const valor = sortearFace(faces);
        expect(valor).toBeGreaterThanOrEqual(1);
        expect(valor).toBeLessThanOrEqual(faces);
        expect(Number.isInteger(valor)).toBe(true);
      }
    }
  });

  it("descarta os valores que dariam viés entre as faces", () => {
    // 2^32 % 6 = 4: os 4 valores do topo enviesariam as faces 1 a 4 e são descartados.
    const topo = 2 ** 32 - 1;
    expect(sortearFace(6, sequencia(topo, topo - 3, 5))).toBe(6);
    expect(sortearFace(6, sequencia(topo - 4))).toBe((topo - 4) % 6 + 1);
  });

  it("dá o d100 de 1 a 100", () => {
    expect(sortearFace(100, sequencia(0))).toBe(1);
    expect(sortearFace(100, sequencia(99))).toBe(100);
  });
});

describe("montagem", () => {
  it("monta 2d6 + 1d20 + 3 com os dados na ordem dos tipos", () => {
    let montagem: Montagem = MONTAGEM_VAZIA;
    montagem = acrescentarDado(montagem, 20);
    montagem = acrescentarDado(montagem, 6);
    montagem = acrescentarDado(montagem, 6);
    montagem = ajustarModificador(montagem, 3);
    expect(descreverMontagem(montagem)).toBe("2d6 + 1d20 + 3");
  });

  it("mostra o modificador negativo com o sinal tipográfico e omite o zero", () => {
    expect(descreverMontagem({ dados: { 20: 1 }, modificador: -1 })).toBe("1d20 − 1");
    expect(descreverMontagem({ dados: { 8: 3 }, modificador: 0 })).toBe("3d8");
  });

  it("fica vazia sem dados, mesmo com modificador", () => {
    expect(descreverMontagem({ dados: {}, modificador: 4 })).toBe("");
  });

  it("tira um dado do tipo, e some com o tipo quando chega a zero", () => {
    const montagem: Montagem = { dados: { 6: 2, 20: 1 }, modificador: 3 };
    expect(descreverMontagem(removerDado(montagem, 6))).toBe("1d6 + 1d20 + 3");
    expect(removerDado(montagem, 20).dados).toEqual({ 6: 2 });
    expect(removerDado(montagem, 4)).toBe(montagem);
  });

  it("limita a 99 dados por tipo e o modificador a ±99", () => {
    let montagem: Montagem = { dados: { 4: 99 }, modificador: 99 };
    expect(acrescentarDado(montagem, 4)).toBe(montagem);
    expect(ajustarModificador(montagem, 1)).toBe(montagem);
    montagem = { dados: {}, modificador: -99 };
    expect(ajustarModificador(montagem, -1).modificador).toBe(-99);
  });
});

describe("rolar", () => {
  it("soma os dados e o modificador e agrupa por tipo", () => {
    const rolagem = rolar({ dados: { 6: 2, 20: 1 }, modificador: 3 }, 1, sequencia(3, 5, 16));
    expect(rolagem.grupos).toEqual([{ faces: 6, valores: [4, 6] }, { faces: 20, valores: [17] }]);
    expect(rolagem.total).toBe(4 + 6 + 17 + 3);
    expect(rolagem.expressao).toBe("2d6 + 1d20 + 3");
  });

  it("aceita total negativo com modificador", () => {
    expect(rolar({ dados: { 4: 1 }, modificador: -5 }, 1, sequencia(0)).total).toBe(-4);
  });
});
