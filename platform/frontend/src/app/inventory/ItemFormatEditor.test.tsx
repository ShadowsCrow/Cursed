// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiSimulada, renderComQuery } from "../cards/testing";
import type { ApiClient } from "../characters/types";
import { ItemFormatEditor, type FormatoItem } from "./ItemFormatEditor";

function Controlado({ inicial = null, api, arte, onChange }: {
  inicial?: FormatoItem | null; api?: ApiClient; arte?: string | null; onChange?: (f: FormatoItem | null) => void;
}) {
  const [valor, setValor] = useState<FormatoItem | null>(inicial);
  return (
    <ItemFormatEditor valor={valor} nome="Espada longa" idPrefix="teste" api={api} mesaId={api ? "mesa" : undefined} arte={arte}
      onChange={(f) => { setValor(f); onChange?.(f); }} />
  );
}

const ultimo = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0] as FormatoItem | null;

/** jsdom não carrega imagens: simula as dimensões naturais e dispara o carregamento. */
function carregarImagem(img: HTMLElement, largura: number, altura: number) {
  Object.defineProperty(img, "naturalWidth", { configurable: true, value: largura });
  Object.defineProperty(img, "naturalHeight", { configurable: true, value: altura });
  fireEvent.load(img);
}

afterEach(() => cleanup());

describe("ItemFormatEditor — 5.2 criação de item com formato", () => {
  it("sem tipo avisa que o item não pode ser publicado", () => {
    renderComQuery(<Controlado />);
    expect(screen.getByText("Sem tipo e dimensão o item não entra na grade nem pode ser publicado como carta.")).toBeTruthy();
    expect(screen.queryByLabelText("Largura")).toBeNull();
  });

  it("escolher o subtipo preenche a dimensão sugerida, e girar troca largura e altura", () => {
    const onChange = vi.fn();
    renderComQuery(<Controlado onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Tipo na grade"), { target: { value: "uma_mao" } });
    expect(ultimo(onChange)).toEqual({ subtipo: "uma_mao", largura: 1, altura: 3 });
    expect(screen.getByRole("figure", { name: "Prévia na grade: 1 por 3" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Girar" }));
    expect(ultimo(onChange)).toMatchObject({ largura: 3, altura: 1 });
    expect(screen.getByRole("figure", { name: "Prévia na grade: 3 por 1" })).toBeTruthy();
  });

  it("limita a dimensão entre 1 e 12", () => {
    const onChange = vi.fn();
    renderComQuery(<Controlado onChange={onChange} inicial={{ subtipo: "peitoral", largura: 2, altura: 3 }} />);
    fireEvent.change(screen.getByLabelText("Largura"), { target: { value: "40" } });
    expect(ultimo(onChange)).toMatchObject({ largura: 12 });
    fireEvent.change(screen.getByLabelText("Altura"), { target: { value: "0" } });
    expect(ultimo(onChange)).toMatchObject({ altura: 1 });
  });

  it("mostra mãos e pilha só em Outros", () => {
    const onChange = vi.fn();
    renderComQuery(<Controlado onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Tipo na grade"), { target: { value: "peitoral" } });
    expect(screen.queryByLabelText("Ocupa mãos")).toBeNull();
    fireEvent.change(screen.getByLabelText("Tipo na grade"), { target: { value: "outro" } });
    fireEvent.change(screen.getByLabelText("Ocupa mãos"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Empilha até (por célula)"), { target: { value: "3" } });
    expect(ultimo(onChange)).toMatchObject({ subtipo: "outro", maos: 1, pilha_max: 3 });
  });

  it("pede ampliação e Requisito de Força na mochila, e capacidade na aljava", () => {
    const onChange = vi.fn();
    renderComQuery(<Controlado onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Tipo na grade"), { target: { value: "mochila" } });
    fireEvent.change(screen.getByLabelText("Colunas a mais"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Requisito de Força"), { target: { value: "3" } });
    expect(ultimo(onChange)?.mochila).toEqual({ linhas: 1, colunas: 2, requisito_forca: 3 });
    fireEvent.change(screen.getByLabelText("Requisito de Força"), { target: { value: "" } });
    expect(ultimo(onChange)?.mochila?.requisito_forca).toBeNull();
    fireEvent.change(screen.getByLabelText("Tipo na grade"), { target: { value: "aljava" } });
    expect(screen.queryByLabelText("Colunas a mais")).toBeNull();
    fireEvent.change(screen.getByLabelText("Capacidade de flechas"), { target: { value: "30" } });
    expect(ultimo(onChange)).toMatchObject({ subtipo: "aljava", aljava: { capacidade_flechas: 30 } });
    expect(ultimo(onChange)?.mochila).toBeUndefined();
  });

  it("trocar o subtipo preserva o ícone de grade já informado", () => {
    const onChange = vi.fn();
    renderComQuery(<Controlado onChange={onChange} inicial={{ subtipo: "uma_mao", largura: 1, altura: 3, icone_grade: "mesas/mesa/mesa/espada.png" }} />);
    fireEvent.change(screen.getByLabelText("Tipo na grade"), { target: { value: "duas_maos" } });
    expect(ultimo(onChange)).toMatchObject({ subtipo: "duas_maos", icone_grade: "mesas/mesa/mesa/espada.png" });
  });

  it("sem imagem mostra a silhueta com o nome; com arte e sem ícone usa a arte", async () => {
    renderComQuery(<Controlado inicial={{ subtipo: "uma_mao", largura: 1, altura: 3 }} />);
    expect(screen.getByText("Espada longa")).toBeTruthy();
    expect(screen.getByText(/sem imagem: silhueta com o nome/)).toBeTruthy();
    cleanup();
    const { api } = apiSimulada({ GET: { "/mesas/{mesa_id}/ativos": { data: { tipo: "image/png", base64: "YWJj" } } } });
    const { container } = renderComQuery(<Controlado api={api} arte="mesas/mesa/mesa/arte.png" inicial={{ subtipo: "uma_mao", largura: 1, altura: 3 }} />);
    await waitFor(() => expect(container.querySelector(".formato-item__icone")).toBeTruthy());
    expect(screen.getByText(/usando a arte/)).toBeTruthy();
  });

  it("avisa quando o ícone de grade não está na proporção da dimensão e deixa continuar", async () => {
    const { api } = apiSimulada({ GET: { "/mesas/{mesa_id}/ativos": { data: { tipo: "image/png", base64: "YWJj" } } } });
    const { container } = renderComQuery(
      <Controlado api={api} inicial={{ subtipo: "uma_mao", largura: 1, altura: 3, icone_grade: "mesas/mesa/mesa/quadrado.png" }} />,
    );
    await waitFor(() => expect(container.querySelector(".formato-item__icone")).toBeTruthy());
    const img = container.querySelector(".formato-item__icone") as HTMLElement;
    carregarImagem(img, 512, 512);
    expect(await screen.findByText(/não está na proporção 1:3/)).toBeTruthy();
    carregarImagem(img, 100, 300);
    await waitFor(() => expect(screen.queryByText(/não está na proporção/)).toBeNull());
    expect((screen.getByLabelText("Largura") as HTMLInputElement).disabled).toBe(false);
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    renderComQuery(<Controlado inicial={{ subtipo: "mochila", largura: 2, altura: 2, mochila: { linhas: 1, colunas: 0, requisito_forca: 2 } }} />);
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
