import { describe, expect, it } from "vitest";

import { GRUPOS_ATRIBUTOS, GRUPOS_PERICIAS } from "../sheet/sheetCatalog";
import {
  DISTRIBUICAO, TOTAL_PADRAO, avaliar, mensagemDeLimite, mensagemSemVaga, problemas, vagaPara, type Valores,
} from "./distribuicao";

const ATRIBUTOS = GRUPOS_ATRIBUTOS.flatMap((g) => g.nomes);
const PERICIAS = GRUPOS_PERICIAS.flatMap((g) => g.nomes);

const completa: Valores = {
  Vigor: 3, "Força": 2, Destreza: 2, Proposito: 2, "Inteligência": 2,
  Carisma: 1, "Manipulação": 1, "Percepção": 1, "Raciocínio": 1,
};

describe("distribuição padrão do livro", () => {
  it("totaliza 15 pontos de Atributo e 13 de Perícia", () => {
    for (const categoria of ["atributos", "pericias"] as const) {
      const d = DISTRIBUICAO[categoria];
      expect(3 * d[3] + 2 * d[2] + d[1]).toBe(TOTAL_PADRAO[categoria]);
    }
  });

  it("Atributos: distribuição completa fecha", () => {
    const estado = avaliar("atributos", ATRIBUTOS, completa);
    expect(estado).toMatchObject({ fecha: true, faltam: { 3: 0, 2: 0, 1: 0 }, excedentes: [], semValor: [] });
  });

  it("Atributos: atributo sem valor não fecha e conta o que falta", () => {
    const estado = avaliar("atributos", ATRIBUTOS, { ...completa, Vigor: undefined, "Raciocínio": undefined });
    expect(estado.fecha).toBe(false);
    expect(estado.faltam).toEqual({ 3: 1, 2: 0, 1: 1 });
    expect(estado.semValor).toEqual(["Vigor", "Raciocínio"]);
    expect(avaliar("atributos", ATRIBUTOS, {}).faltam).toEqual({ 3: 1, 2: 4, 1: 4 });
  });

  it("Atributos: valor excedido é recusado e diz onde está", () => {
    const vaga = vagaPara("atributos", ATRIBUTOS, completa, "Força", 3);
    expect(vaga).toEqual({ cabe: false, ocupadoPor: ["Vigor"] });
    expect(mensagemSemVaga("atributos", 3, ["Vigor"])).toBe("O único 3 já foi usado em Vigor.");
    expect(vagaPara("atributos", ATRIBUTOS, completa, "Vigor", 3)).toEqual({ cabe: true });
    const estado = avaliar("atributos", ATRIBUTOS, { ...completa, "Força": 3 });
    expect(estado.fecha).toBe(false);
    expect(estado.excedentes).toEqual([{ valor: 3, permitido: 1, nomes: ["Força", "Vigor"] }]);
    expect(problemas("atributos", estado)[0]).toContain("Só um Atributo pode ter 3");
  });

  it("Perícias: as não escolhidas ficam em 0 e a distribuição fecha", () => {
    const valores: Valores = { Arcanismo: 3, "Acadêmicos": 2, "Investigação": 2, "Prontidão": 2,
      Ocultismo: 1, Linguistica: 1, Medicina: 1, Esquiva: 1 };
    const estado = avaliar("pericias", PERICIAS, valores);
    expect(estado).toMatchObject({ fecha: true, semValor: [], excedentes: [] });
  });

  it("Perícias: cinco com 1 excedem e não fecham", () => {
    const valores: Valores = { Arcanismo: 3, "Acadêmicos": 2, "Investigação": 2, "Prontidão": 2,
      Ocultismo: 1, Linguistica: 1, Medicina: 1, Esquiva: 1, Briga: 1 };
    const estado = avaliar("pericias", PERICIAS, valores);
    expect(estado.fecha).toBe(false);
    expect(estado.excedentes).toEqual([{ valor: 1, permitido: 4, nomes: ["Briga", "Esquiva", "Linguistica", "Medicina", "Ocultismo"].sort((a, b) => PERICIAS.indexOf(a) - PERICIAS.indexOf(b)) }]);
    expect(problemas("pericias", estado)[0]).toContain("Só quatro Perícias podem ter 1");
    expect(mensagemSemVaga("pericias", 1, ["Ocultismo", "Linguistica", "Medicina", "Esquiva"]))
      .toBe("Os quatro 1 já foram usados em Ocultismo, Linguistica, Medicina e Esquiva.");
  });

  it("limites de 1 a 5 (Atributos) e 0 a 5 (Perícias)", () => {
    expect(avaliar("atributos", ATRIBUTOS, { ...completa, Vigor: 6 }).foraDoLimite).toEqual([{ nome: "Vigor", valor: 6 }]);
    expect(avaliar("atributos", ATRIBUTOS, { ...completa, Carisma: 0 }).foraDoLimite).toEqual([{ nome: "Carisma", valor: 0 }]);
    const livre = avaliar("atributos", ATRIBUTOS, { ...completa, "Força": 4, Destreza: 4 });
    expect(livre).toMatchObject({ fecha: false, dentroDosLimites: true });
    expect(avaliar("pericias", PERICIAS, { Arcanismo: 6 }).foraDoLimite).toEqual([{ nome: "Arcanismo", valor: 6 }]);
    expect(avaliar("pericias", PERICIAS, { Arcanismo: -1 }).foraDoLimite).toEqual([{ nome: "Arcanismo", valor: -1 }]);
    expect(avaliar("pericias", PERICIAS, { Arcanismo: 5 }).dentroDosLimites).toBe(true);
    expect(mensagemDeLimite("atributos")).toBe("O Atributo base vai de 1 a 5.");
    expect(mensagemDeLimite("pericias")).toBe("A Perícia base vai de 0 a 5.");
  });
});
