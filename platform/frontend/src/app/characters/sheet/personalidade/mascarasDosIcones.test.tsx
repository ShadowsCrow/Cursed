// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IconePersonalidade } from "./icones";
import { reiniciarMascarasDosIcones } from "./mascarasDosIcones";

/** Imagem de mentira: carrega ou falha logo depois de receber o `src` (no jsdom, nenhuma imagem carrega). */
function imagemQue(carrega: boolean) {
  return class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_valor: string) { queueMicrotask(() => (carrega ? this.onload?.() : this.onerror?.())); }
  };
}

async function montar(carrega: boolean) {
  reiniciarMascarasDosIcones();
  vi.stubGlobal("Image", imagemQue(carrega));
  const tela = render(<IconePersonalidade nome="aranha" tamanho={40} />);
  await act(async () => { await new Promise((fim) => setTimeout(fim, 0)); });
  return tela;
}

describe("ícones recortados da referência (reformular-personalidade-da-ficha, D7)", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); reiniciarMascarasDosIcones(); });

  it("com as 14 máscaras carregadas, mostra a máscara no tamanho da referência, sem mudar o espaço", async () => {
    const { container } = await montar(true);
    const mascara = container.querySelector<HTMLElement>(".personalidade-icone--mascara")!;
    expect(mascara).not.toBeNull();
    expect(mascara.getAttribute("aria-hidden")).toBe("true");
    expect(mascara.style.width).toBe("48px");
    expect(mascara.style.margin).toBe("-4px");
    expect(mascara.style.getPropertyValue("--icone")).toContain("/arte/personalidade/icones/aranha.webp");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("se alguma máscara falha, fica o desenho em SVG", async () => {
    const { container } = await montar(false);
    expect(container.querySelector(".personalidade-icone--mascara")).toBeNull();
    expect(container.querySelector("svg.personalidade-icone--aranha")).not.toBeNull();
  });
});
