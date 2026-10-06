// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CHAVE_FAVORITAS, type Camada, type FaixaDeMusica } from "./musica";
import { MusicaDoPainel } from "./MusicaDoPainel";
import type { CamadaDaSala, MusicaDaSala } from "./useMusicaDaSala";

const ESTILOS = ["Medieval", "Moderno", "Ficção científica"];
const MOMENTOS = ["Exploração / Viagem", "Combate", "Chefe / Épico", "Tensão / Suspense", "Mistério", "Terror",
  "Taverna / Festa", "Descanso / Calmo", "Drama / Tristeza"];
const CENARIOS = ["Cidade / Vila", "Interior", "Natureza", "Masmorra / Caverna", "Sobrenatural / Sombrio", "Nave / Estação"];

const ambiente = (id: string, titulo: string, cenario: string, estilos: string[]): FaixaDeMusica => ({
  id, tipo: "ambiente", titulo, autor: "yd (OpenGameArt)", licenca: "CC0",
  licenca_url: "https://creativecommons.org/publicdomain/zero/1.0/", origem_url: "https://exemplo/origem",
  arquivo: `/musica/${id}.ogg`, duracao_s: 206, estilos, momento: null, cenario, sem_emenda: true,
});
const musicaCC = (id: string, titulo: string, momento: string, cenario: string | null, estilos: string[]): FaixaDeMusica => ({
  id, tipo: "musica", titulo, autor: "Kevin MacLeod (incompetech.com)", licenca: "CC BY 4.0",
  licenca_url: "https://creativecommons.org/licenses/by/4.0/", origem_url: "https://exemplo/origem",
  arquivo: `/musica/${id}.mp3`, duracao_s: 134, estilos, momento, cenario, sem_emenda: false,
});

const FAIXAS = [
  ambiente("loopable-dungeon-ambience", "Loopable Dungeon Ambience", "Masmorra / Caverna", ["Medieval", "Moderno"]),
  ambiente("dungeon-ambience", "Dungeon Ambience", "Masmorra / Caverna", ["Medieval"]),
  ambiente("rain-loop", "Rain Loop", "Natureza", ["Medieval", "Moderno"]),
  ambiente("high-traffic-road", "High Traffic Road", "Cidade / Vila", ["Moderno"]),
  ambiente("spaceship-hums", "Ambient Spaceship Hums", "Nave / Estação", ["Ficção científica"]),
  musicaCC("cathedral-in-the-forest", "Cathedral in the Forest", "Mistério", "Natureza", ["Medieval"]),
  musicaCC("clash-defiant", "Clash Defiant", "Combate", null, ["Medieval"]),
  musicaCC("achaidh-cheide", "Achaidh Cheide", "Taverna / Festa", "Interior", ["Medieval"]),
  musicaCC("darkest-child", "Darkest Child", "Terror", "Sobrenatural / Sombrio", ["Medieval", "Moderno"]),
  musicaCC("cut-and-run", "Cut and Run", "Combate", "Cidade / Vila", ["Moderno"]),
];
const por = (id: string) => FAIXAS.find((faixa) => faixa.id === id)!;

function camada(nome: Camada, parcial: Partial<CamadaDaSala> = {}): CamadaDaSala {
  return {
    camada: nome, estado: null, faixaAtual: null, posicao: () => ({ segundos: 0, terminou: false }),
    volume: nome === "ambiente" ? 0.5 : 0.6, mudarVolume: vi.fn(),
    tocar: vi.fn(), pausar: vi.fn(), continuar: vi.fn(), parar: vi.fn(), mudarRepetir: vi.fn(), ...parcial,
  };
}

function sala(parcial: Partial<MusicaDaSala> = {}): MusicaDaSala {
  return {
    faixas: FAIXAS, estilos: ESTILOS, momentos: MOMENTOS, cenarios: CENARIOS, ambiente: camada("ambiente"),
    musica: camada("musica"), bloqueado: false, ativarSom: vi.fn(), silenciada: false, silenciar: vi.fn(),
    pendente: false, erro: null, ...parcial,
  };
}

const estado = (faixa_id: string, tocando = true) =>
  ({ faixa_id, tocando, posicao_ms: 0, repetir: true, alterada_em: null });

const tocandoAs2 = () => sala({
  ambiente: camada("ambiente", { faixaAtual: por("dungeon-ambience"), estado: estado("dungeon-ambience"),
    posicao: () => ({ segundos: 12, terminou: false }) }),
  musica: camada("musica", { faixaAtual: por("achaidh-cheide"), estado: estado("achaidh-cheide"),
    posicao: () => ({ segundos: 75, terminou: false }) }),
});

const titulos = (lista: HTMLElement) => within(lista).getAllByRole("listitem")
  .map((item) => item.querySelector(".musica__titulo")?.firstChild?.textContent?.trim());
const botao = (nome: string) => screen.queryByRole("button", { name: nome }) as HTMLButtonElement | null;

describe("aba Música", () => {
  afterEach(() => { cleanup(); window.localStorage.clear(); });

  it("favoritar uma faixa e filtrar só as favoritas, junto com os outros filtros", () => {
    render(<MusicaDoPainel musica={sala()} narrator />);
    fireEvent.click(botao("Músicas")!);
    const estrela = (titulo: string) => screen.getByRole("button", { name: `Favoritar ${titulo}` });
    fireEvent.click(estrela("Clash Defiant"));
    fireEvent.click(estrela("Achaidh Cheide"));
    expect(estrela("Clash Defiant").getAttribute("aria-pressed")).toBe("true");
    expect(estrela("Darkest Child").getAttribute("aria-pressed")).toBe("false");
    expect(JSON.parse(window.localStorage.getItem(CHAVE_FAVORITAS)!)).toEqual(["clash-defiant", "achaidh-cheide"]);

    fireEvent.click(botao("Favoritas")!);
    expect(titulos(screen.getByRole("list", { name: "Músicas" }))).toEqual(["Clash Defiant", "Achaidh Cheide"]);
    // Os outros filtros valem entre as favoritas.
    expect(botao("Terror")!.disabled).toBe(true);
    fireEvent.click(botao("Combate")!);
    expect(titulos(screen.getByRole("list", { name: "Músicas" }))).toEqual(["Clash Defiant"]);
    // Tirar a estrela tira a faixa da lista filtrada.
    fireEvent.click(estrela("Clash Defiant"));
    expect(screen.getByText("Nada com esse filtro.")).toBeTruthy();
    // Num estilo sem favoritas, o aviso ensina a usar a estrela.
    fireEvent.click(botao("Moderno")!);
    fireEvent.click(botao("Favoritas")!);
    expect(screen.getByText(/Nenhuma favorita aqui/)).toBeTruthy();
  });

  it("as favoritas ficam guardadas neste navegador", () => {
    window.localStorage.setItem(CHAVE_FAVORITAS, JSON.stringify(["rain-loop"]));
    render(<MusicaDoPainel musica={sala()} narrator />);
    expect(screen.getByRole("button", { name: "Favoritar Rain Loop" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(botao("Favoritas")!);
    expect(titulos(screen.getByRole("list", { name: "Ambientes" }))).toEqual(["Rain Loop"]);
  });

  it("a biblioteca separa Ambientes de Músicas e, em cada um, os Estilos de jogo", () => {
    render(<MusicaDoPainel musica={sala()} narrator />);
    expect(botao("Ambientes")!.getAttribute("aria-pressed")).toBe("true");
    expect(botao("Medieval")!.getAttribute("aria-pressed")).toBe("true");
    expect(titulos(screen.getByRole("list", { name: "Ambientes" })))
      .toEqual(["Loopable Dungeon Ambience", "Dungeon Ambience", "Rain Loop"]);
    // Ambiente não tem Momento; o Cenário só mostra os lugares que existem no estilo.
    expect(screen.queryByRole("group", { name: "Momento" })).toBeNull();
    expect(botao("Natureza")).toBeTruthy();
    expect(botao("Cidade / Vila")).toBeNull();
    expect(botao("Nave / Estação")).toBeNull();

    fireEvent.click(botao("Moderno")!);
    expect(titulos(screen.getByRole("list", { name: "Ambientes" })))
      .toEqual(["Loopable Dungeon Ambience", "Rain Loop", "High Traffic Road"]);
    fireEvent.click(botao("Ficção científica")!);
    expect(titulos(screen.getByRole("list", { name: "Ambientes" }))).toEqual(["Ambient Spaceship Hums"]);

    fireEvent.click(botao("Músicas")!);
    fireEvent.click(botao("Medieval")!);
    expect(titulos(screen.getByRole("list", { name: "Músicas" })))
      .toEqual(["Cathedral in the Forest", "Clash Defiant", "Achaidh Cheide", "Darkest Child"]);
    expect(screen.getByRole("group", { name: "Momento" })).toBeTruthy();
    fireEvent.click(botao("Interior")!);
    expect(titulos(screen.getByRole("list", { name: "Músicas" }))).toEqual(["Achaidh Cheide"]);
    expect(botao("Combate")!.disabled).toBe(true);
    expect(botao("Taverna / Festa")!.disabled).toBe(false);

    // Cada estilo guarda o próprio filtro.
    fireEvent.click(botao("Moderno")!);
    expect(titulos(screen.getByRole("list", { name: "Músicas" }))).toEqual(["Darkest Child", "Cut and Run"]);
    expect(botao("Interior")).toBeNull();
    fireEvent.click(botao("Medieval")!);
    expect(botao("Interior")!.getAttribute("aria-pressed")).toBe("true");
  });

  it("faixa sem Cenário serve em qualquer lugar e mostra só o Momento", () => {
    render(<MusicaDoPainel musica={sala()} narrator />);
    fireEvent.click(botao("Músicas")!);
    const clash = screen.getByRole("button", { name: "Tocar Clash Defiant" }).closest("li")!;
    expect(Array.from(clash.querySelectorAll(".musica__rotulo"), (r) => r.textContent)).toEqual(["Combate"]);
  });

  it("o Narrador toca cada faixa na camada do seu tipo e controla as duas", () => {
    const m = tocandoAs2();
    render(<MusicaDoPainel musica={m} narrator />);
    fireEvent.click(screen.getByRole("button", { name: "Tocar Loopable Dungeon Ambience" }));
    expect(m.ambiente.tocar).toHaveBeenCalledWith("loopable-dungeon-ambience");
    fireEvent.click(screen.getByRole("button", { name: "Músicas" }));
    fireEvent.click(screen.getByRole("button", { name: "Tocar Cathedral in the Forest" }));
    expect(m.musica.tocar).toHaveBeenCalledWith("cathedral-in-the-forest");
    expect(m.ambiente.tocar).toHaveBeenCalledTimes(1);

    const quadroAmbiente = screen.getByRole("region", { name: "Ambiente" });
    const quadroMusica = screen.getByRole("region", { name: "Música" });
    expect(within(quadroAmbiente).getByText("Dungeon Ambience")).toBeTruthy();
    expect(within(quadroMusica).getByText("1:15 / 2:14")).toBeTruthy();
    fireEvent.click(within(quadroAmbiente).getByRole("button", { name: "Pausar" }));
    expect(m.ambiente.pausar).toHaveBeenCalled();
    expect(m.musica.pausar).not.toHaveBeenCalled();
    fireEvent.click(within(quadroMusica).getByRole("button", { name: "Parar" }));
    expect(m.musica.parar).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("switch", { name: "Repetir ambiente" }));
    expect(m.ambiente.mudarRepetir).toHaveBeenCalledWith(false);
  });

  it("o jogador vê as duas camadas com o crédito, sem controles de tocar nem biblioteca", () => {
    render(<MusicaDoPainel musica={tocandoAs2()} narrator={false} />);
    const quadroMusica = screen.getByRole("region", { name: "Música" });
    expect(within(quadroMusica).getByText("Achaidh Cheide")).toBeTruthy();
    expect(within(quadroMusica).getByText("Taverna / Festa")).toBeTruthy();
    expect(within(quadroMusica).getByRole("link", { name: "CC BY 4.0" }).getAttribute("href"))
      .toBe("https://creativecommons.org/licenses/by/4.0/");
    const quadroAmbiente = screen.getByRole("region", { name: "Ambiente" });
    expect(within(quadroAmbiente).getByText("Masmorra / Caverna")).toBeTruthy();
    expect(within(quadroAmbiente).getByRole("link", { name: "CC0" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^(Tocar|Pausar|Continuar|Parar)/ })).toBeNull();
    expect(screen.queryByRole("region", { name: "Biblioteca" })).toBeNull();
  });

  it("sem som, cada camada avisa que nada toca", () => {
    render(<MusicaDoPainel musica={sala()} narrator={false} />);
    expect(screen.getByText("Nenhum ambiente tocando.")).toBeTruthy();
    expect(screen.getByText("Nenhuma música tocando.")).toBeTruthy();
  });

  it("faixa terminada sem repetir mostra 'Terminou' e 'Tocar de novo'", () => {
    const m = sala({ musica: camada("musica", { faixaAtual: por("achaidh-cheide"), estado: { ...estado("achaidh-cheide"), repetir: false },
      posicao: () => ({ segundos: 134, terminou: true }) }) });
    render(<MusicaDoPainel musica={m} narrator />);
    const quadro = screen.getByRole("region", { name: "Música" });
    expect(within(quadro).getByText("Terminou")).toBeTruthy();
    fireEvent.click(within(quadro).getByRole("button", { name: "Tocar de novo" }));
    expect(m.musica.continuar).toHaveBeenCalled();
  });

  it("volume de cada camada, silenciar tudo e 'Ativar som' com o som bloqueado", () => {
    const m = { ...tocandoAs2(), bloqueado: true };
    render(<MusicaDoPainel musica={m} narrator={false} />);
    fireEvent.change(screen.getByRole("slider", { name: "Volume do ambiente" }), { target: { value: "20" } });
    expect(m.ambiente.mudarVolume).toHaveBeenCalledWith(0.2);
    expect(m.musica.mudarVolume).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("slider", { name: "Volume da música" }), { target: { value: "90" } });
    expect(m.musica.mudarVolume).toHaveBeenCalledWith(0.9);
    fireEvent.click(screen.getByRole("button", { name: "Silenciar" }));
    expect(m.silenciar).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Ativar som" }));
    expect(m.ativarSom).toHaveBeenCalled();
  });
});
