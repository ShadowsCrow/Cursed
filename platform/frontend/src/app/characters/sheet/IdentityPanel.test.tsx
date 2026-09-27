// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FichaContrato, PermissoesFicha } from "../types";
import type { ClasseCatalogo, ListasFicha, RacaCatalogo } from "./catalogoApi";
import { IdentityPanel } from "./IdentityPanel";
import { PersonalityPanel } from "./PersonalityPanel";

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
    { chave: "vivo_para", rotulo: "Vivo para", dica: "Ex: proteger os inocentes" },
    { chave: "medo", rotulo: "Medo ou fobia", dica: "Ex: aranhas gigantes" },
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

describe("Aba Personalidade", () => {
  afterEach(() => cleanup());

  function personalidade(valores: Record<string, unknown>) {
    const onSave = vi.fn(async () => ({ status: "salvo" as const }));
    render(<PersonalityPanel nome="Ayla" ficha={ficha({}, valores)} permissoes={JOGADOR} listas={LISTAS} avisos={{}} onSave={onSave} />);
    return onSave;
  }

  it("ficha migrada mostra os valores antigos, com Ganancia como Ganância", () => {
    personalidade({ pecado: "Ganancia", alinhamento: "Leal | Bom", medo: "aranhas gigantes" });
    expect(screen.getByText("💰 Ganância")).toBeTruthy();
    expect(screen.getByText("Leal | Bom")).toBeTruthy();
    expect(screen.getByText("aranhas gigantes")).toBeTruthy();
  });

  it("campo vazio mostra a dica sem gravá-la", () => {
    const onSave = personalidade({});
    expect(screen.getByText("Ex: proteger os inocentes")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Editar Vivo para" }));
    expect((screen.getByLabelText("Vivo para", { selector: "textarea" }) as HTMLTextAreaElement).placeholder).toBe("Ex: proteger os inocentes");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("pecado escolhido da lista com ícone", async () => {
    const onSave = personalidade({});
    fireEvent.click(screen.getByRole("button", { name: "Editar Pecado Capital" }));
    fireEvent.change(screen.getByLabelText("Pecado Capital", { selector: "select" }), { target: { value: "Orgulho" } });
    expect(screen.getByRole("option", { name: "👑 Orgulho" })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Salvar" })[0]!);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([{ path: "personalidade.pecado", value: "Orgulho" }]));
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    personalidade({ pecado: "Ira", medo: "escuro" });
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
