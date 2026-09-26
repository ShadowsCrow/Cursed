// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NarratorLibrary } from "./NarratorLibrary";
import { PlayerLibrary, PresentationOverlay } from "./PlayerLibrary";
import { apiSimulada, renderComQuery, versao, visivel } from "./testing";

const PERSONAGENS = [{ id: "lia", mesa_id: "mesa", nome: "Lia", tipo: "personagem", visibilidade: "mesa", proprietario_id: "ana", versao: 0 }];
const OFERTA = {
  id: "o1", titulo: "Tesouro", estado: "aberta", min_escolhas: 1, max_escolhas: 1, expira_em: null, expirada: false,
  criado_em: "2026-09-25T12:00:00Z", candidatas: [visivel("va", "item", "Anel")],
  destinatarios: [{ personagem_id: "lia", estado: "pendente", escolhas: [], respondido_em: null }],
};

function narrador() {
  const simulada = apiSimulada({
    GET: {
      "/mesas/{mesa_id}/cartas": { data: [
        { id: "d1", tipo: "item", versao: 1, rascunho: {}, procedencia_rascunho: {}, versao_publicada: 1, arquivada: false,
          publicada: versao("va", "item", { titulo: "Anel", texto: "Brilha." }) },
      ] },
      "/mesas/{mesa_id}/ofertas": { data: [OFERTA] },
      "/mesas/{mesa_id}/apresentacoes": { data: [{ id: "a1", estado: "apresentada", apresentada_em: "2026-09-25T12:00:00Z", carta: visivel("va", "item", "Anel"), destinatarios: [] }] },
      "/mesas/{mesa_id}/personagens": { data: PERSONAGENS },
      "/mesas/{mesa_id}/participantes": { data: [{ usuario_id: "ana", papel: "jogador", nome: "Ana" }] },
    },
    POST: {
      "/mesas/{mesa_id}/cartas/importacoes/previa": { data: { tipo: "efeito", rascunho: { titulo: "Luz", texto: "Ilumina." }, validacao: { valida: true, problemas: [], revisao_pendente: [] }, avisos: ["A imagem não foi importada."] } },
      "/mesas/{mesa_id}/cartas/importacoes": { data: { id: "d2", tipo: "efeito", versao: 0, rascunho: {}, procedencia_rascunho: {}, versao_publicada: null, publicada: null, arquivada: false } },
      "/mesas/{mesa_id}/ofertas": { data: OFERTA },
      "/mesas/{mesa_id}/ofertas/{oferta_id}/cancelamento": { data: { ...OFERTA, estado: "cancelada" } },
      "/mesas/{mesa_id}/apresentacoes": { data: {} },
      "/mesas/{mesa_id}/apresentacoes/{apresentacao_id}/recolhimento": { data: {} },
    },
  });
  renderComQuery(<NarratorLibrary api={simulada.api} mesaId="mesa" />);
  return simulada;
}

describe("NarratorLibrary — catálogo, ofertas e apresentações", () => {
  afterEach(() => cleanup());

  it("importa com prévia antes de criar o rascunho", async () => {
    const { POST } = narrador();
    fireEvent.click(await screen.findByRole("button", { name: "Importar código" }));
    fireEvent.change(screen.getByLabelText(/Código E1/), { target: { value: "E1:abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }));
    expect(await screen.findByText("A imagem não foi importada.")).toBeTruthy();
    expect(POST).not.toHaveBeenCalledWith("/mesas/{mesa_id}/cartas/importacoes", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Criar rascunho" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/cartas/importacoes", expect.objectContaining({ body: { codigo: "E1:abc" } })));
  });

  it("cria oferta com candidatas, destinatários e limites", async () => {
    const { POST } = narrador();
    const novaOferta = await screen.findByRole("button", { name: "Nova oferta" }) as HTMLButtonElement;
    await waitFor(() => expect(novaOferta.disabled).toBe(false));
    fireEvent.click(novaOferta);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Recompensa" } });
    fireEvent.click(await screen.findByLabelText(/Anel \(Item, v1\)/));
    fireEvent.click(await screen.findByLabelText("Lia"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar oferta" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/ofertas", expect.anything()));
    expect(POST.mock.calls.find(([c]) => c === "/mesas/{mesa_id}/ofertas")?.[1]?.body).toEqual({
      titulo: "Recompensa", versao_ids: ["va"], personagem_ids: ["lia"], min_escolhas: 1, max_escolhas: 1, expira_em: null,
    });
  });

  it("acompanha destinatários, cancela oferta e recolhe carta apresentada", async () => {
    const { POST } = narrador();
    expect(await screen.findByText("Lia: pendente")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar oferta" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Cancelar oferta" }).at(-1) as HTMLElement);
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/ofertas/{oferta_id}/cancelamento", expect.anything()));
    fireEvent.click(screen.getByRole("button", { name: "Recolher" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/apresentacoes/{apresentacao_id}/recolhimento", expect.anything()));
  });

  it("apresenta uma carta publicada aos destinatários escolhidos", async () => {
    const { POST } = narrador();
    fireEvent.click(await screen.findByRole("button", { name: "Apresentar" }));
    fireEvent.click(await screen.findByLabelText("Ana"));
    fireEvent.click(screen.getAllByRole("button", { name: "Apresentar" }).at(-1) as HTMLElement);
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/apresentacoes", expect.objectContaining({
      body: { versao_id: "va", destinatarios: ["ana"] },
    })));
  });
});

describe("Visão do jogador — ofertas e apresentação temporária", () => {
  afterEach(() => cleanup());

  it("lista ofertas pendentes e abre a escolha, sem acessar o catálogo", async () => {
    const { GET } = (() => {
      const simulada = apiSimulada({
        GET: { "/mesas/{mesa_id}/ofertas": { data: [OFERTA] }, "/mesas/{mesa_id}/personagens": { data: PERSONAGENS } },
      });
      renderComQuery(<PlayerLibrary api={simulada.api} mesaId="mesa" />);
      return simulada;
    })();
    expect(await screen.findByText(/1 carta\(s\) para Lia/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Escolher cartas" }));
    expect(await screen.findByText("Escolha exatamente 1 carta(s) para Lia.")).toBeTruthy();
    expect(GET).not.toHaveBeenCalledWith("/mesas/{mesa_id}/cartas", expect.anything());
  });

  it("mostra a carta apresentada sem nenhuma escrita na ficha e fecha localmente", async () => {
    const simulada = apiSimulada({
      GET: { "/mesas/{mesa_id}/apresentacoes": { data: [{ id: "a1", estado: "apresentada", apresentada_em: "2026-09-25T12:00:00Z", carta: visivel("va", "item", "Anel Antigo") }] } },
    });
    renderComQuery(<PresentationOverlay api={simulada.api} mesaId="mesa" />);
    expect(await screen.findByText("Anel Antigo")).toBeTruthy();
    expect(screen.getByText(/não foi adicionada à sua ficha/)).toBeTruthy();
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByText("Anel Antigo")).toBeNull());
    expect(simulada.POST).not.toHaveBeenCalled();
    expect(simulada.PUT).not.toHaveBeenCalled();
  });
});
