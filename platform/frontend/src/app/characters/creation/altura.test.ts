import { describe, expect, it } from "vitest";

import { intervaloAplicavel, lerAltura, problemaDeAltura, tamanhoVizinho, textoIntervalo } from "./altura";

const FAIXAS = [["Minúsculo", 0.1, 0.6], ["Pequeno", 0.6, 1.4], ["Médio", 1.4, 2.1], ["Grande", 2.1, 3], ["Enorme", 3, 5], ["Colossal", 5, null]]
  .map(([tamanho, minima, maxima]) => ({ tamanho: tamanho as string, minima: minima as number, maxima: maxima as number | null }));
const HUMANO = { nome: "Humano", tamanho: "Médio", deslocamento: 9, habilidades: [], altura: { minima: 1.55, maxima: 1.9 } };

describe("altura", () => {
  it("lê metros com vírgula ou ponto e recusa o que não é altura", () => {
    expect(lerAltura("")).toEqual({ vazia: true });
    expect(lerAltura("1,75")).toEqual({ vazia: false, valor: 1.75 });
    expect(lerAltura("1.8 m")).toEqual({ vazia: false, valor: 1.8 });
    expect(lerAltura("alto")).toEqual({ vazia: false, valor: null });
    expect(lerAltura("0")).toEqual({ vazia: false, valor: null });
  });

  it("vizinho é um passo; não há passo abaixo de Minúsculo nem acima de Colossal", () => {
    expect(tamanhoVizinho(FAIXAS, "Médio", "acima")?.tamanho).toBe("Grande");
    expect(tamanhoVizinho(FAIXAS, "medio", "abaixo")?.tamanho).toBe("Pequeno");
    expect(tamanhoVizinho(FAIXAS, "Minúsculo", "abaixo")).toBeNull();
    expect(tamanhoVizinho(FAIXAS, "Colossal", "acima")).toBeNull();
    expect(tamanhoVizinho(FAIXAS, "Desconhecido", "acima")).toBeNull();
  });

  it("intervalo: o da raça na média, a faixa do vizinho fora dela, Colossal sem teto", () => {
    expect(intervaloAplicavel(HUMANO, "", FAIXAS)).toEqual({ tamanho: "Médio", minima: 1.55, maxima: 1.9, foraDaMedia: false });
    expect(intervaloAplicavel(HUMANO, "acima", FAIXAS)).toEqual({ tamanho: "Grande", minima: 2.1, maxima: 3, foraDaMedia: true });
    expect(textoIntervalo({ minima: 5, maxima: null })).toBe("acima de 5,00 m");
    expect(problemaDeAltura("1,75", HUMANO, "", FAIXAS)).toBeNull();
    expect(problemaDeAltura("2,3", HUMANO, "", FAIXAS)).toContain("fora da média");
    expect(problemaDeAltura("2,3", HUMANO, "acima", FAIXAS)).toBeNull();
    expect(problemaDeAltura("1,2", HUMANO, "abaixo", FAIXAS)).toBeNull();
  });
});
