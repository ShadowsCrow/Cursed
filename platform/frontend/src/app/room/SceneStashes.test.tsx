// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { apiSimulada, em, renderComQuery } from "../cards/testing";
import { TIPO_ARRASTE_ITEM } from "../inventory/arrasteExterno";
import { SceneStashes } from "./SceneStashes";

const ESPADA = { id: "r-espada", nome: "Espada curta", tipo: "arma", subtipo: "uma_mao", quantidade: 1,
  largura: 1, altura: 2, coluna: 0, linha: 0, girado: false, efeitos: ["Fio frio"] };
const CORDA = { id: "r-corda", nome: "Corda", tipo: "outro", subtipo: "outro", quantidade: 1,
  largura: 1, altura: 1, coluna: null, linha: null, girado: false, efeitos: [] };
const RECIPIENTES = [
  { id: "chao", tipo: "chao", nome: "Chão — Cripta", colunas: 6, linhas: 4, versao: 2, itens: [CORDA] },
  { id: "bau", tipo: "bau", nome: "Baú da cripta", colunas: 4, linhas: 4, versao: 1, itens: [ESPADA] },
];
const PERSONAGENS = [
  { id: "lia", mesa_id: "mesa", nome: "Lia", tipo: "personagem", visibilidade: "mesa", proprietario_id: "jogador-1", versao: 7 },
  { id: "bram", mesa_id: "mesa", nome: "Bram", tipo: "personagem", visibilidade: "mesa", proprietario_id: "jogador-2", versao: 2 },
];
const GRADE = {
  versao: 7, forca: 2, tamanho: "medio", tamanho_origem: "raca", colunas_verdes: 4, linhas_verdes: 4, colunas: 4, linhas: 5,
  ampliacoes: [], sobrecarga: false, itens_em_sobrecarga: [], maos_ocupadas: 0, celulas_ocupadas: 0, celulas_verdes: 16, itens: [],
};

function montar({ narrador = false, pegar }: {
  narrador?: boolean; pegar?: Parameters<typeof apiSimulada>[0]["POST"];
} = {}) {
  const simulada = apiSimulada({
    GET: {
      "/mesas/{mesa_id}/sala/recipientes": { data: RECIPIENTES },
      "/mesas/{mesa_id}/personagens": { data: PERSONAGENS },
      "/mesas/{mesa_id}/personagens/{personagem_id}/inventario/grade": { data: GRADE },
      "/mesas/{mesa_id}/cartas": { data: [
        { id: "c1", tipo: "item", versao: 1, arquivada: false, publicada: { id: "v1", conteudo: { titulo: "Lanterna" } } },
        { id: "c2", tipo: "magia", versao: 1, arquivada: false, publicada: { id: "v2", conteudo: { titulo: "Luz" } } },
      ] },
    },
    POST: {
      "/mesas/{mesa_id}/sala/recipientes/{recipiente_id}/itens/{retrato_id}/pegar": { data: { id: "novo" } },
      "/mesas/{mesa_id}/sala/recipientes": { data: RECIPIENTES[1] },
      "/mesas/{mesa_id}/sala/recipientes/{recipiente_id}/cartas": { data: RECIPIENTES[1] },
      ...pegar,
    },
  });
  renderComQuery(<SceneStashes api={simulada.api} mesaId="mesa" userId="jogador-1" narrator={narrador} />);
  return simulada;
}

const chamada = (fn: ReturnType<typeof apiSimulada>["POST"], caminho: string) =>
  fn.mock.calls.filter(([c]) => c === caminho).map(([, opcoes]) => opcoes as { params: { path: Record<string, string> }; body: unknown });

const PEGAR = "/mesas/{mesa_id}/sala/recipientes/{recipiente_id}/itens/{retrato_id}/pegar";

afterEach(() => cleanup());

describe("SceneStashes — 6.2 chão e baú da cena", () => {
  it("mostra o chão e os baús a todos, e o jogador só leva para os próprios personagens", async () => {
    montar();
    const bau = await screen.findByRole("region", { name: "Baú da cripta" });
    expect(within(bau).getByRole("button", { name: /^Espada curta, 1 por 2, coluna 1, linha 1, efeitos: Fio frio/ })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Chão — Cripta" })).getByRole("button", { name: /^Corda, 1 por 1, sem lugar na grade/ }))
      .toBeTruthy();
    const destino = screen.getByLabelText("Levar para") as HTMLSelectElement;
    expect(Array.from(destino.options).map((o) => o.textContent)).toEqual(["Lia"]);
    expect(await screen.findByRole("region", { name: "Grade de Lia" })).toBeTruthy();
    expect(screen.queryByText("Novo baú")).toBeNull();
  });

  it("pegar pelo botão leva o item para fora da grade, com a versão da ficha", async () => {
    const { POST } = montar();
    fireEvent.click(await screen.findByRole("button", { name: /^Espada curta/ }));
    await screen.findByRole("region", { name: "Grade de Lia" });
    fireEvent.click(screen.getByRole("button", { name: "Pegar para Lia" }));
    expect(await screen.findByText("Espada curta foi para Lia, fora da grade: arrume-o na ficha.")).toBeTruthy();
    const [pedido] = chamada(POST, PEGAR);
    expect(pedido?.params.path).toEqual({ mesa_id: "mesa", recipiente_id: "bau", retrato_id: "r-espada" });
    expect(pedido?.body).toEqual({ personagem_id: "lia", versao_esperada: 7, coluna: null, linha: null, girado: false });
  });

  it("escolher o item e tocar numa célula da grade o coloca ali", async () => {
    const { POST } = montar();
    fireEvent.click(await screen.findByRole("button", { name: /^Espada curta/ }));
    const grade = await screen.findByRole("region", { name: "Grade de Lia" });
    expect(within(grade).getByText("Toque numa célula para colocar Espada curta (1 x 2) ali.")).toBeTruthy();
    const celulas = grade.querySelectorAll(".grade-inventario__celula");
    fireEvent.click(em(Array.from(celulas), 7)); // 5 colunas: coluna 2, linha 1.
    expect(await screen.findByText("Espada curta foi para a grade de Lia.")).toBeTruthy();
    expect(em(chamada(POST, PEGAR), 0).body).toEqual({ personagem_id: "lia", versao_esperada: 7, coluna: 2, linha: 1, girado: false });
  });

  it("arrastar o item até a grade o solta na célula sob o ponteiro", async () => {
    const { POST } = montar();
    const espada = await screen.findByRole("button", { name: /^Espada curta/ });
    const grade = await screen.findByRole("region", { name: "Grade de Lia" });
    const area = grade.querySelector(".grade-inventario__area") as HTMLElement;
    area.getBoundingClientRect = () => ({ left: 0, top: 0, width: 160, height: 200, right: 160, bottom: 200, x: 0, y: 0, toJSON: () => ({}) });
    const dados = new Map<string, string>();
    const dataTransfer = {
      types: [TIPO_ARRASTE_ITEM], effectAllowed: "", setData: (t: string, v: string) => dados.set(t, v), getData: (t: string) => dados.get(t) ?? "",
    };
    fireEvent.dragStart(espada, { dataTransfer });
    expect(JSON.parse(dados.get(TIPO_ARRASTE_ITEM) ?? "{}")).toEqual({ recipienteId: "bau", itemId: "r-espada" });
    // jsdom não repassa coordenadas a eventos de arraste: elas são definidas no próprio evento.
    for (const criar of [createEvent.dragOver, createEvent.drop]) {
      const evento = criar(area, { dataTransfer });
      Object.defineProperties(evento, { clientX: { value: 90 }, clientY: { value: 50 } });
      fireEvent(area, evento);
    }
    await waitFor(() => expect(chamada(POST, PEGAR)).toHaveLength(1));
    expect(em(chamada(POST, PEGAR), 0).body).toMatchObject({ coluna: 2, linha: 1 });
  });

  it("na disputa, quem perde vê que o item já foi levado e a lista é recarregada", async () => {
    const { GET } = montar({ pegar: {
      [PEGAR]: { error: { detail: "O item não está mais disponível: alguém o pegou antes." }, status: 409 },
    } });
    fireEvent.click(await screen.findByRole("button", { name: /^Espada curta/ }));
    await screen.findByRole("region", { name: "Grade de Lia" });
    const antes = GET.mock.calls.filter(([c]) => c === "/mesas/{mesa_id}/sala/recipientes").length;
    fireEvent.click(screen.getByRole("button", { name: "Pegar para Lia" }));
    expect((await screen.findByRole("alert")).textContent).toBe("O item não está mais disponível: alguém o pegou antes.");
    await waitFor(() => expect(GET.mock.calls.filter(([c]) => c === "/mesas/{mesa_id}/sala/recipientes").length).toBeGreaterThan(antes));
  });

  it("o Narrador escolhe qualquer personagem, cria baús e põe cartas de item neles", async () => {
    const { POST } = montar({ narrador: true });
    const destino = await screen.findByLabelText("Levar para") as HTMLSelectElement;
    await waitFor(() => expect(Array.from(destino.options).map((o) => o.textContent)).toEqual(["Lia", "Bram"]));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Arca" } });
    fireEvent.change(screen.getByLabelText("Colunas"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar baú" }));
    await waitFor(() => expect(chamada(POST, "/mesas/{mesa_id}/sala/recipientes")).toHaveLength(1));
    expect(em(chamada(POST, "/mesas/{mesa_id}/sala/recipientes"), 0).body).toEqual({ nome: "Arca", colunas: 20, linhas: 4 });
    const carta = await screen.findByLabelText("Carta") as HTMLSelectElement;
    expect(Array.from(carta.options).map((o) => o.textContent)).toEqual(["Escolha…", "Lanterna"]);
    fireEvent.change(carta, { target: { value: "v1" } });
    fireEvent.change(screen.getByLabelText("Onde"), { target: { value: "bau" } });
    fireEvent.click(screen.getByRole("button", { name: "Colocar" }));
    await waitFor(() => expect(chamada(POST, "/mesas/{mesa_id}/sala/recipientes/{recipiente_id}/cartas")).toHaveLength(1));
    const [colocar] = chamada(POST, "/mesas/{mesa_id}/sala/recipientes/{recipiente_id}/cartas");
    expect(colocar?.body).toEqual({ versao_id: "v1" });
    expect(colocar?.params.path.recipiente_id).toBe("bau");
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    montar({ narrador: true });
    fireEvent.click(await screen.findByRole("button", { name: /^Espada curta/ }));
    await screen.findByRole("region", { name: "Grade de Lia" });
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
