// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CHAVE_BARRA_RECOLHIDA, useBarraRecolhida, usePreferenciaLocal, usePreferenciaNumerica } from "./usePreferenciaLocal";

describe("preferência local da mesa", () => {
  afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear(); });

  it("a barra começa expandida na primeira visita", () => {
    const { result } = renderHook(() => useBarraRecolhida());
    expect(result.current[0]).toBe(false);
  });

  it("guarda a escolha e a devolve numa nova montagem", () => {
    const { result, unmount } = renderHook(() => useBarraRecolhida());
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem(CHAVE_BARRA_RECOLHIDA)).toBe("1");
    unmount();
    expect(renderHook(() => useBarraRecolhida()).result.current[0]).toBe(true);
  });

  it("usa o padrão pedido quando não há valor guardado", () => {
    expect(renderHook(() => usePreferenciaLocal("cursed:teste", true)).result.current[0]).toBe(true);
  });

  it("com o armazenamento bloqueado, começa no padrão e ainda alterna, sem erro", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("bloqueado"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("bloqueado"); });
    const { result } = renderHook(() => useBarraRecolhida());
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });

  it("preferência numérica: padrão, valor guardado, valor inválido e armazenamento bloqueado", () => {
    expect(renderHook(() => usePreferenciaNumerica("cursed:largura", 352)).result.current[0]).toBe(352);
    const { result } = renderHook(() => usePreferenciaNumerica("cursed:largura", 352));
    act(() => result.current[1](420));
    expect(window.localStorage.getItem("cursed:largura")).toBe("420");
    expect(renderHook(() => usePreferenciaNumerica("cursed:largura", 352)).result.current[0]).toBe(420);
    window.localStorage.setItem("cursed:largura", "largo");
    expect(renderHook(() => usePreferenciaNumerica("cursed:largura", 352)).result.current[0]).toBe(352);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("bloqueado"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("bloqueado"); });
    const bloqueado = renderHook(() => usePreferenciaNumerica("cursed:largura", 352));
    expect(bloqueado.result.current[0]).toBe(352);
    act(() => bloqueado.result.current[1](300));
    expect(bloqueado.result.current[0]).toBe(300);
  });
});
