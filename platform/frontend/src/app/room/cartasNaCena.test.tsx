// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AcoesDaVez, BarraDeTurno } from "./BarraDeTurno";
import { QuadroDoPeriodo } from "./EstatisticasDaSala";
import { acontecimentos } from "./acontecimentos";
import { RoladorDeDados } from "./RoladorDeDados";
import type { CombateDoTurno, ParticipanteDoTurno } from "./useModoDeTurno";
import { useRolador } from "./useRolador";
import { descreverUso, deUsoDoServidor, type UsoDeCarta } from "./useUsoDeCartas";

const participante = (parcial: Partial<ParticipanteDoTurno> = {}): ParticipanteDoTurno => ({
  id: "lion", personagem_id: "lion", nome: "Lion", token_id: "t-lion", tokens: 1, token_ids: ["t-lion"], rolou: true, total: 12,
  meu: true, do_jogador: true, fora_da_cena: false, movimento: { gasto: 0, limite: 9, correndo: false },
  acoes: { padrao: false, bonus: true, reacao: true }, ...parcial,
});

const USO: UsoDeCarta = {
  id: 7, autor_id: "ana", personagem_id: "lion", personagem_nome: "Lion", sessao_id: "s1", combate_id: "c1", rodada: 2,
  versao_id: "v-lanca", titulo: "Lança de Fogo", custo_pago: 3, custo_extra: null, acao: "padrao",
  alvos: [{ token_id: "t-g2", personagem_id: "goblin", rotulo: "Goblin 2" }], desfeito: false, criado_em: null,
};

describe("ações da vez na barra de turno (cartas-na-cena, D4)", () => {
  afterEach(cleanup);

  it("mostra os três selos, apaga a gasta e deixa o Narrador devolver", () => {
    const devolver = vi.fn();
    render(<AcoesDaVez participante={participante()} pendente={false} onDevolver={devolver} />);
    const grupo = screen.getByRole("group", { name: "Ações de Lion" });
    expect(grupo.textContent).toContain("Ação");
    expect(grupo.querySelectorAll(".turno__selo--gasta")).toHaveLength(1);
    fireEvent.click(within(grupo).getByRole("button", { name: "Devolver Ação Padrão a Lion" }));
    expect(devolver).toHaveBeenCalledWith("padrao");
    // Reação e Bônus disponíveis não têm botão de devolver.
    expect(within(grupo).getAllByRole("button")).toHaveLength(1);
  });

  it("sem onDevolver (jogador) não há botões; sem ações do servidor, nada aparece", () => {
    render(<AcoesDaVez participante={participante()} pendente={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    render(<AcoesDaVez participante={participante({ acoes: null })} pendente={false} />);
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("o jogador encerra a própria vez pela barra; fora da vez dele, não há botão", () => {
    const onProximo = vi.fn();
    const combate: CombateDoTurno = { id: "c1", estado: "combate", rodada: 2, vez_participante_id: "lion", participantes: [participante()] };
    const montar = (c: CombateDoTurno, narrador = false) => render(<BarraDeTurno combate={c} narrador={narrador} retratos={{}} pendente={false}
      onProximo={onProximo} onSair={vi.fn()} onComecar={vi.fn()} onRolarPor={vi.fn()} onRolarNpcs={vi.fn()} />);
    montar(combate);
    fireEvent.click(screen.getByRole("button", { name: "Encerrar meu turno" }));
    expect(onProximo).toHaveBeenCalledOnce();
    cleanup();
    // Vez de outro: sem o botão. Narrador: tem "Próximo turno", não "Encerrar meu turno".
    montar({ ...combate, participantes: [participante({ id: "kira", personagem_id: "kira", nome: "Kira", meu: false }), participante()],
      vez_participante_id: "kira" });
    expect(screen.queryByRole("button", { name: "Encerrar meu turno" })).toBeNull();
    cleanup();
    montar(combate, true);
    expect(screen.queryByRole("button", { name: "Encerrar meu turno" })).toBeNull();
    expect(screen.getByRole("button", { name: "Próximo turno" })).toBeTruthy();
    cleanup();
    // Alguém na cena sem iniciativa trava o botão do jogador pelo mesmo motivo do Narrador.
    montar({ ...combate, participantes: [participante(), participante({ id: "ogro", personagem_id: "ogro", nome: "Ogro", meu: false, rolou: false, total: null })] });
    const travado = screen.getByRole("button", { name: "Encerrar meu turno" }) as HTMLButtonElement;
    expect(travado.disabled).toBe(true);
    expect(travado.title).toBe("Falta rolar a iniciativa de Ogro.");
  });

  it("na barra, Correr fica desativado com a Ação Padrão gasta, e o Narrador devolve pelo participante da vez", () => {
    const onDevolver = vi.fn();
    const combate: CombateDoTurno = { id: "c1", estado: "combate", rodada: 2, vez_participante_id: "lion", participantes: [participante()] };
    render(<BarraDeTurno combate={combate} narrador retratos={{}} pendente={false} onProximo={vi.fn()} onSair={vi.fn()}
      onComecar={vi.fn()} onRolarPor={vi.fn()} onRolarNpcs={vi.fn()} onCorrer={vi.fn()} onDevolver={onDevolver} />);
    const correr = screen.getByRole("button", { name: "Correr" }) as HTMLButtonElement;
    expect(correr.disabled).toBe(true);
    expect(correr.title).toBe("Ação Padrão já usada nesta vez");
    fireEvent.click(screen.getByRole("button", { name: "Devolver Ação Padrão a Lion" }));
    expect(onDevolver).toHaveBeenCalledWith("lion", "padrao");
  });
});

describe("usos de carta no histórico da aba Dados", () => {
  afterEach(cleanup);

  it("descreve o uso como no registro da mesa", () => {
    expect(descreverUso(deUsoDoServidor(USO))).toBe("Lion usou Lança de Fogo (3 PP) em Goblin 2");
    expect(descreverUso(deUsoDoServidor({ ...USO, alvos: [] }))).toBe("Lion usou Lança de Fogo (3 PP)");
    expect(deUsoDoServidor({ ...USO, custo_extra: "1 de Exaustão" }, "Ana").custoExtra).toBe("1 de Exaustão");
  });

  it("rolagens e usos ficam na ordem de chegada, e um uso desfeito aparece riscado", () => {
    const { result } = renderHook(() => useRolador({ fonte: () => 7 }));
    act(() => { result.current.acrescentar(20); result.current.rolarMontagem(); });
    act(() => { result.current.receberUso(deUsoDoServidor(USO, "Ana")); });
    act(() => { result.current.acrescentar(6); result.current.rolarMontagem(); });
    const itens = acontecimentos(result.current.historico, result.current.usos);
    expect(itens.map((item) => ("uso" in item ? "uso" : "rolagem"))).toEqual(["rolagem", "uso", "rolagem"]);
    const tela = render(<RoladorDeDados rolador={result.current} />);
    // Só os itens do histórico: cada rolagem tem, dentro, a lista dos valores dos dados.
    const lista = Array.from(screen.getByRole("list", { name: "Histórico" }).querySelectorAll(":scope > li"));
    expect(lista).toHaveLength(3);
    expect(lista[1]!.textContent).toContain("Lion usou Lança de Fogo (3 PP) em Goblin 2");
    expect(lista[1]!.textContent).toContain("Ana");
    expect(within(lista[1] as HTMLElement).queryByRole("button", { name: /Rolar de novo/ })).toBeNull();
    act(() => { result.current.atualizarUso(7, true); });
    tela.rerender(<RoladorDeDados rolador={result.current} />);
    const riscado = screen.getByRole("list", { name: "Histórico" }).querySelectorAll(":scope > li")[1]!;
    expect(riscado.className).toContain("rolador__item--desfeito");
    expect(riscado.textContent).toContain("desfeito");
    act(() => { result.current.limparHistorico(); });
    expect(result.current.usos).toEqual([]);
    expect(result.current.historico).toEqual([]);
  });

  it("a opção Animação das cartas aparece junto da dos dados", () => {
    const { result } = renderHook(() => useRolador({ fonte: () => 7 }));
    const aoAnimarCartas = vi.fn();
    render(<RoladorDeDados rolador={result.current} opcoes={{ mostrar: "todas", aoMostrar: vi.fn(), animacao: true, aoAnimar: vi.fn(),
      animacaoDasCartas: true, aoAnimarCartas }} />);
    fireEvent.click(screen.getByRole("switch", { name: "Animação das cartas" }));
    expect(aoAnimarCartas).toHaveBeenCalledWith(false);
  });
});

describe("estatísticas de cartas (cartas-na-cena)", () => {
  afterEach(cleanup);

  it("mostra PP gasto, cartas usadas e a carta favorita", () => {
    render(<QuadroDoPeriodo periodo={{ vida_perdida: 0, vida_recuperada: 0, rolagens: 3, dados: 3, sorte: null, rotulo_sorte: "poucos_dados",
      criticos: null, falhas_criticas: null, pp_gasto: 7, cartas_usadas: 3, carta_favorita: { titulo: "Lança de Fogo", usos: 2 } }} />);
    const numeros = screen.getAllByRole("definition").map((dd) => dd.textContent);
    expect(numeros).toContain("7");
    expect(numeros).toContain("3");
    expect(numeros.some((n) => n?.includes("Lança de Fogo") && n.includes("(2)"))).toBe(true);
    cleanup();
    render(<QuadroDoPeriodo periodo={{ vida_perdida: 0, vida_recuperada: 0, rolagens: 0, dados: 0, sorte: null, rotulo_sorte: "poucos_dados",
      criticos: null, falhas_criticas: null, pp_gasto: 0, cartas_usadas: 0, carta_favorita: null }} />);
    expect(screen.getByText("Nenhuma ainda")).toBeTruthy();
  });
});
