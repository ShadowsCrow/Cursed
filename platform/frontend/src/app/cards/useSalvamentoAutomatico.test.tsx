// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { ancoraDoProblema, rotuloDaAncora } from "./usoDosProblemas";
import { useSalvamentoAutomatico } from "./useSalvamentoAutomatico";
import type { CartaDefinicaoResumo, TipoCarta } from "./types";

/* Salvamento automático (simplificar-criacao-de-cartas, D2 e D4) e âncoras dos problemas (D5). */

function definicao(id: string, versao: number, rascunho: Record<string, unknown>, tipo: TipoCarta = "habilidade"): CartaDefinicaoResumo {
  return { id, tipo, versao, rascunho, procedencia_rascunho: {}, versao_publicada: null, publicada: null, arquivada: false };
}

function envolver() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

/** API com o PUT controlado pelo teste: cada envio fica pendente até `liberar`. */
function apiControlada() {
  const pendentes: Array<() => void> = [];
  const corpos: Array<Record<string, unknown>> = [];
  const POST = vi.fn(async (caminho: string, { body }: { body?: unknown } = {}) => {
    if (caminho.endsWith("/validacao")) return { data: { valida: true, problemas: [], revisao_pendente: [] }, response: { status: 200 } };
    const { tipo, rascunho } = body as { tipo: TipoCarta; rascunho: Record<string, unknown> };
    corpos.push({ criar: rascunho });
    return { data: definicao("nova", 0, rascunho, tipo), response: { status: 201 } };
  });
  const PUT = vi.fn((_caminho: string, { body }: { body: { rascunho: Record<string, unknown>; versao_esperada: number } }) => {
    corpos.push({ salvar: body.rascunho, versao: body.versao_esperada });
    return new Promise((resolver) => pendentes.push(() => resolver({
      data: definicao("nova", body.versao_esperada + 1, body.rascunho), response: { status: 200 },
    })));
  });
  return { api: { POST, PUT, GET: vi.fn() } as unknown as ApiClient, POST, PUT, pendentes, corpos };
}

describe("useSalvamentoAutomatico", () => {
  it("sem título não cria; a primeira alteração com título faz POST e as seguintes PUT, uma por vez", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { api, PUT, pendentes, corpos } = apiControlada();
    let estado = { tipo: "habilidade" as TipoCarta, rascunho: {} as Record<string, unknown> };
    const { result } = renderHook(() => useSalvamentoAutomatico({ api, mesaId: "m", inicial: null, ler: () => estado, atraso: 100 }),
      { wrapper: envolver() });

    act(() => { estado = { ...estado, rascunho: { texto: "Sem título" } }; result.current.marcarAlteracao(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    expect(corpos).toEqual([]);

    act(() => { estado = { ...estado, rascunho: { titulo: "Passo" } }; result.current.marcarAlteracao(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    await waitFor(() => expect(result.current.definicao?.id).toBe("nova"));
    expect(corpos).toEqual([{ criar: { titulo: "Passo" } }]);

    // Primeiro PUT fica pendente; o que muda nesse meio-tempo vai num segundo PUT, com a versão devolvida.
    act(() => { estado = { ...estado, rascunho: { titulo: "Passo Leve" } }; result.current.marcarAlteracao(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    expect(PUT).toHaveBeenCalledTimes(1);
    act(() => { estado = { ...estado, rascunho: { titulo: "Passo Leve!" } }; result.current.marcarAlteracao(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    expect(PUT).toHaveBeenCalledTimes(1);
    await act(async () => { pendentes.shift()?.(); await vi.advanceTimersByTimeAsync(10); });
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(2));
    expect(corpos.slice(1)).toEqual([{ salvar: { titulo: "Passo Leve" }, versao: 0 }, { salvar: { titulo: "Passo Leve!" }, versao: 1 }]);
    await act(async () => { pendentes.shift()?.(); await vi.advanceTimersByTimeAsync(10); });
    await waitFor(() => expect(result.current.estado).toBe("salvo"));
    expect(result.current.pendente).toBe(false);
    vi.useRealTimers();
  });

  it("conflito (409) para os salvamentos seguintes", async () => {
    const PUT = vi.fn(async () => ({ error: { detail: "Rascunho alterado por outra edição." }, response: { status: 409 } }));
    const api = { PUT, POST: vi.fn(async () => ({ data: { valida: true, problemas: [], revisao_pendente: [] }, response: { status: 200 } })), GET: vi.fn() } as unknown as ApiClient;
    const estado = { tipo: "habilidade" as TipoCarta, rascunho: { titulo: "A" } };
    const { result } = renderHook(() => useSalvamentoAutomatico({ api, mesaId: "m", inicial: definicao("c1", 4, {}), ler: () => estado, atraso: 10 }),
      { wrapper: envolver() });
    act(() => result.current.marcarAlteracao());
    await waitFor(() => expect(result.current.estado).toBe("conflito"));
    act(() => result.current.marcarAlteracao());
    await act(async () => { await result.current.salvarAgora(); });
    expect(PUT).toHaveBeenCalledTimes(1);
  });

  it("garantirSalva sem título falha com a explicação", async () => {
    const { api } = apiControlada();
    const { result } = renderHook(() => useSalvamentoAutomatico({ api, mesaId: "m", inicial: null, ler: () => ({ tipo: "item", rascunho: {} }) }),
      { wrapper: envolver() });
    await expect(result.current.garantirSalva()).rejects.toThrow(/Escreva o título/);
  });
});

describe("âncoras dos problemas", () => {
  it("cada caminho do servidor vai para o quadro que o Narrador vê", () => {
    expect(ancoraDoProblema("formato")).toBe("formato");
    expect(ancoraDoProblema("item_tipo")).toBe("formato");
    expect(ancoraDoProblema("formato.largura")).toBe("formato.dimensao");
    expect(ancoraDoProblema("formato.mochila.linhas")).toBe("formato.mochila");
    expect(ancoraDoProblema("formato.icone_grade")).toBe("icone");
    expect(ancoraDoProblema("dados.tipo_dano")).toBe("dados.tipo_dano");
    expect(ancoraDoProblema("efeitos.0.modificadores")).toBe("efeitos.0");
    expect(ancoraDoProblema("custos_adicionais.1.recurso")).toBe("custos_adicionais.1");
    expect(ancoraDoProblema("ativos.0")).toBe("arte");
    expect(ancoraDoProblema("texto")).toBe("texto");
    expect(rotuloDaAncora("efeitos.0")).toBe("Efeito 1");
    expect(rotuloDaAncora("formato")).toBe("O que é?");
    expect(rotuloDaAncora("algo.estranho")).toBe("Carta");
  });
});
