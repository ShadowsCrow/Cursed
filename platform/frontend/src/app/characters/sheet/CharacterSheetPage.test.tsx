// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
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
    if (path.endsWith("/consequencias")) return { data: [], error: undefined };
    if (path.endsWith("/cartas")) return { data: [], error: undefined };
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

function Endereco() {
  const local = useLocation();
  return <output data-testid="endereco">{local.search}</output>;
}

function renderPage(api: ApiClient, initialEntry = "/ficha", staleTime = 0) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <CharacterSheetPage api={api} mesaId="mesa-1" personagemId="pj-1" userId="usuario-1" onBack={vi.fn()} />
        <Endereco />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CharacterSheetPage — 6.3 navegação modular preservando contexto", () => {
  afterEach(() => cleanup());

  it("ficha recém-criada pelo assistente oferece o envio do retrato, que pode ser dispensado", async () => {
    const { api } = createFakeApi();
    renderPage(api, "/ficha?novo=1");
    const aviso = await screen.findByText(/foi criado no nível 1/);
    expect(aviso.closest("[role=status]")?.textContent).toMatch(/ilustração|Narrador/);
    fireEvent.click(screen.getByRole("button", { name: "Dispensar" }));
    expect(screen.queryByText(/foi criado no nível 1/)).toBeNull();
  });

  it("a seção ativa é refletida na URL e a troca não busca os dados de novo", async () => {
    const { api, GET } = createFakeApi();
    renderPage(api);

    expect(await screen.findByRole("tab", { name: "Resumo", selected: true })).toBeTruthy();
    await screen.findByRole("heading", { level: 1, name: "Nara Exemplo" });
    const callsAfterLoad = GET.mock.calls.length;

    fireEvent.click(screen.getByRole("tab", { name: "Atributos" }));
    expect(screen.getByRole("tab", { name: "Atributos", selected: true })).toBeTruthy();
    expect(GET.mock.calls.length).toBe(callsAfterLoad);
  });

  it("abas com ícone decorativo; quando não cabem, a aba ativa é trazida à vista", async () => {
    const rolar = vi.fn();
    const original = { rolar: HTMLElement.prototype.scrollIntoView,
      largura: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollWidth"),
      visivel: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth") };
    HTMLElement.prototype.scrollIntoView = rolar;
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get() { return this.getAttribute("role") === "tablist" ? 1600 : 0; } });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get() { return this.getAttribute("role") === "tablist" ? 375 : 0; } });
    try {
      const { api } = createFakeApi();
      renderPage(api);
      const inventario = await screen.findByRole("tab", { name: "Inventário" });
      expect(inventario.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      fireEvent.click(inventario);
      await waitFor(() => expect(rolar.mock.contexts.at(-1)).toBe(screen.getByRole("tab", { name: "Inventário", selected: true })));
    } finally {
      HTMLElement.prototype.scrollIntoView = original.rolar;
      if (original.largura) Object.defineProperty(HTMLElement.prototype, "scrollWidth", original.largura);
      if (original.visivel) Object.defineProperty(HTMLElement.prototype, "clientWidth", original.visivel);
    }
  });

  it("cada seção fica na moldura com o título uma única vez", async () => {
    const { api } = createFakeApi();
    for (const [secao, titulo] of [["efeitos", "Efeitos"]] as const) {
      const { unmount } = renderPage(api, `/ficha?secao=${secao}`);
      const painel = await screen.findByRole("tabpanel");
      await waitFor(() => expect(within(painel).getAllByRole("heading", { name: titulo })).toHaveLength(1));
      expect(painel.querySelector(".moldura-secao__medalhao")?.getAttribute("aria-hidden")).toBe("true");
      unmount();
    }
  });

  it("Personalidade usa a folha própria, sem a moldura comum, com o título uma única vez", async () => {
    const { api } = createFakeApi();
    renderPage(api, "/ficha?secao=personalidade");
    const painel = await screen.findByRole("tabpanel");
    await waitFor(() => expect(within(painel).getAllByRole("heading", { name: "Personalidade" })).toHaveLength(1));
    expect(painel.querySelector(".folha-personalidade")).toBeTruthy();
    expect(painel.querySelector(".moldura-secao")).toBeNull();
  });

  it("Atributos usa a folha própria com os três cartões, sem a moldura comum, com o título uma única vez", async () => {
    const { api } = createFakeApi();
    renderPage(api, "/ficha?secao=atributos");
    const painel = await screen.findByRole("tabpanel");
    await waitFor(() => expect(within(painel).getAllByRole("heading", { name: "Atributos" })).toHaveLength(1));
    expect(painel.querySelector(".atributos-folha")).toBeTruthy();
    expect(painel.querySelector(".moldura-secao")).toBeNull();
    for (const grupo of ["Físicos", "Sociais", "Mentais"]) expect(within(painel).getByRole("table", { name: grupo })).toBeTruthy();
  });

  it("Perícias usa a folha própria com os três quadros, sem a moldura comum, com o título uma única vez", async () => {
    const { api } = createFakeApi();
    renderPage(api, "/ficha?secao=pericias");
    const painel = await screen.findByRole("tabpanel");
    await waitFor(() => expect(within(painel).getAllByRole("heading", { name: "Perícias" })).toHaveLength(1));
    expect(painel.querySelector(".pericias-folha")).toBeTruthy();
    expect(painel.querySelector(".moldura-secao")).toBeNull();
    for (const grupo of ["Talentos", "Técnicas", "Conhecimentos"]) expect(within(painel).getByRole("table", { name: grupo })).toBeTruthy();
  });

  it("Cartas usa a folha própria, sem a moldura comum, com o título uma única vez", async () => {
    const { api } = createFakeApi();
    renderPage(api, "/ficha?secao=cartas");
    const painel = await screen.findByRole("tabpanel");
    await waitFor(() => expect(within(painel).getAllByRole("heading", { name: "Habilidades, magias, itens e efeitos" })).toHaveLength(1));
    expect(painel.querySelector(".cartas-folha")).toBeTruthy();
    expect(painel.querySelector(".moldura-secao")).toBeNull();
    expect(await within(painel).findByText("Este personagem ainda não possui cartas.")).toBeTruthy();
  });

  it("Informações básicas usa a folha do Resumo, sem a moldura comum, com o título uma única vez", async () => {
    const { api } = createFakeApi();
    renderPage(api, "/ficha?secao=informacoes");
    const painel = await screen.findByRole("tabpanel");
    await waitFor(() => expect(within(painel).getAllByRole("heading", { name: "Informações básicas" })).toHaveLength(1));
    expect(painel.querySelector(".info-folha")).toBeTruthy();
    expect(painel.querySelector(".moldura-secao")).toBeNull();
  });

  it("estado local de uma seção (popover aberto) sobrevive à troca para outra seção e volta", async () => {
    const { api } = createFakeApi();
    renderPage(api);

    await screen.findByRole("tab", { name: "Resumo", selected: true });
    fireEvent.click(screen.getByRole("tab", { name: "Informações básicas" }));
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

describe("CharacterSheetPage — aba Resumo", () => {
  afterEach(() => cleanup());

  it("abre no Resumo sem seção no endereço, com o nome como título e sem o cabeçalho duplicado", async () => {
    const { api } = createFakeApi();
    renderPage(api);
    expect(await screen.findByRole("tab", { name: "Resumo", selected: true })).toBeTruthy();
    expect(screen.getAllByRole("tab")[0]).toHaveProperty("textContent", "Resumo");
    expect(await screen.findAllByRole("heading", { level: 1, name: "Nara Exemplo" })).toHaveLength(1);
    expect(document.querySelector(".character-hero")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Atributos" }));
    expect(screen.getAllByRole("heading", { level: 1, name: "Nara Exemplo" })).toHaveLength(1);
    expect(document.querySelector(".character-hero")).not.toBeNull();
  });

  it("endereços com seção continuam abrindo a seção pedida, inclusive nomes antigos", async () => {
    renderPage(createFakeApi().api, "/ficha?secao=pericias");
    expect(await screen.findByRole("tab", { name: "Perícias", selected: true })).toBeTruthy();
    cleanup();
    renderPage(createFakeApi().api, "/ficha?secao=habilidades");
    expect(await screen.findByRole("tab", { name: "Cartas", selected: true })).toBeTruthy();
  });

  it("atalho de um quadro abre a aba dele e muda o endereço, sem buscar os dados de novo", async () => {
    const { api, GET } = createFakeApi();
    renderPage(api);
    const atalho = await screen.findByRole("button", { name: "Abrir Perícias" });
    const chamadas = GET.mock.calls.length;
    fireEvent.click(atalho);
    expect(screen.getByRole("tab", { name: "Perícias", selected: true })).toBeTruthy();
    expect(screen.getByTestId("endereco").textContent).toBe("?secao=pericias");
    expect(GET.mock.calls.length).toBe(chamadas);
  });

  it("as cartas são buscadas uma vez, e o Resumo e o painel de cartas dividem a consulta", async () => {
    const { api, GET } = createFakeApi();
    // Mesma validade de cache do app (main.tsx): o painel que monta depois reaproveita a consulta.
    renderPage(api, "/ficha", 30_000);
    await screen.findByRole("heading", { level: 1, name: "Nara Exemplo" });
    fireEvent.click(screen.getByRole("tab", { name: "Cartas" }));
    fireEvent.click(screen.getByRole("tab", { name: "Resumo" }));
    await waitFor(() => expect(GET.mock.calls.filter(([caminho]) => String(caminho).endsWith("/cartas"))).toHaveLength(1));
  });

  it("quem pode editar vê a ação de enviar a ilustração; quem só lê, não", async () => {
    renderPage(createFakeApi().api);
    expect(await screen.findByRole("button", { name: "Enviar ilustração" })).toBeTruthy();
    cleanup();
    const leitura = createFakeApi();
    const original = leitura.GET.getMockImplementation()!;
    leitura.GET.mockImplementation(async (caminho: string) =>
      caminho.endsWith("/permissoes") ? { data: { ...permissoesFicha, editar: false }, error: undefined } : original(caminho));
    renderPage(leitura.api);
    await screen.findByText(/modo de leitura/);
    expect(screen.queryByRole("button", { name: /ilustração/ })).toBeNull();
    expect(screen.getByText("História não escrita.")).toBeTruthy();
  });
});

describe("CharacterSheetPage — 6.6/6.7 equipar atualiza efeitos e valores derivados", () => {
  afterEach(() => cleanup());

  it("equipar o item muda o estado do efeito ligado e o total derivado exibido", async () => {
    const { api, PUT } = createFakeApi();
    renderPage(api);

    await screen.findByRole("tab", { name: "Resumo", selected: true });
    const resumo = within(screen.getByRole("tabpanel", { name: "Resumo" }));
    expect(await resumo.findByText("Nada equipado no momento.")).toBeTruthy();

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

    // O Resumo acompanha a ficha sem recarregar: o item equipado e a Defesa recalculada aparecem.
    fireEvent.click(screen.getByRole("tab", { name: "Resumo" }));
    const painelResumo = within(screen.getByRole("tabpanel", { name: "Resumo" }));
    expect(within(painelResumo.getByRole("region", { name: "Equipamentos" })).getByText("Cota de malha")).toBeTruthy();
    expect(painelResumo.getByText("Defesa (Armadura)").closest("div")?.textContent).toContain("5");
  });
});

describe("CharacterSheetPage — acessibilidade", () => {
  afterEach(() => cleanup());

  it("não apresenta violações de acessibilidade detectáveis automaticamente na seção inicial", async () => {
    const { api } = createFakeApi();
    renderPage(api);
    await screen.findByRole("heading", { level: 1, name: "Nara Exemplo" });
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
