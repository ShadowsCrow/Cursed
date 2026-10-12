// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CartasFicha } from "../characters/sheet/cartas/CartasFicha";
import { CatalogStatusNotice } from "./CatalogStatusNotice";
import { NarratorLibrary } from "./NarratorLibrary";
import { apiSimulada, renderComQuery, versao, visivel } from "./testing";

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
    renderComQuery(<CartasFicha api={api} mesaId="mesa" personagemId="lia" versao={1} papel="jogador" podeEditar />);
    expect(await screen.findByText("Classe: Druida - automática")).toBeTruthy();
    expect(screen.getByText("Arquétipo: Animalista - automática")).toBeTruthy();
    expect(screen.getByText("Concedida como aprendida (exceção)")).toBeTruthy();
  });

  it("a biblioteca não oferece editar as cartas do catálogo do sistema (cartas-do-catalogo-somente-leitura 4.1)", async () => {
    const publicada = (id: string, titulo: string) => ({ ...versao(`v-${id}`, "habilidade", { titulo, texto: "Texto." }) });
    const { api } = apiSimulada({ GET: {
      "/mesas/{mesa_id}/cartas": { data: [
        { id: "sis-1", tipo: "habilidade", versao: 1, rascunho: {}, procedencia_rascunho: { origem: "sistema" }, versao_publicada: 1,
          arquivada: false, origem_sistema: "classes/Gatuno/arquetipos/Ladrão/habilidades/Mãos Leves", publicada: publicada("sis-1", "Mãos Leves") },
        { id: "d1", tipo: "habilidade", versao: 1, rascunho: {}, procedencia_rascunho: {}, versao_publicada: 1, arquivada: false,
          origem_sistema: null, publicada: publicada("d1", "Golpe da Mesa") },
      ] },
      "/mesas/{mesa_id}/ofertas": { data: [] },
      "/mesas/{mesa_id}/personagens": { data: [] },
    } });
    renderComQuery(<NarratorLibrary api={api} mesaId="mesa" />);
    expect(await screen.findByRole("button", { name: "Editar Golpe da Mesa" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Editar Mãos Leves" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Habilidade: Mãos Leves" }));
    const grimorio = screen.getByRole("dialog", { name: "Mãos Leves" });
    expect(within(grimorio).getByText("Arquétipo: Ladrão")).toBeTruthy();
    expect(within(grimorio).getByRole("button", { name: "Enviar" })).toBeTruthy();
    expect(within(grimorio).queryByRole("button", { name: "Editar" })).toBeNull();
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
