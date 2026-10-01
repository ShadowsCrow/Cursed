// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
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

const ANEL = { id: "d1", tipo: "item", versao: 1, rascunho: {}, procedencia_rascunho: {}, versao_publicada: 1, arquivada: false,
  publicada: versao("va", "item", { titulo: "Anel", texto: "Brilha." }) };

function definicao(id: string, tipo: "habilidade" | "magia" | "efeito", titulo: string, origem_sistema: string | null = null) {
  return { id, tipo, versao: 1, rascunho: {}, procedencia_rascunho: {}, versao_publicada: 1, arquivada: false, origem_sistema,
    publicada: versao(`v-${id}`, tipo, { titulo, texto: `Texto de ${titulo}` }) };
}

function narrador(ofertas: unknown[] = [OFERTA], cartas: unknown[] = [ANEL]) {
  const simulada = apiSimulada({
    GET: {
      "/mesas/{mesa_id}/cartas": { data: cartas },
      "/mesas/{mesa_id}/ofertas": { data: ofertas },
      "/mesas/{mesa_id}/personagens": { data: PERSONAGENS },
      "/mesas/{mesa_id}/participantes": { data: [{ usuario_id: "ana", papel: "jogador", nome: "Ana" }] },
      "/mesas/{mesa_id}/personagens/{personagem_id}/ficha": { data: { mesa_id: "mesa", personagem_id: "lia", versao: 7, ficha: {} } },
    },
    POST: {
      "/mesas/{mesa_id}/cartas/importacoes/previa": { data: { tipo: "efeito", rascunho: { titulo: "Luz", texto: "Ilumina." }, validacao: { valida: true, problemas: [], revisao_pendente: [] }, avisos: ["A imagem não foi importada."] } },
      "/mesas/{mesa_id}/cartas/importacoes": { data: { id: "d2", tipo: "efeito", versao: 0, rascunho: {}, procedencia_rascunho: {}, versao_publicada: null, publicada: null, arquivada: false } },
      "/mesas/{mesa_id}/ofertas": { data: OFERTA },
      "/mesas/{mesa_id}/ofertas/{oferta_id}/cancelamento": { data: { ...OFERTA, estado: "cancelada" } },
      "/mesas/{mesa_id}/apresentacoes": { data: {} },
      // O editor aberto pelo grimório valida o rascunho ao abrir (salvamento automático).
      "/mesas/{mesa_id}/cartas/{carta_id}/validacao": { data: { valida: true, problemas: [], revisao_pendente: [] } },
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas": { data: { cartas: [], versao: 8 } },
    },
  });
  renderComQuery(<NarratorLibrary api={simulada.api} mesaId="mesa" />);
  return simulada;
}

describe("NarratorLibrary — catálogo e ofertas", () => {
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

  it("acompanha destinatários e cancela oferta", async () => {
    const { POST } = narrador();
    expect(await screen.findByText("Lia: pendente")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar oferta" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Cancelar oferta" }).at(-1) as HTMLElement);
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/ofertas/{oferta_id}/cancelamento", expect.anything()));
  });

  it("não tem seção de cartas apresentadas", async () => {
    narrador();
    expect(await screen.findByText("Ofertas enviadas")).toBeTruthy();
    expect(screen.queryByText("Cartas apresentadas")).toBeNull();
    expect(screen.queryByRole("button", { name: "Recolher" })).toBeNull();
  });

  it("oferta aceita por todos os destinatários sai da lista de ofertas enviadas", async () => {
    const respondida = { personagem_id: "lia", estado: "respondida", escolhas: ["va"], respondido_em: "2026-09-25T13:00:00Z" };
    narrador([
      { ...OFERTA, id: "o-aceita", titulo: "Aceita", destinatarios: [respondida] },
      { ...OFERTA, id: "o-parcial", titulo: "Parcial", destinatarios: [respondida, { ...OFERTA.destinatarios[0], personagem_id: "bram" }] },
    ]);
    expect(await screen.findByText("Parcial")).toBeTruthy();
    expect(screen.queryByText("Aceita")).toBeNull();
  });

  it("sem ofertas aguardando resposta, avisa que a lista está vazia", async () => {
    narrador([{ ...OFERTA, destinatarios: [{ personagem_id: "lia", estado: "respondida", escolhas: ["va"], respondido_em: null }] }]);
    expect(await screen.findByText("Nenhuma oferta aguardando resposta.")).toBeTruthy();
    expect(screen.queryByText("Tesouro")).toBeNull();
  });

  it("filtra o catálogo por origem, tipo e busca, como a aba Cartas da ficha", async () => {
    narrador([], [
      definicao("c1", "habilidade", "Forma Selvagem", "classes/Druida/habilidades/Forma Selvagem"),
      definicao("c2", "habilidade", "Fúria Animal", "classes/Druida/arquetipos/Animalista/habilidades/Fúria Animal"),
      definicao("r1", "habilidade", "Visão no Escuro", "racas/Elfo/habilidades/Visão no Escuro"),
      definicao("n1", "magia", "Bola de Fogo"),
      definicao("n2", "efeito", "Envenenado"),
    ]);
    const filtros = await screen.findByRole("complementary", { name: "Filtros das cartas" });
    const origem = within(filtros).getByRole("navigation", { name: "Origem" });
    const tipo = within(filtros).getByRole("navigation", { name: "Tipo" });
    const titulos = () => screen.getAllByRole("button", { name: /^(Habilidade|Magia|Item|Efeito): / })
      .map((b) => b.getAttribute("aria-label")?.split(": ")[1]);
    expect(within(origem).getByRole("button", { name: /Da classe/ }).textContent).toContain("2");
    expect(within(origem).getByRole("button", { name: /Outras/ }).textContent).toContain("2");

    fireEvent.click(within(origem).getByRole("button", { name: /Da classe/ }));
    expect(titulos()).toEqual(["Forma Selvagem", "Fúria Animal"]);

    fireEvent.click(within(origem).getByRole("button", { name: /Outras/ }));
    fireEvent.click(within(tipo).getByRole("button", { name: /Magias/ }));
    expect(titulos()).toEqual(["Bola de Fogo"]);

    fireEvent.click(within(origem).getByRole("button", { name: /Todas/ }));
    fireEvent.click(within(tipo).getByRole("button", { name: /Todos/ }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar cartas" }), { target: { value: "visao" } });
    expect(titulos()).toEqual(["Visão no Escuro"]);

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar cartas" }), { target: { value: "nada disso" } });
    expect(screen.getByText("Nenhuma carta atende os filtros escolhidos.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(titulos()).toHaveLength(5);
  });

  it("editar fica no selo do lápis, no canto da carta", async () => {
    narrador();
    const editar = await screen.findByRole("button", { name: "Editar Anel" });
    expect(editar.className).toBe("carta-biblioteca__editar");
    expect(editar.querySelector("svg")).toBeTruthy();
  });

  it("envia a carta ao personagem escolhido, na versão atual da ficha dele", async () => {
    const { GET, POST } = narrador();
    fireEvent.click(await screen.findByRole("button", { name: "Item: Anel" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Anel" })).getByRole("button", { name: "Enviar" }));
    expect(screen.getByText(/fora da grade/)).toBeTruthy();
    const enviar = screen.getByRole("button", { name: "Enviar" }) as HTMLButtonElement;
    expect(enviar.disabled).toBe(true);
    fireEvent.click(await screen.findByRole("radio", { name: "Lia" }));
    fireEvent.click(enviar);
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/personagens/{personagem_id}/cartas", {
      params: { path: { mesa_id: "mesa", personagem_id: "lia" } },
      body: { versao_id: "va", excecao_aprendizado: false, motivo: null, versao_esperada: 7 },
    }));
    expect(GET).toHaveBeenCalledWith("/mesas/{mesa_id}/personagens/{personagem_id}/ficha",
      { params: { path: { mesa_id: "mesa", personagem_id: "lia" } } });
    expect(await screen.findByText("“Anel” enviada para Lia.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("clicar na carta abre o grimório da ficha, com os dados do catálogo e as ações da biblioteca", async () => {
    narrador();
    fireEvent.click(await screen.findByRole("button", { name: "Item: Anel" }));
    const grimorio = screen.getByRole("dialog", { name: "Anel" });
    expect(grimorio.className).toContain("grimorio");
    expect(within(grimorio).getByRole("region", { name: "Texto da carta" }).textContent).toBe("Brilha.");
    expect(within(grimorio).getByText("Criada na mesa")).toBeTruthy();
    expect(within(grimorio).getByText("Publicada em")).toBeTruthy();
    expect(within(grimorio).getAllByRole("button").map((b) => b.textContent)).toEqual(
      expect.arrayContaining(["Enviar", "Apresentar", "Editar"]));
    fireEvent.click(within(grimorio).getByRole("button", { name: "Editar" }));
    expect(await screen.findByRole("dialog", { name: "Editar item" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Anel" })).toBeNull();
  });

  it("apresenta uma carta publicada aos destinatários escolhidos", async () => {
    const { POST } = narrador();
    fireEvent.click(await screen.findByRole("button", { name: "Item: Anel" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Anel" })).getByRole("button", { name: "Apresentar" }));
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

  it("mostra a carta apresentada sem escrever na ficha; fechar registra que foi vista, para não voltar ao recarregar", async () => {
    const simulada = apiSimulada({
      GET: { "/mesas/{mesa_id}/apresentacoes": { data: [{ id: "a1", estado: "apresentada", apresentada_em: "2026-09-25T12:00:00Z", carta: visivel("va", "item", "Anel Antigo") }] } },
      POST: { "/mesas/{mesa_id}/apresentacoes/{apresentacao_id}/visualizacao": { data: undefined, status: 204 } },
    });
    renderComQuery(<PresentationOverlay api={simulada.api} mesaId="mesa" />);
    expect(await screen.findByText("Anel Antigo")).toBeTruthy();
    expect(screen.getByText(/não foi adicionada à sua ficha/)).toBeTruthy();
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByText("Anel Antigo")).toBeNull());
    await waitFor(() => expect(simulada.POST).toHaveBeenCalledTimes(1));
    expect(simulada.POST).toHaveBeenCalledWith("/mesas/{mesa_id}/apresentacoes/{apresentacao_id}/visualizacao",
      { params: { path: { mesa_id: "mesa", apresentacao_id: "a1" } } });
    expect(simulada.PUT).not.toHaveBeenCalled();
  });
});
