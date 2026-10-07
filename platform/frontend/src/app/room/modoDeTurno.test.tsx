// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { AvisoDeIniciativa, BarraDeTurno } from "./BarraDeTurno";
import { juntarParaAnimar } from "./dados";
import { MestreDoPainel } from "./MestreDoPainel";
import { RoladorDeDados } from "./RoladorDeDados";
import { useRolador } from "./useRolador";
import { useModoDeTurno, type CombateDoTurno, type ParticipanteDoTurno } from "./useModoDeTurno";
import type { GamificacaoDaSala } from "./useGamificacaoDaSala";
import { CHAVE_ABA_DO_PAINEL } from "./abasDoPainel";
import { RoomView } from "./RoomView";

const p = (id: string, nome: string, parcial: Partial<ParticipanteDoTurno> = {}): ParticipanteDoTurno => ({
  id, personagem_id: id, nome, token_id: `t-${id}`, tokens: 1, token_ids: [`t-${id}`], rolou: true, total: 10, meu: false, do_jogador: true,
  fora_da_cena: false, ...parcial,
});

const COMBATE: CombateDoTurno = {
  id: "c1", estado: "combate", rodada: 2, vez_participante_id: "lion",
  participantes: [
    p("kira", "Kira", { total: 18 }),
    p("goblin", "Goblin", { total: null, do_jogador: false, tokens: 2 }),
    p("lion", "Lion", { total: 12, meu: true }),
    p("lobo", "Lobo", { fora_da_cena: true, do_jogador: false }),
    p("ogro", "Ogro", { rolou: false, total: null, do_jogador: false }),
  ],
};

function barra(combate: CombateDoTurno, narrador: boolean) {
  const acoes = { onProximo: vi.fn(), onSair: vi.fn(), onComecar: vi.fn(), onRolarPor: vi.fn(), onRolarNpcs: vi.fn() };
  const resultado = render(<BarraDeTurno combate={combate} narrador={narrador} retratos={{ "t-lion": "data:lion" }}
    pendente={false} {...acoes} />);
  return { ...acoes, ...resultado };
}

describe("barra de ordem", () => {
  afterEach(cleanup);

  it("mostra a ordem, a rodada, a vez em destaque e quem falta rolar; esconde quem saiu da cena", () => {
    barra(COMBATE, false);
    expect(screen.getByText("Rodada 2")).toBeTruthy();
    const itens = within(screen.getByRole("list", { name: "Ordem de iniciativa" })).getAllByRole("listitem");
    expect(itens.map((item) => item.getAttribute("title"))).toEqual(["Kira", "Goblin (×2)", "Lion", "Ogro"]);
    const lion = itens[2]!;
    expect(lion.getAttribute("aria-current")).toBe("true");
    expect(lion.querySelector("img")?.getAttribute("src")).toBe("data:lion");
    expect(lion.textContent).toContain("12");
    // O total do Goblin não veio do servidor para o jogador.
    expect(itens[1]!.querySelector(".turno__total")).toBeNull();
    expect(itens[3]!.textContent).toContain("falta rolar");
    expect(screen.getByRole("status").textContent).toBe("Vez de Lion, rodada 2");
    // O jogador não tem os controles do Narrador.
    expect(screen.queryByRole("button", { name: "Próximo turno" })).toBeNull();
  });

  it("o Narrador passa a vez e sai", () => {
    const todosRolaram = { ...COMBATE, participantes: COMBATE.participantes.map((x) => ({ ...x, rolou: true })) };
    const acoes = barra(todosRolaram, true);
    expect(screen.queryByRole("group", { name: "Falta rolar a iniciativa" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Próximo turno" }));
    fireEvent.click(screen.getByRole("button", { name: "Sair do modo turno" }));
    expect(acoes.onProximo).toHaveBeenCalledOnce();
    expect(acoes.onSair).toHaveBeenCalledOnce();
  });

  it("quem falta rolar na cena trava o Próximo turno, e o Narrador rola por ele ali mesmo (D8c)", () => {
    const acoes = barra(COMBATE, true);
    const proximo = screen.getByRole("button", { name: "Próximo turno" }) as HTMLButtonElement;
    expect(proximo.disabled).toBe(true);
    // O Lobo saiu da cena: não trava.
    expect(proximo.title).toBe("Falta rolar a iniciativa de Ogro.");
    const quadro = screen.getByRole("group", { name: "Falta rolar a iniciativa" });
    expect(quadro.textContent).toContain("Falta rolar a iniciativa de Ogro.");
    fireEvent.click(within(quadro).getByRole("button", { name: "Rolar por Ogro" }));
    fireEvent.click(within(quadro).getByRole("button", { name: "Rolar todos os NPCs e monstros" }));
    expect(acoes.onRolarPor).toHaveBeenCalledWith("ogro");
    expect(acoes.onRolarNpcs).toHaveBeenCalledOnce();
    expect(acoes.onProximo).not.toHaveBeenCalled();
  });

  it("o jogador não vê o quadro do travamento, só a marca 'falta rolar'", () => {
    barra(COMBATE, false);
    expect(screen.queryByRole("group", { name: "Falta rolar a iniciativa" })).toBeNull();
  });

  it("anuncia a nova vez quando ela muda", () => {
    const { rerender } = barra(COMBATE, false);
    rerender(<BarraDeTurno combate={{ ...COMBATE, rodada: 3, vez_participante_id: "kira" }} narrador={false} retratos={{}}
      pendente={false} onProximo={vi.fn()} onSair={vi.fn()} onComecar={vi.fn()} onRolarPor={vi.fn()} onRolarNpcs={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toBe("Vez de Kira, rodada 3");
  });

  it("na fase de iniciativa, o Narrador rola por quem falta, rola os NPCs e começa", () => {
    const iniciativa: CombateDoTurno = { ...COMBATE, estado: "iniciativa", rodada: 0, vez_participante_id: null };
    const acoes = barra(iniciativa, true);
    expect(screen.getByText("Iniciativa")).toBeTruthy();
    const quadro = screen.getByRole("group", { name: "Iniciativa" });
    fireEvent.click(within(quadro).getByRole("button", { name: "Rolar por Ogro" }));
    expect(acoes.onRolarPor).toHaveBeenCalledWith("ogro");
    fireEvent.click(within(quadro).getByRole("button", { name: "Rolar todos os NPCs e monstros" }));
    expect(acoes.onRolarNpcs).toHaveBeenCalledOnce();
    fireEvent.click(within(quadro).getByRole("button", { name: "Começar a disputa" }));
    expect(acoes.onComecar).toHaveBeenCalledOnce();
    expect(quadro.textContent).toContain("fica no fim da fila");
  });

  it("sem ninguém ter rolado, não dá para começar; sem NPC pendente, não há 'Rolar todos'", () => {
    const ninguem: CombateDoTurno = { ...COMBATE, estado: "iniciativa", rodada: 0, vez_participante_id: null,
      participantes: [p("lion", "Lion", { rolou: false, total: null })] };
    barra(ninguem, true);
    expect((screen.getByRole("button", { name: "Começar a disputa" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Rolar todos os NPCs e monstros" })).toBeNull();
  });
});

describe("saldo de Deslocamento na barra", () => {
  afterEach(cleanup);
  const comSaldo = (movimento: ParticipanteDoTurno["movimento"], meu = true): CombateDoTurno => ({ ...COMBATE,
    participantes: COMBATE.participantes.map((x) => (x.id === "lion" ? { ...x, meu, movimento } : x)) });

  it("mostra quanto falta ao dono e oferece Correr", () => {
    const onCorrer = vi.fn();
    render(<BarraDeTurno combate={comSaldo({ gasto: 5, limite: 9, correndo: false })} narrador={false} retratos={{}}
      pendente={false} onProximo={vi.fn()} onSair={vi.fn()} onComecar={vi.fn()} onRolarPor={vi.fn()} onRolarNpcs={vi.fn()}
      onCorrer={onCorrer} />);
    const saldo = screen.getByRole("group", { name: "Deslocamento de Lion" });
    expect(saldo.textContent).toContain("Deslocamento: 4 de 9 m");
    fireEvent.click(within(saldo).getByRole("button", { name: "Correr" }));
    expect(onCorrer).toHaveBeenCalledOnce();
  });

  it("correndo, mostra o saldo dobrado e some o botão", () => {
    render(<BarraDeTurno combate={comSaldo({ gasto: 5, limite: 18, correndo: true })} narrador={false} retratos={{}}
      pendente={false} onProximo={vi.fn()} onSair={vi.fn()} onComecar={vi.fn()} onRolarPor={vi.fn()} onRolarNpcs={vi.fn()}
      onCorrer={vi.fn()} />);
    const saldo = screen.getByRole("group", { name: "Deslocamento de Lion" });
    expect(saldo.textContent).toContain("Deslocamento: 13 de 18 m · Correndo");
    expect(within(saldo).queryByRole("button", { name: "Correr" })).toBeNull();
  });

  it("sem o saldo vindo do servidor (outra pessoa), não mostra nada; o Narrador pode Correr por quem está na vez", () => {
    const { unmount } = render(<BarraDeTurno combate={comSaldo(null, false)} narrador={false} retratos={{}} pendente={false}
      onProximo={vi.fn()} onSair={vi.fn()} onComecar={vi.fn()} onRolarPor={vi.fn()} onRolarNpcs={vi.fn()} onCorrer={vi.fn()} />);
    expect(screen.queryByRole("group", { name: /Deslocamento/ })).toBeNull();
    unmount();
    render(<BarraDeTurno combate={comSaldo({ gasto: 0, limite: 9, correndo: false }, false)} narrador retratos={{}}
      pendente={false} onProximo={vi.fn()} onSair={vi.fn()} onComecar={vi.fn()} onRolarPor={vi.fn()} onRolarNpcs={vi.fn()}
      onCorrer={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Correr" })).toBeTruthy();
  });
});

describe("movimento livre do Narrador na barra", () => {
  afterEach(cleanup);

  it("é uma chave liga/desliga do Narrador, na disputa e na iniciativa; o jogador não a tem", () => {
    const aoMudar = vi.fn();
    const acoes = { onProximo: vi.fn(), onSair: vi.fn(), onComecar: vi.fn(), onRolarPor: vi.fn(), onRolarNpcs: vi.fn() };
    const { rerender } = render(<BarraDeTurno combate={COMBATE} narrador retratos={{}} pendente={false} {...acoes}
      movimentoLivre={{ ligado: false, aoMudar }} />);
    const chave = screen.getByRole("switch", { name: "Movimento livre" }) as HTMLInputElement;
    expect(chave.checked).toBe(false);
    expect(chave.closest("label")?.getAttribute("title")).toContain("Alt");
    fireEvent.click(chave);
    expect(aoMudar).toHaveBeenCalledWith(true);
    rerender(<BarraDeTurno combate={COMBATE} narrador retratos={{}} pendente={false} {...acoes} movimentoLivre={{ ligado: true, aoMudar }} />);
    expect((screen.getByRole("switch", { name: "Movimento livre" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText(/ligado/)).toBeNull();
    rerender(<BarraDeTurno combate={{ ...COMBATE, estado: "iniciativa", rodada: 0, vez_participante_id: null }} narrador retratos={{}}
      pendente={false} {...acoes} movimentoLivre={{ ligado: false, aoMudar }} />);
    expect(screen.getByRole("switch", { name: "Movimento livre" })).toBeTruthy();
    rerender(<BarraDeTurno combate={COMBATE} narrador={false} retratos={{}} pendente={false} {...acoes} />);
    expect(screen.queryByRole("switch", { name: "Movimento livre" })).toBeNull();
  });
});

describe("aviso de iniciativa do jogador", () => {
  afterEach(cleanup);

  it("um botão por personagem dele que falta rolar", () => {
    const onRolar = vi.fn();
    const combate: CombateDoTurno = { ...COMBATE, estado: "iniciativa", participantes: [
      p("lion", "Lion", { meu: true, rolou: false, total: null }), p("bolota", "Bolota", { meu: true, rolou: false, total: null }),
      p("kira", "Kira", { rolou: false, total: null }), p("ze", "Zé", { meu: true }),
    ] };
    render(<AvisoDeIniciativa combate={combate} pendente={false} onRolar={onRolar} />);
    const aviso = screen.getByRole("alertdialog", { name: "Role iniciativa" });
    expect(within(aviso).getAllByRole("button").map((b) => b.textContent)).toEqual(
      ["Rolar iniciativa de Lion", "Rolar iniciativa de Bolota"]);
    fireEvent.click(within(aviso).getByRole("button", { name: "Rolar iniciativa de Lion" }));
    expect(onRolar).toHaveBeenCalledWith("lion");
  });

  it("some quando todos os dele rolaram", () => {
    render(<AvisoDeIniciativa combate={COMBATE} pendente={false} onRolar={vi.fn()} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

const gamificacao = (): GamificacaoDaSala => ({
  preferencias: { destaque_criticos: false, estatisticas_visiveis: false, mao_dos_jogadores_visivel: true },
  sessoes: { atual: { id: "s1", numero: 1, iniciada_em: "2026-10-04T20:00:00Z", encerrada_em: null }, ultima_encerrada: null },
  estatisticas: null, mvp: null, mudarPreferencias: vi.fn(), iniciarSessao: vi.fn(), encerrarSessao: vi.fn(),
  abrirVotacao: vi.fn(), encerrarVotacao: vi.fn(), desempatar: vi.fn(), votar: vi.fn(), pendente: false, erro: null,
});

describe("modo turno na aba Mestre", () => {
  afterEach(() => { cleanup(); window.localStorage.clear(); });

  it("entra quando pode; sem poder, o botão fica desativado com o motivo; aberto, oferece sair", () => {
    const controle = { aberto: false, motivo: null, entrar: vi.fn(), sair: vi.fn(), pendente: false, erro: null };
    const { rerender } = render(<MestreDoPainel gamificacao={gamificacao()} modoTurno={controle} />);
    fireEvent.click(screen.getByRole("button", { name: "Entrar em modo turno" }));
    expect(controle.entrar).toHaveBeenCalledOnce();
    rerender(<MestreDoPainel gamificacao={gamificacao()} modoTurno={{ ...controle, motivo: "Inicie uma sessão para entrar em modo turno." }} />);
    const botao = screen.getByRole("button", { name: "Entrar em modo turno" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    expect(botao.getAttribute("aria-describedby")).toBe("mestre-turno-motivo");
    expect(document.getElementById("mestre-turno-motivo")?.textContent).toBe("Inicie uma sessão para entrar em modo turno.");
    rerender(<MestreDoPainel gamificacao={gamificacao()} modoTurno={{ ...controle, aberto: true }} />);
    fireEvent.click(screen.getByRole("button", { name: "Sair do modo turno" }));
    expect(controle.sair).toHaveBeenCalledOnce();
  });
});

describe("iniciativa no histórico e na animação", () => {
  afterEach(cleanup);

  it("o histórico marca a rolagem de iniciativa", () => {
    function Rolador() {
      const rolador = useRolador();
      return <><button type="button" onClick={() => rolador.receber({ id: 9, expressao: "1d20 + Raciocínio (+2) + Prontidão (+1)",
        grupos: [{ faces: 20, valores: [14] }], modificador: 0, total: 17, montagem: { dados: { 20: 1 }, modificador: 0 },
        finalidade: "iniciativa", personagem: "Lion" })}>receber</button><RoladorDeDados rolador={rolador} /></>;
    }
    render(<Rolador />);
    fireEvent.click(screen.getByRole("button", { name: "receber" }));
    expect(document.querySelector(".rolador__item-autor")?.textContent).toBe("Iniciativa · Lion");
  });

  it("junta as rolagens de vários NPCs para animar de uma vez, com as marcas no lugar", () => {
    expect(juntarParaAnimar([
      { grupos: [{ faces: 20, valores: [7] }] },
      { grupos: [{ faces: 20, valores: [20] }], marcas: [{ faces: 20, indice: 0, tipo: "critico" }] },
    ])).toEqual({ grupos: [{ faces: 20, valores: [7, 20] }], marcas: [{ faces: 20, indice: 1, tipo: "critico" }] });
  });
});

describe("useModoDeTurno", () => {
  afterEach(cleanup);
  const wrapper = ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;

  it("lê o combate, rola e devolve as rolagens, e mostra o erro do servidor", async () => {
    const GET = vi.fn(async () => ({ data: { combate: COMBATE }, error: undefined }));
    const POST = vi.fn(async (caminho: string) => caminho.endsWith("/inicio")
      ? { data: undefined, error: { detail: "Ninguém na cena rolou a iniciativa ainda." } }
      : { data: { estado: { combate: COMBATE }, rolagens: [{ id: 3, total: 17 }] }, error: undefined });
    const { result } = renderHook(() => useModoDeTurno({ api: { GET, POST } as unknown as ApiClient, mesaId: "mesa",
      comTempoReal: true, ativo: true }), { wrapper });
    await waitFor(() => expect(result.current.combate?.rodada).toBe(2));
    let rolagens: unknown[] = [];
    await act(async () => { rolagens = await result.current.rolar("lion"); });
    expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/turno/iniciativa", {
      params: { path: { mesa_id: "mesa" } }, body: { participante_id: "lion" } });
    expect(rolagens).toEqual([{ id: 3, total: 17 }]);
    act(() => result.current.comecar());
    await waitFor(() => expect(result.current.erro).toBe("Ninguém na cena rolou a iniciativa ainda."));
  });
});

const tabuleiro = vi.hoisted(() => ({ animar: vi.fn() }));
vi.mock("./useDadosNoTabuleiro", () => ({
  useDadosNoTabuleiro: () => ({ camada: <div data-testid="camada-dos-dados" aria-hidden="true" />, animar: tabuleiro.animar }),
}));
vi.mock("./RoomCanvas", () => ({ RoomCanvas: () => <div data-testid="grid" /> }));
vi.mock("./SceneStashes", () => ({ SceneStashes: () => null }));

describe("modo turno na Sala do jogador", () => {
  beforeEach(() => { tabuleiro.animar.mockReset(); tabuleiro.animar.mockResolvedValue(undefined); });
  afterEach(() => { cleanup(); window.localStorage.clear(); });

  it("o jogador rola pelo aviso, os dados rolam e a rolagem entra no histórico com a marca", async () => {
    window.localStorage.setItem(CHAVE_ABA_DO_PAINEL, "dados");
    const iniciativa: CombateDoTurno = { ...COMBATE, estado: "iniciativa", rodada: 0, vez_participante_id: null,
      participantes: [p("lion", "Lion", { meu: true, rolou: false, total: null })] };
    const sala = { cenas: [], cena: { id: "cena", nome: "Ponte", colunas: 8, linhas: 6, mapa_objeto: null, ativa: true,
      versao: 1, camadas: [], tokens: [] } };
    const GET = vi.fn(async (caminho: string) => ({ error: undefined,
      data: caminho === "/mesas/{mesa_id}/sala" ? sala : caminho === "/mesas/{mesa_id}/sala/turno" ? { combate: iniciativa } : [] }));
    const POST = vi.fn(async () => ({ error: undefined, data: { estado: { combate: null }, rolagens: [{
      id: 5, autor_id: "ana", expressao: "1d20 + Raciocínio (+2) + Prontidão (+1)", grupos: [{ faces: 20, valores: [14] }],
      modificador: 0, total: 17, oculta: false, personagem_id: "lion", termos: [], marcas: [], finalidade: "iniciativa" }] } }));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RoomView api={{ GET, POST } as unknown as ApiClient} mesaId="mesa" userId="ana" narrator={false} realtime={undefined} />
    </QueryClientProvider>);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
    fireEvent.click(await screen.findByRole("button", { name: "Rolar iniciativa de Lion" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/turno/iniciativa", {
      params: { path: { mesa_id: "mesa" } }, body: { participante_id: "lion" } }));
    await waitFor(() => expect(tabuleiro.animar).toHaveBeenCalledWith({ grupos: [{ faces: 20, valores: [14] }] }));
    await waitFor(() => expect(document.querySelector(".rolador__item-autor")?.textContent).toContain("Iniciativa"));
  });
});
