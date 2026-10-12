// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { ProvaDaFicha } from "./ProvaDaFicha";

function abrir(consulta: string) {
  render(<MemoryRouter initialEntries={[`/preview/ficha?${consulta}`]}><ProvaDaFicha /></MemoryRouter>);
}

describe("prévia da ficha — aba Personalidade (reformular-personalidade-da-ficha, D10)", () => {
  afterEach(() => cleanup());

  it("mostra Lion como na referência: frase, traços, grupos e História", async () => {
    abrir("secao=personalidade");
    const painel = await screen.findByRole("tabpanel");
    expect(await within(painel).findByText("Conhecimento é a única arma que nunca podem me tirar.")).toBeTruthy();
    expect(within(within(painel).getByRole("list", { name: "Traços" })).getAllByRole("listitem")).toHaveLength(4);
    expect(within(painel).getByRole("heading", { name: "Traços e essência" })).toBeTruthy();
    expect(within(painel).getByText("Runas antigas")).toBeTruthy();
    expect(painel.querySelector(".personalidade-historia__texto")?.textContent).toMatch(/^Veio de terras antigas/);
    expect(within(painel).getAllByRole("button", { name: /^Editar / }).length).toBeGreaterThan(10);
  });

  it("vazia=1 deixa a personalidade em branco", async () => {
    abrir("secao=personalidade&vazia=1");
    const painel = await screen.findByRole("tabpanel");
    expect(await within(painel).findByText("A história de Lion ainda não foi escrita.")).toBeTruthy();
    expect(within(painel).queryByText("Runas antigas")).toBeNull();
  });

  it("papel=leitura mostra a folha sem nenhum Editar", async () => {
    abrir("secao=personalidade&papel=leitura");
    const painel = await screen.findByRole("tabpanel");
    expect(await within(painel).findByText("Runas antigas")).toBeTruthy();
    expect(within(painel).queryAllByRole("button", { name: /^Editar / })).toHaveLength(0);
  });
});
