// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardEditor } from "./CardEditor";
import { apiSimulada, em, renderComQuery, versao } from "./testing";
import type { CartaDefinicaoResumo } from "./types";

const DEFINICAO: CartaDefinicaoResumo = {
  id: "c1", tipo: "magia", versao: 0, rascunho: { tipo: "magia", titulo: "Bola de Fogo", texto: "Explode." },
  procedencia_rascunho: { origem: "narrador" }, versao_publicada: null, publicada: null, arquivada: false,
};

function montar(rotas: Parameters<typeof apiSimulada>[0] = {}) {
  const simulada = apiSimulada({
    GET: { "/mesas/{mesa_id}/cartas/{carta_id}/versoes": { data: [] } },
    PUT: {
      "/mesas/{mesa_id}/cartas/{carta_id}/rascunho": ({ body }) => ({
        data: { ...DEFINICAO, versao: (body as { versao_esperada: number }).versao_esperada + 1, rascunho: (body as { rascunho: unknown }).rascunho },
      }),
    },
    POST: {
      "/mesas/{mesa_id}/cartas/{carta_id}/validacao": { data: { valida: true, problemas: [], revisao_pendente: [] } },
      "/mesas/{mesa_id}/cartas/{carta_id}/publicacao": { data: versao("v1", "magia", { titulo: "Bola de Fogo" }) },
      ...rotas.POST,
    },
    ...(rotas.GET ? { GET: rotas.GET } : {}),
  });
  renderComQuery(<CardEditor api={simulada.api} mesaId="mesa" definicao={DEFINICAO} onClose={vi.fn()} />);
  return simulada;
}

describe("CardEditor — 9.3 rascunho, validação e publicação", () => {
  afterEach(() => cleanup());

  it("salva custos vazios como nulos e não copia o custo legado para eles", async () => {
    const { PUT } = montar();
    fireEvent.change(screen.getByLabelText("Custo de Aprendizado (PP)"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Custo legado/), { target: { value: "2 PP + 1 PV" } });
    fireEvent.change(screen.getByLabelText("Custo de Aprendizado (PP)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(PUT).toHaveBeenCalled());
    const corpo = em(PUT.mock.calls, 0)[1]?.body as { rascunho: Record<string, unknown>; versao_esperada: number };
    expect(corpo.versao_esperada).toBe(0);
    expect(corpo.rascunho.custo_aprendizado).toBeNull();
    expect(corpo.rascunho.custo_legado).toBe("2 PP + 1 PV");
    for (const campo of ["descansos_minimos", "potencia_uso", "custo_uso"]) expect(corpo.rascunho[campo]).toBeUndefined();
    expect(screen.getByText("Custo legado (apenas histórico): 2 PP + 1 PV")).toBeTruthy();
    expect(screen.getAllByText("Não definido").length).toBe(4);
  });

  it("mostra problemas de validação por campo e aviso de revisão", async () => {
    montar({
      POST: {
        "/mesas/{mesa_id}/cartas/{carta_id}/validacao": {
          data: { valida: false, problemas: [{ campo: "texto", mensagem: "Campo obrigatório" }], revisao_pendente: ["Custo legado sem cálculo validado"] },
        },
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validar" }));
    expect(await screen.findByText(/Campo obrigatório/)).toBeTruthy();
    expect(screen.getByText("texto")).toBeTruthy();
    expect(screen.getByText(/Custo legado sem cálculo validado/)).toBeTruthy();
  });

  it("publica com a versão do rascunho após confirmação e exibe os problemas do 422", async () => {
    const { POST } = montar({
      POST: {
        "/mesas/{mesa_id}/cartas/{carta_id}/publicacao": {
          error: { detail: { mensagem: "A carta tem problemas de validação.", problemas: [{ campo: "ativos.0", mensagem: "Ativo fora da mesa" }] } }, status: 422,
        },
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar nova versão" }));
    expect(POST).not.toHaveBeenCalledWith("/mesas/{mesa_id}/cartas/{carta_id}/publicacao", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
    expect(await screen.findByText("A carta tem problemas de validação.")).toBeTruthy();
    expect(screen.getByText(/Ativo fora da mesa/)).toBeTruthy();
    const chamada = POST.mock.calls.find(([caminho]) => caminho === "/mesas/{mesa_id}/cartas/{carta_id}/publicacao");
    expect(chamada?.[1]?.body).toEqual({ versao_esperada: 0, promover_ativos: false });
  });

  it("confirma a cópia de arte privada e mostra a imagem no rascunho", async () => {
    const caminho = "mesas/mesa/narrador/legado/arte.png";
    const simulada = apiSimulada({
      GET: {
        "/mesas/{mesa_id}/cartas/{carta_id}/versoes": { data: [] },
        "/mesas/{mesa_id}/ativos": { data: { tipo: "image/png", base64: "YWJj" } },
      },
      POST: { "/mesas/{mesa_id}/cartas/{carta_id}/publicacao": { data: versao("v1", "magia", { titulo: "Bola de Fogo" }) } },
    });
    renderComQuery(<CardEditor api={simulada.api} mesaId="mesa" definicao={{
      ...DEFINICAO, rascunho: { ...DEFINICAO.rascunho, ativos_privados: [caminho] },
    }} onClose={vi.fn()} />);
    expect((await screen.findByRole("img", { name: "Arte de Bola de Fogo" })).getAttribute("src"))
      .toBe("data:image/png;base64,YWJj");
    fireEvent.click(screen.getByRole("button", { name: "Publicar nova versão" }));
    expect(screen.getByText(/arte privada.*será copiada/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
    await waitFor(() => expect(simulada.POST).toHaveBeenCalledWith(
      "/mesas/{mesa_id}/cartas/{carta_id}/publicacao",
      expect.objectContaining({ body: { versao_esperada: 0, promover_ativos: true } }),
    ));
  });

  it("exibe conflito ao salvar rascunho desatualizado", async () => {
    const simulada = apiSimulada({
      GET: { "/mesas/{mesa_id}/cartas/{carta_id}/versoes": { data: [] } },
      PUT: { "/mesas/{mesa_id}/cartas/{carta_id}/rascunho": { error: { detail: "Rascunho alterado por outra edição." }, status: 409 } },
    });
    renderComQuery(<CardEditor api={simulada.api} mesaId="mesa" definicao={DEFINICAO} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Outra" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(await screen.findByText("Rascunho alterado por outra edição.")).toBeTruthy();
  });

  it("carta de item: o subtipo do formato define o tipo de item e o rascunho é salvo com o formato", async () => {
    const simulada = apiSimulada({
      GET: { "/mesas/{mesa_id}/cartas/{carta_id}/versoes": { data: [] } },
      PUT: {
        "/mesas/{mesa_id}/cartas/{carta_id}/rascunho": ({ body }) => ({
          data: { ...DEFINICAO, tipo: "item", versao: 1, rascunho: (body as { rascunho: unknown }).rascunho },
        }),
      },
    });
    renderComQuery(<CardEditor api={simulada.api} mesaId="mesa" onClose={vi.fn()} definicao={{
      ...DEFINICAO, tipo: "item", rascunho: { tipo: "item", titulo: "Escudo de carvalho", texto: "Robusto.", item_tipo: "outro" },
    }} />);
    expect(screen.getByLabelText("Peso aproximado (só descrição)")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tipo na grade"), { target: { value: "escudo" } });
    expect((screen.getByLabelText("Tipo de item") as HTMLSelectElement).value).toBe("armadura");
    expect((screen.getByLabelText("Tipo de item") as HTMLSelectElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(simulada.PUT).toHaveBeenCalled());
    const corpo = em(simulada.PUT.mock.calls, 0)[1]?.body as { rascunho: Record<string, unknown> };
    expect(corpo.rascunho.item_tipo).toBe("armadura");
    expect(corpo.rascunho.formato).toEqual({ subtipo: "escudo", largura: 2, altura: 2 });
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    montar();
    await screen.findByText("Nenhuma versão publicada ainda.");
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
