// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useConnectivityStatus } from "./useConnectivityStatus";

function setOnLine(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { value, configurable: true });
}

describe("useConnectivityStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setOnLine(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("começa online quando o navegador reporta conexão", () => {
    const { result } = renderHook(() => useConnectivityStatus());
    expect(result.current).toBe("online");
  });

  it("começa offline quando o navegador já está sem conexão", () => {
    setOnLine(false);
    const { result } = renderHook(() => useConnectivityStatus());
    expect(result.current).toBe("offline");
  });

  it("passa por 'reconectando' antes de confirmar 'online' ao voltar a conexão", () => {
    setOnLine(false);
    const { result } = renderHook(() => useConnectivityStatus(1000));
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(result.current).toBe("offline");

    act(() => { window.dispatchEvent(new Event("online")); });
    expect(result.current).toBe("reconectando");

    act(() => { vi.advanceTimersByTime(999); });
    expect(result.current).toBe("reconectando");

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe("online");
  });

  it("volta para offline imediatamente se a conexão cair de novo durante a reconexão", () => {
    const { result } = renderHook(() => useConnectivityStatus(1000));
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(result.current).toBe("offline");
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(result.current).toBe("reconectando");
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(result.current).toBe("offline");
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current).toBe("offline");
  });
});
