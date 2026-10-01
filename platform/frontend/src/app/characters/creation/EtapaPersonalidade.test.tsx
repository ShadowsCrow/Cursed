// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ListasFicha } from "../sheet/catalogoApi";
import { EtapaPersonalidade } from "./CamposDasEtapas";

const LISTAS: ListasFicha = {
  sexos: ["Masculino", "Feminino", "Outro"],
  alinhamentos: ["Leal | Bom"],
  pecados: [{ nome: "Ira", icone: "😡", equivalentes: [] }],
  campos_personalidade: [
    { chave: "frase", rotulo: "Frase marcante", dica: "Ex: Conhecimento é a única arma", longo: false, limite: 160 },
    { chave: "tracos", rotulo: "Traços", dica: "Ex: Leal, Disciplinado", longo: false, tipo: "tracos", maximo: 6, limite: 24 },
    { chave: "vivo_para", rotulo: "Vivo para", dica: "Ex: proteger os inocentes", longo: false },
    { chave: "historia", rotulo: "História", dica: "Ex: de onde veio, o que perdeu e o que o fez partir", longo: true, limite: 4000 },
  ],
  faixas_de_altura: [],
  icones_ficha: {},
};

describe("etapa Personalidade do assistente", () => {
  afterEach(() => cleanup());

  it("História aparece como campo opcional longo, com a dica e o limite do JSON", () => {
    const onChange = vi.fn();
    render(<EtapaPersonalidade listas={LISTAS} valores={{ historia: "a".repeat(4001) }} onChange={onChange} />);
    const campo = screen.getByLabelText("História (opcional)") as HTMLTextAreaElement;
    expect(campo.placeholder).toBe("Ex: de onde veio, o que perdeu e o que o fez partir");
    expect(campo.rows).toBe(8);
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/4\.001 de 4\.000 caracteres — encurte o texto/)).toBeTruthy();
    fireEvent.change(campo, { target: { value: "Veio do norte.\n\nPerdeu tudo." } });
    expect(onChange).toHaveBeenCalledWith("historia", "Veio do norte.\n\nPerdeu tudo.");
    expect((screen.getByLabelText("Vivo para") as HTMLTextAreaElement).rows).toBe(2);
  });

  it("Frase marcante como texto curto e Traços como etiquetas, com os limites da ficha", () => {
    const onChange = vi.fn();
    render(<EtapaPersonalidade listas={LISTAS} valores={{ tracos: ["Leal"] }} onChange={onChange} />);
    const frase = screen.getByLabelText("Frase marcante") as HTMLTextAreaElement;
    expect(frase.rows).toBe(2);
    expect(screen.getByText("0 de 160 caracteres")).toBeTruthy();
    expect(screen.getByText("1 de 6")).toBeTruthy();
    const campo = screen.getByLabelText("Traços (até 6)");
    fireEvent.change(campo, { target: { value: "Reservado" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("tracos", ["Leal", "Reservado"]);
    fireEvent.change(campo, { target: { value: "leal" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(screen.getByRole("alert").textContent).toContain("já está na lista");
    fireEvent.click(screen.getByRole("button", { name: "Remover Leal" }));
    expect(onChange).toHaveBeenLastCalledWith("tracos", []);
  });
});
