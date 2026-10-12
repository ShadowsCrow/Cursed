// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { FonteAleatoria } from "./dados";
import { RoladorDeDados } from "./RoladorDeDados";
import { useRolador } from "./useRolador";

/** Fonte que devolve os valores dados, em ordem, e depois repete zero (face 1). */
function sequencia(...valores: number[]): FonteAleatoria {
  let indice = 0;
  return () => valores[indice++] ?? 0;
}

function Rolador({ fonte }: { fonte?: FonteAleatoria }) {
  return <RoladorDeDados rolador={useRolador({ fonte })} />;
}

const tocar = (nome: string | RegExp, vezes = 1) => {
  for (let i = 0; i < vezes; i += 1) fireEvent.click(screen.getByRole("button", { name: nome }));
};
const expressao = () => document.querySelector(".rolador__expressao")!.textContent;

describe("aba Dados: rolador de dados", () => {
  afterEach(cleanup);

  it("monta 2d6 + 1d20 + 3 tocando nos dados e no +", () => {
    render(<Rolador />);
    tocar(/^Acrescentar d6/, 2);
    tocar("Acrescentar d20");
    tocar("Aumentar modificador", 3);
    expect(expressao()).toBe("Rolagem montada: 2d6 + 1d20 + 3");
    expect(screen.getByRole("button", { name: "Acrescentar d6 (2 na rolagem)" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Rolar" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("botão direito ou Delete no dado tira um dele, sem abrir o menu do navegador", () => {
    render(<Rolador />);
    tocar(/^Acrescentar d6/, 3);
    tocar("Acrescentar d20");
    const d6 = screen.getByRole("button", { name: "Acrescentar d6 (3 na rolagem)" });
    const evento = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    act(() => { d6.dispatchEvent(evento); });
    expect(evento.defaultPrevented).toBe(true);
    expect(expressao()).toContain("2d6 + 1d20");
    fireEvent.keyDown(screen.getByRole("button", { name: "Acrescentar d6 (2 na rolagem)" }), { key: "Delete" });
    fireEvent.contextMenu(screen.getByRole("button", { name: "Acrescentar d6 (1 na rolagem)" }));
    expect(expressao()).toBe("Rolagem montada: 1d20");
    // Sem nenhum d6, o botão direito não muda nada.
    fireEvent.contextMenu(screen.getByRole("button", { name: "Acrescentar d6" }));
    expect(expressao()).toBe("Rolagem montada: 1d20");
  });

  it("sem dados não rola, mesmo com modificador", () => {
    render(<Rolador />);
    expect(expressao()).toContain("Escolha ao menos um dado.");
    tocar("Aumentar modificador");
    expect((screen.getByRole("button", { name: "Rolar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Limpar zera os dados, o modificador e o resultado do visor, e mantém o histórico", () => {
    render(<Rolador fonte={sequencia(4, 4, 4)} />);
    tocar(/^Acrescentar d8/, 3);
    tocar("Aumentar modificador", 2);
    tocar("Rolar");
    expect(screen.getByRole("status").textContent).toContain("17");
    tocar("Limpar");
    expect(expressao()).toContain("Escolha ao menos um dado.");
    expect(screen.getByRole("group", { name: "Modificador" }).textContent).toContain("0");
    expect(screen.getByRole("status").textContent).not.toContain("17");
    expect(document.querySelector(".rolador__visor .rolador__grupos")).toBeNull();
    expect(document.querySelectorAll(".rolador__item")).toHaveLength(1);
    expect((screen.getByRole("button", { name: "Limpar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Limpar fica ativo só com o resultado no visor", () => {
    render(<Rolador />);
    expect((screen.getByRole("button", { name: "Limpar" }) as HTMLButtonElement).disabled).toBe(true);
    tocar("Acrescentar d4");
    tocar("Rolar");
    tocar("Limpar");
    tocar("Acrescentar d4");
    tocar("Rolar");
    tocar("Limpar");
    expect(screen.getByRole("status").textContent).not.toContain("Resultado");
  });

  it("mostra o total anunciado e os valores de cada dado, e mantém a montagem para rolar de novo", () => {
    render(<Rolador fonte={sequencia(3, 5)} />);
    tocar(/^Acrescentar d6/, 2);
    tocar("Aumentar modificador", 3);
    tocar("Rolar");
    const resultado = screen.getByRole("status");
    expect(resultado.textContent).toContain("Resultado de 2d6 + 3: 13");
    const visor = document.querySelector(".rolador__visor") as HTMLElement;
    expect(within(visor).getByText("4")).toBeTruthy();
    expect(within(visor).getByText("6")).toBeTruthy();
    expect(expressao()).toContain("2d6 + 3");
    tocar("Rolar");
    expect(screen.getByRole("status").textContent).toContain("Resultado de 2d6 + 3: 5");
  });

  it("não traz leitura mecânica do resultado", () => {
    render(<Rolador fonte={sequencia(19)} />);
    tocar("Acrescentar d20");
    tocar("Rolar");
    const texto = document.querySelector(".rolador")!.textContent!.toLowerCase();
    for (const termo of ["crítico", "sucesso", "falha", "cd "]) expect(texto).not.toContain(termo);
  });

  it("guarda as 20 rolagens mais recentes, com a última no topo", () => {
    render(<Rolador />);
    tocar("Acrescentar d4");
    tocar("Rolar", 20);
    tocar(/^Acrescentar d4/);
    tocar("Rolar");
    const itens = within(screen.getByRole("region", { name: "Histórico" })).getAllByRole("listitem")
      .filter((item) => item.classList.contains("rolador__item"));
    expect(itens).toHaveLength(20);
    expect(itens[0]!.textContent).toContain("2d4");
    expect(itens[19]!.textContent).toContain("1d4");
  });

  it("Rolar de novo pelo histórico rola a mesma expressão e a põe no topo", () => {
    render(<Rolador fonte={sequencia(0, 6)} />);
    tocar("Acrescentar d8");
    tocar("Aumentar modificador");
    tocar("Rolar");
    tocar("Limpar");
    tocar("Acrescentar d20");
    tocar("Rolar de novo 1d8 + 1");
    expect(screen.getByRole("status").textContent).toContain("Resultado de 1d8 + 1: 8");
    const itens = document.querySelectorAll(".rolador__item");
    expect(itens).toHaveLength(2);
    expect(itens[0]!.textContent).toContain("1d8 + 1");
    expect(expressao()).toContain("1d20");
  });

  it("Limpar histórico esvazia o histórico", () => {
    render(<Rolador />);
    tocar("Acrescentar d12");
    tocar("Rolar");
    tocar("Limpar histórico");
    expect(screen.queryByRole("region", { name: "Histórico" })).toBeNull();
  });
});
