// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARTE_DA_GRAVURA, arteDaFaixa, esquecerPinturasDasCartas, usePintura } from "./pinturasDasCartas";

/** Imagem simulada: as URLs em `faltam` falham; as outras carregam. Conta quantas vezes cada uma foi pedida. */
function simularImagens(faltam: string[]) {
  const pedidas: string[] = [];
  vi.stubGlobal("Image", class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(url: string) {
      pedidas.push(url);
      queueMicrotask(() => (faltam.includes(url) ? this.onerror?.() : this.onload?.()));
    }
  });
  return pedidas;
}

beforeEach(() => esquecerPinturasDasCartas());
afterEach(() => vi.unstubAllGlobals());

describe("pinturas da aba Cartas", () => {
  it("nomeia a faixa pela categoria, com hífens", () => {
    expect(arteDaFaixa("habilidades")).toBe("/arte/cartas/cartas-faixa-habilidades.webp");
    expect(arteDaFaixa("itens_de_missao")).toBe("/arte/cartas/cartas-faixa-itens-de-missao.webp");
    expect(ARTE_DA_GRAVURA).toBe("/arte/cartas/cartas-gravura.webp");
  });

  it("começa carregando e fica pronta quando a pintura chega", async () => {
    simularImagens([]);
    const { result } = renderHook(() => usePintura(arteDaFaixa("habilidades")));
    expect(result.current).toBe("carregando");
    await waitFor(() => expect(result.current).toBe("pronta"));
  });

  it("uma categoria sem pintura não afeta as outras", async () => {
    simularImagens([arteDaFaixa("magias")]);
    const magias = renderHook(() => usePintura(arteDaFaixa("magias")));
    const armas = renderHook(() => usePintura(arteDaFaixa("armas")));
    await waitFor(() => expect(magias.result.current).toBe("ausente"));
    await waitFor(() => expect(armas.result.current).toBe("pronta"));
  });

  it("vale para a sessão: cartas da mesma categoria dividem um carregamento só", async () => {
    const pedidas = simularImagens([]);
    const primeira = renderHook(() => usePintura(arteDaFaixa("efeitos")));
    const segunda = renderHook(() => usePintura(arteDaFaixa("efeitos")));
    await waitFor(() => expect(primeira.result.current).toBe("pronta"));
    await waitFor(() => expect(segunda.result.current).toBe("pronta"));
    const terceira = renderHook(() => usePintura(arteDaFaixa("efeitos")));
    expect(terceira.result.current).toBe("pronta");
    expect(pedidas.filter((url) => url === arteDaFaixa("efeitos"))).toHaveLength(1);
  });
});
