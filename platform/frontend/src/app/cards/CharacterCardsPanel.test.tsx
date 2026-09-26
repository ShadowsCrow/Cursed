// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CharacterCardsPanel } from "./CharacterCardsPanel";
import { apiSimulada, em, renderComQuery, versao, visivel } from "./testing";

function posse(id: string, estado: string, tipo: "habilidade" | "magia" | "item" | "efeito", titulo: string, extra: Record<string, unknown> = {}) {
  return {
    id, personagem_id: "lia", tipo, estado, origem: "oferta", excecao_aprendizado: false,
    adquirida_em: "2026-09-25T12:00:00Z", carta: visivel(`v-${id}`, tipo, titulo), versao_mais_recente: null, ...extra,
  };
}

const CARTAS = [
  posse("c1", "disponivel", "magia", "Raio"),
  posse("c2", "em_aprendizado", "habilidade", "Esquiva Rápida"),
  posse("c3", "aprendida", "magia", "Luz", { excecao_aprendizado: true, versao_mais_recente: 2 }),
  posse("c4", "no_inventario", "item", "Espada"),
];

function montar(papel: "narrador" | "jogador", rotasExtras: Parameters<typeof apiSimulada>[0] = {}) {
  const simulada = apiSimulada({
    GET: {
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas": { data: CARTAS },
      "/mesas/{mesa_id}/cartas": { data: [
        { id: "d1", tipo: "magia", versao: 1, rascunho: {}, procedencia_rascunho: {}, versao_publicada: 1, arquivada: false,
          publicada: versao("pv1", "magia", { titulo: "Relâmpago", texto: "Dano elétrico." }) },
        { id: "d2", tipo: "item", versao: 1, rascunho: {}, procedencia_rascunho: {}, versao_publicada: 1, arquivada: false,
          publicada: versao("pv2", "item", { titulo: "Escudo", texto: "Protege.", item_tipo: "armadura" }) },
      ] },
      "/mesas/{mesa_id}/cartas/{carta_id}/versoes": { data: [versao("v-c3", "magia", { titulo: "Luz" }, 1), versao("luz-v2", "magia", { titulo: "Luz" }, 2)] },
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao/previa": {
        data: { origem_numero: 1, destino_numero: 2, diferencas: [{ campo: "custo_uso", antes: 1, depois: 2 }], observacao: null },
      },
      ...rotasExtras.GET,
    },
    POST: {
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/transicoes/{acao}": { data: { versao: 8, cartas: [] } },
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas": { data: { versao: 8, cartas: [] } },
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao": { data: { versao: 8, cartas: [] } },
      ...rotasExtras.POST,
    },
  });
  renderComQuery(<CharacterCardsPanel api={simulada.api} mesaId="mesa" personagemId="lia" versao={7} papel={papel} podeEditar />);
  return simulada;
}

describe("CharacterCardsPanel — 9.4, 9.6, 9.7 e 9.9 na ficha", () => {
  afterEach(() => cleanup());

  it("agrupa por estado e deixa claro que escolher não é aprender", async () => {
    montar("jogador");
    const disponiveis = await screen.findByRole("region", { name: "Disponíveis para aprender" });
    expect(within(disponiveis).getByText("Raio")).toBeTruthy();
    expect(within(disponiveis).getByText(/não a torna aprendida/)).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Aprendidas" })).getByText("Luz")).toBeTruthy();
    expect(screen.getByText("Concedida como aprendida (exceção)")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Itens recebidos" })).getByText("Espada")).toBeTruthy();
  });

  it("jogador inicia e interrompe, mas não conclui, remove nem concede", async () => {
    const { POST } = montar("jogador");
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar aprendizado" }));
    await waitFor(() => expect(POST).toHaveBeenCalled());
    expect(em(POST.mock.calls, 0)[1]).toMatchObject({
      params: { path: { carta_id: "c1", acao: "iniciar_aprendizado" } }, body: { versao_esperada: 7 },
    });
    expect(screen.getByRole("button", { name: "Interromper aprendizado" })).toBeTruthy();
    for (const nome of ["Concluir aprendizado", "Remover", "Conceder carta"]) expect(screen.queryByRole("button", { name: nome })).toBeNull();
    expect(screen.queryByRole("button", { name: /Migrar/ })).toBeNull();
  });

  it("Narrador concede com exceção apenas para habilidades e magias", async () => {
    const { POST } = montar("narrador");
    fireEvent.click(await screen.findByRole("button", { name: "Conceder carta" }));
    const select = await screen.findByLabelText("Carta publicada");
    await screen.findByRole("option", { name: /Escudo/ });
    fireEvent.change(select, { target: { value: "pv2" } });
    expect(screen.queryByLabelText(/Conceder como aprendida/)).toBeNull();
    fireEvent.change(select, { target: { value: "pv1" } });
    fireEvent.click(screen.getByLabelText(/Conceder como aprendida/));
    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), { target: { value: "Recompensa" } });
    fireEvent.click(screen.getByRole("button", { name: "Conceder" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/personagens/{personagem_id}/cartas", expect.anything()));
    const corpo = POST.mock.calls.find(([c]) => c === "/mesas/{mesa_id}/personagens/{personagem_id}/cartas")?.[1]?.body;
    expect(corpo).toEqual({ versao_id: "pv1", excecao_aprendizado: true, motivo: "Recompensa", versao_esperada: 7 });
  });

  it("Narrador migra com prévia das diferenças", async () => {
    const { POST } = montar("narrador");
    fireEvent.click(await screen.findByRole("button", { name: "Migrar para a versão 2" }));
    const dialogo = await screen.findByRole("dialog", { name: /Migrar/ });
    expect(await within(dialogo).findByRole("rowheader", { name: "custo_uso" })).toBeTruthy();
    const confirmar = within(dialogo).getByRole("button", { name: "Migrar para a versão 2" }) as HTMLButtonElement;
    await waitFor(() => expect(confirmar.disabled).toBe(false));
    fireEvent.click(confirmar);
    await waitFor(() => expect(POST).toHaveBeenCalledWith(
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao",
      expect.objectContaining({ body: { versao_destino_id: "luz-v2", versao_esperada: 7 } }),
    ));
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    montar("narrador");
    await screen.findByText("Raio");
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
