// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NarratorLibrary } from "./NarratorLibrary";
import { PlayerLibrary, PresentationOverlay } from "./PlayerLibrary";
import { CATALOGO_FRAMEWORK, apiSimulada, renderComQuery, versao, visivel } from "./testing";

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

/** Pré-visualização de um código de criação (adaptar-cartas-ao-framework, 5.5). */
const PREVIA_CR1 = { data: {
  tipo: "magia",
  rascunho: { titulo: "Raízes do Brejo Faminto", texto: "Raízes espinhosas.", escola: "druidica", alcance: { tipo: "metros", metros: 15 },
    forma: "circulo", custo_aprendizado: 31, potencia_uso: 20 },
  calculados: { grau: "intermediaria", descansos_minimos: 6, custo_uso_framework: 5 },
  validacao: { valida: true, problemas: [], revisao_pendente: [] },
  avisos: ["Grau do código (Básica) substituído pelo calculado (Intermediária)."],
} };

const PREVIA_CR1_INVALIDA = { data: {
  ...PREVIA_CR1.data, avisos: [],
  validacao: { valida: false, problemas: [{ campo: "alcance.metros", mensagem: "Use um número inteiro." }], revisao_pendente: [] },
} };

/** Pares rótulo/valor de uma lista de dados da revelação. */
function pares(seletor: string): Record<string, string | null | undefined> {
  return Object.fromEntries(Array.from((document.querySelector(seletor) as HTMLElement).querySelectorAll(":scope > div"))
    .map((d) => [d.querySelector("dt")?.textContent, d.querySelector("dd")?.textContent]));
}

function narrador(ofertas: unknown[] = [OFERTA], cartas: unknown[] = [ANEL]) {
  const simulada = apiSimulada({
    GET: {
      "/mesas/{mesa_id}/cartas": { data: cartas },
      "/mesas/{mesa_id}/ofertas": { data: ofertas },
      "/mesas/{mesa_id}/personagens": { data: PERSONAGENS },
      "/mesas/{mesa_id}/participantes": { data: [{ usuario_id: "ana", papel: "jogador", nome: "Ana" }] },
      "/mesas/{mesa_id}/personagens/{personagem_id}/ficha": { data: { mesa_id: "mesa", personagem_id: "lia", versao: 7, ficha: {} } },
      "/mesas/{mesa_id}/catalogos/framework": { data: CATALOGO_FRAMEWORK },
    },
    POST: {
      "/mesas/{mesa_id}/cartas/importacoes/previa": ({ body }) => (String((body as { codigo: string }).codigo) === "CR1:ruim" ? PREVIA_CR1_INVALIDA
        : String((body as { codigo: string }).codigo).startsWith("CR1:") ? PREVIA_CR1 : { data: { tipo: "efeito", rascunho: { titulo: "Luz", texto: "Ilumina." }, validacao: { valida: true, problemas: [], revisao_pendente: [] }, avisos: ["A imagem não foi importada."] } }),
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
    fireEvent.change(screen.getByLabelText(/Código CR1, E1/), { target: { value: "E1:abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }));
    expect(await screen.findByText(/A imagem não foi importada\./)).toBeTruthy();
    expect(POST).not.toHaveBeenCalledWith("/mesas/{mesa_id}/cartas/importacoes", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Criar rascunho" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/cartas/importacoes", expect.objectContaining({ body: { codigo: "E1:abc" } })));
  });

  it("código CR1: a revelação mostra a carta, os destaques, os campos e os avisos (adaptar-cartas-ao-framework, 9.2)", async () => {
    narrador();
    fireEvent.click(await screen.findByRole("button", { name: "Importar código" }));
    // Antes da prévia, só o campo do código.
    expect(document.querySelector(".revelacao__palco")).toBeNull();
    fireEvent.change(screen.getByLabelText(/Código CR1/), { target: { value: "CR1:abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }));
    expect(await screen.findByText(/Grau do código \(Básica\) substituído pelo calculado \(Intermediária\)\./)).toBeTruthy();
    expect(document.querySelector(".revelacao__carta .carta-ficha__titulo")?.textContent).toBe("Raízes do Brejo Faminto");
    expect(screen.getByRole("heading", { name: /Prévia da importação/ }).textContent).toMatch(/CR1/);
    await waitFor(() => expect(pares(".revelacao__destaques")).toEqual({ "Grau": "Intermediária", "Custo de uso": "5 PP", "Potência": "20" }));
    expect(pares(".revelacao__dados")).toMatchObject({
      "Escola": "Druídica", "Descansos mínimos": "6", "Alcance": "15 metros", "Forma": "Círculo", "Custo de aprendizado": "31",
    });
    expect((screen.getByRole("button", { name: "Criar rascunho" }) as HTMLButtonElement).disabled).toBe(false);
    const resultado = await axe.run(document.querySelector('[role="dialog"]') as HTMLElement, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
    // Trocar o código volta ao campo, com o código colado.
    fireEvent.click(screen.getByRole("button", { name: "Trocar código" }));
    expect((await screen.findByLabelText(/Código CR1/) as HTMLTextAreaElement).value).toBe("CR1:abc");
    expect(document.querySelector(".revelacao__palco")).toBeNull();
  });

  it("código CR1 com problemas: aparecem com o rótulo do campo e Criar rascunho fica indisponível", async () => {
    narrador();
    fireEvent.click(await screen.findByRole("button", { name: "Importar código" }));
    fireEvent.change(screen.getByLabelText(/Código CR1/), { target: { value: "CR1:ruim" } });
    fireEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }));
    expect((await screen.findByText(/Use um número inteiro\./)).closest("li")?.textContent).toBe("Alcance: Use um número inteiro.");
    expect((screen.getByRole("button", { name: "Criar rascunho" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/Código válido/)).toBeNull();
  });

  it("código sem avisos: indica que o código é válido", async () => {
    narrador();
    fireEvent.click(await screen.findByRole("button", { name: "Importar código" }));
    fireEvent.change(screen.getByLabelText(/Código CR1/), { target: { value: "E1:abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }));
    await screen.findByText(/A imagem não foi importada/);
    expect(document.querySelector(".revelacao__destaques")).toBeNull();
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
