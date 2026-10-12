// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PermissoesFicha } from "../../types";
import { problemaDoTraco } from "./tracos";
import { TracosField } from "./TracosField";

const JOGADOR: PermissoesFicha = {
  papel: "jogador", editar: true, excluir: false, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [],
};
const LION = ["Leal", "Disciplinado", "Reservado", "Idealista"];

function montar(valor: string[], permissoes: PermissoesFicha = JOGADOR) {
  const onSave = vi.fn(async () => ({ status: "salvo" as const }));
  render(<TracosField rotulo="Traços" path="personalidade.tracos" valor={valor} maximo={6} limite={24} dica="Ex: Leal, Disciplinado"
    permissoes={permissoes} onSave={onSave} />);
  return onSave;
}

const campo = () => screen.getByLabelText("Traços", { selector: "input" }) as HTMLInputElement;
function adicionar(texto: string, comEnter = false) {
  fireEvent.change(campo(), { target: { value: texto } });
  if (comEnter) fireEvent.keyDown(campo(), { key: "Enter" });
  else fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
}

describe("Traços (reformular-personalidade-da-ficha, D3)", () => {
  afterEach(() => cleanup());

  it("mostra os traços de Lion em etiquetas, na ordem", () => {
    montar(LION);
    expect(within(screen.getByRole("list", { name: "Traços" })).getAllByRole("listitem").map((i) => i.textContent)).toEqual(LION);
  });

  it("adiciona com Enter e com o botão, remove e grava a lista inteira em ordem", async () => {
    const onSave = montar(LION);
    fireEvent.click(screen.getByRole("button", { name: "Editar Traços" }));
    expect(screen.getByText("4 de 6")).toBeTruthy();
    adicionar("Paciente", true);
    adicionar("Teimoso");
    expect(screen.getByText("6 de 6")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Adicionar" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Remover Reservado" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([{ path: "personalidade.tracos", value: ["Leal", "Disciplinado", "Idealista", "Paciente", "Teimoso"] }]));
  });

  it("recusa o sétimo traço, o repetido (sem diferenciar maiúsculas e acentos) e o vazio", () => {
    montar([...LION, "Ágil", "Calmo"]);
    fireEvent.click(screen.getByRole("button", { name: "Editar Traços" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover Calmo" }));
    adicionar("agil");
    expect(screen.getByRole("alert").textContent).toContain("já está na lista");
    adicionar("   ");
    expect(screen.getByRole("alert").textContent).toContain("Escreva o traço");
    expect(problemaDoTraco("Sábio", ["a", "b", "c", "d", "e", "f"], 6, 24)).toBe("No máximo 6 traços.");
    expect(problemaDoTraco("a".repeat(25), [], 6, 24)).toBe("O traço passa de 24 caracteres.");
  });

  it("sem permissão, só as etiquetas", () => {
    montar(LION, { ...JOGADOR, editar: false });
    expect(screen.getByRole("list", { name: "Traços" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Editar Traços" })).toBeNull();
  });
});
