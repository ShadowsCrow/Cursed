// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import listasDoSistema from "../../../../../../cursed_platform/catalogos/listas_ficha.json";
import type { FichaContrato, PermissoesFicha } from "../types";
import type { ListasFicha } from "./catalogoApi";
import { PersonalityPanel } from "./PersonalityPanel";

// As listas do JSON do sistema: os testes acompanham os grupos, os ícones e a ordem de lá.
const LISTAS = listasDoSistema as unknown as ListasFicha;

const JOGADOR: PermissoesFicha = {
  papel: "jogador", editar: true, excluir: false, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [],
};
const LEITOR: PermissoesFicha = { ...JOGADOR, editar: false };

/** A personalidade de Lion, a da imagem de referência (pecado vazio). */
const LION = {
  alinhamento: "Leal | Bom", coisa_favorita: "Runas antigas", quando_me_veem: "Um sábio distante",
  vivo_para: "Proteger os inocentes", medo: "Aranhas gigantes", odeia: "Traição", manias: "Roer unha",
  meu_lema: "O dever acima de tudo", valor_inquebravel: "Lealdade", religiao: "Deusa da Lua",
  frase: "Conhecimento é a única arma que nunca podem me tirar.",
  tracos: ["Leal", "Disciplinado", "Reservado", "Idealista"],
  historia: "Veio de terras antigas.\n\nSegue movido por dever.",
};

function ficha(personalidade: Record<string, unknown>): FichaContrato {
  return { personagem: { nome: "Lion" }, personalidade } as unknown as FichaContrato;
}

function montar(personalidade: Record<string, unknown>, opcoes: { permissoes?: PermissoesFicha; listas?: ListasFicha; avisos?: Record<string, string> } = {}) {
  const onSave = vi.fn(async () => ({ status: "salvo" as const }));
  render(<PersonalityPanel nome="Lion" ficha={ficha(personalidade)} permissoes={opcoes.permissoes ?? JOGADOR}
    listas={opcoes.listas ?? LISTAS} avisos={opcoes.avisos ?? {}} onSave={onSave} arte={{}} />);
  return onSave;
}

/** Rótulos das linhas de um quadro, na ordem. */
function rotulosDo(titulo: string) {
  const quadro = screen.getByRole("region", { name: titulo });
  return Array.from(quadro.querySelectorAll(".personalidade-linha .editable-field > .eyebrow")).map((e) => e.textContent);
}

describe("Aba Personalidade (cópia da referência)", () => {
  afterEach(() => cleanup());

  it("Lion: topo com eyebrow, título único, frase e traços; dois quadros na ordem do JSON; História em parágrafos", () => {
    montar(LION);
    expect(screen.getByText("Quem é Lion")).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: "Personalidade" })).toHaveLength(1);
    expect(screen.getByText("Traços, valores e marcas que definem o personagem.")).toBeTruthy();
    expect(screen.getByText("Conhecimento é a única arma que nunca podem me tirar.")).toBeTruthy();
    const etiquetas = screen.getByRole("list", { name: "Traços" });
    expect(within(etiquetas).getAllByRole("listitem").map((i) => i.textContent)).toEqual(["Leal", "Disciplinado", "Reservado", "Idealista"]);

    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Traços e essência", "Convicções e sombras", "História"]);
    expect(rotulosDo("Traços e essência")).toEqual(["Alinhamento", "Coisa favorita", "Quando me veem pensam que", "Vivo para", "Medo ou fobia"]);
    expect(rotulosDo("Convicções e sombras")).toEqual(["Pecado Capital", "O que odeia", "Manias ou hábitos", "Meu lema", "Valor inquebrável", "Religião ou crença"]);
    expect(screen.getByText("O que teme, o que rejeita e aquilo que nunca abandona.")).toBeTruthy();

    const historia = screen.getByRole("region", { name: "História" });
    expect(Array.from(historia.querySelectorAll(".personalidade-historia__texto p")).map((p) => p.textContent))
      .toEqual(["Veio de terras antigas.", "Segue movido por dever."]);
    expect(screen.getByText("O passado que moldou o presente.")).toBeTruthy();
  });

  it("cada linha tem o ícone do tema do campo, fora da árvore de acessibilidade", () => {
    montar(LION);
    const linhas = Array.from(document.querySelectorAll(".personalidade-linha"));
    expect(linhas).toHaveLength(11);
    for (const linha of linhas) {
      const icone = linha.querySelector(".personalidade-linha__icone svg");
      expect(icone?.getAttribute("aria-hidden")).toBe("true");
    }
    expect(linhas[0]!.querySelector(".personalidade-icone--balanca")).not.toBeNull();
    expect(linhas[4]!.querySelector(".personalidade-icone--aranha")).not.toBeNull();
    expect(linhas[5]!.querySelector(".personalidade-icone--caveira")).not.toBeNull();
  });

  it("um campo movido de grupo no JSON muda de coluna, sem mudança de código", () => {
    const grupos = LISTAS.grupos_personalidade!.map((g) => ({ ...g, campos: g.campos.filter((c) => c !== "medo") }));
    grupos[1]!.campos.push("medo");
    montar(LION, { listas: { ...LISTAS, grupos_personalidade: grupos } });
    expect(rotulosDo("Traços e essência")).not.toContain("Medo ou fobia");
    expect(rotulosDo("Convicções e sombras").at(-1)).toBe("Medo ou fobia");
  });

  it("pecado escolhido aparece só pelo nome; o emoji fica nas opções", async () => {
    const onSave = montar({ ...LION, pecado: "Orgulho" });
    expect(screen.getByText("Orgulho")).toBeTruthy();
    expect(screen.queryByText("👑 Orgulho")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Editar Pecado Capital" }));
    expect(screen.getByRole("option", { name: "👑 Orgulho" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Pecado Capital", { selector: "select" }), { target: { value: "Ira" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Salvar" })[0]!);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([{ path: "personalidade.pecado", value: "Ira" }]));
  });

  it("ficha migrada: Ganancia vira Ganância, sem emoji", () => {
    montar({ pecado: "Ganancia" });
    expect(screen.getByText("Ganância")).toBeTruthy();
  });

  it("editar pela linha: Vivo para salva pelo mesmo campo de antes", async () => {
    const onSave = montar({});
    expect(screen.getByText("Ex: proteger os inocentes")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Editar Vivo para" }));
    fireEvent.change(screen.getByLabelText("Vivo para", { selector: "textarea" }), { target: { value: "Proteger os inocentes" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Salvar" }).at(-1)!);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([{ path: "personalidade.vivo_para", value: "Proteger os inocentes" }]));
  });

  it("valor antigo de alinhamento fora da lista mostra o aviso e a ação Vincular", () => {
    montar({ alinhamento: "caótico e bondoso" }, { avisos: { "personalidade.alinhamento": "Alinhamento fora da lista." } });
    expect(screen.getByText("caótico e bondoso")).toBeTruthy();
    expect(screen.getByText("Alinhamento fora da lista.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vincular Alinhamento" })).toBeTruthy();
  });

  it("só leitura: sem Editar, vazios como Não informado e sem citação nem traços vazios", () => {
    montar({ alinhamento: "Leal | Bom" }, { permissoes: LEITOR });
    expect(screen.queryAllByRole("button", { name: /^Editar/ })).toHaveLength(0);
    expect(screen.getAllByText("Não informado").length).toBeGreaterThan(5);
    expect(document.querySelector(".personalidade-citacao")).toBeNull();
    expect(screen.queryByRole("list", { name: "Traços" })).toBeNull();
    expect(screen.getByText("História não escrita.")).toBeTruthy();
  });

  it("quem edita vê a citação e os traços vazios com a dica, e o convite da História", () => {
    montar({});
    expect(screen.getByText("Ex: Conhecimento é a única arma que nunca podem me tirar.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar Frase marcante" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar Traços" })).toBeTruthy();
    expect(screen.getByText("A história de Lion ainda não foi escrita.")).toBeTruthy();
  });

  it("História: editar abre o texto longo com o limite do JSON", async () => {
    const onSave = montar({ historia: "Primeiro." });
    fireEvent.click(screen.getByRole("button", { name: "Editar História" }));
    const campo = screen.getByLabelText("História", { selector: "textarea" }) as HTMLTextAreaElement;
    expect(campo.rows).toBe(10);
    expect(screen.getByText("9 de 4.000 caracteres")).toBeTruthy();
    fireEvent.change(campo, { target: { value: "Veio do norte.\n\nPerdeu tudo." } });
    fireEvent.click(screen.getAllByRole("button", { name: "Salvar" }).at(-1)!);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([{ path: "personalidade.historia", value: "Veio do norte.\n\nPerdeu tudo." }]));
  });

  it("pinturas: a que falha dá lugar ao ornamento, sem imagem quebrada, e a área continua reservada", () => {
    const onSave = vi.fn(async () => ({ status: "salvo" as const }));
    render(<PersonalityPanel nome="Lion" ficha={ficha(LION)} permissoes={JOGADOR} listas={LISTAS} avisos={{}} onSave={onSave}
      arte={{ escrivaninha: "/arte/x.webp", historia: "/arte/y.webp" }} />);
    const escrivaninha = document.querySelector(".personalidade-pintura--escrivaninha")!;
    fireEvent.error(escrivaninha.querySelector("img")!);
    expect(escrivaninha.querySelector("img")).toBeNull();
    expect(escrivaninha.querySelector("svg")).not.toBeNull();
    expect(escrivaninha.getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector(".personalidade-pintura--historia img")).not.toBeNull();
  });

  it("molduras e ornamentos ficam fora da árvore de acessibilidade", () => {
    montar(LION);
    const folha = document.querySelector(".folha-personalidade")!;
    expect(folha.querySelectorAll(".canto-filigrana")).toHaveLength(8);
    for (const svg of Array.from(folha.querySelectorAll("svg"))) {
      expect(svg.closest("[aria-hidden='true']"), svg.getAttribute("class") ?? "svg").not.toBeNull();
    }
    for (const seletor of [".folha-personalidade__haste", ".folha-personalidade__divisor", ".personalidade-historia__divisor",
      ".personalidade-historia__cantos", ".personalidade-citacao__aspas", ".personalidade-historia__filigrana"]) {
      expect(folha.querySelector(seletor)?.closest("[aria-hidden='true']"), seletor).not.toBeNull();
    }
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    montar(LION);
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
