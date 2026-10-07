// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { MaoDeCartas } from "./MaoDeCartas";
import type { CartaDaMao, MaoDeCartas as Mao } from "./useUsoDeCartas";

const carta = (parcial: Partial<CartaDaMao> & Pick<CartaDaMao, "titulo" | "versao_id">): CartaDaMao => ({
  posse_id: `posse-${parcial.versao_id}`, tipo: "habilidade", ativacao: "ativa", custo_uso: 3, custo_extra: null, acao: "padrao",
  aviso_lancamento: false, lancamento: "Instantâneo", alvo_area: "1 criatura", texto: "Um feixe de fogo.", ativos: [],
  motivo_indisponivel: null, ...parcial,
});

const MAO: Mao = {
  personagem_id: "lion", personagem_nome: "Lion", pp_atual: 7, pp_maximo: 10,
  cartas: [
    carta({ titulo: "Lança de Fogo", versao_id: "v-lanca" }),
    carta({ titulo: "Égide", versao_id: "v-egide", ativacao: "reacao", acao: "reacao", custo_uso: 1, alvo_area: null }),
    carta({ titulo: "Fúria", versao_id: "v-furia", acao: "bonus", lancamento: "Bônus", custo_uso: 1, custo_extra: "1 de Exaustão" }),
    carta({ titulo: "Rito", versao_id: "v-rito", lancamento: "Ritual (10 min)", aviso_lancamento: true, custo_uso: 2,
      motivo_indisponivel: "Faltam 2 PP." }),
  ],
};

const api = { GET: vi.fn().mockResolvedValue({ data: undefined, error: { detail: "sem imagem" } }) } as unknown as ApiClient;

function montar(parcial: Partial<Parameters<typeof MaoDeCartas>[0]> = {}) {
  const acoes = {
    onEscolherPersonagem: vi.fn(), onAlternar: vi.fn(), onAbrirCarta: vi.fn(), onFechar: vi.fn(), onTirarAlvo: vi.fn(),
    onLimparAlvos: vi.fn(), onUsar: vi.fn(), aoCarregarArte: vi.fn(),
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const resultado = render(<QueryClientProvider client={queryClient}>
    <MaoDeCartas api={api} mesaId="mesa" mao={MAO} carregando={false} narrador={false} personagens={[{ id: "lion", nome: "Lion" }]}
      personagemId="lion" aberta cartaAberta={null} alvos={[]} pendente={false} erro={null} {...acoes} {...parcial} />
  </QueryClientProvider>);
  return { ...acoes, ...resultado };
}

describe("mão de cartas (cartas-na-cena)", () => {
  afterEach(cleanup);

  it("mostra as cartas em leque com custo, ação e o motivo do que está apagado", () => {
    montar();
    const mao = screen.getByRole("region", { name: "Mão de cartas de Lion" });
    expect(within(mao).getByText("7 de 10 PP")).toBeTruthy();
    const cartas = within(screen.getByRole("list", { name: "Cartas de Lion" })).getAllByRole("button");
    expect(cartas.map((c) => c.getAttribute("aria-label"))).toEqual([
      "Lança de Fogo, 3 PP · Ação Padrão", "Égide, 1 PP · Reação", "Fúria, 1 PP · Ação Bônus", "Rito, 2 PP · Ação Padrão · Faltam 2 PP.",
    ]);
    expect(cartas[3]!.getAttribute("aria-disabled")).toBe("true");
    expect(cartas[3]!.className).toContain("mao__carta--apagada");
    // Sem arte carregada, as iniciais do título.
    expect(cartas[0]!.textContent).toContain("LA");
  });

  it("clicar numa carta abre o quadro de uso; marcar alvos muda o botão Usar", () => {
    const acoes = montar();
    fireEvent.click(screen.getByRole("button", { name: /^Lança de Fogo/ }));
    expect(acoes.onAbrirCarta).toHaveBeenCalledWith("v-lanca");
    cleanup();
    const aberta = montar({ cartaAberta: "v-lanca", alvos: [{ tokenId: "t1", rotulo: "Goblin 2" }] });
    const quadro = screen.getByRole("dialog", { name: "Lança de Fogo" });
    expect(within(quadro).getByText("1 criatura")).toBeTruthy();
    expect(within(quadro).getByText("Goblin 2")).toBeTruthy();
    fireEvent.click(within(quadro).getByRole("button", { name: "Usar em Goblin 2" }));
    expect(aberta.onUsar).toHaveBeenCalledWith(expect.objectContaining({ versao_id: "v-lanca" }));
    fireEvent.click(within(quadro).getByRole("button", { name: "Tirar alvo Goblin 2" }));
    expect(aberta.onTirarAlvo).toHaveBeenCalledWith("t1");
    fireEvent.click(within(quadro).getByRole("button", { name: "Cancelar" }));
    expect(aberta.onFechar).toHaveBeenCalled();
  });

  it("avisa o custo extra e o lançamento sem encaixe; carta indisponível não tem Usar", () => {
    montar({ cartaAberta: "v-furia" });
    const furia = screen.getByRole("dialog", { name: "Fúria" });
    expect(furia.textContent).toContain("Custo extra: 1 de Exaustão");
    expect(within(furia).getByRole("button", { name: "Usar" })).toBeTruthy();
    cleanup();
    montar({ cartaAberta: "v-rito" });
    const rito = screen.getByRole("dialog", { name: "Rito" });
    expect(rito.textContent).toContain("lido como Ação Padrão");
    expect(within(rito).getByRole("status").textContent).toBe("Faltam 2 PP.");
    expect(within(rito).queryByRole("button", { name: /^Usar/ })).toBeNull();
  });

  it("o Narrador vê Desfazer último uso; recolher esconde o leque; sem cartas, avisa", () => {
    const desfazer = vi.fn();
    montar({ narrador: true, desfazer: { titulo: "Lança de Fogo", onDesfazer: desfazer } });
    fireEvent.click(screen.getByRole("button", { name: "Desfazer último uso" }));
    expect(desfazer).toHaveBeenCalledOnce();
    cleanup();
    const recolhida = montar({ aberta: false });
    expect(screen.queryByRole("list", { name: "Cartas de Lion" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mão (4)" }));
    expect(recolhida.onAlternar).toHaveBeenCalledOnce();
    cleanup();
    montar({ mao: { ...MAO, cartas: [] } });
    expect(screen.getByText("Lion não tem cartas com custo em PP para jogar.")).toBeTruthy();
  });

  it("com mais de um personagem na cena, o jogador escolhe de quem é a mão", () => {
    const acoes = montar({ personagens: [{ id: "lion", nome: "Lion" }, { id: "bolota", nome: "Bolota" }] });
    fireEvent.change(screen.getByRole("combobox", { name: "Personagem da mão" }), { target: { value: "bolota" } });
    expect(acoes.onEscolherPersonagem).toHaveBeenCalledWith("bolota");
  });
});
