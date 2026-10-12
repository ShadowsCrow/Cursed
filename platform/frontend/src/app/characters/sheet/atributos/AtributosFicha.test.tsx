// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FichaContrato, PermissoesFicha, ValorDerivadoResumo } from "../../types";
import { GRUPOS_ATRIBUTOS } from "../sheetCatalog";
import { AtributosFicha } from "./AtributosFicha";
import { ICONES_DOS_ATRIBUTOS } from "./nomesDosIcones";

const FICHA = {
  personagem: { nome: "Lion" },
  atributos: {
    valores: { "Força": 3, Destreza: 2, Vigor: 2, Carisma: 2, "Manipulação": 2, Proposito: 1, "Percepção": 1, Sorte: 2 },
    ajustes: { Vigor: 1, "Percepção": -1 },
  },
} as unknown as FichaContrato;
const PERMISSOES: PermissoesFicha = {
  papel: "jogador", editar: true, excluir: true, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [],
};
const VALORES: ValorDerivadoResumo[] = [
  { chave: "atributo:forca", rotulo: "Força", grupo: "atributo", calculavel: true, total: 4,
    fontes: [{ tipo: "base", descricao: "Valor base", valor: 3 }, { tipo: "efeito", descricao: "Elfo", valor: 1 }], situacionais: [] },
  { chave: "atributo:proposito", rotulo: "Propósito", grupo: "atributo", calculavel: true, total: 1,
    fontes: [{ tipo: "base", descricao: "Valor base", valor: 1 }], situacionais: [] },
  { chave: "atributo:destreza", rotulo: "Destreza", grupo: "atributo", calculavel: false, total: null, motivo: "Classe fora do catálogo.",
    fontes: [], situacionais: [] },
];

function montar({ permissoes = PERMISSOES, onSave = vi.fn(async () => ({ status: "salvo" as const })), aplicarLimites = true } = {}) {
  render(<AtributosFicha grupos={GRUPOS_ATRIBUTOS} ficha={FICHA} valores={VALORES} permissoes={permissoes} onSave={onSave} aplicarLimites={aplicarLimites} />);
  return onSave;
}

describe("AtributosFicha — aba Atributos", () => {
  afterEach(() => cleanup());

  it("compõe a folha: título, três cartões na ordem oficial e as tabelas nomeadas pelos cartões", () => {
    montar();
    expect(screen.getByRole("heading", { level: 2, name: "Atributos" })).toBeTruthy();
    expect(screen.getByText("Base mecânica")).toBeTruthy();
    const cartoes = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(cartoes).toEqual(["Físicos", "Sociais", "Mentais", "Outros registrados na ficha"]);
    const sociais = screen.getByRole("table", { name: "Sociais" });
    expect(within(sociais).getAllByRole("rowheader").map((c) => c.textContent)).toEqual(["Carisma", "Manipulação", "Propósito"]);
    expect(screen.getByText("Força do corpo", { selector: ".atributos-cartao__subtitulo" })).toBeTruthy();
  });

  it("mostra a base, o ajuste com sinal ou travessão e o total com sinal", () => {
    montar();
    expect(screen.getByLabelText("Base de Força").textContent).toBe("3");
    expect(screen.getByLabelText("Ajuste manual de Força").textContent).toBe("—");
    expect(screen.getByLabelText("Ajuste manual de Vigor").textContent).toBe("+1");
    expect(screen.getByLabelText("Ajuste manual de Percepção").textContent).toBe("−1");
    expect(screen.getByLabelText("Base de Inteligência").textContent).toBe("—");
    // A grafia de exibição vem do servidor ("Proposito" gravado na ficha).
    expect(screen.getByLabelText("Base de Propósito").textContent).toBe("1");
    expect(screen.getByRole("button", { name: "Fontes de Força" }).textContent).toBe("+4");
  });

  it("abre as fontes do total e mostra o motivo quando não é calculável", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Fontes de Força" }));
    expect(await screen.findByText(/Elfo/)).toBeTruthy();
    const destreza = screen.getByRole("button", { name: "Destreza: não calculável" });
    expect(destreza.textContent).toBe("—");
    fireEvent.click(destreza);
    expect(await screen.findByText(/Classe fora do catálogo/)).toBeTruthy();
  });

  it("mantém atributos extras da ficha no cartão Outros", () => {
    montar();
    const outros = screen.getByRole("table", { name: "Outros registrados na ficha" });
    expect(within(outros).getByRole("rowheader", { name: "Sorte" })).toBeTruthy();
    expect(screen.getByLabelText("Base de Sorte").textContent).toBe("2");
  });

  it("grava duas alterações numa única chamada e volta à leitura", async () => {
    const onSave = montar();
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    fireEvent.change(screen.getByLabelText("Base de Destreza"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Ajuste manual de Vigor"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações (2)" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith([
      { path: "atributos.valores.Destreza", value: 3 },
      { path: "atributos.ajustes.Vigor", value: 2 },
    ]);
    expect(await screen.findByText("Alterações salvas.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar valores" })).toBeTruthy();
  });

  it("recusa base 6 com a mensagem junto ao campo; NPC não tem limite", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    const forca = screen.getByLabelText("Base de Força");
    fireEvent.change(forca, { target: { value: "6" } });
    expect(forca.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(forca.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Vai de 1 a 5; acima disso, use o ajuste.");
    expect((screen.getByRole("button", { name: /Salvar alterações/ }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    montar({ aplicarLimites: false });
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    fireEvent.change(screen.getByLabelText("Base de Força"), { target: { value: "8" } });
    expect(screen.getByLabelText("Base de Força").getAttribute("aria-invalid")).toBeNull();
  });

  it("avisa da aprovação do Narrador e cancela sem gravar", () => {
    const onSave = montar({ permissoes: { ...PERMISSOES, campos_exigem_aprovacao: ["atributos.ajustes"] } });
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    fireEvent.change(screen.getByLabelText("Ajuste manual de Força"), { target: { value: "1" } });
    expect(screen.getByText(/serão enviadas para aprovação do Narrador/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Ajuste manual de Força").textContent).toBe("—");
  });

  it("quem só lê não vê a ação de editar", () => {
    montar({ permissoes: { ...PERMISSOES, editar: false } });
    expect(screen.queryByRole("button", { name: "Editar valores" })).toBeNull();
  });

  it("sem a gravura, cada fita ganha um emblema; sem a cena, a faixa fica no degradê", () => {
    const { container } = render(<AtributosFicha grupos={GRUPOS_ATRIBUTOS} ficha={FICHA} valores={VALORES} permissoes={PERMISSOES} onSave={vi.fn()} />);
    const gravura = container.querySelector(".atributos-vinhetas__gravura");
    expect(gravura?.getAttribute("src")).toBe("/arte/atributos/atributos-gravura.webp");
    expect(container.querySelectorAll(".atributos-vinheta__emblema")).toHaveLength(0);
    fireEvent.error(gravura!);
    expect(container.querySelector(".atributos-vinhetas__gravura")).toBeNull();
    expect(container.querySelectorAll(".atributos-vinheta__emblema")).toHaveLength(3);
    const cenas = container.querySelectorAll(".atributos-cartao__pintura");
    expect(cenas).toHaveLength(3);
    fireEvent.error(cenas[0]!);
    expect(container.querySelectorAll(".atributos-cartao__pintura")).toHaveLength(2);
  });

  it("ícones e ornamentos são decorativos, e cada atributo oficial tem ícone", () => {
    const { container } = render(<AtributosFicha grupos={GRUPOS_ATRIBUTOS} ficha={FICHA} valores={VALORES} permissoes={PERMISSOES} onSave={vi.fn()} />);
    for (const svg of Array.from(container.querySelectorAll("svg"))) {
      expect(svg.closest("[aria-hidden='true']")).not.toBeNull();
    }
    expect(ICONES_DOS_ATRIBUTOS).toHaveLength(9);
    expect(container.querySelectorAll(".atributos-linha .icone-atributo")).toHaveLength(9);
  });

  it("não apresenta violações de acessibilidade detectáveis, em leitura e em edição", async () => {
    montar();
    let resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    fireEvent.change(screen.getByLabelText("Base de Força"), { target: { value: "9" } });
    resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
