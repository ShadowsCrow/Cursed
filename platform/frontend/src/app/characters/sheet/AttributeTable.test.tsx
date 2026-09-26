// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FichaContrato, PermissoesFicha, ValorDerivadoResumo } from "../types";
import { AttributeTable } from "./AttributeTable";
import { chaveDerivada, GRUPOS_ATRIBUTOS } from "./sheetCatalog";

const FICHA = {
  personagem: { nome: "Lia" },
  atributos: { valores: { "Força": 2, Destreza: 3, Sorte: 1 }, ajustes: { "Força": 1 }, totais: {} },
} as unknown as FichaContrato;
const PERMISSOES: PermissoesFicha = {
  papel: "jogador", editar: true, excluir: true, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [],
};
const VALORES: ValorDerivadoResumo[] = [
  { chave: "atributo:forca", rotulo: "Força", grupo: "atributo", total: 3,
    fontes: [{ tipo: "base", descricao: "Valor base", valor: 2 }, { tipo: "ajuste", descricao: "Ajuste manual", valor: 1 }], situacionais: [] },
];

function montar(permissoes: PermissoesFicha = PERMISSOES, onSave = vi.fn(async () => ({ status: "salvo" as const }))) {
  render(
    <AttributeTable categoria="atributo" titulo="Atributos" eyebrow="BASE" grupos={GRUPOS_ATRIBUTOS}
      ficha={FICHA} valores={VALORES} permissoes={permissoes} onSave={onSave} />,
  );
  return onSave;
}

describe("AttributeTable — edição de atributos e perícias", () => {
  afterEach(() => cleanup());

  it("usa a mesma chave dos valores derivados do servidor", () => {
    expect(chaveDerivada("atributo", "Força")).toBe("atributo:forca");
    expect(chaveDerivada("pericia", "Conhecimento urbano")).toBe("pericia:conhecimento_urbano");
    expect(chaveDerivada("pericia", "Lábia")).toBe("pericia:labia");
  });

  it("mostra todos os atributos oficiais, os extras da ficha e o total com fontes", () => {
    montar();
    for (const nome of ["Força", "Carisma", "Raciocínio", "Sorte"]) expect(screen.getByRole("rowheader", { name: nome })).toBeTruthy();
    expect(screen.getByText("Outros registrados na ficha")).toBeTruthy();
    expect(screen.getByLabelText("Base de Força").textContent).toBe("2");
    expect(screen.getByLabelText("Base de Carisma").textContent).toBe("—");
    expect(screen.getByRole("button", { name: "Fontes de Força" })).toBeTruthy();
  });

  it("salva só o que mudou, numa única gravação", async () => {
    const onSave = montar();
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    fireEvent.change(screen.getByLabelText("Base de Carisma"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Ajuste manual de Força"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Base de Destreza"), { target: { value: "3" } });
    const salvar = screen.getByRole("button", { name: "Salvar alterações (2)" });
    fireEvent.click(salvar);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith([
      { path: "atributos.valores.Carisma", value: 4 },
      { path: "atributos.ajustes.Força", value: 2 },
    ]);
    expect(await screen.findByText("Alterações salvas.")).toBeTruthy();
  });

  it("recusa valores não inteiros e permite cancelar sem salvar", () => {
    const onSave = montar();
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    fireEvent.change(screen.getByLabelText("Base de Vigor"), { target: { value: "1.5" } });
    expect(screen.getByText("Use apenas números inteiros.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Base de Vigor").textContent).toBe("—");
  });

  it("respeita campos bloqueados, aprovação e leitura sem permissão", () => {
    montar({ ...PERMISSOES, campos_bloqueados: ["atributos.valores"], campos_exigem_aprovacao: ["atributos.ajustes"] });
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    expect(screen.getByLabelText("Base de Força").tagName).toBe("SPAN");
    fireEvent.change(screen.getByLabelText("Ajuste manual de Vigor"), { target: { value: "1" } });
    expect(screen.getByText(/serão enviadas para aprovação/)).toBeTruthy();
    cleanup();
    montar({ ...PERMISSOES, editar: false });
    expect(screen.queryByRole("button", { name: "Editar valores" })).toBeNull();
  });

  it("não apresenta violações de acessibilidade detectáveis em edição", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
