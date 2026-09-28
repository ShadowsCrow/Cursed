// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../types";
import { ConsequencesPanel } from "./ConsequencesPanel";
import type { ConsequenciaResumo } from "./sheetApi";

const FRATURA: ConsequenciaResumo = {
  id: "c-1", categoria: "ferimento_grave", nome: "Costelas Fraturadas", descricao: "Queda durante a marcha.",
  origem: { tipo: "mestre", nome: "Desfiladeiro" }, gatilho: "", efeito_atual: "Não pode Correr.", intensidade: 1,
  tratamento: { estado: "em_tratamento", progresso: 1, objetivo: 3, regra: "Estabilizar e repousar uma semana." },
  historico: [{ acao: "criado", justificativa: "Queda no desfiladeiro", criado_em: null }],
};

function createApi() {
  const resposta = { data: { versao: 2, consequencias: [FRATURA], consequencia: FRATURA } };
  type Chamada = (path: string, options: unknown) => Promise<typeof resposta>;
  const POST = vi.fn<Chamada>(async () => resposta);
  const PATCH = vi.fn<Chamada>(async () => resposta);
  return { api: { POST, PATCH } as unknown as ApiClient, POST, PATCH };
}

function renderPanel(consequencias: ConsequenciaResumo[], api?: ApiClient) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ConsequencesPanel consequencias={consequencias}
        admin={api ? { api, mesaId: "mesa", personagemId: "lia", versao: 4 } : undefined} />
    </QueryClientProvider>,
  );
  return view;
}

/** O cartão inteiro da consequência (o histórico interno também tem itens de lista). */
function cartao(): HTMLElement {
  return screen.getByRole("heading", { name: "Costelas Fraturadas" }).closest("li")!;
}

afterEach(cleanup);

describe("painel de consequências (5.4)", () => {
  it("explica origem, efeito e tratamento e não dá ações ao jogador", async () => {
    const { container } = renderPanel([FRATURA]);
        expect(within(cartao()).getByText("Ferimento Grave")).toBeTruthy();
    expect(within(cartao()).getByText("Em tratamento")).toBeTruthy();
    expect(within(cartao()).getByText("Desfiladeiro")).toBeTruthy();
    expect(within(cartao()).getByText(/Estabilizar e repousar uma semana\. — progresso 1 de 3/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    const resultado = await axe.run(container);
    expect(resultado.violations).toEqual([]);
  });

  it("registrar exige campos mínimos, gatilho no Trauma e justificativa", async () => {
    const { api, POST } = createApi();
    renderPanel([], api);
    fireEvent.click(screen.getByRole("button", { name: "Registrar consequência" }));
    const dialogo = await screen.findByRole("dialog");
    const registrar = within(dialogo).getByRole("button", { name: "Registrar" }) as HTMLButtonElement;
    fireEvent.change(within(dialogo).getByLabelText("Categoria"), { target: { value: "trauma" } });
    fireEvent.change(within(dialogo).getByLabelText("Nome"), { target: { value: "Medo do Abismo" } });
    fireEvent.change(within(dialogo).getByLabelText("Descrição"), { target: { value: "Pavor de lugares sem fundo." } });
    fireEvent.change(within(dialogo).getByLabelText("Manifestação"), { target: { value: "Paralisa." } });
    fireEvent.change(within(dialogo).getByLabelText("Tratamento ou encerramento"), { target: { value: "Três cenas com apoio." } });
    fireEvent.change(within(dialogo).getByLabelText("Justificativa"), { target: { value: "Poço de Varn" } });
    expect(registrar.disabled).toBe(true);
    fireEvent.change(within(dialogo).getByLabelText("Gatilho"), { target: { value: "Beiradas" } });
    expect(registrar.disabled).toBe(false);
    fireEvent.click(registrar);
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
    expect(POST.mock.calls[0]![1]).toMatchObject({ body: {
      consequencia: { categoria: "trauma", nome: "Medo do Abismo", gatilho: "Beiradas", tratamento_regra: "Três cenas com apoio." },
      justificativa: "Poço de Varn", versao_esperada: 4,
    } });
  });

  it("oferece só as ações válidas no estado e exige justificativa", async () => {
    const { api, POST } = createApi();
    renderPanel([FRATURA], api);
        expect(within(cartao()).queryByRole("button", { name: "Iniciar tratamento" })).toBeNull();
    for (const rotulo of ["Editar", "Intensificar", "Mitigar", "Reativar", "Encerrar", "Remover"]) {
      expect(within(cartao()).getByRole("button", { name: rotulo })).toBeTruthy();
    }
    fireEvent.click(within(cartao()).getByRole("button", { name: "Encerrar" }));
    const dialogo = await screen.findByRole("dialog");
    const confirmar = within(dialogo).getByRole("button", { name: "Encerrar" }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(within(dialogo).getByLabelText("Justificativa"), { target: { value: "Tratamento concluído" } });
    fireEvent.click(confirmar);
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
    expect(POST.mock.calls[0]![0]).toBe("/mesas/{mesa_id}/personagens/{personagem_id}/consequencias/{consequencia_id}/{acao}");
    expect(POST.mock.calls[0]![1]).toMatchObject({
      params: { path: { consequencia_id: "c-1", acao: "encerrar" } },
      body: { justificativa: "Tratamento concluído", versao_esperada: 4 },
    });
  });

  it("consequência encerrada só pode ser reativada ou removida", () => {
    const { api } = createApi();
    renderPanel([{ ...FRATURA, tratamento: { ...FRATURA.tratamento, estado: "encerrado" } }], api);
    const nomes = within(cartao()).getAllByRole("button").map((b) => b.textContent);
    expect(nomes).toEqual(["Reativar", "Remover"]);
  });

  it("editar envia só os campos alterados", async () => {
    const { api, PATCH } = createApi();
    renderPanel([FRATURA], api);
    fireEvent.click(within(cartao()).getByRole("button", { name: "Editar" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Efeito ou limitação"), { target: { value: "Não pode Correr nem saltar." } });
    fireEvent.change(within(dialogo).getByLabelText("Progresso do tratamento"), { target: { value: "2" } });
    fireEvent.change(within(dialogo).getByLabelText("Justificativa"), { target: { value: "Correção após a cena" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(PATCH).toHaveBeenCalledTimes(1));
    expect(PATCH.mock.calls[0]![1]).toEqual({
      params: { path: { mesa_id: "mesa", personagem_id: "lia", consequencia_id: "c-1" } },
      body: { efeito: "Não pode Correr nem saltar.", progresso: 2, justificativa: "Correção após a cena", versao_esperada: 4 },
    });
  });
});
