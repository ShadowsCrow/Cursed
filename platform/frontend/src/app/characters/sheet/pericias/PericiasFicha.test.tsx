// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FichaContrato, PermissoesFicha, ValorDerivadoResumo } from "../../types";
import { chaveDerivada, GRUPOS_PERICIAS } from "../sheetCatalog";
import { maioresBases } from "./apresentacao";
import { ICONES_DAS_PERICIAS } from "./nomesDosIcones";
import { PericiasFicha } from "./PericiasFicha";

/* As perícias da imagem de referência (2026-09-29), mais uma perícia fora da lista oficial. */
const FICHA = {
  personagem: { nome: "Lion" },
  pericias: {
    valores: { "Prontidão": 3, Esportes: 1, Briga: 1, Esquiva: 1, Empatia: 1, "Expressão": 2, "Intimidação": 2, "Liderança": 2, "Navegação": 1 },
    ajustes: { "Prontidão": 3, "Lábia": -1 },
  },
} as unknown as FichaContrato;
const PERMISSOES: PermissoesFicha = {
  papel: "jogador", editar: true, excluir: true, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [],
};
const valor = (nome: string, total: number, fontes: ValorDerivadoResumo["fontes"] = []): ValorDerivadoResumo => ({
  chave: chaveDerivada("pericia", nome), rotulo: nome, grupo: "pericia", calculavel: true, total, fontes, situacionais: [],
});
const VALORES: ValorDerivadoResumo[] = [
  valor("Prontidão", 6, [{ tipo: "base", descricao: "Valor base", valor: 3 }, { tipo: "ajuste", descricao: "Treino com a guarda", valor: 3 }]),
  valor("Esquiva", 1),
  valor("Arcanismo", 0),
  { chave: "pericia:investigacao", rotulo: "Investigação", grupo: "pericia", calculavel: false, total: null, motivo: "Classe fora do catálogo.", fontes: [], situacionais: [] },
];

type Gravacao = { status: "salvo" | "pendente" };

function montar({
  ficha = FICHA, permissoes = PERMISSOES, onSave = vi.fn(async (): Promise<Gravacao> => ({ status: "salvo" })), aplicarLimites = true,
} = {}) {
  const resultado = render(<PericiasFicha grupos={GRUPOS_PERICIAS} ficha={ficha} valores={VALORES} permissoes={permissoes} onSave={onSave} aplicarLimites={aplicarLimites} />);
  return { onSave, ...resultado };
}

describe("PericiasFicha — aba Perícias", () => {
  afterEach(() => cleanup());

  it("compõe a folha: etiqueta, título, texto, três quadros com lema e as tabelas nomeadas por eles", () => {
    montar();
    expect(screen.getByText("Especialidades")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Perícias" })).toBeTruthy();
    expect(screen.getByText("As perícias representam o que seu personagem sabe, pratica e é capaz de fazer no mundo.")).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent))
      .toEqual(["Talentos", "Técnicas", "Conhecimentos", "Outros registrados na ficha"]);
    for (const lema of ["Instinto e ação", "Prática e ofício", "Sabedoria e mundo"]) {
      expect(screen.getByText(lema, { selector: ".atributos-cartao__subtitulo" })).toBeTruthy();
    }
    const talentos = screen.getByRole("table", { name: "Talentos" });
    expect(within(talentos).getAllByRole("rowheader")).toHaveLength(10);
    expect(within(talentos).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Nome", "Base", "Ajuste manual", "Total"]);
  });

  it("mostra a base (0 quando não gravada), o ajuste na caixa e o total com sinal", () => {
    montar();
    expect(screen.getByLabelText("Base de Esportes").textContent).toBe("1");
    expect(screen.getByLabelText("Base de Arcanismo").textContent).toBe("0");
    expect(screen.getByLabelText("Ajuste manual de Esportes").textContent).toBe("—");
    expect(screen.getByLabelText("Ajuste manual de Lábia").textContent).toBe("−1");
    expect(screen.getByRole("button", { name: "Fontes de Esquiva" }).textContent).toBe("+1");
    expect(screen.getByRole("button", { name: "Fontes de Arcanismo" }).textContent).toBe("+0");
  });

  it("Prontidão 3 com ajuste 3: selo de maior base, caixa com 3 e total +6", () => {
    montar();
    const base = screen.getByLabelText("Base de Prontidão, maior base");
    expect(base.textContent).toBe("3");
    expect(base.classList.contains("pericias-base--selo")).toBe(true);
    expect(screen.getByLabelText("Ajuste manual de Prontidão").textContent).toBe("3");
    expect(screen.getByRole("button", { name: "Fontes de Prontidão" }).textContent).toBe("+6");
    expect(document.querySelectorAll(".pericias-base--selo")).toHaveLength(1);
  });

  it("maior base: todas as empatadas ganham o selo, e nenhuma quando a maior é 0", () => {
    expect([...maioresBases([["Briga", 2], ["Esquiva", 2], ["Lábia", 1], ["Arcanismo", null]])]).toEqual(["Briga", "Esquiva"]);
    expect([...maioresBases([["Briga", 0], ["Esquiva", null]])]).toEqual([]);
    expect([...maioresBases([])]).toEqual([]);
    montar({ ficha: { pericias: { valores: { Briga: 2, Esquiva: 2, "Lábia": 1 } } } as unknown as FichaContrato });
    expect(screen.getByLabelText("Base de Briga, maior base")).toBeTruthy();
    expect(screen.getByLabelText("Base de Esquiva, maior base")).toBeTruthy();
    expect(screen.getByLabelText("Base de Lábia").classList.contains("pericias-base--selo")).toBe(false);
    cleanup();
    montar({ ficha: { pericias: { valores: {} } } as unknown as FichaContrato });
    expect(document.querySelectorAll(".pericias-base--selo")).toHaveLength(0);
  });

  it("abre as fontes do total e mostra o motivo quando não é calculável", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Fontes de Prontidão" }));
    expect(await screen.findByText(/Treino com a guarda/)).toBeTruthy();
    const investigacao = screen.getByRole("button", { name: "Investigação: não calculável" });
    expect(investigacao.textContent).toBe("—");
    fireEvent.click(investigacao);
    expect(await screen.findByText(/Classe fora do catálogo/)).toBeTruthy();
  });

  it("mantém perícias extras da ficha no quadro Outros", () => {
    montar();
    const outros = screen.getByRole("table", { name: "Outros registrados na ficha" });
    expect(within(outros).getByRole("rowheader", { name: "Navegação" })).toBeTruthy();
    expect(screen.getByLabelText("Base de Navegação").textContent).toBe("1");
  });

  it("grava base e ajuste numa única chamada e volta à leitura", async () => {
    const { onSave } = montar();
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    fireEvent.change(screen.getByLabelText("Base de Briga"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Ajuste manual de Lábia"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações (2)" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith([
      { path: "pericias.valores.Briga", value: 2 },
      { path: "pericias.ajustes.Lábia", value: 1 },
    ]);
    expect(await screen.findByText("Alterações salvas.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar valores" })).toBeTruthy();
  });

  it("recusa base 6 com a mensagem junto ao campo; NPC não tem limite", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    const esquiva = screen.getByLabelText("Base de Esquiva");
    fireEvent.change(esquiva, { target: { value: "6" } });
    expect(esquiva.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(esquiva.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Vai de 0 a 5; acima disso, use o ajuste.");
    expect((screen.getByRole("button", { name: /Salvar alterações/ }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    montar({ aplicarLimites: false });
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    fireEvent.change(screen.getByLabelText("Base de Esquiva"), { target: { value: "8" } });
    expect(screen.getByLabelText("Base de Esquiva").getAttribute("aria-invalid")).toBeNull();
  });

  it("avisa da aprovação do Narrador e cancela sem gravar", async () => {
    const onSave = vi.fn(async (): Promise<Gravacao> => ({ status: "pendente" }));
    montar({ onSave, permissoes: { ...PERMISSOES, campos_exigem_aprovacao: ["pericias.ajustes"] } });
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    fireEvent.change(screen.getByLabelText("Ajuste manual de Briga"), { target: { value: "1" } });
    expect(screen.getByText(/serão enviadas para aprovação do Narrador/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Ajuste manual de Briga").textContent).toBe("—");
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    fireEvent.change(screen.getByLabelText("Ajuste manual de Briga"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações (1)" }));
    expect(await screen.findByText("Alterações enviadas para aprovação do Narrador.")).toBeTruthy();
  });

  it("quem só lê não vê a ação de editar", () => {
    montar({ permissoes: { ...PERMISSOES, editar: false } });
    expect(screen.queryByRole("button", { name: "Editar valores" })).toBeNull();
    expect(screen.getByRole("table", { name: "Talentos" })).toBeTruthy();
  });

  it("sem a paisagem, rosas dos ventos; sem o estandarte, o degradê do grupo", () => {
    const { container } = montar();
    const cena = container.querySelector(".pericias-cena__pintura");
    expect(cena?.getAttribute("src")).toBe("/arte/pericias/pericias-cena.webp");
    expect(container.querySelector(".pericias-cena__reserva")).toBeNull();
    fireEvent.error(cena!);
    expect(container.querySelector(".pericias-cena__pintura")).toBeNull();
    expect(container.querySelectorAll(".pericias-cena__reserva .resumo-rosa")).toHaveLength(2);
    const estandartes = container.querySelectorAll(".atributos-cartao__pintura");
    expect(Array.from(estandartes).map((e) => e.getAttribute("src"))).toEqual([
      "/arte/pericias/pericias-talentos.webp", "/arte/pericias/pericias-tecnicas.webp", "/arte/pericias/pericias-conhecimentos.webp",
    ]);
    fireEvent.error(estandartes[1]!);
    expect(container.querySelectorAll(".atributos-cartao__pintura")).toHaveLength(2);
    expect(container.querySelector(".pericias-cartao--tecnicas .atributos-cartao__cena")).not.toBeNull();
  });

  it("cada perícia oficial tem um ícone próprio, e ícones e ornamentos são decorativos", () => {
    const { container } = montar();
    expect(new Set(ICONES_DAS_PERICIAS).size).toBe(30);
    for (const grupo of GRUPOS_PERICIAS) {
      for (const nome of grupo.nomes) {
        expect(ICONES_DAS_PERICIAS).toContain(chaveDerivada("pericia", nome).slice("pericia:".length));
      }
    }
    const oficiais = Array.from(container.querySelectorAll(".pericias-cartao:not(.pericias-cartao--outros) .pericias-linha__icone"));
    expect(oficiais).toHaveLength(30);
    expect(oficiais.every((icone) => icone.querySelector("svg"))).toBe(true);
    for (const svg of Array.from(container.querySelectorAll("svg"))) {
      expect(svg.closest("[aria-hidden='true']")).not.toBeNull();
    }
  });

  it("não apresenta violações de acessibilidade detectáveis, em leitura e em edição", async () => {
    montar();
    let resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    fireEvent.change(screen.getByLabelText("Base de Briga"), { target: { value: "9" } });
    resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
