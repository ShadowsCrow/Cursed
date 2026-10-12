import { describe, expect, it } from "vitest";

import casos from "../../../../../fixtures/criacao/casos.json";
import { CATALOGO_FRAMEWORK } from "./testing";
import { calcular, custoDeUso, textoDoAlcance, type Natureza } from "./criacao";

describe("cálculos do Framework (fixtures/criacao/casos.json)", () => {
  it.each(casos.graus)("$nome", (caso) => {
    const calculados = calcular(CATALOGO_FRAMEWORK, caso.natureza as Natureza, { custo_aprendizado: caso.custo });
    expect({ grau: calculados.grau, descansos: calculados.descansos, abaixo_do_minimo: calculados.abaixoDoMinimo }).toEqual(caso.esperado);
  });

  it.each(casos.custo_uso)("Custo de Uso: $nome", (caso) => {
    expect(custoDeUso(CATALOGO_FRAMEWORK, caso.potencia, caso.tipo)).toBe(caso.esperado);
  });

  it("mostra o alcance pelo rótulo ou em metros", () => {
    expect(textoDoAlcance(CATALOGO_FRAMEWORK, { tipo: "toque" })).toBe("Toque");
    expect(textoDoAlcance(CATALOGO_FRAMEWORK, { tipo: "arma" })).toBe("Alcance da arma");
    expect(textoDoAlcance(CATALOGO_FRAMEWORK, { tipo: "metros", metros: 12 })).toBe("12 metros");
    expect(textoDoAlcance(CATALOGO_FRAMEWORK, { tipo: "metros", metros: 1 })).toBe("1 metro");
    expect(textoDoAlcance(CATALOGO_FRAMEWORK, null)).toBeNull();
  });
});
