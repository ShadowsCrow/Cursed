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
});
