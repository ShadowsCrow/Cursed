// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FichaContrato, PermissoesFicha } from "../types";
import type { ClasseCatalogo, ListasFicha, RacaCatalogo } from "./catalogoApi";
import { IdentityPanel } from "./IdentityPanel";
import { iconeDoSexo } from "./informacoes/sexo";

const hab = (nome: string) => ({ nome, descricao: `${nome}.`, tipo: "Passiva" });
const CLASSES: ClasseCatalogo[] = [
  { nome: "Mago", cor: "#5B2C6F", habilidades: [hab("Mutações")],
    arquetipos: [{ nome: "Mutante Arcano", conceito: "Corpos propícios a mutações.", habilidades: [hab("Resistência Imutável")] }] },
  { nome: "Gatuno", cor: "#2E4053", habilidades: [hab("Mãos Leves")],
    arquetipos: ["Ladrão", "Assassino", "Psionico"].map((nome) => ({ nome, conceito: "", habilidades: [hab(`Truque ${nome}`)] })) },
];
const RACAS: RacaCatalogo[] = [
  { nome: "Elfo", deslocamento: 9, tamanho: "Médio", habilidades: [] },
  { nome: "Anão", deslocamento: 7, tamanho: "Pequeno", habilidades: [] },
];
const LISTAS: ListasFicha = {
  sexos: ["Masculino", "Feminino", "Outro"],
  alinhamentos: ["Leal | Bom", "Neutro | Bom", "Caótico | Bom"],
  pecados: [{ nome: "Ira", icone: "😡", equivalentes: [] }, { nome: "Ganância", icone: "💰", equivalentes: ["Ganancia"] },
    { nome: "Orgulho", icone: "👑", equivalentes: [] }],
  campos_personalidade: [
    { chave: "vivo_para", rotulo: "Vivo para", dica: "Ex: proteger os inocentes", longo: false },
    { chave: "medo", rotulo: "Medo ou fobia", dica: "Ex: aranhas gigantes", longo: false },
    { chave: "historia", rotulo: "História", dica: "Ex: de onde veio", longo: true, limite: 4000 },
  ],
};
const JOGADOR: PermissoesFicha = {
  papel: "jogador", editar: true, excluir: false, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [],
};
const NARRADOR: PermissoesFicha = { ...JOGADOR, papel: "narrador" };

function ficha(personagem: Record<string, unknown>, personalidade: Record<string, unknown> = {}): FichaContrato {
  return { personagem: { nome: "Ayla", ...personagem }, personalidade } as unknown as FichaContrato;
}

function montar(f: FichaContrato, permissoes = JOGADOR, avisos: Record<string, string> = {}) {
  const onSave = vi.fn(async () => ({ status: "salvo" as const }));
  render(<IdentityPanel ficha={f} permissoes={permissoes} classes={CLASSES} racas={RACAS} listas={LISTAS} avisos={avisos} onSave={onSave} />);
  return onSave;
}

describe("Aba Informações", () => {
  afterEach(() => cleanup());

  it("mostra a cor da classe junto do nome, o conceito do arquétipo e o Tamanho vindo da raça", () => {
    montar(ficha({ classe: "Mago", arquetipo: "Mutante Arcano", raca: "Elfo", nivel: 3 }));
    expect(screen.getByText("Mago")).toBeTruthy();
    expect(document.querySelector(".class-swatch")).toBeTruthy();
    expect(screen.getByText("Corpos propícios a mutações.")).toBeTruthy();
    expect(screen.getByText("Da raça Elfo")).toBeTruthy();
    expect(screen.getByText("Médio")).toBeTruthy();
  });

  it("mostra a altura e salva em metros aceitando vírgula; aviso do servidor aparece junto", async () => {
    const onSave = montar(ficha({ raca: "Elfo", altura: 1.75 }), JOGADOR, { "personagem.altura": "Na média, a altura de um Elfo vai de 1,60 m a 1,95 m." });
    expect(screen.getByText("1,75")).toBeTruthy();
    expect(screen.getByText(/Na média, a altura de um Elfo/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Editar Altura (m)" }));
    fireEvent.change(screen.getByLabelText("Altura (m)", { selector: "input" }), { target: { value: "1,82" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Salvar" })[0]!);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([{ path: "personagem.altura", value: 1.82 }]));
  });

  it("ficha sem altura mostra não informado", () => {
    montar(ficha({ raca: "Elfo" }));
    const campo = screen.getByText("Altura (m)").closest(".editable-field")!;
    expect(campo.textContent).toContain("Não informado");
  });

  it("arquétipos mostram só os da classe escolhida", () => {
    montar(ficha({ classe: "Gatuno", raca: "Elfo" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Arquétipo" }));
    const opcoes = within(screen.getByLabelText("Arquétipo", { selector: "select" })).getAllByRole("option").map((o) => o.textContent);
    expect(opcoes).toEqual(["Sem arquétipo", "Ladrão", "Assassino", "Psionico"]);
  });

  it("troca de classe limpa o arquétipo de outra classe e lista as cartas que saem e entram", async () => {
    const onSave = montar(ficha({ classe: "Mago", arquetipo: "Mutante Arcano", raca: "Elfo" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Classe" }));
    fireEvent.change(screen.getByLabelText("Classe", { selector: "select" }), { target: { value: "Gatuno" } });
    expect(screen.getByText(/não pertence à nova classe/)).toBeTruthy();
    const troca = screen.getByLabelText("Cartas de habilidade na troca");
    expect(troca.textContent).toContain("Mutações, Resistência Imutável");
    expect(troca.textContent).toContain("Mãos Leves");
    fireEvent.click(screen.getAllByRole("button", { name: "Salvar" })[0]!);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([
      { path: "personagem.classe", value: "Gatuno" }, { path: "personagem.arquetipo", value: "" },
    ]));
  });

  it("nível e Tamanho atual são só do Narrador", () => {
    montar(ficha({ classe: "Mago", raca: "Elfo", nivel: 2 }));
    expect(screen.queryByRole("button", { name: "Editar Nível" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar Tamanho atual" })).toBeNull();
    cleanup();
    montar(ficha({ classe: "Mago", raca: "Elfo", nivel: 2 }), NARRADOR);
    expect(screen.getByRole("button", { name: "Editar Nível" })).toBeTruthy();
  });

  it("troca de raça com Tamanho atual exige limpar ou reconfirmar", async () => {
    const onSave = montar(ficha({ classe: "Mago", raca: "Elfo", tamanho: "Grande" }), NARRADOR);
    fireEvent.click(screen.getByRole("button", { name: "Editar Raça" }));
    fireEvent.change(screen.getByLabelText("Raça", { selector: "select" }), { target: { value: "Anão" } });
    const salvar = screen.getAllByRole("button", { name: "Salvar" })[0] as HTMLButtonElement;
    expect(salvar.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("Manter Grande também para Anão"));
    expect(salvar.disabled).toBe(false);
    fireEvent.click(salvar);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([
      { path: "personagem.raca", value: "Anão" }, { path: "personagem.tamanho_raca", value: "Anão" },
    ]));
  });

  it("jogador não troca a raça quando há Tamanho atual do Narrador", () => {
    montar(ficha({ classe: "Mago", raca: "Elfo", tamanho: "Grande" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Raça" }));
    fireEvent.change(screen.getByLabelText("Raça", { selector: "select" }), { target: { value: "Anão" } });
    expect(screen.getByRole("alert").textContent).toContain("Peça a ele");
  });

  it("valor antigo fora do catálogo aparece com aviso e a ação de vincular", () => {
    montar(ficha({ classe: "mago negro", raca: "Elfo" }), NARRADOR, { "personagem.classe": "A classe \"mago negro\" não existe no catálogo." });
    expect(screen.getByText("mago negro")).toBeTruthy();
    expect(screen.getByText(/não existe no catálogo/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Vincular Classe" }));
    expect(screen.getByText(/Valor atual fora da lista: “mago negro”/)).toBeTruthy();
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    montar(ficha({ classe: "Mago", arquetipo: "Mutante Arcano", raca: "Elfo", nivel: 1, idade: 27, sexo: "Feminino" }), NARRADOR);
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});

describe("Folha de Informações básicas", () => {
  afterEach(() => cleanup());

  const LION = { nome: "Lion", classe: "Mago", arquetipo: "Mutante Arcano", raca: "Elfo", nivel: 1, idade: 15, sexo: "Masculino" };

  function quadro(nome: string) {
    return screen.getByRole("region", { name: nome });
  }

  it("divide os campos nos dois quadros da referência, com título e subtítulo da folha", () => {
    montar(ficha(LION));
    const folha = screen.getByRole("region", { name: "Informações básicas" });
    expect(within(folha).getByRole("heading", { level: 2, name: "Informações básicas" })).toBeTruthy();
    expect(within(folha).getByText("Dados fundamentais sobre o personagem.")).toBeTruthy();
    const rotulos = (nome: string) => Array.from(quadro(nome).querySelectorAll(".info-linha .eyebrow")).map((e) => e.textContent);
    expect(within(quadro("Características pessoais")).getByRole("heading", { level: 3 })).toBeTruthy();
    expect(rotulos("Características pessoais")).toEqual(["Nome", "Arquétipo", "Nível", "Altura (m)", "Tamanho base"]);
    expect(rotulos("Classificação e origem")).toEqual(["Classe", "Raça", "Idade", "Sexo", "Tamanho atual"]);
    expect(within(quadro("Características pessoais")).getByText("Lion")).toBeTruthy();
    expect(within(quadro("Classificação e origem")).getByText("Masculino")).toBeTruthy();
  });

  it("Tamanho base não tem botão de edição e mostra a raça de origem", () => {
    montar(ficha(LION), NARRADOR);
    const linha = screen.getByText("Tamanho base").closest(".info-linha") as HTMLElement;
    expect(within(linha).queryByRole("button")).toBeNull();
    expect(within(linha).getByText("Da raça Elfo")).toBeTruthy();
  });

  it("só leitura: nenhuma linha tem Editar", () => {
    montar(ficha(LION), { ...JOGADOR, editar: false });
    expect(screen.queryAllByRole("button", { name: /^Editar / })).toHaveLength(0);
    expect(document.querySelectorAll(".info-linha")).toHaveLength(10);
  });

  it("faixa do conceito com título pelo arquétipo; sem conceito, a faixa não aparece", () => {
    montar(ficha(LION));
    const faixa = screen.getByRole("region", { name: "Conceito do arquétipo Mutante Arcano" });
    expect(within(faixa).getByText("Corpos propícios a mutações.")).toBeTruthy();
    cleanup();
    montar(ficha({ ...LION, classe: "Gatuno", arquetipo: "Ladrão" }));
    expect(screen.queryByRole("region", { name: /Conceito do arquétipo/ })).toBeNull();
    cleanup();
    montar(ficha({ ...LION, arquetipo: "" }));
    expect(screen.queryByRole("region", { name: /Conceito do arquétipo/ })).toBeNull();
  });

  it("ícones, emblemas e ornamentos ficam fora da árvore de acessibilidade", () => {
    montar(ficha(LION));
    const svgs = Array.from(document.querySelectorAll("svg"));
    expect(svgs.length).toBeGreaterThan(15);
    for (const svg of svgs) {
      expect(svg.closest("[aria-hidden='true']")).toBeTruthy();
      expect(svg.getAttribute("focusable")).toBe("false");
    }
  });

  it("o símbolo do sexo segue o valor gravado", () => {
    expect(iconeDoSexo("Masculino")).toBe("sexo-masculino");
    expect(iconeDoSexo("feminino")).toBe("sexo-feminino");
    expect(iconeDoSexo("Outro")).toBe("sexo-outro");
    expect(iconeDoSexo("")).toBe("sexo-outro");
    montar(ficha({ ...LION, sexo: "Feminino" }));
    expect(document.querySelector(".info-icone--sexo-feminino")).toBeTruthy();
  });

  it("pinturas: a que falha some sem imagem quebrada e o texto do conceito fica com o espaço; a que carrega abre espaço", () => {
    montar(ficha(LION));
    const faixa = screen.getByRole("region", { name: "Conceito do arquétipo Mutante Arcano" });
    const esquerda = faixa.querySelector(".info-pintura--conceito-esquerda") as HTMLImageElement;
    const direita = faixa.querySelector(".info-pintura--conceito-direita") as HTMLImageElement;
    expect(esquerda.getAttribute("alt")).toBe("");
    fireEvent.load(esquerda);
    fireEvent.error(direita);
    expect(faixa.className).toContain("info-conceito--esquerda");
    expect(faixa.className).not.toContain("info-conceito--direita");
    expect(faixa.querySelector(".info-pintura--conceito-direita")).toBeNull();

    const paisagem = document.querySelector(".info-pintura--paisagem") as HTMLImageElement;
    expect(document.querySelector(".info-folha__rosa")).toBeTruthy();
    fireEvent.error(paisagem);
    expect(document.querySelector(".info-pintura--paisagem")).toBeNull();
    expect(document.querySelector(".info-folha__rosa")).toBeTruthy();
  });

  it("paisagem carregada toma o lugar da rosa dos ventos", () => {
    montar(ficha(LION));
    fireEvent.load(document.querySelector(".info-pintura--paisagem") as HTMLImageElement);
    expect(document.querySelector(".info-folha")?.className).toContain("info-folha--paisagem");
    expect(document.querySelector(".info-folha__rosa")).toBeNull();
  });
});
