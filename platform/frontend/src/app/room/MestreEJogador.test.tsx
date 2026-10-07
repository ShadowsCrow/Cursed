// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JogadorDoPainel } from "./JogadorDoPainel";
import { CHAVE_SUBABA_DO_MESTRE, MestreDoPainel } from "./MestreDoPainel";
import type { EstatisticasDoPeriodo, GamificacaoDaSala, VotacaoMvp } from "./useGamificacaoDaSala";

const periodo = (parcial: Partial<EstatisticasDoPeriodo> = {}): EstatisticasDoPeriodo => ({
  vida_perdida: 15, vida_recuperada: 3, rolagens: 12, dados: 12, sorte: 12.4, rotulo_sorte: "quentes",
  criticos: null, falhas_criticas: null, pp_gasto: 0, cartas_usadas: 0, carta_favorita: null, ...parcial,
});

const SESSAO = { id: "s2", numero: 2, iniciada_em: "2026-10-04T20:14:00Z", encerrada_em: null };

function votacao(parcial: Partial<VotacaoMvp> = {}): VotacaoMvp {
  return { id: "v1", estado: "aberta", aberta_em: "2026-10-04T22:00:00Z", encerrada_em: null, votaram: 1, total: 2,
    candidatos: ["kira"], meu_voto: null, empatados: [], vencedor_id: null, votos_do_vencedor: null, sessao_numero: 2,
    ...parcial };
}

function gamificacao(parcial: Partial<GamificacaoDaSala> = {}): GamificacaoDaSala {
  return {
    preferencias: { destaque_criticos: false, estatisticas_visiveis: false, mao_dos_jogadores_visivel: true },
    sessoes: { atual: SESSAO, ultima_encerrada: null },
    estatisticas: {
      sessao: SESSAO, placar_visivel: false,
      jogadores: [
        { usuario_id: "ana", apelido: "Lion", sessao: periodo(), campanha: periodo({ vida_perdida: 40, rolagens: 30, dados: 30 }) },
        { usuario_id: "kira", apelido: "Kira", sessao: periodo({ rotulo_sorte: "frios", sorte: -8 }), campanha: periodo() },
      ],
    },
    mvp: { votacao: null, historico: [], apelidos: { ana: "Lion", kira: "Kira" } },
    mudarPreferencias: vi.fn(), iniciarSessao: vi.fn(), encerrarSessao: vi.fn(), abrirVotacao: vi.fn(),
    encerrarVotacao: vi.fn(), desempatar: vi.fn(), votar: vi.fn(), pendente: false, erro: null,
    ...parcial,
  };
}

/** Abre a sub-aba da aba Mestre e devolve o conteúdo dela. */
const subAba = (nome: string) => {
  fireEvent.click(screen.getByRole("tab", { name: new RegExp(`^${nome}`) }));
  return screen.getByRole("tabpanel");
};

describe("aba Mestre", () => {
  afterEach(() => { cleanup(); window.localStorage.clear(); });

  it("tem as sub-abas Sessão, Preferências, MVP e Estatísticas, com setas, Home e End, e lembra a escolhida", () => {
    const { unmount } = render(<MestreDoPainel gamificacao={gamificacao()} />);
    const lista = screen.getByRole("tablist", { name: "Temas do Mestre" });
    expect(within(lista).getAllByRole("tab").map((aba) => aba.textContent)).toEqual(["Sessão", "Preferências", "MVP", "Estatísticas"]);
    expect(screen.getByRole("tab", { name: "Sessão" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe("mestre-aba-sessao");
    // Só o tema escolhido aparece: nada de seções retráteis.
    expect(screen.queryByRole("switch", { name: /Destaque de críticos/ })).toBeNull();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Sessão" }), { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Preferências" }));
    expect(screen.getByRole("switch", { name: /Destaque de críticos/ })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Preferências" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "Estatísticas" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Estatísticas" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Sessão" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Sessão" }), { key: "ArrowLeft" });
    expect(window.localStorage.getItem(CHAVE_SUBABA_DO_MESTRE)).toBe("estatisticas");
    unmount();
    render(<MestreDoPainel gamificacao={gamificacao()} />);
    expect(screen.getByRole("tab", { name: "Estatísticas" }).getAttribute("aria-selected")).toBe("true");
  });

  it("com votação aberta, a sub-aba MVP avisa", () => {
    render(<MestreDoPainel gamificacao={gamificacao({ mvp: { votacao: votacao(), historico: [], apelidos: {} } })} />);
    expect(screen.getByRole("tab", { name: /^MVP\s*\(votação aberta\)$/ })).toBeTruthy();
  });

  it("inicia e encerra a sessão", () => {
    const semSessao = gamificacao({ sessoes: { atual: null, ultima_encerrada: null } });
    const { rerender } = render(<MestreDoPainel gamificacao={semSessao} />);
    expect(within(subAba("Sessão")).getByText("Nenhuma sessão em andamento")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sessão" }));
    expect(semSessao.iniciarSessao).toHaveBeenCalledOnce();
    const comSessao = gamificacao();
    rerender(<MestreDoPainel gamificacao={comSessao} />);
    expect(within(screen.getByRole("tabpanel")).getByText(/Sessão 2 em andamento desde/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Iniciar sessão" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Encerrar sessão" }));
    expect(comSessao.encerrarSessao).toHaveBeenCalledOnce();
  });

  it("liga o destaque de críticos e o placar da mesa", () => {
    const dados = gamificacao();
    render(<MestreDoPainel gamificacao={dados} />);
    subAba("Preferências");
    const destaque = screen.getByRole("switch", { name: /Destaque de críticos/ }) as HTMLInputElement;
    expect(destaque.checked).toBe(false);
    fireEvent.click(destaque);
    expect(dados.mudarPreferencias).toHaveBeenCalledWith({ destaque_criticos: true });
    fireEvent.click(screen.getByRole("switch", { name: /Mostrar estatísticas da mesa/ }));
    expect(dados.mudarPreferencias).toHaveBeenCalledWith({ estatisticas_visiveis: true });
  });

  it("mostra as estatísticas de cada jogador por período", () => {
    render(<MestreDoPainel gamificacao={gamificacao()} />);
    subAba("Estatísticas");
    const placar = screen.getByRole("list", { name: "Estatísticas dos jogadores" });
    const lion = within(placar).getByRole("heading", { name: "Lion" }).closest("li")!;
    expect(lion.textContent).toContain("Vida perdida15");
    expect(lion.textContent).toContain("Dados quentes");
    expect(lion.textContent).toContain("+12 pontos acima da média");
    expect(within(placar).getByRole("heading", { name: "Kira" }).closest("li")!.textContent).toContain("Dados frios");
    fireEvent.click(screen.getByRole("radio", { name: "Campanha" }));
    expect(within(placar).getByRole("heading", { name: "Lion" }).closest("li")!.textContent).toContain("Vida perdida40");
    // Sem o destaque de críticos, não há contadores de crítico.
    expect(placar.textContent).not.toContain("Críticos");
  });

  it("abre, acompanha e encerra a votação sem mostrar em quem votaram", () => {
    const fechada = gamificacao();
    const { rerender } = render(<MestreDoPainel gamificacao={fechada} />);
    subAba("MVP");
    fireEvent.click(screen.getByRole("button", { name: "Abrir votação de MVP" }));
    expect(fechada.abrirVotacao).toHaveBeenCalledOnce();
    const aberta = gamificacao({ mvp: { votacao: votacao(), historico: [], apelidos: { ana: "Lion", kira: "Kira" } } });
    rerender(<MestreDoPainel gamificacao={aberta} />);
    const mvp = screen.getByRole("region", { name: "Votação de MVP" });
    expect(within(mvp).getByRole("status").textContent).toBe("1 de 2 votaram");
    expect(mvp.textContent).not.toContain("Kira");
    fireEvent.click(within(mvp).getByRole("button", { name: "Encerrar votação" }));
    expect(aberta.encerrarVotacao).toHaveBeenCalledOnce();
  });

  it("no empate, o Narrador escolhe entre os empatados", () => {
    const empate = gamificacao({ mvp: { votacao: votacao({ estado: "desempate", empatados: ["ana", "kira"] }), historico: [],
      apelidos: { ana: "Lion", kira: "Kira" } } });
    render(<MestreDoPainel gamificacao={empate} />);
    subAba("MVP");
    const grupo = screen.getByRole("group", { name: /Empate/ });
    fireEvent.click(within(grupo).getByRole("button", { name: "Kira" }));
    expect(empate.desempatar).toHaveBeenCalledWith("kira");
  });

  it("com menos de dois jogadores não abre a votação e explica", () => {
    const sozinho = gamificacao();
    sozinho.estatisticas!.jogadores = sozinho.estatisticas!.jogadores.slice(0, 1);
    render(<MestreDoPainel gamificacao={sozinho} />);
    subAba("MVP");
    expect((screen.getByRole("button", { name: "Abrir votação de MVP" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/ao menos dois jogadores/)).toBeTruthy();
  });

  it("lista os MVPs anteriores", () => {
    render(<MestreDoPainel gamificacao={gamificacao({ mvp: { votacao: null, apelidos: { kira: "Kira" }, historico: [
      { votacao_id: "v0", vencedor_id: "kira", votos: 2, sessao_numero: 1, encerrada_em: "2026-09-27T23:00:00Z" },
    ] } })} />);
    subAba("MVP");
    const lista = screen.getByRole("region", { name: "MVPs anteriores" });
    expect(lista.textContent).toContain("Kira");
    expect(lista.textContent).toContain("Sessão 1");
    expect(lista.textContent).toContain("2 votos");
  });
});

describe("aba Jogador", () => {
  afterEach(() => { cleanup(); window.localStorage.clear(); });

  it("mostra as próprias estatísticas da sessão e da campanha, sem o placar quando ele está desligado", () => {
    render(<JogadorDoPainel gamificacao={gamificacao()} userId="ana" />);
    expect(screen.getByText(/Sessão 2 em andamento/)).toBeTruthy();
    const minhas = screen.getByRole("region", { name: "Minhas estatísticas" });
    expect(minhas.textContent).toContain("Vida perdida15");
    expect(minhas.textContent).toContain("Vida recuperada3");
    fireEvent.click(within(minhas).getByRole("radio", { name: "Campanha" }));
    expect(minhas.textContent).toContain("Vida perdida40");
    expect(screen.queryByRole("region", { name: "Placar da mesa" })).toBeNull();
  });

  it("com críticos e poucos dados", () => {
    const dados = gamificacao();
    dados.estatisticas!.jogadores[0]!.sessao = periodo({ criticos: 2, falhas_criticas: 1, sorte: null, rotulo_sorte: "poucos_dados" });
    render(<JogadorDoPainel gamificacao={dados} userId="ana" />);
    const minhas = screen.getByRole("region", { name: "Minhas estatísticas" });
    expect(minhas.textContent).toContain("Críticos2");
    expect(minhas.textContent).toContain("Falhas críticas1");
    expect(minhas.textContent).toContain("Poucos dados ainda");
  });

  it("mostra o placar da mesa quando o Narrador libera", () => {
    const dados = gamificacao();
    dados.estatisticas!.placar_visivel = true;
    render(<JogadorDoPainel gamificacao={dados} userId="ana" />);
    const placar = screen.getByRole("region", { name: "Placar da mesa" });
    expect(within(placar).getByRole("heading", { name: "Kira" })).toBeTruthy();
    expect(within(placar).getByRole("heading", { name: "Lion" })).toBeTruthy();
  });

  it("vota em outro jogador, vê o próprio voto e pode trocar; não aparece como opção", () => {
    const dados = gamificacao({ mvp: { votacao: votacao({ candidatos: ["kira", "rui"], meu_voto: "kira" }), historico: [],
      apelidos: { ana: "Lion", kira: "Kira", rui: "Rui" } } });
    render(<JogadorDoPainel gamificacao={dados} userId="ana" retrato={(id) => (id === "kira" ? <img alt="" /> : null)} />);
    const grupo = screen.getByRole("group", { name: "Quem foi o MVP?" });
    expect(within(grupo).queryByRole("button", { name: /Lion/ })).toBeNull();
    const kira = within(grupo).getByRole("button", { name: /Kira/ });
    expect(kira.getAttribute("aria-pressed")).toBe("true");
    expect(kira.textContent).toContain("seu voto");
    expect(kira.querySelector("img")).toBeTruthy();
    fireEvent.click(within(grupo).getByRole("button", { name: /Rui/ }));
    expect(dados.votar).toHaveBeenCalledWith("rui");
  });

  it("sem votação aberta não mostra a votação", () => {
    render(<JogadorDoPainel gamificacao={gamificacao({ mvp: { votacao: votacao({ estado: "encerrada", vencedor_id: "kira" }),
      historico: [], apelidos: {} } })} userId="ana" />);
    expect(screen.queryByRole("group", { name: "Quem foi o MVP?" })).toBeNull();
  });
});
