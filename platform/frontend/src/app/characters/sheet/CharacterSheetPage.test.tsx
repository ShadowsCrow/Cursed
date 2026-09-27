// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterSheetPage } from "./CharacterSheetPage";
import type { ApiClient, EfeitoResumo, FichaSnapshot, ItemInventarioResumo, PermissoesFicha, ValorDerivadoResumo } from "../types";

const permissoesFicha: PermissoesFicha = {
  papel: "jogador", editar: true, excluir: false, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [],
};

function createFakeApi() {
  let equipped = false;
  let versao = 2;
  const item: ItemInventarioResumo = {
    id: "item-1", tipo: "armadura", nome: "Cota de malha", quantidade: 1, equipado: false,
    cargas_atuais: null, cargas_maximas: null, dados: { armadura: 2 }, efeitos: ["efeito-1"], girado: false,
    subtipo: "peitoral", largura: 2, altura: 2, coluna: 0, linha: 0,
  };

  function efeito(): EfeitoResumo {
    return {
      id: "efeito-1", nome: "Bênção da armadura", descricao: "Reforça a proteção enquanto equipada.",
      estado: equipped ? "ativo" : "suspenso", derivado: false, icone: { origem: "padrao", caminho: "/icones/efeitos/padrao.webp" }, duracao_rodadas: null, ativacao: "enquanto_equipado",
      fontes: [{ tipo: "equipamento", descricao: "Cota de malha", equipamento_id: "item-1" }],
      modificadores: [{ alvo: "defesa:armadura", valor: 2, contexto: null }],
    };
  }

  function valorDefesa(): ValorDerivadoResumo {
    return {
      chave: "defesa:armadura", rotulo: "Defesa (Armadura)", grupo: "status", calculavel: true,
      total: equipped ? 5 : 3,
      fontes: equipped
        ? [{ tipo: "atributo", descricao: "Vigor", valor: 3 }, { tipo: "efeito", descricao: "Cota de malha — Bênção da armadura", valor: 2, efeito_id: "efeito-1", item_id: "item-1" }]
        : [{ tipo: "atributo", descricao: "Vigor", valor: 3 }],
      situacionais: [],
    };
  }

  const GET = vi.fn(async (path: string) => {
    if (path.endsWith("/ficha")) {
      const snapshot: FichaSnapshot = { mesa_id: "mesa-1", personagem_id: "pj-1", versao, tipo: "personagem", ficha: { personagem: { nome: "Nara Exemplo" } } };
      return { data: snapshot, error: undefined };
    }
    if (path.endsWith("/permissoes")) return { data: permissoesFicha, error: undefined };
    if (path.endsWith("/inventario")) return { data: [{ ...item, equipado: equipped }], error: undefined };
    if (path.endsWith("/inventario/grade")) {
      return {
        data: {
          versao, forca: 2, tamanho: "medio", tamanho_origem: "raca", colunas_verdes: 4, linhas_verdes: 4, colunas: 4, linhas: 5,
          ampliacoes: [], sobrecarga: false, itens_em_sobrecarga: [], maos_ocupadas: 0, celulas_ocupadas: 0, celulas_verdes: 16,
          itens: [{ ...item, equipado: equipped }],
        },
        error: undefined,
      };
    }
    if (path.endsWith("/efeitos")) return { data: [efeito()], error: undefined };
    if (path.endsWith("/valores-derivados")) return { data: [valorDefesa()], error: undefined };
    if (path.endsWith("/desgaste")) return { data: [], error: undefined };
    throw new Error(`GET não simulado: ${path}`);
  });

  const POST = vi.fn(async (path: string, options: { body: { equipado: boolean } }) => {
    if (path.includes("/equipar")) {
      equipped = options.body.equipado;
      versao += 1;
      return { data: { versao, item: { ...item, equipado: equipped } }, error: undefined };
    }
    throw new Error(`POST não simulado: ${path}`);
  });

  // Equipar pela grade grava a arrumação inteira: só o que está na grade é levado e equipado.
  const PUT = vi.fn(async (path: string, options: { body: { itens: Array<{ item_id: string; equipado: boolean }> } }) => {
    if (path.endsWith("/inventario/arrumacao")) {
      equipped = options.body.itens.find((i) => i.item_id === "item-1")?.equipado ?? equipped;
      versao += 1;
      const grade = await GET("/inventario/grade");
      return { data: grade.data, error: undefined, response: { status: 200 } };
    }
    throw new Error(`PUT não simulado: ${path}`);
  });

  return { api: { GET, POST, PUT } as unknown as ApiClient, GET, POST, PUT };
}

function renderPage(api: ApiClient, initialEntry = "/ficha") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <CharacterSheetPage api={api} mesaId="mesa-1" personagemId="pj-1" userId="usuario-1" onBack={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CharacterSheetPage — 6.3 navegação modular preservando contexto", () => {
  afterEach(() => cleanup());

  it("a seção ativa é refletida na URL e a troca não busca os dados de novo", async () => {
    const { api, GET } = createFakeApi();
    renderPage(api);

    expect(await screen.findByRole("tab", { name: "Informações básicas", selected: true })).toBeTruthy();
    const callsAfterLoad = GET.mock.calls.length;

    fireEvent.click(screen.getByRole("tab", { name: "Atributos" }));
    expect(screen.getByRole("tab", { name: "Atributos", selected: true })).toBeTruthy();
    expect(GET.mock.calls.length).toBe(callsAfterLoad);
  });

  it("estado local de uma seção (popover aberto) sobrevive à troca para outra seção e volta", async () => {
    const { api } = createFakeApi();
    renderPage(api);

    await screen.findByRole("tab", { name: "Informações básicas", selected: true });
    fireEvent.click(screen.getByRole("button", { name: "Editar Nome" }));
    const input = screen.getByLabelText("Nome") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Rascunho não salvo" } });
    expect(screen.getByDisplayValue("Rascunho não salvo")).toBeTruthy();

    // As seções não ativas ficam ocultas (`hidden`), não desmontadas — por isso o
    // rascunho não confirmado sobrevive à troca de seção, embora fique invisível
    // enquanto a seção não está em foco.
    fireEvent.click(screen.getByRole("tab", { name: "Atributos" }));
    expect(input.closest("[hidden]")).not.toBeNull();
    expect(input.value).toBe("Rascunho não salvo");

    fireEvent.click(screen.getByRole("tab", { name: "Informações básicas" }));
    expect(input.closest("[hidden]")).toBeNull();
    expect(screen.getByDisplayValue("Rascunho não salvo")).toBeTruthy();
  });
});

describe("CharacterSheetPage — 6.6/6.7 equipar atualiza efeitos e valores derivados", () => {
  afterEach(() => cleanup());

  it("equipar o item muda o estado do efeito ligado e o total derivado exibido", async () => {
    const { api, PUT } = createFakeApi();
    renderPage(api);

    await screen.findByRole("tab", { name: "Informações básicas", selected: true });

    fireEvent.click(screen.getByRole("tab", { name: "Status" }));
    expect(await screen.findByRole("button", { name: "Fontes de Defesa (Armadura)" })).toHaveProperty("textContent", "+3");

    fireEvent.click(screen.getByRole("tab", { name: "Efeitos" }));
    expect(await screen.findByRole("button", { name: "Bênção da armadura (suspenso)" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Equipamentos" }));
    expect(await screen.findByText("Nenhum item equipado no momento.")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Inventário" }));
    const cota = await screen.findByRole("button", { name: /^Cota de malha, peitoral, 2 por 2, coluna 1, linha 1/ });
    fireEvent.keyDown(cota, { key: "Enter" });
    fireEvent.keyDown(cota, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Equipar" }));

    await waitFor(() => expect(PUT).toHaveBeenCalled(), { timeout: 2000 });

    fireEvent.click(screen.getByRole("tab", { name: "Efeitos" }));
    const painelEfeitos = within(screen.getByRole("tabpanel", { name: "Efeitos", hidden: true }));
    expect(await painelEfeitos.findByRole("button", { name: "Bênção da armadura", hidden: true })).toBeTruthy();
    expect(painelEfeitos.queryByRole("button", { name: "Bênção da armadura (suspenso)", hidden: true })).toBeNull();
    // A faixa de estado ativo mostra o efeito fora da aba, em qualquer seção.
    expect(within(screen.getByRole("region", { name: "Estado ativo" })).getByRole("button", { name: "Bênção da armadura" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Status" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Fontes de Defesa (Armadura)" })).toHaveProperty("textContent", "+5"));
  });
});

describe("CharacterSheetPage — acessibilidade", () => {
  afterEach(() => cleanup());

  it("não apresenta violações de acessibilidade detectáveis automaticamente na seção inicial", async () => {
    const { api } = createFakeApi();
    renderPage(api);
    await screen.findByRole("tab", { name: "Informações básicas", selected: true });
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
