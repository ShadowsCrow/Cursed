// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  sheetKeys,
  useEquipCommand,
  useFichaSnapshot,
  useSalvarCampoFicha,
} from "./sheetApi";
import type { ApiClient, FichaSnapshot, ItemInventarioResumo } from "../types";

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const fichaBase: FichaSnapshot = {
  mesa_id: "mesa-1",
  personagem_id: "pj-1",
  versao: 2,
  ficha: { personagem: { nome: "Nara Exemplo" } },
};

describe("sheetApi — 6.4 comando de gravação da ficha", () => {
  it("useFichaSnapshot carrega o snapshot confirmado", async () => {
    const GET = vi.fn().mockResolvedValue({ data: fichaBase, error: undefined });
    const api = { GET } as unknown as ApiClient;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useFichaSnapshot(api, "mesa-1", "pj-1"), { wrapper: wrapper(queryClient) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(fichaBase);
  });

  it("uma resposta 200 confirma a gravação e atualiza o cache da ficha", async () => {
    const novaFicha: FichaSnapshot = { ...fichaBase, versao: 3, ficha: { personagem: { nome: "Nara Renomeada" } } };
    const PUT = vi.fn().mockResolvedValue({ data: novaFicha, error: undefined, response: { status: 200 } });
    const api = { PUT } as unknown as ApiClient;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    queryClient.setQueryData(sheetKeys.ficha("mesa-1", "pj-1"), fichaBase);

    const { result } = renderHook(() => useSalvarCampoFicha(api, "mesa-1", "pj-1", "usuario-1"), { wrapper: wrapper(queryClient) });
    const resultado = await result.current.mutateAsync({ path: "personagem.nome", value: "Nara Renomeada", ficha: fichaBase.ficha, versao: 2 });

    expect(resultado.status).toBe("salvo");
    expect(queryClient.getQueryData(sheetKeys.ficha("mesa-1", "pj-1"))).toEqual(novaFicha);
    expect(PUT).toHaveBeenCalledWith(
      "/mesas/{mesa_id}/personagens/{personagem_id}/ficha",
      expect.objectContaining({
        body: expect.objectContaining({
          ator_id: "usuario-1",
          mesa_id: "mesa-1",
          personagem_id: "pj-1",
          versao_esperada: 2,
          ficha: { personagem: { nome: "Nara Renomeada" } },
        }),
      }),
    );
  });

  it("uma resposta 202 indica aprovação pendente e não altera a ficha exibida", async () => {
    const pedido = { id: "pedido-1", estado: "pendente", campos_alterados: ["personagem.nome"] };
    const PUT = vi.fn().mockResolvedValue({ data: pedido, error: undefined, response: { status: 202 } });
    const api = { PUT } as unknown as ApiClient;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    queryClient.setQueryData(sheetKeys.ficha("mesa-1", "pj-1"), fichaBase);

    const { result } = renderHook(() => useSalvarCampoFicha(api, "mesa-1", "pj-1", "usuario-1"), { wrapper: wrapper(queryClient) });
    const resultado = await result.current.mutateAsync({ path: "personagem.nome", value: "Nara Renomeada", ficha: fichaBase.ficha, versao: 2 });

    expect(resultado.status).toBe("pendente");
    expect(queryClient.getQueryData(sheetKeys.ficha("mesa-1", "pj-1"))).toEqual(fichaBase);
  });

  it("forçar o envio de um campo bloqueado recebe o 403 real do servidor, e a ficha exibida não muda", async () => {
    // O componente esconde o controle quando o campo está bloqueado, mas o comando em
    // si (chamado aqui diretamente, simulando alguém contornando a interface) nunca
    // finge sucesso: o erro do servidor é propagado e nada no cache é alterado.
    const PUT = vi.fn().mockResolvedValue({
      data: undefined,
      error: { detail: "Alteração bloqueada pelo Narrador." },
      response: { status: 403 },
    });
    const api = { PUT } as unknown as ApiClient;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    queryClient.setQueryData(sheetKeys.ficha("mesa-1", "pj-1"), fichaBase);

    const { result } = renderHook(() => useSalvarCampoFicha(api, "mesa-1", "pj-1", "usuario-1"), { wrapper: wrapper(queryClient) });
    await expect(
      result.current.mutateAsync({ path: "personagem.nivel", value: 9, ficha: fichaBase.ficha, versao: 2 }),
    ).rejects.toThrow("Alteração bloqueada pelo Narrador.");

    expect(queryClient.getQueryData(sheetKeys.ficha("mesa-1", "pj-1"))).toEqual(fichaBase);
  });
});

describe("sheetApi — 6.6 comando de equipar/desequipar", () => {
  const item: ItemInventarioResumo = {
    id: "item-1",
    tipo: "armadura",
    nome: "Cota de malha",
    quantidade: 1,
    equipado: false,
    cargas_atuais: null,
    cargas_maximas: null,
    dados: {},
    efeitos: ["efeito-1"],
  };

  it("ao confirmar, atualiza o inventário em cache e invalida efeitos e valores derivados", async () => {
    const equipado = { ...item, equipado: true };
    const POST = vi.fn().mockResolvedValue({ data: { versao: 3, item: equipado }, error: undefined });
    const api = { POST } as unknown as ApiClient;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    queryClient.setQueryData(sheetKeys.inventario("mesa-1", "pj-1"), [item]);
    queryClient.setQueryData(sheetKeys.efeitos("mesa-1", "pj-1"), []);
    queryClient.setQueryData(sheetKeys.valoresDerivados("mesa-1", "pj-1"), []);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const onVersaoConfirmada = vi.fn();
    const { result } = renderHook(
      () => useEquipCommand({ api, mesaId: "mesa-1", personagemId: "pj-1", item, versaoEsperada: 2, online: true, onVersaoConfirmada }),
      { wrapper: wrapper(queryClient) },
    );

    await result.current.execute(true);
    await waitFor(() => expect(result.current.status).toBe("confirmado"));

    // O valor local (`confirmed`) só é atualizado quando o chamador re-renderiza com o
    // item mais recente; aqui validamos o efeito real do comando: o cache do
    // inventário passa a refletir o item equipado, e efeitos/valores derivados
    // dependentes são invalidados para recarregar.
    expect(onVersaoConfirmada).toHaveBeenCalledWith(3);
    expect(queryClient.getQueryData(sheetKeys.inventario("mesa-1", "pj-1"))).toEqual([equipado]);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sheetKeys.efeitos("mesa-1", "pj-1") });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sheetKeys.valoresDerivados("mesa-1", "pj-1") });
  });

  it("uma falha do servidor reverte a prévia e anuncia o erro, sem tocar no cache", async () => {
    const POST = vi.fn().mockResolvedValue({ data: undefined, error: { detail: "Versão da ficha desatualizada." } });
    const api = { POST } as unknown as ApiClient;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    queryClient.setQueryData(sheetKeys.inventario("mesa-1", "pj-1"), [item]);

    const { result } = renderHook(
      () => useEquipCommand({ api, mesaId: "mesa-1", personagemId: "pj-1", item, versaoEsperada: 1, online: true, onVersaoConfirmada: vi.fn() }),
      { wrapper: wrapper(queryClient) },
    );

    await result.current.execute(true);
    await waitFor(() => expect(result.current.status).toBe("erro"));
    expect(result.current.value.equipado).toBe(false);
    expect(result.current.errorMessage).toBe("Versão da ficha desatualizada.");
    expect(queryClient.getQueryData(sheetKeys.inventario("mesa-1", "pj-1"))).toEqual([item]);
  });
});
