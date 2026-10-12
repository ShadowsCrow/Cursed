import { describe, expect, it } from "vitest";

import { rotuloCampo } from "./fieldLabels";

describe("rotuloCampo", () => {
  it("rótulos legíveis da História e da ilustração nos pedidos e no histórico", () => {
    expect(rotuloCampo("personalidade.historia")).toBe("História");
    expect(rotuloCampo("personagem.ilustracao_ativo")).toBe("Ilustração");
    expect(rotuloCampo("atributos.valores.Força")).toBe("Força (base)");
  });

  it("Frase marcante e Traços (reformular-personalidade-da-ficha)", () => {
    expect(rotuloCampo("personalidade.frase")).toBe("Frase marcante");
    expect(rotuloCampo("personalidade.tracos")).toBe("Traços");
  });
});
