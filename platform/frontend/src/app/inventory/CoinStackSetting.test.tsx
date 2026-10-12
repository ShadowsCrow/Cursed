// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { apiSimulada, em, renderComQuery } from "../cards/testing";
import { CoinStackSetting } from "./CoinStackSetting";

const POLITICA = {
  permitir_criacao_propria: true, permitir_edicao_propria: true, permitir_exclusao_propria: false,
  campos_bloqueados: ["nivel"], campos_exigem_aprovacao: [], moedas_por_pilha: 100,
};

function montar(put: Parameters<typeof apiSimulada>[0]["PUT"] = {
  "/mesas/{mesa_id}/politicas": ({ body }) => ({ data: body }),
}) {
  const simulada = apiSimulada({ GET: { "/mesas/{mesa_id}/politicas": { data: POLITICA } }, PUT: put });
  renderComQuery(<CoinStackSetting api={simulada.api} mesaId="mesa" />);
  return simulada;
}

afterEach(() => cleanup());

describe("CoinStackSetting — 5.3 configuração da mesa", () => {
  it("mostra o limite atual e grava a política inteira com o novo valor", async () => {
    const { PUT } = montar();
    const campo = await screen.findByLabelText("Moedas por pilha (uma célula da grade)") as HTMLInputElement;
    expect(campo.value).toBe("100");
    expect((screen.getByRole("button", { name: "Salvar limite" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(campo, { target: { value: "50" } });
    expect(screen.getByText(/Reduzir o limite reorganiza as moedas de todos/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Salvar limite" }));
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(1));
    expect(em(PUT.mock.calls, 0)[1]?.body).toEqual({ ...POLITICA, moedas_por_pilha: 50 });
    expect(await screen.findByText("Limite salvo.")).toBeTruthy();
    expect((screen.getByLabelText("Moedas por pilha (uma célula da grade)") as HTMLInputElement).value).toBe("50");
  });

  it("recusa valores fora de 1 a 10.000 sem enviar", async () => {
    const { PUT } = montar();
    const campo = await screen.findByLabelText("Moedas por pilha (uma célula da grade)");
    fireEvent.change(campo, { target: { value: "0" } });
    expect((screen.getByRole("button", { name: "Salvar limite" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(campo, { target: { value: "20000" } });
    expect((screen.getByRole("button", { name: "Salvar limite" }) as HTMLButtonElement).disabled).toBe(true);
    expect(PUT).not.toHaveBeenCalled();
  });

  it("mostra a recusa do servidor", async () => {
    montar({ "/mesas/{mesa_id}/politicas": { error: { detail: "Somente o Narrador configura a mesa." }, status: 403 } });
    fireEvent.change(await screen.findByLabelText("Moedas por pilha (uma célula da grade)"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar limite" }));
    expect(await screen.findByText("Somente o Narrador configura a mesa.")).toBeTruthy();
  });
});
