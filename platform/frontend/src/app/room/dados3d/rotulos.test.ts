import { describe, expect, it } from "vitest";

import { TIPOS_DE_DADO } from "../dados";
import { POR_QUADRO, simularArremesso } from "./fisica";
import { dot, solido, type Forma } from "./geometria";
import {
  dadosParaAnimar, forcarResultado, girar, indiceDeCima, rotulosDaFaceDoD4, rotulosIniciais, valorDoPercentual,
  type Quaternio,
} from "./rotulos";

/** Gerador determinístico (mulberry32), para os arremessos do teste serem sempre os mesmos. */
function semente(valor: number) {
  let t = valor >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

describe("rótulos dos dados 3D", () => {
  it("numera de 1 a N com faces opostas somando N + 1", () => {
    for (const forma of ["d6", "d8", "d10", "d12", "d20"] as Forma[]) {
      const s = solido(forma);
      const rotulos = rotulosIniciais(forma);
      expect([...rotulos].map(Number).sort((a, b) => a - b)).toEqual(Array.from({ length: s.faces.length }, (_, i) => i + 1));
      s.normais.forEach((n, i) => {
        const oposta = s.normais.findIndex((m) => dot(n, m) < -0.999);
        expect(Number(rotulos[i]) + Number(rotulos[oposta])).toBe(s.faces.length + 1);
      });
    }
    expect(rotulosIniciais("d4")).toEqual(["1", "2", "3", "4"]);
    expect([...rotulosIniciais("d10", "dezenas")].sort()).toEqual(["00", "10", "20", "30", "40", "50", "60", "70", "80", "90"]);
    expect([...rotulosIniciais("d10", "unidades")].sort()).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  });

  it("divide o d100 em dezenas e unidades, com 00 e 0 valendo 100", () => {
    expect(dadosParaAnimar(100, 100).map((d) => d.rotulo)).toEqual(["00", "0"]);
    expect(dadosParaAnimar(100, 5).map((d) => d.rotulo)).toEqual(["00", "5"]);
    expect(dadosParaAnimar(100, 47).map((d) => d.rotulo)).toEqual(["40", "7"]);
    expect(dadosParaAnimar(100, 90).map((d) => d.rotulo)).toEqual(["90", "0"]);
    for (let v = 1; v <= 100; v += 1) {
      const [dezenas, unidades] = dadosParaAnimar(100, v);
      expect(valorDoPercentual(dezenas!.rotulo, unidades!.rotulo)).toBe(v);
    }
    expect(dadosParaAnimar(20, 17)).toEqual([{ forma: "d20", conjunto: "comum", rotulo: "17" }]);
  });

  it("acha a face de cima pela orientação", () => {
    const s = solido("d6");
    const identidade: Quaternio = [0, 0, 0, 1];
    const cima = indiceDeCima("d6", identidade);
    expect(s.normais[cima]![1]).toBeCloseTo(1, 6);
    // Meia volta no eixo x: a face de baixo vai para cima.
    const meiaVolta: Quaternio = [1, 0, 0, 0];
    expect(s.normais[indiceDeCima("d6", meiaVolta)]![1]).toBeCloseTo(-1, 6);
    expect(girar(meiaVolta, [0, 1, 0])[1]).toBeCloseTo(-1, 6);
  });

  it("forçar troca só os dois números envolvidos", () => {
    expect(forcarResultado(["1", "2", "3", "4"], 0, "3")).toEqual(["3", "2", "1", "4"]);
    expect(forcarResultado(["1", "2", "3", "4"], 2, "3")).toEqual(["1", "2", "3", "4"]);
    expect(() => forcarResultado(["1", "2"], 0, "9")).toThrow();
  });

  it("o d4 mostra em cada face os números dos três vértices dela", () => {
    const rotulos = ["1", "2", "3", "4"];
    solido("d4").faces.forEach((face, i) => {
      expect(rotulosDaFaceDoD4(rotulos, i)).toEqual(face.map((v) => rotulos[v]));
    });
  });
});

describe("arremessos simulados", () => {
  it("todos os dados param dentro das paredes, e o número de cima é sempre o sorteado", () => {
    const aleatorio = semente(42);
    const area = { largura: 24, profundidade: 14 };
    for (const faces of TIPOS_DE_DADO) {
      for (let tentativa = 0; tentativa < 6; tentativa += 1) {
        const valor = 1 + Math.floor(aleatorio() * faces);
        const dados = dadosParaAnimar(faces, valor);
        const arremesso = simularArremesso(dados.map((d) => d.forma), area, aleatorio);
        expect(arremesso.parados).toBe(true);
        const mostrados = dados.map((dado, i) => {
          const cima = indiceDeCima(dado.forma, arremesso.finais[i]!);
          const rotulos = forcarResultado(rotulosIniciais(dado.forma, dado.conjunto), cima, dado.rotulo);
          // A posição final fica dentro da área e sobre o chão.
          const final = arremesso.quadros[i]!.subarray((arremesso.passos - 1) * POR_QUADRO);
          expect(Math.abs(final[0]!)).toBeLessThan(area.largura / 2);
          expect(Math.abs(final[2]!)).toBeLessThan(area.profundidade / 2);
          expect(final[1]!).toBeLessThan(2);
          return rotulos[cima]!;
        });
        const lido = faces === 100 ? valorDoPercentual(mostrados[0]!, mostrados[1]!) : Number(mostrados[0]);
        expect(lido).toBe(valor);
      }
    }
  });

  it("vários dados de uma vez também param", () => {
    const arremesso = simularArremesso(["d20", "d20", "d6", "d6", "d8", "d12", "d4", "d10"], { largura: 24, profundidade: 14 }, semente(7));
    expect(arremesso.parados).toBe(true);
    expect(arremesso.passos).toBeGreaterThan(30);
  });
});
