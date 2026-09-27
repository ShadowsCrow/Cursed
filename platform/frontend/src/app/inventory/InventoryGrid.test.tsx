// @vitest-environment jsdom
import axe from "axe-core";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InventoryGrid, type Destino } from "./InventoryGrid";
import type { ItemGrade, ParametrosGrade } from "./gridEngine";

const base = (extra: Partial<ItemGrade>): ItemGrade => ({
  id: "x", nome: "Item", subtipo: "outro", largura: 1, altura: 1, coluna: null, linha: null, girado: false, equipado: false, ...extra,
});

function Controlado({ inicial, parametros = { forca: 3, tamanho: "medio" } }: { inicial: ItemGrade[]; parametros?: ParametrosGrade }) {
  const [itens, setItens] = useState(inicial);
  const mover = (id: string, destino: Destino) => setItens((lista) => lista.map((i) => (i.id === id ? { ...i, ...destino } : i)));
  const equipar = (id: string, equipado: boolean) => setItens((lista) => lista.map((i) => (i.id === id ? { ...i, equipado } : i)));
  const retirar = (id: string) => setItens((lista) => lista.map((i) => (i.id === id ? { ...i, coluna: null, linha: null } : i)));
  const empunhar = (id: string, maos: 1 | 2) => setItens((lista) => lista.map((i) => (i.id === id ? { ...i, maos } : i)));
  return <InventoryGrid rotulo="Inventário de teste" parametros={parametros} itens={itens} onMover={mover} onEquipar={equipar} onRetirar={retirar} onEmpunhar={empunhar} />;
}

afterEach(() => cleanup());

describe("InventoryGrid", () => {
  it("descreve cada item com nome, tipo, dimensão, posição e estado", () => {
    render(<Controlado inicial={[base({ id: "p", nome: "Peitoral", subtipo: "peitoral", largura: 2, altura: 3, coluna: 0, linha: 0, equipado: true })]} />);
    expect(screen.getByRole("button", { name: "Peitoral, peitoral, 2 por 3, coluna 1, linha 1, equipado" })).toBeTruthy();
    expect(screen.getByText("Normal")).toBeTruthy();
  });

  it("move pelo teclado, gira e anuncia a sobrecarga ao soltar na linha vermelha", () => {
    render(<Controlado inicial={[base({ id: "c", nome: "Corda", largura: 1, altura: 2, coluna: 0, linha: 0 })]} />);
    const corda = screen.getByRole("button", { name: /^Corda/ });
    fireEvent.keyDown(corda, { key: "Enter" });
    expect(screen.getByRole("status").textContent).toMatch(/Movendo Corda/);
    fireEvent.keyDown(corda, { key: "r" });
    for (let i = 0; i < 5; i += 1) fireEvent.keyDown(corda, { key: "ArrowDown" });
    fireEvent.keyDown(corda, { key: "Enter" });
    expect(screen.getByRole("status").textContent).toMatch(/coluna 1, linha 6, na área vermelha: sobrecarga/);
    expect(screen.getByText("Sobrecarga")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Corda, item, 2 por 1, coluna 1, linha 6, em sobrecarga/ })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Inventário de teste" }).querySelector("header")?.textContent)
      .toMatch(/2 de 25 células \(2 na área vermelha\)/);
  });

  it("recusa soltar sobre outro item e explica o motivo", () => {
    render(<Controlado inicial={[
      base({ id: "e", nome: "Escudo", subtipo: "escudo", largura: 2, altura: 2, coluna: 0, linha: 0 }),
      base({ id: "p", nome: "Poção", coluna: 3, linha: 0 }),
    ]} />);
    const pocao = screen.getByRole("button", { name: /^Poção/ });
    fireEvent.keyDown(pocao, { key: "Enter" });
    fireEvent.keyDown(pocao, { key: "ArrowLeft" });
    fireEvent.keyDown(pocao, { key: "ArrowLeft" });
    fireEvent.keyDown(pocao, { key: "Enter" });
    expect(screen.getByRole("status").textContent).toMatch(/há outro item nesse lugar/);
    fireEvent.keyDown(pocao, { key: "Escape" });
    expect(screen.getByRole("button", { name: /^Poção, item, 1 por 1, coluna 4, linha 1/ })).toBeTruthy();
  });

  it("não deixa equipar uma segunda peça igual", () => {
    render(<Controlado inicial={[
      base({ id: "c1", nome: "Elmo", subtipo: "capacete", largura: 2, altura: 2, coluna: 0, linha: 0, equipado: true }),
      base({ id: "c2", nome: "Capuz", subtipo: "capacete", coluna: 3, linha: 0 }),
    ]} />);
    const capuz = screen.getByRole("button", { name: /^Capuz/ });
    fireEvent.keyDown(capuz, { key: "Enter" });
    fireEvent.keyDown(capuz, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Equipar" }));
    expect(screen.getByRole("status").textContent).toMatch(/Só um item de capacete fica equipado por vez: Elmo já está/);
    expect(screen.getByRole("group", { name: "Ações para Capuz" }).querySelector("[role=alert]")?.textContent)
      .toMatch(/Só um item de capacete fica equipado por vez/);
  });

  it("coloca um item da bandeja tocando numa célula", () => {
    const onMover = vi.fn();
    const { container } = render(
      <InventoryGrid rotulo="Inventário" parametros={{ forca: 3, tamanho: "medio" }} onMover={onMover}
        itens={[base({ id: "t", nome: "Tocha", largura: 1, altura: 2 })]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Tocha (1 x 2)" }));
    const celulas = container.querySelectorAll(".grade-inventario__celula");
    const alvo = celulas[6]; // Médio com Força 3: 5 colunas, então a célula 6 é coluna 1, linha 1.
    if (!alvo) throw new Error("célula ausente");
    fireEvent.click(alvo);
    expect(onMover).toHaveBeenCalledWith("t", { coluna: 1, linha: 1, girado: false });
  });

  it("item na bandeja não é levado: a grade avisa e não oferece equipar", () => {
    render(<Controlado inicial={[base({ id: "e", nome: "Espada", subtipo: "uma_mao", largura: 1, altura: 3 })]} />);
    const bandeja = screen.getByRole("region", { name: "Fora da grade" });
    expect(bandeja.textContent).toMatch(/não estão sendo levados: coloque-os na grade/);
    fireEvent.click(screen.getByRole("button", { name: "Espada (1 x 3)" }));
    expect(screen.queryByRole("button", { name: "Equipar" })).toBeNull();
    fireEvent.click(Array.from(document.querySelectorAll(".grade-inventario__celula"))[0] as HTMLElement);
    expect(screen.getByRole("button", { name: "Equipar" })).toBeTruthy();
  });

  it("equipar uma segunda mochila pergunta se deve substituir a equipada", () => {
    const onEquipar = vi.fn();
    const viagem = base({ id: "m1", nome: "Mochila de viagem", subtipo: "mochila", largura: 2, altura: 2, equipado: true,
      ampliacao: { linhas: 1, colunas: 0 } });
    const bolsa = base({ id: "m2", nome: "Bolsa de cintura", subtipo: "mochila", ampliacao: { linhas: 0, colunas: 1 } });
    render(<InventoryGrid rotulo="Inventário de teste" parametros={{ forca: 3, tamanho: "medio" }} itens={[viagem, bolsa]}
      onMover={vi.fn()} onEquipar={onEquipar} />);
    fireEvent.click(screen.getByRole("button", { name: "Bolsa de cintura (1 x 1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Equipar" }));
    const dialogo = screen.getByRole("dialog", { name: "Substituir Mochila de viagem?" });
    expect(dialogo.textContent).toMatch(/Bolsa de cintura será equipada, e Mochila de viagem passa a ser item carregado/);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onEquipar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Bolsa de cintura (1 x 1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Bolsa de cintura (1 x 1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Equipar" }));
    fireEvent.click(screen.getByRole("button", { name: "Substituir" }));
    expect(onEquipar).toHaveBeenCalledWith("m2", true);
  });

  it("girar encostado na borda procura o encaixe mais próximo e anuncia a mudança", () => {
    render(<Controlado inicial={[base({ id: "e", nome: "Espada", subtipo: "uma_mao", largura: 1, altura: 3, coluna: 4, linha: 0 })]} />);
    const espada = screen.getByRole("button", { name: /^Espada/ });
    fireEvent.keyDown(espada, { key: "Enter" });
    fireEvent.keyDown(espada, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Girar" }));
    expect(screen.getByRole("button", { name: /^Espada, arma de uma mão, 3 por 1, coluna 3, linha 1/ })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Espada girado e movido para coluna 3, linha 1.");
  });

  it("alterna a arma versátil entre uma e duas mãos e recusa quando a outra mão está ocupada", () => {
    render(<Controlado inicial={[
      base({ id: "v", nome: "Espada bastarda", subtipo: "uma_mao", largura: 1, altura: 3, coluna: 0, linha: 0, equipado: true, versatil: true, maos: 1 }),
      base({ id: "e", nome: "Escudo", subtipo: "escudo", largura: 2, altura: 2, coluna: 2, linha: 0 }),
    ]} />);
    const espada = screen.getByRole("button", { name: /^Espada bastarda/ });
    expect(espada.getAttribute("aria-label")).toMatch(/com uma mão/);
    fireEvent.keyDown(espada, { key: "Enter" });
    fireEvent.keyDown(espada, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Empunhar com duas mãos" }));
    expect(screen.getByRole("button", { name: /^Espada bastarda/ }).getAttribute("aria-label")).toMatch(/com as duas mãos/);
    expect(screen.getByRole("region", { name: "Inventário de teste" }).querySelector("header")?.textContent).toMatch(/mãos 2\/2/);
    fireEvent.click(screen.getByRole("button", { name: "Empunhar com uma mão" }));
    expect(screen.getByRole("region", { name: "Inventário de teste" }).querySelector("header")?.textContent).toMatch(/mãos 1\/2/);

    const escudo = screen.getByRole("button", { name: /^Escudo/ });
    fireEvent.keyDown(escudo, { key: "Enter" });
    fireEvent.keyDown(escudo, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Equipar" }));
    const espadaDeNovo = screen.getByRole("button", { name: /^Espada bastarda/ });
    fireEvent.keyDown(espadaDeNovo, { key: "Enter" });
    fireEvent.keyDown(espadaDeNovo, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Empunhar com duas mãos" }));
    expect(screen.getByRole("status").textContent).toMatch(/solte o que ocupa a outra mão/);
    expect(screen.getByRole("button", { name: /^Espada bastarda/ }).getAttribute("aria-label")).toMatch(/com uma mão/);
  });

  it("mostra a regra de levantar, empurrar e arrastar ao passar o mouse ou focar o (i)", () => {
    render(<Controlado inicial={[]} />);
    const info = screen.getByRole("button", { name: "Regra de levantar, empurrar e arrastar" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.focus(info);
    const dica = screen.getByRole("tooltip");
    expect(dica.textContent).toMatch(/1d20 \+ Força \+ Esportes contra CD 18/);
    expect(dica.textContent).toMatch(/\+1 por ajudante, até \+3/);
    expect(info.getAttribute("aria-describedby")).toBe(dica.id);
  });

  it("passa na verificação automática de acessibilidade", async () => {
    render(<Controlado inicial={[
      base({ id: "p", nome: "Peitoral", subtipo: "peitoral", largura: 2, altura: 3, coluna: 0, linha: 0, equipado: true }),
      base({ id: "m", nome: "Moedas", subtipo: "moedas", coluna: 0, linha: 5 }),
      base({ id: "b", nome: "Bandagem" }),
    ]} />);
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
