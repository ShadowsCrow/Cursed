// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRoomEphemera } from "./useRoomEphemera";

describe("sinais efêmeros da sala", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("envia cursor, ping e arraste por broadcast e descarta prévias canceladas ou perdidas", async () => {
    const handlers = new Map<string, (mensagem: { payload: Record<string, unknown> }) => void>();
    let status: (valor: "SUBSCRIBED" | "CHANNEL_ERROR") => void = () => {};
    const send = vi.fn().mockResolvedValue({});
    const canal = {
      on: vi.fn((_tipo: string, filtro: { event: string }, handler: typeof handlers extends Map<string, infer T> ? T : never) => {
        handlers.set(filtro.event, handler);
        return canal;
      }),
      subscribe: vi.fn((callback: typeof status) => { status = callback; return canal; }),
      send,
    };
    const removeChannel = vi.fn().mockResolvedValue({});
    const channel = vi.fn(() => canal);
    const client = { channel, removeChannel, realtime: { setAuth: vi.fn().mockResolvedValue(undefined) } } as unknown as SupabaseClient;
    const { result, unmount } = renderHook(() => useRoomEphemera("mesa", "ana", { client, accessToken: "token" }));
    await waitFor(() => expect(channel).toHaveBeenCalledOnce());
    expect(channel).toHaveBeenCalledWith("mesa:mesa", { config: { private: true } });
    act(() => { status("SUBSCRIBED"); });
    act(() => {
      result.current.cursor(1, 2);
      result.current.ping(3, 4);
      result.current.arraste("t1", 5, 6);
      result.current.cancelarArraste("t1");
    });
    expect(send).toHaveBeenCalledTimes(4);
    expect(send).toHaveBeenNthCalledWith(3, {
      type: "broadcast", event: "sala.arraste",
      payload: { token_id: "t1", x: 5, y: 6, ativo: true, usuario_id: "ana" },
    });
    act(() => { handlers.get("sala.arraste")?.({ payload: {
      usuario_id: "bia", token_id: "t2", x: 2, y: 3, ativo: true,
    } }); });
    expect(result.current.arrastes).toHaveLength(1);
    act(() => { handlers.get("sala.arraste")?.({ payload: {
      usuario_id: "bia", token_id: "t2", x: 0, y: 0, ativo: false,
    } }); });
    expect(result.current.arrastes).toHaveLength(0);
    act(() => { handlers.get("sala.cursor")?.({ payload: { usuario_id: "bia", x: 1, y: 1 } }); });
    expect(result.current.cursores).toHaveLength(1);
    act(() => { status("CHANNEL_ERROR"); });
    expect(result.current.cursores).toHaveLength(0);
    unmount();
    expect(removeChannel).toHaveBeenCalledOnce();
  });
});
