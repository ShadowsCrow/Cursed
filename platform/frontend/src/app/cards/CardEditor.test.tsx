// @vitest-environment jsdom
import axe from "axe-core";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CATALOGO_ITENS } from "../inventory/catalogoItensTeste";
import { CardEditor } from "./CardEditor";
import { CATALOGO_FRAMEWORK, apiSimulada, renderComQuery, versao } from "./testing";
import type { CartaDefinicaoResumo, ValidacaoCarta } from "./types";

/*
 * Editor de cartas no grimório (simplificar-criacao-de-cartas): uma etapa só, salvamento automático,
 * validação junto do campo e Publicar único. Os cenários seguem as specs `editor-de-cartas` e `inventario-em-grade`.
 */

const VALIDA: ValidacaoCarta = { valida: true, problemas: [], revisao_pendente: [] };

function definicao(tipo: CartaDefinicaoResumo["tipo"], rascunho: Record<string, unknown>, extra: Partial<CartaDefinicaoResumo> = {}): CartaDefinicaoResumo {
  return {
    id: "c1", tipo, versao: 0, rascunho: { tipo, ...rascunho }, procedencia_rascunho: { origem: "narrador" },
    versao_publicada: null, publicada: null, arquivada: false, ...extra,
  };
}

type Rotas = Parameters<typeof apiSimulada>[0];

function montar(inicial: CartaDefinicaoResumo | null, rotas: Rotas = {}, onClose = vi.fn()) {
  let versaoAtual = inicial?.versao ?? 0;
  const simulada = apiSimulada({
    GET: {
      "/mesas/{mesa_id}/cartas/{carta_id}/versoes": { data: [] },
      "/mesas/{mesa_id}/cartas": { data: [] },
      "/mesas/{mesa_id}/catalogos/itens": { data: CATALOGO_ITENS },
      "/mesas/{mesa_id}/catalogos/framework": { data: CATALOGO_FRAMEWORK },
      ...rotas.GET,
    },
    POST: {
      "/mesas/{mesa_id}/cartas": ({ body }) => {
        const { tipo, rascunho } = body as { tipo: CartaDefinicaoResumo["tipo"]; rascunho: Record<string, unknown> };
        versaoAtual = 0;
        return { data: definicao(tipo, rascunho, { id: "nova" }), status: 201 };
      },
      "/mesas/{mesa_id}/cartas/{carta_id}/validacao": { data: VALIDA },
      "/mesas/{mesa_id}/cartas/{carta_id}/publicacao": { data: versao("v1", inicial?.tipo ?? "habilidade", { titulo: "x" }), status: 201 },
      ...rotas.POST,
    },
    PUT: {
      "/mesas/{mesa_id}/cartas/{carta_id}/rascunho": ({ body }) => {
        const pedido = body as { rascunho: Record<string, unknown>; versao_esperada: number; tipo?: CartaDefinicaoResumo["tipo"] };
        versaoAtual = pedido.versao_esperada + 1;
        return { data: definicao(pedido.tipo ?? inicial?.tipo ?? "habilidade", pedido.rascunho, { id: inicial?.id ?? "nova", versao: versaoAtual }) };
      },
      ...rotas.PUT,
    },
  });
  renderComQuery(<CardEditor api={simulada.api} mesaId="mesa" definicao={inicial} onClose={onClose} />);
  return { ...simulada, onClose };
}

const chamadas = (fn: ReturnType<typeof vi.fn>, caminho: string) => fn.mock.calls.filter(([c]) => c === caminho);
const corpo = (fn: ReturnType<typeof vi.fn>, caminho: string, indice = -1) =>
  chamadas(fn, caminho).at(indice)?.[1]?.body as Record<string, unknown> | undefined;
const esperarSalvo = () => screen.findByText("Rascunho salvo", {}, { timeout: 3000 });

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("CardEditor — criação numa etapa só", () => {
  it("Narrador cria uma habilidade: o título na carta cria e salva o rascunho sem outro clique", async () => {
    const { POST } = montar(null);
    expect(screen.getByRole("dialog", { name: "Nova carta" })).toBeTruthy();
    expect((screen.getByRole("radio", { name: "Habilidade" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("Escreva o título para salvar o rascunho.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Passo Leve" } });
    await esperarSalvo();
    expect(corpo(POST, "/mesas/{mesa_id}/cartas")).toEqual({ tipo: "habilidade", rascunho: { titulo: "Passo Leve" } });
    expect(chamadas(POST, "/mesas/{mesa_id}/cartas").length).toBe(1);
    // Depois de salvar, o servidor valida.
    await waitFor(() => expect(chamadas(POST, "/mesas/{mesa_id}/cartas/{carta_id}/validacao").length).toBe(1));
  });

  it("Narrador desiste: trocar o tipo e fechar sem título não cria carta", async () => {
    const { POST, onClose } = montar(null);
    fireEvent.click(screen.getByRole("radio", { name: "Item" }));
    expect((screen.getByRole("radio", { name: "Item" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(chamadas(POST, "/mesas/{mesa_id}/cartas")).toEqual([]);
  });

  it("fechar logo depois de digitar salva antes de fechar", async () => {
    const { PUT, onClose } = montar(definicao("habilidade", { titulo: "Golpe", texto: "Antigo." }));
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Novo texto." } });
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(corpo(PUT, "/mesas/{mesa_id}/cartas/{carta_id}/rascunho")).toMatchObject({ rascunho: { texto: "Novo texto." }, versao_esperada: 0 });
  });

  it("Narrador envia a arte: a carta ainda não salva é criada antes, e a imagem vai para ela", async () => {
    const ordem: string[] = [];
    const { POST } = montar(null, {
      POST: {
        "/mesas/{mesa_id}/cartas": ({ body }) => {
          ordem.push("criar");
          const { tipo, rascunho } = body as { tipo: CartaDefinicaoResumo["tipo"]; rascunho: Record<string, unknown> };
          return { data: definicao(tipo, rascunho, { id: "nova" }), status: 201 };
        },
      },
      PUT: {
        "/mesas/{mesa_id}/imagens/{destino}": ({ params, body }) => {
          const { destino, alvo } = (params as { path: { destino: string; alvo?: string } }).path;
          ordem.push(`${destino}:${(body as FormData).get("alvo") ?? alvo}:${(body as FormData).get("versao_esperada")}`);
          return { data: { destino, alvo: "nova", objeto: "mesas/mesa/narrador/cartas/nova/arte.png", versao: 1 } };
        },
      },
    });
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Olho Arcano" } });
    fireEvent.change(screen.getByTestId("upload-carta"), { target: { files: [new File(["x"], "arte.png", { type: "image/png" })] } });
    await waitFor(() => expect(ordem).toEqual(["criar", "carta:nova:0"]));
    expect(chamadas(POST, "/mesas/{mesa_id}/cartas").length).toBe(1);
    expect(await screen.findByRole("button", { name: "Trocar arte da carta" })).toBeTruthy();
  });
});

describe("CardEditor — tipo trocável até a primeira publicação", () => {
  it("de Magia para Habilidade: avisa que a Escola será descartada e mantém os campos do Framework", async () => {
    const { PUT } = montar(definicao("magia", {
      titulo: "Bola de Fogo", texto: "Explode.", escola: "elemental", alcance: { tipo: "metros", metros: 15 }, custo_aprendizado: 26,
    }));
    await waitFor(() => expect(screen.getByLabelText("Grau").textContent).toBe("Intermediária"));
    fireEvent.click(screen.getByRole("radio", { name: "Habilidade" }));
    const confirmacao = screen.getByRole("dialog", { name: "Trocar para Habilidade?" });
    expect(confirmacao.textContent).toMatch(/A Escola será descartada/);
    fireEvent.click(within(confirmacao).getByRole("button", { name: "Trocar o tipo" }));
    await esperarSalvo();
    expect(corpo(PUT, "/mesas/{mesa_id}/cartas/{carta_id}/rascunho")).toEqual({
      rascunho: { titulo: "Bola de Fogo", texto: "Explode.", alcance: { tipo: "metros", metros: 15 }, custo_aprendizado: 26 },
      versao_esperada: 0, tipo: "habilidade",
    });
    expect(screen.queryByLabelText("Escola")).toBeNull();
    expect(screen.getByLabelText("Disciplina")).toBeTruthy();
    expect(screen.getByLabelText("Grau").textContent).toBe("Avançada");
    expect(screen.getByLabelText("Descansos Mínimos").textContent).toBe("8");
    expect((screen.getByLabelText("Metros") as HTMLInputElement).value).toBe("15");
  });

  it("entre Habilidade e Magia sem Escola nem Disciplina, troca sem confirmação", async () => {
    montar(definicao("habilidade", { titulo: "Golpe", texto: "x", combo: "Bloqueio → Ataque Leve" }));
    fireEvent.click(screen.getByRole("radio", { name: "Magia" }));
    expect(screen.queryByRole("dialog", { name: "Trocar para Magia?" })).toBeNull();
    expect((screen.getByLabelText("Combo") as HTMLInputElement).value).toBe("Bloqueio → Ataque Leve");
  });

  it("carta já publicada: só o tipo atual fica selecionável", () => {
    montar(definicao("magia", { titulo: "Bola de Fogo", texto: "Explode." }, { versao_publicada: 1 }));
    expect((screen.getByRole("radio", { name: "Magia" }) as HTMLInputElement).disabled).toBe(false);
    for (const outro of ["Habilidade", "Item", "Efeito"]) {
      expect((screen.getByRole("radio", { name: outro }) as HTMLInputElement).disabled).toBe(true);
    }
  });
});

describe("CardEditor — salvamento, validação e publicação", () => {
  it("conflito com outra edição: para de salvar e oferece recarregar", async () => {
    const { PUT, GET } = montar(definicao("habilidade", { titulo: "Golpe", texto: "x" }), {
      PUT: { "/mesas/{mesa_id}/cartas/{carta_id}/rascunho": { error: { detail: "Rascunho alterado por outra edição." }, status: 409 } },
      GET: { "/mesas/{mesa_id}/cartas": { data: [definicao("habilidade", { titulo: "Golpe de outro", texto: "x" }, { versao: 3 })] } },
    });
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Outro" } });
    expect(await screen.findByText(/A carta foi alterada em outro lugar/, {}, { timeout: 3000 })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Mais um" } });
    await new Promise((r) => setTimeout(r, 1300));
    expect(chamadas(PUT, "/mesas/{mesa_id}/cartas/{carta_id}/rascunho").length).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Recarregar a carta" }));
    await waitFor(() => expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("Golpe de outro"));
    expect(chamadas(GET, "/mesas/{mesa_id}/cartas").length).toBeGreaterThan(0);
  });

  it("problemas junto do campo, com o rótulo da tela e nunca o caminho do servidor", async () => {
    montar(definicao("item", { titulo: "Lança", texto: "Longa.", item_tipo: "arma",
      efeitos: [{ nome: "X", descricao: "Y", modificadores: [], ativacao: "manual" }] }), {
      POST: {
        "/mesas/{mesa_id}/cartas/{carta_id}/validacao": { data: { valida: false, revisao_pendente: [], problemas: [
          { campo: "formato", mensagem: "Defina o tipo e a dimensão do item na grade antes de publicar." },
          { campo: "efeitos.0.modificadores", mensagem: "Alvo inválido." },
        ] } },
      },
    });
    const oQueE = (await screen.findByRole("radiogroup", { name: "O que é?" })).parentElement!;
    await waitFor(() => expect(oQueE.textContent).toMatch(/Defina o tipo e a dimensão/));
    const efeito = screen.getByRole("group", { name: "Efeito 1" });
    expect(efeito.textContent).toMatch(/Alvo inválido/);
    expect(document.body.textContent).not.toMatch(/efeitos\.0|modificadores:/);
    expect(screen.getByText("2 pendências")).toBeTruthy();
  });

  it("duas pendências: Publicar não abre a confirmação e leva o foco ao primeiro campo com problema", async () => {
    montar(definicao("habilidade", { titulo: "Golpe", texto: "" }), {
      POST: {
        "/mesas/{mesa_id}/cartas/{carta_id}/validacao": { data: { valida: false, revisao_pendente: [], problemas: [
          { campo: "texto", mensagem: "Preencha este campo." }, { campo: "custo_uso", mensagem: "Use um valor a partir de 0." },
        ] } },
      },
    });
    const publicar = await screen.findByRole("button", { name: /Publicar/ });
    await screen.findByText("2 pendências");
    expect(publicar.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(publicar);
    expect(screen.queryByRole("dialog", { name: "Publicar nova versão?" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText("Descrição"));
    expect(screen.getByLabelText("Descrição").getAttribute("aria-invalid")).toBe("true");
  });

  it("publicação com arte privada: a confirmação avisa da cópia e publica com a versão salva", async () => {
    const { POST } = montar(definicao("magia", { titulo: "Bola de Fogo", texto: "Explode.",
      ativos_privados: ["mesas/mesa/narrador/cartas/c1/arte.png"] }), {
      GET: { "/mesas/{mesa_id}/ativos": { data: { tipo: "image/png", base64: "YWJj" } } },
    });
    await waitFor(() => expect(chamadas(POST, "/mesas/{mesa_id}/cartas/{carta_id}/validacao").length).toBe(1));
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
    const confirmacao = await screen.findByRole("dialog", { name: "Publicar nova versão?" });
    expect(confirmacao.textContent).toMatch(/arte privada.*será copiada/i);
    fireEvent.click(within(confirmacao).getByRole("button", { name: "Publicar" }));
    await waitFor(() => expect(corpo(POST, "/mesas/{mesa_id}/cartas/{carta_id}/publicacao")).toEqual({ versao_esperada: 0, promover_ativos: true }));
    expect(await screen.findByText(/Versão 1 publicada/)).toBeTruthy();
    // Depois de publicada, o tipo fica.
    expect((screen.getByRole("radio", { name: "Habilidade" }) as HTMLInputElement).disabled).toBe(true);
  });
});

describe("CardEditor — campos do Framework (adaptar-cartas-ao-framework)", () => {
  it("grau calculado ao digitar o custo, sem edição", async () => {
    const { PUT } = montar(definicao("magia", { titulo: "Raízes", texto: "x" }));
    const grau = await screen.findByLabelText("Grau");
    expect(grau.tagName).toBe("OUTPUT");
    expect(grau.textContent).toBe("—");
    fireEvent.change(screen.getByLabelText("Custo de Aprendizado"), { target: { value: "26" } });
    expect(screen.getByLabelText("Grau").textContent).toBe("Intermediária");
    expect(screen.getByLabelText("Descansos Mínimos").textContent).toBe("6");
    fireEvent.change(screen.getByLabelText("Custo de Aprendizado"), { target: { value: "10" } });
    expect(screen.getByLabelText("Grau").textContent).toBe("Abaixo do mínimo");
    await esperarSalvo();
    const rascunho = corpo(PUT, "/mesas/{mesa_id}/cartas/{carta_id}/rascunho")?.rascunho as Record<string, unknown>;
    expect(rascunho).not.toHaveProperty("grau");
    expect(rascunho).not.toHaveProperty("descansos_minimos");
  });

  it("Custo de Uso: o calculado é a sugestão; outro valor mostra o aviso e Publicar continua disponível", async () => {
    montar(definicao("habilidade", { titulo: "Punição", texto: "x" }));
    fireEvent.change(await screen.findByLabelText("Potência de Uso"), { target: { value: "1" } });
    const custo = screen.getByLabelText("Custo de Uso") as HTMLInputElement;
    expect(custo.placeholder).toBe("1");
    expect(custo.value).toBe("");
    fireEvent.change(custo, { target: { value: "3" } });
    expect(custo.value).toBe("3");
    expect(custo.closest(".editor-quadro")?.textContent).toMatch(/O Framework daria 1 PP/);
    await esperarSalvo();
    expect(screen.getByRole("button", { name: /Publicar/ }).getAttribute("aria-disabled")).toBeNull();
  });

  it("Tipo, Escola, Forma e Alcance vêm do catálogo; metros só na distância; Acesso nos requisitos", async () => {
    const { PUT } = montar(definicao("magia", { titulo: "Raízes", texto: "x" }));
    const escola = await screen.findByLabelText("Escola") as HTMLSelectElement;
    await waitFor(() => expect(Array.from(escola.options).map((o) => o.textContent)).toContain("Druídica"));
    expect(Array.from((screen.getByLabelText("Tipo") as HTMLSelectElement).options).map((o) => o.textContent))
      .toEqual(["—", "Ativa", "Reação", "Passiva condicional", "Passiva permanente"]);
    expect(Array.from((screen.getByLabelText("Forma") as HTMLSelectElement).options).map((o) => o.value)).toContain("circulo");
    expect(screen.queryByLabelText("Disciplina")).toBeNull();
    expect(screen.getByRole("group", { name: "Acesso" })).toBeTruthy();
    fireEvent.change(escola, { target: { value: "druidica" } });
    fireEvent.change(screen.getByLabelText("Alcance"), { target: { value: "toque" } });
    expect(screen.queryByLabelText("Metros")).toBeNull();
    fireEvent.change(screen.getByLabelText("Alcance"), { target: { value: "metros" } });
    fireEvent.change(screen.getByLabelText("Metros"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Efeito principal"), { target: { value: "1d8 de dano." } });
    await esperarSalvo();
    expect(corpo(PUT, "/mesas/{mesa_id}/cartas/{carta_id}/rascunho")?.rascunho).toMatchObject({
      escola: "druidica", alcance: { tipo: "metros", metros: 12 }, efeito_principal: "1d8 de dano.",
    });
  });

  it("aviso de revisão do servidor aparece junto do campo Tipo", async () => {
    montar(definicao("habilidade", { titulo: "Pele", texto: "x", ativacao_legado: "passiva" }), {
      POST: { "/mesas/{mesa_id}/cartas/{carta_id}/validacao": { data: {
        valida: true, problemas: [], revisao_pendente: ["Tipo: defina se a passiva é condicional ou permanente."] } } },
    });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Casca." } });
    const aviso = await screen.findByText(/defina se a passiva é condicional ou permanente/);
    expect(aviso.closest(".editor-quadro")?.textContent).toMatch(/^.*Tipo/);
  });
});

describe("CardEditor — só os campos que se aplicam", () => {
  it("custos de aprendizado com a marca \"só você vê\"; custo legado só quando existe", () => {
    montar(definicao("habilidade", { titulo: "Golpe", texto: "x" }));
    for (const rotulo of ["Custo de Aprendizado", "Descansos Mínimos"]) {
      expect(screen.getByLabelText(rotulo).closest(".editor-quadro")?.textContent).toMatch(/só você vê/);
    }
    expect(screen.getByLabelText("Potência de Uso").closest(".editor-quadro")?.textContent).not.toMatch(/só você vê/);
    expect(screen.queryByLabelText(/Custo legado/)).toBeNull();
    cleanup();
    montar(definicao("habilidade", { titulo: "Golpe", texto: "x", custo_legado: "2 PP + 1 PV" }));
    expect((screen.getByLabelText(/Custo legado/) as HTMLInputElement).value).toBe("2 PP + 1 PV");
  });

  it("mochila sem campos de combate; a espada mostra os campos da regra; o capacete não tem Armadura", async () => {
    montar(definicao("item", { titulo: "Mochila de Viajante", texto: "Couro.", item_tipo: "outro" }));
    fireEvent.click(await screen.findByRole("radio", { name: "Mochila" }));
    expect(await screen.findByRole("group", { name: "Espaço na bolsa" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Amplia a bolsa em" })).toBeTruthy();
    expect(screen.getByLabelText("Requisito de Força")).toBeTruthy();
    expect(screen.getByLabelText("Raridade")).toBeTruthy();
    for (const ausente of ["Dano", "Armadura", "RDB", /Peso/]) expect(screen.queryByLabelText(ausente)).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Uma mão" }));
    for (const rotulo of ["Família de Proficiência", "Dano", "Tipo de Dano", "Alcance Normal", "Alcance Máximo", "Requisito de Força"]) {
      expect(screen.getByLabelText(rotulo)).toBeTruthy();
    }
    const tipoDeDano = screen.getByLabelText("Tipo de Dano") as HTMLSelectElement;
    expect(Array.from(tipoDeDano.options).slice(1, 4).map((o) => o.text)).toEqual(["Cortante", "Perfurante", "Contundente"]);
    expect(screen.getByRole("group", { name: "Atributo de Ataque" })).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "Capacete" }));
    expect(screen.queryByLabelText("Armadura")).toBeNull();
    expect(screen.queryByLabelText("RDB")).toBeNull();
    expect(screen.getByRole("button", { name: "+ Adicionar efeito" })).toBeTruthy();
  });

  it("espada vira mochila: avisa que o Dano será descartado e salva sem ele", async () => {
    const { PUT } = montar(definicao("item", { titulo: "Espada", texto: "Aço.", item_tipo: "arma",
      formato: { subtipo: "uma_mao", largura: 1, altura: 3 }, dados: { dano: "1d8" } }));
    expect(((await screen.findByLabelText("Dano")) as HTMLInputElement).value).toBe("1d8");
    fireEvent.click(screen.getByRole("radio", { name: "Mochila" }));
    const confirmacao = screen.getByRole("dialog", { name: "Trocar o que é o item?" });
    expect(confirmacao.textContent).toMatch(/Dano não se aplica ao novo tipo e será descartado/);
    fireEvent.click(within(confirmacao).getByRole("button", { name: "Trocar" }));
    await esperarSalvo();
    expect(corpo(PUT, "/mesas/{mesa_id}/cartas/{carta_id}/rascunho")).toMatchObject({
      rascunho: { item_tipo: "outro", dados: {}, formato: { subtipo: "mochila", largura: 2, altura: 2 } },
    });
  });

  it("os valores dos campos vão para `dados` com o tipo do catálogo", async () => {
    const { PUT } = montar(definicao("item", { titulo: "Espada", texto: "Aço.", item_tipo: "arma",
      formato: { subtipo: "uma_mao", largura: 1, altura: 3 } }));
    fireEvent.change(await screen.findByLabelText("Dano"), { target: { value: "1d8" } });
    fireEvent.change(screen.getByLabelText("Tipo de Dano"), { target: { value: "Cortante" } });
    fireEvent.change(screen.getByLabelText("Alcance Normal"), { target: { value: "6" } });
    const atributos = screen.getByRole("group", { name: "Atributo de Ataque" });
    fireEvent.click(within(atributos).getByRole("button", { name: "Destreza" }));
    fireEvent.click(within(atributos).getByRole("button", { name: "Força" }));
    const propriedades = screen.getByLabelText("Acrescentar a Propriedades");
    fireEvent.change(propriedades, { target: { value: "Lâmina de família" } });
    fireEvent.keyDown(propriedades, { key: "Enter" });
    await esperarSalvo();
    expect(corpo(PUT, "/mesas/{mesa_id}/cartas/{carta_id}/rascunho")).toMatchObject({ rascunho: { dados: {
      dano: "1d8", tipo_dano: "Cortante", alcance_normal: 6, atributo_ataque: ["Força", "Destreza"], propriedades: ["Lâmina de família"],
    } } });
  });

  it("lista de campos alterada no catálogo: o campo novo do escudo aparece sem mudança de código", async () => {
    const catalogo = {
      ...CATALOGO_ITENS,
      campos: [...(CATALOGO_ITENS.campos ?? []), { id: "bloqueio_area", rotulo: "Bloqueia área", tipo: "texto" as const, icone: "armadura", lista: null, exemplo: null, unidade: null }],
      campos_por_subtipo: { ...CATALOGO_ITENS.campos_por_subtipo, escudo: [...(CATALOGO_ITENS.campos_por_subtipo?.escudo ?? []), { campo: "bloqueio_area", sugestoes: null }] },
    };
    montar(definicao("item", { titulo: "Escudo", texto: "Carvalho.", item_tipo: "armadura",
      formato: { subtipo: "escudo", largura: 2, altura: 2 } }), { GET: { "/mesas/{mesa_id}/catalogos/itens": { data: catalogo } } });
    expect(await screen.findByLabelText("Bloqueia área")).toBeTruthy();
  });

  it("o ícone da bolsa salva antes o que estiver pendente e usa a versão nova", async () => {
    const ordem: string[] = [];
    montar(definicao("item", { titulo: "Lança", texto: "Longa.", item_tipo: "arma" }), {
      PUT: {
        "/mesas/{mesa_id}/cartas/{carta_id}/rascunho": ({ body }) => {
          ordem.push("rascunho");
          const pedido = body as { rascunho: Record<string, unknown>; versao_esperada: number };
          return { data: definicao("item", pedido.rascunho, { versao: pedido.versao_esperada + 1 }) };
        },
        "/mesas/{mesa_id}/imagens/{destino}": ({ params, body }) => {
          const destino = (params as { path: { destino: string } }).path.destino;
          ordem.push(`${destino}:${(body as FormData).get("versao_esperada")}`);
          return { data: { destino, alvo: "carta:c1", objeto: `mesas/mesa/narrador/enviados/${destino}.png`, versao: 2 } };
        },
      },
    });
    fireEvent.click(await screen.findByRole("radio", { name: "Duas mãos" }));
    expect(screen.getByRole("group", { name: "Ícone na bolsa" }).textContent).toMatch(/Ocupa 1 × 4 células.*256 × 1024 px/);
    fireEvent.change(screen.getByTestId("upload-icone-grade"), { target: { files: [new File(["x"], "lanca.png", { type: "image/png" })] } });
    await waitFor(() => expect(ordem).toEqual(["rascunho", "icone-grade:1"]));
    expect(await screen.findByRole("button", { name: "Trocar ícone da bolsa" })).toBeTruthy();
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    vi.useRealTimers();
    montar(definicao("item", { titulo: "Mochila", texto: "Couro.", item_tipo: "outro", formato: { subtipo: "mochila", largura: 2, altura: 2,
      mochila: { linhas: 1, colunas: 0 } } }));
    await screen.findByRole("group", { name: "Espaço na bolsa" });
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
