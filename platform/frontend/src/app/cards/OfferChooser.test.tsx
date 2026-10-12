// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfferChooser } from "./OfferChooser";
import { apiSimulada, em, renderComQuery, visivel } from "./testing";
import type { OfertaResumo } from "./types";

const OFERTA: OfertaResumo = {
  id: "o1", titulo: "Tesouro do dragão", estado: "aberta", min_escolhas: 2, max_escolhas: 2, expira_em: null,
  expirada: false, criado_em: "2026-09-25T12:00:00Z",
  candidatas: ["A", "B", "C"].map((l) => visivel(`v${l}`, "magia", `Magia ${l}`)),
  destinatarios: [{ personagem_id: "lia", estado: "pendente", escolhas: [], respondido_em: null }],
};

function montar(resposta?: { data?: unknown; error?: unknown; status?: number }, reduzido = false) {
  window.matchMedia = vi.fn().mockImplementation((consulta: string) => ({
    matches: reduzido && consulta.includes("reduce"), media: consulta,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  const simulada = apiSimulada({
    GET: { "/mesas/{mesa_id}/personagens/{personagem_id}/ficha": { data: { versao: 4, ficha: {} } } },
    POST: {
      "/mesas/{mesa_id}/ofertas/{oferta_id}/respostas/{personagem_id}": resposta ?? {
        data: { versao: 5, cartas: [
          { id: "i1", personagem_id: "lia", tipo: "magia", estado: "disponivel", origem: "oferta", excecao_aprendizado: false,
            adquirida_em: "2026-09-25T12:00:00Z", carta: visivel("vA", "magia", "Magia A") },
        ] },
      },
    },
  });
  renderComQuery(<OfferChooser api={simulada.api} mesaId="mesa" oferta={OFERTA} personagemId="lia" personagemNome="Lia" />);
  return simulada;
}

describe("OfferChooser — 9.8 escolha acessível e animada", () => {
  afterEach(() => cleanup());

  it("não mostra ao jogador o Custo de aprendizado nem os Descansos mínimos, mesmo se chegarem", () => {
    const [primeira] = OFERTA.candidatas;
    const oferta: OfertaResumo = { ...OFERTA, candidatas: [{ ...primeira!, conteudo: {
      ...primeira!.conteudo, custo_aprendizado: 22, descansos_minimos: 4, potencia_uso: 9, custo_uso: 2, custo_legado: "22 PP" } }] };
    const simulada = apiSimulada({ GET: {}, POST: {} });
    renderComQuery(<OfferChooser api={simulada.api} mesaId="mesa" oferta={oferta} personagemId="lia" personagemNome="Lia" />);
    expect(screen.getByText("Potência de uso")).toBeTruthy();
    expect(screen.getByText("Custo de uso")).toBeTruthy();
    expect(screen.queryByText("Custo de aprendizado")).toBeNull();
    expect(screen.queryByText("Descansos mínimos")).toBeNull();
    expect(screen.queryByText(/22 PP/)).toBeNull();
  });

  it("seleciona por teclado com setas e Espaço, e o contador acompanha", () => {
    montar();
    const botoes = screen.getAllByRole("button", { pressed: false });
    const primeira = em(botoes, 0);
    const segunda = em(botoes, 1);
    primeira.focus();
    fireEvent.keyDown(primeira, { key: "ArrowRight" });
    expect(document.activeElement).toBe(segunda);
    expect(segunda.getAttribute("tabindex")).toBe("0");
    fireEvent.click(segunda);
    expect(segunda.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Escolhidas 1 de 2 (mínimo 2)")).toBeTruthy();
    fireEvent.keyDown(segunda, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(primeira);
    fireEvent.keyDown(primeira, { key: "End" });
    expect(document.activeElement?.textContent).toContain("Magia C");
  });

  it("só permite confirmar dentro dos limites e pede confirmação antes de enviar", async () => {
    const { POST } = montar();
    const confirmar = screen.getByRole("button", { name: "Confirmar escolha" }) as HTMLButtonElement;
    const cartas = screen.getAllByRole("button", { pressed: false });
    fireEvent.click(em(cartas, 0));
    expect(confirmar.disabled).toBe(true);
    fireEvent.click(em(cartas, 1));
    expect(confirmar.disabled).toBe(false);
    fireEvent.click(em(cartas, 2));
    expect(confirmar.disabled).toBe(true);
    fireEvent.click(em(cartas, 2));

    fireEvent.click(confirmar);
    expect(POST).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(POST).toHaveBeenCalled());
    expect(em(POST.mock.calls, 0)[1]?.body).toEqual({ escolhas: ["vA", "vB"], versao_esperada: 4 });
    expect(await screen.findByText(/Disponível para aprender/)).toBeTruthy();
    expect(screen.getByText(/ficam disponíveis para aprender/)).toBeTruthy();
  });

  it("exibe a recusa do servidor sem perder a seleção", async () => {
    montar({ error: { detail: "Esta oferta já foi respondida." }, status: 409 });
    const cartas = screen.getAllByRole("button", { pressed: false });
    fireEvent.click(em(cartas, 0));
    fireEvent.click(em(cartas, 1));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar escolha" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Esta oferta já foi respondida.")).toBeTruthy();
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(2);
  });

  it("desliga a animação com movimento reduzido", () => {
    montar(undefined, true);
    expect(document.querySelector(".offer-chooser")?.getAttribute("data-movimento")).toBe("reduzido");
    cleanup();
    montar(undefined, false);
    expect(document.querySelector(".offer-chooser")?.getAttribute("data-movimento")).toBe("normal");
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    montar();
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
