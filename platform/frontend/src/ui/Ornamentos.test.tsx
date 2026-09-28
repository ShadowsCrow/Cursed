// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AlternanciaSegmentada, Avatar, CantoDoSite, Icone, MolduraOrnamentada, PontosDeValor } from "./Ornamentos";

describe("componentes da navegação inicial (4.1)", () => {
  afterEach(() => cleanup());

  it("moldura ornamentada: só CSS/SVG, sem elementos de ornamento no conteúdo; seleção muda a variante", () => {
    const { container, rerender } = render(<MolduraOrnamentada aria-label="Painel">Conteúdo</MolduraOrnamentada>);
    const moldura = container.firstElementChild as HTMLElement;
    expect(moldura.className).toContain("moldura-ornada--quadro");
    expect(moldura.className).toContain("moldura-ornada--noite");
    expect(moldura.querySelector("img, [aria-hidden]")).toBeNull();
    expect(screen.getByText("Conteúdo")).toBeTruthy();
    rerender(<MolduraOrnamentada tipo="painel" selecionada>Conteúdo</MolduraOrnamentada>);
    expect((container.firstElementChild as HTMLElement).className).toContain("moldura-ornada--painel moldura-ornada--sangue");
  });

  it("moldura de pergaminho aplica os tokens de leitura", () => {
    const { container } = render(<MolduraOrnamentada fundo="pergaminho">x</MolduraOrnamentada>);
    expect((container.firstElementChild as HTMLElement).classList.contains("tema-pergaminho")).toBe(true);
  });

  it("avatar sem foto mostra as iniciais; com foto, a imagem com nome acessível", () => {
    const { rerender } = render(<Avatar nome="Ana Souza Lima" />);
    expect(screen.getByRole("img", { name: "Foto de Ana Souza Lima" }).textContent).toBe("AL");
    rerender(<Avatar nome="Corvo" />);
    expect(screen.getByRole("img", { name: "Foto de Corvo" }).textContent).toBe("CO");
    rerender(<Avatar nome="Corvo" src="data:image/png;base64,AA==" />);
    expect(screen.getByRole("img", { name: "Foto de Corvo" }).querySelector("img")).toBeTruthy();
    rerender(<Avatar nome="Corvo" decorativo />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("alternância anuncia a opção atual com aria-pressed e a contagem", () => {
    const mudar = vi.fn();
    render(<AlternanciaSegmentada rotulo="Mostrar campanhas" valor="narrando" onChange={mudar}
      opcoes={[{ id: "narrando", rotulo: "Narrando", contagem: 2 }, { id: "jogando", rotulo: "Jogando", contagem: 0 }]} />);
    const grupo = screen.getByRole("group", { name: "Mostrar campanhas" });
    expect(grupo).toBeTruthy();
    expect(screen.getByRole("button", { name: /Narrando/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Jogando/ }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /Jogando/ }));
    expect(mudar).toHaveBeenCalledWith("jogando");
  });

  it("pontos mostram o valor da ficha, inclusive acima de 5, sem calcular nada", () => {
    const { rerender } = render(<PontosDeValor rotulo="Força" valor={2} />);
    expect(screen.getByRole("img", { name: "Força: 2 de 5" })).toBeTruthy();
    rerender(<PontosDeValor rotulo="Força" valor={7} />);
    expect(screen.getByRole("img", { name: "Força: 7 de 7" })).toBeTruthy();
    rerender(<PontosDeValor rotulo="Força" valor={null} />);
    expect(screen.getByRole("img", { name: "Força: sem valor" })).toBeTruthy();
  });

  it("ícones e cantos do site são decorativos", () => {
    const { container } = render(<><Icone nome="livro" /><CantoDoSite posicao="se" /></>);
    container.querySelectorAll("svg").forEach((svg) => expect(svg.getAttribute("aria-hidden")).toBe("true"));
  });
});
