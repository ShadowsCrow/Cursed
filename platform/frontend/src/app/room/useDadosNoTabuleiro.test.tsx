// @vitest-environment jsdom
import { cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Faces } from "./dados";
import { MAXIMO_DE_DADOS_ANIMADOS, useDadosNoTabuleiro } from "./useDadosNoTabuleiro";

const criar = vi.hoisted(() => vi.fn());
vi.mock("./dados3d/cena", () => ({ criarMesaDeDados: criar }));

const rolagem = (faces: Faces, quantos: number) => ({ grupos: [{ faces, valores: Array.from({ length: quantos }, () => 1) }] });

describe("camada dos dados no tabuleiro", () => {
  afterEach(() => { cleanup(); criar.mockReset(); });

  it("é ignorada por leitores de tela", () => {
    const { result } = renderHook(() => useDadosNoTabuleiro());
    const { container } = render(result.current.camada);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(container.firstElementChild?.className).toContain("dados-no-tabuleiro");
  });

  it("sem WebGL, resolve na hora (o resultado aparece direto)", async () => {
    criar.mockRejectedValue(new Error("Sem WebGL."));
    const { result } = renderHook(() => useDadosNoTabuleiro());
    render(result.current.camada);
    await expect(result.current.animar(rolagem(20, 1))).resolves.toBeUndefined();
  });

  it("acima de 30 dados, nem carrega a cena 3D", async () => {
    const { result } = renderHook(() => useDadosNoTabuleiro());
    render(result.current.camada);
    await result.current.animar(rolagem(6, MAXIMO_DE_DADOS_ANIMADOS + 1));
    expect(criar).not.toHaveBeenCalled();
  });

  it("lança um dado por dado da rolagem, e dois no d100", async () => {
    const rolar = vi.fn().mockResolvedValue(undefined);
    criar.mockResolvedValue({ rolar, destruir: vi.fn() });
    const { result } = renderHook(() => useDadosNoTabuleiro());
    render(result.current.camada);
    await result.current.animar({ grupos: [{ faces: 6, valores: [3, 5] }, { faces: 100, valores: [47] }] });
    expect(rolar).toHaveBeenCalledWith([
      { forma: "d6", conjunto: "comum", rotulo: "3" }, { forma: "d6", conjunto: "comum", rotulo: "5" },
      { forma: "d10", conjunto: "dezenas", rotulo: "40" }, { forma: "d10", conjunto: "unidades", rotulo: "7" },
    ]);
  });
});
