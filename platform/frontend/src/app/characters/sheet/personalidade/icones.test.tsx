// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import listas from "../../../../../../../cursed_platform/catalogos/listas_ficha.json";
import { IconePersonalidade } from "./icones";
import { NOMES_ICONES_PERSONALIDADE } from "./nomesDosIcones";

// A igualdade com ICONES_PERSONALIDADE do servidor é conferida em test_catalogos.py (PersonalidadeTest).
describe("ícones da aba Personalidade (reformular-personalidade-da-ficha, D7)", () => {
  afterEach(() => cleanup());

  it("todo ícone do JSON do sistema tem desenho", () => {
    const usados = [
      ...listas.campos_personalidade.map((c) => (c as { icone?: string }).icone).filter(Boolean),
      ...listas.grupos_personalidade.map((g) => g.emblema),
      ...Object.values(listas.icones_personalidade),
    ];
    for (const nome of usados) expect(NOMES_ICONES_PERSONALIDADE).toContain(nome);
  });

  it("cada ícone é decorativo e sem foco", () => {
    for (const nome of NOMES_ICONES_PERSONALIDADE) {
      const { container, unmount } = render(<IconePersonalidade nome={nome} />);
      const svg = container.querySelector("svg")!;
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.getAttribute("focusable")).toBe("false");
      expect(svg.children.length).toBeGreaterThan(0);
      unmount();
    }
  });
});
