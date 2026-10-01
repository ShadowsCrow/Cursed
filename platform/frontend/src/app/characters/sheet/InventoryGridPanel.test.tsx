// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InventoryGridPanel } from "./InventoryGridPanel";
import type { ApiClient, GradeInventario, ItemInventarioResumo, PermissoesFicha } from "../types";
import type { OfertaItem } from "./sheetApi";

const permissoes: PermissoesFicha = {
  papel: "jogador", editar: true, excluir: false, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [],
};

const item = (extra: Partial<ItemInventarioResumo>): ItemInventarioResumo => ({
  id: "x", tipo: "outro", nome: "Item", quantidade: 1, equipado: false, cargas_atuais: null, cargas_maximas: null,
  dados: {}, efeitos: [], girado: false, ...extra,
});

function grade(itens: ItemInventarioResumo[], versao = 3): GradeInventario {
  return {
    versao, forca: 3, tamanho: "medio", tamanho_origem: "raca", colunas_verdes: 4, linhas_verdes: 5, colunas: 4, linhas: 6,
    ampliacoes: [], sobrecarga: false, itens_em_sobrecarga: [], maos_ocupadas: 0, celulas_ocupadas: 2, celulas_verdes: 20, itens,
  };
}

const CORDA = item({ id: "corda", nome: "Corda", subtipo: "outro", largura: 1, altura: 2, coluna: 0, linha: 0 });
const ANTIGA = item({ id: "antiga", nome: "Espada antiga", tipo: "arma", dados: { peso: 3 } });
const MOEDAS = item({ id: "moedas", nome: "Moedas (40 cobre)", subtipo: "moedas", largura: 1, altura: 1, coluna: 3, linha: 0,
  dados: { cobre: 40 } });

function rotasGet(gradeAtual: () => GradeInventario, ofertas: () => OfertaItem[]) {
  return async (path: string) => {
    if (path.endsWith("/inventario/grade")) return { data: gradeAtual(), error: undefined };
    if (path.endsWith("/politicas")) return { data: { moedas_por_pilha: 100 }, error: undefined };
    if (path.endsWith("/ofertas-item")) return { data: ofertas(), error: undefined };
    if (path.endsWith("/ativos")) return { data: { tipo: "image/png", base64: "SUNPTkU=" }, error: undefined };
    if (path.endsWith("/entidades-publicas")) {
      return { data: [{ id: "pj-1", nome_publico: "Eu" }, { id: "teo", nome_publico: "Teo" }], error: undefined };
    }
    throw new Error(`GET não simulado: ${path}`);
  };
}

function montar({ online = true, editar = true, put, post, papel = "jogador", ofertas = [], itens = [CORDA, ANTIGA, MOEDAS] }: {
  online?: boolean; editar?: boolean; put?: ReturnType<typeof vi.fn>; post?: ReturnType<typeof vi.fn>; papel?: PermissoesFicha["papel"];
  ofertas?: OfertaItem[]; itens?: ItemInventarioResumo[];
}) {
  const estado = { grade: grade(itens), ofertas };
  const GET = vi.fn(rotasGet(() => estado.grade, () => estado.ofertas));
  const PUT = put ?? vi.fn(async (_path: string, opcoes: { body: { versao_esperada: number; itens: unknown[] } }) => ({
    data: grade([{ ...CORDA, coluna: 1 }, ANTIGA], opcoes.body.versao_esperada + 1), error: undefined, response: { status: 200 },
  }));
  const api = { GET, PUT, POST: post ?? vi.fn() } as unknown as ApiClient;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onVersaoConfirmada = vi.fn();
  const renderizar = (onlineAgora: boolean) => (
    <QueryClientProvider client={queryClient}>
      <InventoryGridPanel api={api} mesaId="mesa-1" personagemId="pj-1" permissoes={{ ...permissoes, editar, papel }} versao={3}
        online={onlineAgora} onVersaoConfirmada={onVersaoConfirmada} />
    </QueryClientProvider>
  );
  const resultado = render(renderizar(online));
  return { PUT, GET, estado, onVersaoConfirmada, reconectar: () => resultado.rerender(renderizar(true)) };
}

async function moverCordaParaDireita() {
  const corda = await screen.findByRole("button", { name: /^Corda/ });
  fireEvent.keyDown(corda, { key: "Enter" });
  fireEvent.keyDown(corda, { key: "ArrowRight" });
  fireEvent.keyDown(corda, { key: "Enter" });
}

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

describe("InventoryGridPanel", () => {
  it("mostra a grade do servidor e lista à parte os itens sem dimensão", async () => {
    montar({});
    expect(await screen.findByRole("button", { name: /^Corda, item, 1 por 2, coluna 1, linha 1/ })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Sem dimensão" }).textContent).toMatch(/Espada antiga/);
    expect(screen.getByRole("region", { name: "Sem dimensão" }).textContent).toMatch(/O Narrador precisa definir/);
    // A plataforma não tem peso (simplificar-criacao-de-cartas, D7a), nem quando a API ainda o traz.
    expect(screen.getByRole("region", { name: "Sem dimensão" }).textContent).not.toMatch(/Peso/);
  });

  it("mostra na célula o ícone de grade enviado e, sem ele, a arte do item", async () => {
    const { GET } = montar({ itens: [
      { ...CORDA, dados: { icone_grade: "mesas/mesa-1/mesa/corda.png", imagem_ativo: "mesas/mesa-1/mesa/corda-arte.png" } },
      item({ id: "adaga", nome: "Adaga", subtipo: "uma_mao", tipo: "arma", largura: 1, altura: 1, coluna: 2, linha: 0,
        dados: { imagem_ativo: "mesas/mesa-1/mesa/adaga.png" } }),
    ] });
    const corda = await screen.findByRole("button", { name: /^Corda/ });
    await waitFor(() => expect(corda.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,SUNPTkU="));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Adaga/ }).querySelector("img")).toBeTruthy());
    const chamadas = GET.mock.calls as unknown as Array<[string, { params: { query: { caminho: string } } }]>;
    const pedidos = chamadas.filter(([caminho]) => caminho.endsWith("/ativos")).map(([, opcoes]) => opcoes.params.query.caminho);
    expect(pedidos.sort()).toEqual(["mesas/mesa-1/mesa/adaga.png", "mesas/mesa-1/mesa/corda.png"]);
  });

  it("envia a arrumação inteira pouco depois do movimento, com a versão da ficha", async () => {
    const { PUT, onVersaoConfirmada } = montar({});
    await moverCordaParaDireita();
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(1), { timeout: 2000 });
    const [, opcoes] = PUT.mock.calls[0] as [string, { body: { versao_esperada: number; itens: Array<{ item_id: string; coluna: number }> } }];
    expect(opcoes.body.versao_esperada).toBe(3);
    expect(opcoes.body.itens).toEqual([
      { item_id: "corda", coluna: 1, linha: 0, girado: false, equipado: false },
      { item_id: "moedas", coluna: 3, linha: 0, girado: false, equipado: false },
    ]);
    await waitFor(() => expect(onVersaoConfirmada).toHaveBeenCalledWith(4));
    expect(window.localStorage.getItem("cursed:arrumacao:mesa-1:pj-1")).toBeNull();
  });

  it("sem conexão guarda o rascunho e envia quando a conexão volta", async () => {
    const { PUT, reconectar } = montar({ online: false });
    await moverCordaParaDireita();
    expect(await screen.findByText(/Sem conexão: a arrumação fica guardada/)).toBeTruthy();
    expect(PUT).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("cursed:arrumacao:mesa-1:pj-1")).toContain("corda");
    reconectar();
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it("quando o servidor recusa, desfaz e explica o motivo", async () => {
    const put = vi.fn(async () => ({
      data: undefined, error: { detail: [{ item_id: "corda", motivo: "sobreposicao", mensagem: "Corda e Escudo ocupam o mesmo lugar." }] },
      response: { status: 422 },
    }));
    montar({ put });
    await moverCordaParaDireita();
    expect(await screen.findByText(/Arrumação recusada: Corda e Escudo ocupam o mesmo lugar/, undefined, { timeout: 2000 })).toBeTruthy();
    expect(await screen.findByRole("button", { name: /^Corda, item, 1 por 2, coluna 1, linha 1/ })).toBeTruthy();
  });

  it("descarta um rascunho antigo feito sobre outra versão da ficha", async () => {
    window.localStorage.setItem("cursed:arrumacao:mesa-1:pj-1", JSON.stringify({ versao: 1, itens: [] }));
    const { PUT } = montar({});
    expect(await screen.findByText(/ficou para trás porque a ficha mudou/)).toBeTruthy();
    expect(PUT).not.toHaveBeenCalled();
  });

  it("adicionar moedas envia só o que entra, com a versão da ficha, e aplica a grade devolvida", async () => {
    const put = vi.fn(async (caminho: string, opcoes: { body: { versao_esperada: number } }) => {
      if (caminho.endsWith("/moedas")) {
        return {
          data: grade([CORDA, ANTIGA, { ...MOEDAS, dados: { cobre: 40, ouro: 7 } }], opcoes.body.versao_esperada + 1),
          error: undefined, response: { status: 200 },
        };
      }
      throw new Error(`PUT não simulado: ${caminho}`);
    });
    const { onVersaoConfirmada } = montar({ put });
    fireEvent.click(await screen.findByRole("button", { name: "Gerenciar moedas" }));
    const moedas = await screen.findByRole("region", { name: "Moedas" });
    expect(moedas.textContent).toMatch(/40 moeda\(s\) em 1 pilha\(s\)\. Cada pilha ocupa uma célula e guarda até 100/);
    fireEvent.change(screen.getByLabelText("Ouro", { selector: "#ajuste-ouro" }), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const [, opcoes] = put.mock.calls[0] as [string, { body: unknown }];
    expect(opcoes.body).toEqual({ versao_esperada: 3, adicionar: { cobre: 0, prata: 0, ouro: 7 } });
    await waitFor(() => expect(onVersaoConfirmada).toHaveBeenCalledWith(4));
    await waitFor(() => expect(moedas.textContent).toMatch(/47 moeda\(s\)/));
  });

  it("moedas recusadas mostram o motivo e recarregam a grade", async () => {
    const put = vi.fn(async () => ({
      data: undefined, error: { detail: "A pilha 1 passa do limite de 100 moedas por pilha da mesa." }, response: { status: 422 },
    }));
    montar({ put });
    fireEvent.click(await screen.findByRole("button", { name: "Gerenciar moedas" }));
    await screen.findByRole("region", { name: "Moedas" });
    fireEvent.change(screen.getByLabelText("Cobre", { selector: "#ajuste-cobre" }), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(await screen.findByText(/Moedas recusadas: A pilha 1 passa do limite/)).toBeTruthy();
  });

  it("largar no chão envia o item com a versão da ficha e recarrega a grade", async () => {
    const POST = vi.fn(async () => ({ data: { id: "chao" }, error: undefined, response: { status: 200 } }));
    const { onVersaoConfirmada, estado } = montar({ post: POST });
    const corda = await screen.findByRole("button", { name: /^Corda/ });
    fireEvent.keyDown(corda, { key: "Enter" });
    fireEvent.keyDown(corda, { key: "Escape" });
    estado.grade = grade([ANTIGA, MOEDAS], 4);
    fireEvent.click(screen.getByRole("button", { name: "Largar no chão" }));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
    const [caminho, opcoes] = POST.mock.calls[0] as unknown as [string, { params: { path: Record<string, string> }; body: unknown }];
    expect(caminho).toBe("/mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/largar");
    expect(opcoes.params.path.item_id).toBe("corda");
    expect(opcoes.body).toEqual({ versao_esperada: 3, recipiente_id: null });
    expect(await screen.findByText("Corda ficou no chão da cena.")).toBeTruthy();
    await waitFor(() => expect(onVersaoConfirmada).toHaveBeenCalledWith(4));
    expect(screen.queryByRole("button", { name: /^Corda/ })).toBeNull();
  });

  it("largar sem cena ativa explica o motivo", async () => {
    const POST = vi.fn(async () => ({
      data: undefined, error: { detail: "Não há cena ativa: ative uma cena para ter um chão onde largar itens." },
      response: { status: 409 },
    }));
    montar({ post: POST });
    const corda = await screen.findByRole("button", { name: /^Corda/ });
    fireEvent.keyDown(corda, { key: "Enter" });
    fireEvent.keyDown(corda, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Largar no chão" }));
    expect(await screen.findByText(/Não foi possível largar: Não há cena ativa/)).toBeTruthy();
  });

  it("oferecer um item escolhe o destinatário entre as entidades públicas", async () => {
    const POST = vi.fn(async () => ({
      data: { id: "o1", estado: "pendente", item_id: "corda", item_nome: "Corda", largura: 1, altura: 2, subtipo: "outro",
        de_personagem_id: "pj-1", de_nome: "Eu", para_personagem_id: "teo", para_nome: "Teo", criado_em: "2026-09-27T10:00:00Z" },
      error: undefined, response: { status: 201 },
    }));
    montar({ post: POST });
    const corda = await screen.findByRole("button", { name: /^Corda/ });
    fireEvent.keyDown(corda, { key: "Enter" });
    fireEvent.keyDown(corda, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Oferecer…" }));
    const dialogo = await screen.findByRole("dialog", { name: "Oferecer Corda" });
    const para = within(dialogo).getByLabelText("Para quem") as HTMLSelectElement;
    await waitFor(() => expect(Array.from(para.options).map((o) => o.textContent)).toEqual(["Escolha…", "Teo"]));
    fireEvent.change(para, { target: { value: "teo" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Oferecer" }));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
    const [caminho, opcoes] = POST.mock.calls[0] as unknown as [string, { params: { path: Record<string, string> }; body: unknown }];
    expect(caminho).toBe("/mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/ofertas");
    expect(opcoes.params.path).toEqual({ mesa_id: "mesa-1", personagem_id: "pj-1", item_id: "corda" });
    expect(opcoes.body).toEqual({ para_personagem_id: "teo" });
    expect(await screen.findByText("Corda oferecido a Teo.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("aceitar uma oferta escolhendo o lugar envia a célula tocada com a versão da ficha", async () => {
    const OFERTA: OfertaItem = {
      id: "o9", estado: "pendente", item_id: "x", item_nome: "Tocha", subtipo: "outro", largura: 1, altura: 1,
      de_personagem_id: "teo", de_nome: "Teo", para_personagem_id: "pj-1", para_nome: "Eu", criado_em: "2026-09-27T10:00:00Z",
    };
    const POST = vi.fn(async () => ({ data: { id: "novo" }, error: undefined, response: { status: 200 } }));
    const { estado, onVersaoConfirmada } = montar({ post: POST, ofertas: [OFERTA] });
    fireEvent.click(await screen.findByRole("button", { name: "Escolher lugar para Tocha" }));
    const gradeUi = screen.getByRole("region", { name: "Inventário em grade" });
    expect(within(gradeUi).getByText("Toque numa célula para colocar Tocha (1 x 1) ali.")).toBeTruthy();
    estado.grade = grade([CORDA, ANTIGA, MOEDAS, item({ id: "tocha", nome: "Tocha", subtipo: "outro", largura: 1, altura: 1, coluna: 2, linha: 1 })], 4);
    estado.ofertas = [];
    fireEvent.click(Array.from(gradeUi.querySelectorAll(".grade-inventario__celula"))[7] as HTMLElement); // 5 colunas: coluna 2, linha 1.
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
    const [caminho, opcoes] = POST.mock.calls[0] as unknown as [string, { params: { path: Record<string, string> }; body: unknown }];
    expect(caminho).toBe("/mesas/{mesa_id}/ofertas-item/{oferta_id}/aceitar");
    expect(opcoes.params.path.oferta_id).toBe("o9");
    expect(opcoes.body).toEqual({ versao_esperada: 3, coluna: 2, linha: 1, girado: false });
    expect(await screen.findByText("Tocha entrou na grade.")).toBeTruthy();
    await waitFor(() => expect(onVersaoConfirmada).toHaveBeenCalledWith(4));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Trocas" })).toBeNull());
  });

  it("recusar uma oferta chama o servidor e mostra a recusa dele se houver", async () => {
    const OFERTA: OfertaItem = {
      id: "o9", estado: "pendente", item_id: "x", item_nome: "Tocha", subtipo: "outro", largura: 1, altura: 1,
      de_personagem_id: "teo", de_nome: "Teo", para_personagem_id: "pj-1", para_nome: "Eu", criado_em: "2026-09-27T10:00:00Z",
    };
    const POST = vi.fn(async () => ({ data: undefined, error: { detail: "Esta oferta já foi respondida." }, response: { status: 409 } }));
    montar({ post: POST, ofertas: [OFERTA] });
    fireEvent.click(await screen.findByRole("button", { name: "Recusar Tocha" }));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
    expect((POST.mock.calls[0] as unknown as [string])[0]).toBe("/mesas/{mesa_id}/ofertas-item/{oferta_id}/recusar");
    expect(await screen.findByText("Esta oferta já foi respondida.")).toBeTruthy();
  });

  it("itens sem dimensão não oferecem equipar, porque não podem ir para a grade", async () => {
    montar({});
    const semDimensao = await screen.findByRole("region", { name: "Sem dimensão" });
    expect(semDimensao.textContent).toMatch(/não são levados nem equipados/);
    expect(within(semDimensao).queryByRole("button", { name: /Equipar/ })).toBeNull();
  });

  it("o jogador não vê a ação de definir formato", async () => {
    montar({});
    await screen.findByRole("region", { name: "Sem dimensão" });
    expect(screen.queryByRole("button", { name: /Definir formato/ })).toBeNull();
  });

  it("o Narrador define o formato de um item sem dimensão, sem peso na tela", async () => {
    const put = vi.fn(async (caminho: string, opcoes: { body: Record<string, unknown> }) => {
      if (caminho.endsWith("/formato")) {
        return { data: { versao: opcoes.body.versao_esperada as number + 1, item: ANTIGA }, error: undefined, response: { status: 200 } };
      }
      throw new Error(`PUT não simulado: ${caminho}`);
    });
    const { onVersaoConfirmada } = montar({ put, papel: "narrador" });
    expect(await screen.findByText(/Defina o tipo e a dimensão de cada um/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Definir formato de Espada antiga" }));
    const dialogo = await screen.findByRole("dialog", { name: "Definir formato: Espada antiga" });
    expect(dialogo.textContent).not.toMatch(/Peso/);
    const confirmar = screen.getByRole("button", { name: "Definir formato" }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Uma mão" }));
    fireEvent.click(confirmar);
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const [caminho, opcoes] = put.mock.calls[0] as [string, { params: { path: Record<string, string> }; body: Record<string, unknown> }];
    expect(caminho).toBe("/mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/formato");
    expect(opcoes.params.path.item_id).toBe("antiga");
    expect(opcoes.body).toEqual({ formato: { subtipo: "uma_mao", largura: 1, altura: 3, versatil: false }, versao_esperada: 3 });
    await waitFor(() => expect(onVersaoConfirmada).toHaveBeenCalledWith(4));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("mostra a recusa do servidor dentro do diálogo de formato", async () => {
    const put = vi.fn(async () => ({ data: undefined, error: { detail: "Versão da ficha desatualizada." }, response: { status: 409 } }));
    montar({ put, papel: "narrador" });
    fireEvent.click(await screen.findByRole("button", { name: "Definir formato de Espada antiga" }));
    fireEvent.click(await screen.findByRole("radio", { name: "Outros (não se equipa, mas ocupa espaço)" }));
    fireEvent.click(screen.getByRole("button", { name: "Definir formato" }));
    expect(await screen.findByText("Versão da ficha desatualizada.")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("sem permissão de edição a grade só mostra", async () => {
    const { PUT } = montar({ editar: false });
    const corda = await screen.findByRole("button", { name: /^Corda/ });
    fireEvent.keyDown(corda, { key: "Enter" });
    fireEvent.keyDown(corda, { key: "ArrowRight" });
    expect(screen.queryByRole("button", { name: "Girar" })).toBeNull();
    await new Promise((r) => setTimeout(r, 700));
    expect(PUT).not.toHaveBeenCalled();
  });
});
