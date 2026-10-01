// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiSimulada, renderComQuery, versao as versaoPublicada } from "../../../cards/testing";
import type { CartaPersonagemResumo } from "../../../cards/types";
import { CATALOGO_ITENS } from "../../../inventory/catalogoItensTeste";
import { CARTAS_DA_REFERENCIA, CARTAS_PARA_FILTROS, semCustosReservados } from "../../../plataforma/cartasDemonstracao";
import { CartasFicha } from "./CartasFicha";
import { esquecerPinturasDasCartas } from "./pinturasDasCartas";

const TODAS = [...CARTAS_DA_REFERENCIA, ...CARTAS_PARA_FILTROS];
const ROTA_CARTAS = "/mesas/{mesa_id}/personagens/{personagem_id}/cartas";
const ROTA_TRANSICAO = "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/transicoes/{acao}";

function montar({ cartas = semCustosReservados(TODAS), papel = "jogador", podeEditar = true, legado = [] as { nome: string }[] }: {
  cartas?: CartaPersonagemResumo[]; papel?: "jogador" | "narrador"; podeEditar?: boolean; legado?: { nome: string }[];
} = {}) {
  const simulada = apiSimulada({
    GET: {
      [ROTA_CARTAS]: { data: cartas },
      "/mesas/{mesa_id}/catalogos/itens": { data: CATALOGO_ITENS },
      "/mesas/{mesa_id}/cartas": { data: [
        { id: "d1", tipo: "magia", versao: 1, rascunho: {}, procedencia_rascunho: {}, versao_publicada: 1, arquivada: false,
          publicada: versaoPublicada("pv1", "magia", { titulo: "Relâmpago", texto: "Dano elétrico." }) },
        { id: "d2", tipo: "item", versao: 1, rascunho: {}, procedencia_rascunho: {}, versao_publicada: 1, arquivada: false,
          publicada: versaoPublicada("pv2", "item", { titulo: "Escudo", texto: "Protege.", item_tipo: "armadura" }) },
      ] },
      "/mesas/{mesa_id}/ativos": { data: { tipo: "image/png", base64: "iVBORw0KGgo=" } },
      "/mesas/{mesa_id}/cartas/{carta_id}/versoes": { data: [
        versaoPublicada("v-carta-ref-0", "habilidade", { titulo: "Segundo round" }, 1),
        versaoPublicada("segundo-v2", "habilidade", { titulo: "Segundo round" }, 2),
      ] },
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao/previa": {
        data: { origem_numero: 1, destino_numero: 2, diferencas: [{ campo: "custo_uso", antes: 1, depois: 2 }], observacao: null },
      },
    },
    POST: {
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas": { data: { versao: 8, cartas: [] } },
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao": { data: { versao: 8, cartas: [] } },
      [ROTA_TRANSICAO]: ({ params }) => {
        const { carta_id: cartaId } = (params as { path: { carta_id: string } }).path;
        const carta = cartas.find((c) => c.id === cartaId)!;
        return { data: { versao: 8, cartas: [{ ...carta, estado: "em_aprendizado" }] } };
      },
    },
  });
  renderComQuery(<CartasFicha api={simulada.api} mesaId="mesa" personagemId="lion" versao={7} papel={papel} podeEditar={podeEditar} habilidadesLegadas={legado} />);
  return simulada;
}

const cartaChamada = (titulo: string) => screen.getByRole("button", { name: new RegExp(`: ${titulo}\\.`) });
const titulosNaGrade = () => Array.from(document.querySelectorAll(".cartas-corpo__grade .carta-ficha__titulo")).map((t) => t.textContent);
/** A barra aparece como lista (ao lado da grade) e como fileiras (celular); os testes usam a lista. */
const barra = (nome: "Origem" | "Tipo") => within(document.querySelector(".cartas-corpo__lateral") as HTMLElement).getByRole("navigation", { name: nome });

beforeEach(() => {
  esquecerPinturasDasCartas();
  // No jsdom nenhuma imagem carrega: as pinturas falham e a folha mostra as reservas em SVG.
  vi.stubGlobal("Image", class { onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(_: string) { queueMicrotask(() => this.onerror?.()); } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Folha da aba Cartas", () => {
  it("jogador vê etiqueta, título, busca e ordem, sem Conceder carta", async () => {
    montar();
    expect(await screen.findByText("Segundo round")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Habilidades, magias, itens e efeitos" })).toBeTruthy();
    expect(screen.getByText("Cartas", { selector: ".cartas-cabecalho__sobretitulo" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Buscar cartas" }).getAttribute("placeholder")).toBe("Buscar cartas…");
    expect((screen.getByRole("combobox", { name: "Ordem das cartas" }) as HTMLSelectElement).selectedOptions[0]?.textContent).toBe("Nome (A-Z)");
    expect(screen.queryByRole("button", { name: "Conceder carta" })).toBeNull();
  });

  it("Narrador tem Conceder carta, que abre a concessão", async () => {
    montar({ papel: "narrador", cartas: TODAS });
    fireEvent.click(await screen.findByRole("button", { name: "Conceder carta" }));
    expect(await screen.findByRole("dialog", { name: "Conceder carta" })).toBeTruthy();
  });

  it("sem a gravura, o cabeçalho mostra o ornamento em SVG, sem imagem", async () => {
    montar();
    await waitFor(() => expect(document.querySelector(".cartas-gravura__reserva svg")).toBeTruthy());
    expect(document.querySelector(".cartas-gravura img")).toBeNull();
  });

  it("personagem sem cartas", async () => {
    montar({ cartas: [] });
    expect(await screen.findByText("Este personagem ainda não possui cartas.")).toBeTruthy();
  });

  it("mantém as anotações da ficha antiga no fim da folha", async () => {
    montar({ legado: [{ nome: "Rajada de Energia" }] });
    const legado = await screen.findByRole("region", { name: "Habilidades registradas na ficha antiga" });
    expect(within(legado).getByText("Rajada de Energia")).toBeTruthy();
  });

  it("sem violações de acessibilidade, com ornamentos ocultos", async () => {
    montar({ papel: "narrador", cartas: TODAS });
    await screen.findByText("Segundo round");
    for (const svg of Array.from(document.querySelectorAll(".cartas-folha svg"))) {
      expect(svg.closest("[aria-hidden='true']") ?? (svg.getAttribute("aria-hidden") === "true" ? svg : null)).toBeTruthy();
    }
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});

describe("Barra lateral de filtros", () => {
  it("só o que vem da raça", async () => {
    montar();
    await screen.findByText("Segundo round");
    const origem = barra("Origem");
    expect(within(origem).getByRole("button", { name: /Todas/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(origem).getByRole("button", { name: /Da raça/ }));
    expect(within(origem).getByRole("button", { name: /Da raça/ }).getAttribute("aria-pressed")).toBe("true");
    expect(within(origem).getByRole("button", { name: /Da raça/ }).textContent).toContain("1");
    expect(titulosNaGrade()).toEqual(["Luz das estrelas"]);
  });

  it("origem e tipo juntos", async () => {
    montar();
    await screen.findByText("Segundo round");
    fireEvent.click(within(barra("Origem")).getByRole("button", { name: /Concedidas/ }));
    fireEvent.click(within(barra("Tipo")).getByRole("button", { name: /Armas/ }));
    expect(titulosNaGrade()).toEqual(["Arco curto", "Espada longa"]);
    expect(screen.getByRole("heading", { name: "Itens recebidos" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Aprendidas" })).toBeNull();
  });

  it("tipo sem cartas não aparece; as origens aparecem sempre", async () => {
    montar({ cartas: semCustosReservados(CARTAS_DA_REFERENCIA) });
    await screen.findByText("Segundo round");
    expect(within(barra("Tipo")).queryByRole("button", { name: /Magias/ })).toBeNull();
    expect(within(barra("Tipo")).getByRole("button", { name: /Habilidades/ })).toBeTruthy();
    expect(within(barra("Origem")).getByRole("button", { name: /Da raça/ }).textContent).toContain("0");
  });

  it("filtro sem resultado oferece Limpar filtros", async () => {
    montar();
    await screen.findByText("Segundo round");
    fireEvent.click(within(barra("Origem")).getByRole("button", { name: /Da raça/ }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar cartas" }), { target: { value: "dragão" } });
    expect(screen.getByText("Nenhuma carta atende os filtros escolhidos.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(titulosNaGrade()).toHaveLength(13);
    expect((screen.getByRole("searchbox", { name: "Buscar cartas" }) as HTMLInputElement).value).toBe("");
    expect(within(barra("Origem")).getByRole("button", { name: /Todas/ }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("Busca, ordem e seções", () => {
  it("busca sem acento", async () => {
    montar();
    await screen.findByText("Segundo round");
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar cartas" }), { target: { value: "canalizacao" } });
    expect(titulosNaGrade()).toEqual(["Canalização arcana"]);
  });

  it("ordem por nome, nos dois sentidos", async () => {
    montar();
    await screen.findByText("Segundo round");
    const aprendidas = () => Array.from(screen.getByRole("region", { name: "Aprendidas" }).querySelectorAll(".carta-ficha__titulo")).map((t) => t.textContent);
    expect(aprendidas().indexOf("Combinação tática")).toBeLessThan(aprendidas().indexOf("Segundo round"));
    fireEvent.change(screen.getByRole("combobox", { name: "Ordem das cartas" }), { target: { value: "nome-za" } });
    expect(aprendidas()[0]).toBe("Uso de item");
  });

  it("separa por estado e esconde seção vazia", async () => {
    const [primeira, ...resto] = semCustosReservados(CARTAS_DA_REFERENCIA);
    montar({ cartas: [...resto, { ...primeira!, tipo: "magia", estado: "em_aprendizado", carta: { ...primeira!.carta, tipo: "magia" } }] });
    expect(await screen.findByRole("region", { name: "Aprendidas" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Aprendidas" })).getAllByRole("button")).toHaveLength(9);
    expect(within(screen.getByRole("region", { name: "Em aprendizado" })).getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("region", { name: "Disponíveis para aprender" })).toBeNull();
  });
});

describe("Carta ilustrada", () => {
  it("habilidade da classe vista pelo jogador", async () => {
    montar();
    const carta = await waitFor(() => cartaChamada("Segundo round"));
    expect(carta.getAttribute("aria-label")).toBe("Habilidade: Segundo round. Classe: Especialista de Combate - automática");
    expect(within(carta).getByText("Habilidade")).toBeTruthy();
    expect(within(carta).getByText(/Uma vez a cada 2 turnos/)).toBeTruthy();
    expect(within(carta).getByText("Potência de uso")).toBeTruthy();
    expect(within(carta).getByText("Custo de uso")).toBeTruthy();
    expect(within(carta).getAllByText("Não definido")).toHaveLength(2);
    expect(within(carta).queryByText("Custo de aprendizado")).toBeNull();
    expect(within(carta).queryByText("Descansos mínimos")).toBeNull();
    expect(within(carta).getByText("Classe: Especialista de Combate - automática")).toBeTruthy();
  });

  it("a mesma habilidade vista pelo Narrador tem os quatro custos", async () => {
    montar({ papel: "narrador", cartas: TODAS });
    const carta = await waitFor(() => cartaChamada("Segundo round"));
    for (const rotulo of ["Custo de aprendizado", "Descansos mínimos", "Potência de uso", "Custo de uso"]) {
      expect(within(carta).getByText(rotulo)).toBeTruthy();
    }
    expect(carta.querySelector(".carta-ficha__custos--4")).toBeTruthy();
  });

  it("item com foto própria: a foto ocupa a faixa, e a carta está em Armas", async () => {
    const espada = { ...CARTAS_PARA_FILTROS[1]!, carta: { ...CARTAS_PARA_FILTROS[1]!.carta, conteudo: {
      ...CARTAS_PARA_FILTROS[1]!.carta.conteudo, ativos: ["mesas/mesa/mesa/cartas/espada.png"] } } };
    montar({ cartas: [espada] });
    const carta = await waitFor(() => cartaChamada("Espada longa"));
    await waitFor(() => expect(carta.querySelector(".carta-ficha__faixa img.carta-ficha__pintura--propria")?.getAttribute("src"))
      .toBe("data:image/png;base64,iVBORw0KGgo="));
    expect(carta.querySelector(".carta-medalhao")).toBeNull();
    expect(within(barra("Tipo")).getByRole("button", { name: /Armas/ })).toBeTruthy();
  });

  it("sem pintura, a faixa mostra o medalhão em SVG, sem imagem", async () => {
    montar();
    const carta = await waitFor(() => cartaChamada("Luz das estrelas"));
    await waitFor(() => expect(carta.querySelector(".carta-ficha__reserva .carta-medalhao svg")).toBeTruthy());
    expect(carta.querySelector("img")).toBeNull();
  });

  it("com a pintura da categoria pronta, ela ocupa a faixa inteira", async () => {
    vi.stubGlobal("Image", class { onload: (() => void) | null = null; set src(_: string) { queueMicrotask(() => this.onload?.()); } });
    montar();
    const carta = await waitFor(() => cartaChamada("Segundo round"));
    await waitFor(() => expect(carta.querySelector(".carta-ficha__faixa img")?.getAttribute("src")).toBe("/arte/cartas/cartas-faixa-habilidades.webp"));
    expect(carta.querySelector(".carta-medalhao")).toBeNull();
    // O medalhão é o da arte da categoria do grimório, por cima da faixa.
    await waitFor(() => expect(carta.querySelector(".carta-ficha__medalhao")?.getAttribute("src")).toBe("/arte/cartas/cartas-medalhao-habilidades.webp"));
  });

  it("texto longo: a carta corta em três linhas e o detalhe mostra o texto inteiro", async () => {
    montar();
    const carta = await waitFor(() => cartaChamada("Canalização arcana"));
    expect(carta.querySelector(".carta-ficha__texto")).toBeTruthy();
    fireEvent.click(carta);
    const detalhe = await screen.findByRole("dialog", { name: "Canalização arcana" });
    expect(within(detalhe).getByText(/ampliando sua percepção por um instante\./, { selector: ".detalhe-carta__descricao" })).toBeTruthy();
  });
});

describe("Detalhe e ações", () => {
  it("jogador inicia um aprendizado", async () => {
    const disponivel = { ...semCustosReservados(CARTAS_PARA_FILTROS)[0]!, estado: "disponivel" as const };
    const { POST } = montar({ cartas: [disponivel] });
    fireEvent.click(await waitFor(() => cartaChamada("Luz das estrelas")));
    const detalhe = await screen.findByRole("dialog", { name: "Luz das estrelas" });
    expect(within(detalhe).getByText("Ilusão")).toBeTruthy();
    fireEvent.click(within(detalhe).getByRole("button", { name: "Iniciar aprendizado" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith(ROTA_TRANSICAO, expect.objectContaining({
      params: { path: { mesa_id: "mesa", personagem_id: "lion", carta_id: disponivel.id, acao: "iniciar_aprendizado" } },
      body: { versao_esperada: 7, motivo: null },
    })));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("sem permissão, o detalhe não tem botões de ação", async () => {
    const disponivel = { ...semCustosReservados(CARTAS_PARA_FILTROS)[0]!, estado: "disponivel" as const };
    montar({ cartas: [disponivel], podeEditar: false });
    fireEvent.click(await waitFor(() => cartaChamada("Luz das estrelas")));
    const detalhe = await screen.findByRole("dialog", { name: "Luz das estrelas" });
    expect(within(detalhe).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual(["Fechar"]);
  });

  it("Narrador conclui, migra e remove pelo detalhe", async () => {
    const emAprendizado = { ...CARTAS_DA_REFERENCIA[0]!, estado: "em_aprendizado" as const, versao_mais_recente: 2 };
    montar({ papel: "narrador", cartas: [emAprendizado] });
    const carta = await waitFor(() => cartaChamada("Segundo round"));
    expect(within(carta).getByText("v2 disponível")).toBeTruthy();
    fireEvent.click(carta);
    const detalhe = await screen.findByRole("dialog", { name: "Segundo round" });
    expect(within(detalhe).getByRole("button", { name: "Concluir aprendizado" })).toBeTruthy();
    expect(within(detalhe).getByRole("button", { name: "Interromper aprendizado" })).toBeTruthy();
    expect(within(detalhe).getByRole("button", { name: "Migrar para a versão 2" })).toBeTruthy();
    fireEvent.click(within(detalhe).getByRole("button", { name: "Remover" }));
    expect(await screen.findByRole("dialog", { name: "Remover carta?" })).toBeTruthy();
  });

  it("Narrador concede com exceção só para habilidades e magias", async () => {
    const { POST } = montar({ papel: "narrador", cartas: TODAS });
    fireEvent.click(await screen.findByRole("button", { name: "Conceder carta" }));
    const select = await screen.findByLabelText("Carta publicada");
    await screen.findByRole("option", { name: /Escudo/ });
    fireEvent.change(select, { target: { value: "pv2" } });
    expect(screen.queryByLabelText(/Conceder como aprendida/)).toBeNull();
    fireEvent.change(select, { target: { value: "pv1" } });
    fireEvent.click(screen.getByLabelText(/Conceder como aprendida/));
    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), { target: { value: "Recompensa" } });
    fireEvent.click(screen.getByRole("button", { name: "Conceder" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/personagens/{personagem_id}/cartas", expect.objectContaining({
      body: { versao_id: "pv1", excecao_aprendizado: true, motivo: "Recompensa", versao_esperada: 7 },
    })));
  });

  it("Narrador migra pelo detalhe, com a prévia das diferenças", async () => {
    const { POST } = montar({ papel: "narrador", cartas: [{ ...CARTAS_DA_REFERENCIA[0]!, versao_mais_recente: 2 }] });
    fireEvent.click(await waitFor(() => cartaChamada("Segundo round")));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Segundo round" })).getByRole("button", { name: "Migrar para a versão 2" }));
    const dialogo = await screen.findByRole("dialog", { name: /Migrar/ });
    expect(await within(dialogo).findByRole("rowheader", { name: "custo_uso" })).toBeTruthy();
    const confirmar = within(dialogo).getByRole("button", { name: "Migrar para a versão 2" }) as HTMLButtonElement;
    await waitFor(() => expect(confirmar.disabled).toBe(false));
    fireEvent.click(confirmar);
    await waitFor(() => expect(POST).toHaveBeenCalledWith(
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao",
      expect.objectContaining({ body: { versao_destino_id: "segundo-v2", versao_esperada: 7 } }),
    ));
  });

  it("jogador não conclui, não remove, não migra nem concede", async () => {
    montar({ cartas: [{ ...semCustosReservados(CARTAS_DA_REFERENCIA)[0]!, estado: "em_aprendizado", versao_mais_recente: 2 }] });
    fireEvent.click(await waitFor(() => cartaChamada("Segundo round")));
    const detalhe = await screen.findByRole("dialog", { name: "Segundo round" });
    expect(within(detalhe).getByRole("button", { name: "Interromper aprendizado" })).toBeTruthy();
    for (const nome of ["Concluir aprendizado", "Remover", /Migrar/]) expect(within(detalhe).queryByRole("button", { name: nome })).toBeNull();
    expect(screen.queryByRole("button", { name: "Conceder carta" })).toBeNull();
  });

  it("Enter abre o detalhe, e ao fechar o foco volta para a carta", async () => {
    montar();
    const carta = await waitFor(() => cartaChamada("Passo veloz"));
    carta.focus();
    fireEvent.keyDown(carta, { key: "Enter" });
    fireEvent.click(carta); // no navegador, Enter num botão dispara o clique
    const detalhe = await screen.findByRole("dialog", { name: "Passo veloz" });
    fireEvent.keyDown(detalhe, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(cartaChamada("Passo veloz")));
  });
});

describe("Detalhe em grimório (D8 revisto)", () => {
  const quadros = (detalhe: HTMLElement) => Array.from(detalhe.querySelectorAll(".grimorio-dado"))
    .map((q) => [q.querySelector("dt")?.textContent, q.querySelector("dd")?.textContent]);

  it("habilidade vista pelo jogador: arte, tipo e título à esquerda; citação e os seis quadros à direita", async () => {
    montar();
    fireEvent.click(await waitFor(() => cartaChamada("Segundo round")));
    const detalhe = await screen.findByRole("dialog", { name: "Segundo round" });
    expect(detalhe.querySelector(".grimorio-pagina--esquerda .grimorio-arte .carta-medalhao")).toBeTruthy();
    expect(within(detalhe).getByText("Habilidade", { selector: ".grimorio-titulo__tipo" })).toBeTruthy();
    expect(within(detalhe).getByText(/Uma vez a cada 2 turnos/, { selector: ".grimorio-citacao__texto" })).toBeTruthy();
    expect(quadros(detalhe)).toEqual([
      ["Marcações", "Nenhuma"],
      ["Origem", "Classe: Especialista de Combate - automática"],
      ["Versão", "1"],
      ["Recebida em", new Date(CARTAS_DA_REFERENCIA[0]!.adquirida_em).toLocaleDateString("pt-BR")],
      ["Potência de uso", "Não definido"],
      ["Custo de uso", "Não definido"],
    ]);
    // Como no conceito, os quadros ficam em pares lado a lado; a origem longa diminui para caber.
    expect(Array.from(detalhe.querySelectorAll(".grimorio-dado")).map((q) => q.className.match(/grimorio-dado--(\w+)/)?.[1]))
      .toEqual(["esquerda", "direita", "esquerda", "direita", "esquerda", "direita"]);
    expect((detalhe.querySelectorAll(".grimorio-dado__valor")[1] as HTMLElement).style.getPropertyValue("--valor-escala")).toBe("0.86");
    // Sem a pintura, o livro é desenhado em CSS.
    expect(detalhe.classList.contains("grimorio--pintado")).toBe(false);
    expect(detalhe.querySelector(".grimorio-fundo img")).toBeNull();
  });

  it("com a pintura do grimório pronta, ela é o fundo e o livro em CSS sai", async () => {
    vi.stubGlobal("Image", class { onload: (() => void) | null = null; set src(_: string) { queueMicrotask(() => this.onload?.()); } });
    montar();
    fireEvent.click(await waitFor(() => cartaChamada("Segundo round")));
    const detalhe = await screen.findByRole("dialog", { name: "Segundo round" });
    await waitFor(() => expect(detalhe.classList.contains("grimorio--pintado")).toBe(true));
    expect(detalhe.querySelector(".grimorio-fundo img")?.getAttribute("src")).toBe("/arte/cartas/cartas-detalhe-livro.webp");
    // A arte quadrada da categoria traz a moldura pintada: a de SVG sai.
    await waitFor(() => expect(detalhe.querySelector(".grimorio-arte--pintada img")?.getAttribute("src")).toBe("/arte/cartas/cartas-arte-habilidades.webp"));
    expect(detalhe.querySelector(".grimorio-arte .carta-medalhao")).toBeNull();
  });

  it("magia vista pelo Narrador: escola, grau e os custos reservados, com marcações sem o prefixo interno", async () => {
    const magia = { ...CARTAS_PARA_FILTROS[0]!, carta: { ...CARTAS_PARA_FILTROS[0]!.carta, conteudo: {
      ...CARTAS_PARA_FILTROS[0]!.carta.conteudo, custo_aprendizado: 22, descansos_minimos: 4, tags: ["raca:Elfo", "Luz"] } } };
    montar({ papel: "narrador", cartas: [magia] });
    fireEvent.click(await waitFor(() => cartaChamada("Luz das estrelas")));
    const detalhe = await screen.findByRole("dialog", { name: "Luz das estrelas" });
    expect(Object.fromEntries(quadros(detalhe))).toMatchObject({
      "Marcações": "Elfo • Luz", "Escola": "Ilusão", "Grau": "1", "Potência de uso": "2", "Custo de uso": "1",
      "Custo de aprendizado": "22", "Descansos mínimos": "4",
    });
  });

  it("item: sem quadros de custo, e a arte própria ocupa o quadro da página esquerda", async () => {
    const espada = { ...CARTAS_PARA_FILTROS[1]!, carta: { ...CARTAS_PARA_FILTROS[1]!.carta, conteudo: {
      ...CARTAS_PARA_FILTROS[1]!.carta.conteudo, ativos: ["mesas/mesa/mesa/cartas/espada.png"] } } };
    montar({ cartas: [espada] });
    fireEvent.click(await waitFor(() => cartaChamada("Espada longa")));
    const detalhe = await screen.findByRole("dialog", { name: "Espada longa" });
    expect(quadros(detalhe).map(([rotulo]) => rotulo)).toEqual(["Marcações", "Origem", "Versão", "Recebida em"]);
    await waitFor(() => expect(detalhe.querySelector(".grimorio-arte img")?.getAttribute("src")).toBe("data:image/png;base64,iVBORw0KGgo="));
  });
});
