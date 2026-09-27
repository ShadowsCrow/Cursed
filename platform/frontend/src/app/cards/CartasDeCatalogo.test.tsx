// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CardEditor } from "./CardEditor";
import { CatalogStatusNotice } from "./CatalogStatusNotice";
import { CharacterCardsPanel } from "./CharacterCardsPanel";
import { apiSimulada, renderComQuery, visivel } from "./testing";

describe("Cartas de classe, arquétipo e raça (7.6)", () => {
  afterEach(() => cleanup());

  it("mostra de qual escolha veio cada carta concedida pelo catálogo", async () => {
    const posse = (id: string, titulo: string, concedida_por: string | null) => ({
      id, personagem_id: "lia", tipo: "habilidade", estado: "aprendida", origem: "concessao", excecao_aprendizado: true,
      adquirida_em: "2026-09-27T12:00:00Z", carta: visivel(`v-${id}`, "habilidade", titulo), versao_mais_recente: null, concedida_por,
    });
    const { api } = apiSimulada({ GET: { "/mesas/{mesa_id}/personagens/{personagem_id}/cartas": { data: [
      posse("c1", "Forma Selvagem", "classe:Druida"),
      posse("c2", "Laço Animal", "arquetipo:Druida/Animalista"),
      posse("c3", "Truque do Templo", null),
    ] } } });
    renderComQuery(<CharacterCardsPanel api={api} mesaId="mesa" personagemId="lia" versao={1} papel="jogador" podeEditar />);
    expect(await screen.findByText("Classe: Druida · habilidade automática")).toBeTruthy();
    expect(screen.getByText("Arquétipo: Animalista · habilidade automática")).toBeTruthy();
    expect(screen.getByText("Concedida como aprendida (exceção)")).toBeTruthy();
  });

  it("o editor avisa que o JSON do catálogo prevalece sobre edições", () => {
    const { api } = apiSimulada({ GET: { "/mesas/{mesa_id}/cartas/{carta_id}/versoes": { data: [] } } });
    renderComQuery(<CardEditor api={api} mesaId="mesa" onClose={() => undefined} definicao={{
      id: "sis-1", tipo: "habilidade", versao: 1, rascunho: { titulo: "Forma Selvagem", texto: "Vira um animal." },
      procedencia_rascunho: {}, versao_publicada: 1, arquivada: false, origem_sistema: "classes/Druida/habilidades/Forma Selvagem",
    }} />);
    expect(screen.getByRole("note").textContent).toContain("O JSON do catálogo prevalece");
  });

  it("o Narrador vê o erro de recarga do catálogo", async () => {
    const { api } = apiSimulada({ GET: { "/mesas/{mesa_id}/catalogos/estado": { data: {
      versao: "abc", erro: { arquivo: "classes.json", motivo: "JSON inválido (linha 3).", em: "2026-09-27T12:00:00Z" },
    } } } });
    renderComQuery(<CatalogStatusNotice api={api} mesaId="mesa" />);
    const aviso = await screen.findByRole("alert");
    expect(aviso.textContent).toContain("classes.json");
    expect(aviso.textContent).toContain("última versão válida");
  });
});
