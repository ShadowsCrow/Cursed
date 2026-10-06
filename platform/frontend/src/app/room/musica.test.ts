import { describe, expect, it } from "vitest";

import { diferencaDoRelogio, minutos, opcaoDisponivel, passaNoFiltro, posicaoEsperada, type FaixaDeMusica } from "./musica";

const faixa = (id: string, momento: string, cenario: string): FaixaDeMusica => ({
  id, tipo: "musica", estilos: ["Medieval"], titulo: id, autor: "A", licenca: "CC0", licenca_url: "", origem_url: "", arquivo: `/musica/${id}.ogg`,
  duracao_s: 100, momento, cenario, sem_emenda: false,
});

const biblioteca = [
  faixa("clash", "Combate", "Medieval"),
  faixa("taverna", "Taverna / Festa", "Medieval"),
  faixa("masmorra-1", "Exploração / Viagem", "Masmorra / Caverna"),
  faixa("masmorra-2", "Exploração / Viagem", "Masmorra / Caverna"),
  faixa("floresta", "Mistério", "Floresta / Natureza"),
];

describe("posição esperada da música", () => {
  const alterada_em = "2026-10-03T20:00:00.000Z";
  const inicio = Date.parse(alterada_em);

  it("soma o tempo passado desde a última mudança, no relógio do servidor", () => {
    expect(posicaoEsperada({ tocando: true, posicao_ms: 5000, repetir: true, alterada_em }, 100, inicio + 30_000, 0))
      .toEqual({ segundos: 35, terminou: false });
    // Relógio deste navegador 10 s atrasado em relação ao servidor: a diferença compensa.
    expect(posicaoEsperada({ tocando: true, posicao_ms: 0, repetir: true, alterada_em }, 100, inicio + 20_000, 10_000))
      .toEqual({ segundos: 30, terminou: false });
  });

  it("parada, fica na posição guardada", () => {
    expect(posicaoEsperada({ tocando: false, posicao_ms: 42_000, repetir: false, alterada_em }, 100, inicio + 60_000, 0))
      .toEqual({ segundos: 42, terminou: false });
  });

  it("com repetir dá a volta; sem repetir termina no fim", () => {
    expect(posicaoEsperada({ tocando: true, posicao_ms: 0, repetir: true, alterada_em }, 100, inicio + 130_000, 0))
      .toEqual({ segundos: 30, terminou: false });
    expect(posicaoEsperada({ tocando: true, posicao_ms: 0, repetir: false, alterada_em }, 100, inicio + 130_000, 0))
      .toEqual({ segundos: 100, terminou: true });
  });

  it("diferença do relógio vem do agora da resposta; sem ele, zero", () => {
    expect(diferencaDoRelogio("2026-10-03T20:00:05.000Z", inicio)).toBe(5000);
    expect(diferencaDoRelogio(undefined, inicio)).toBe(0);
    expect(diferencaDoRelogio("lixo", inicio)).toBe(0);
  });
});

describe("filtros da biblioteca", () => {
  it("combina Momento e Cenário", () => {
    expect(biblioteca.filter((f) => passaNoFiltro(f, { momento: null, cenario: "Masmorra / Caverna" })).map((f) => f.id))
      .toEqual(["masmorra-1", "masmorra-2"]);
    expect(biblioteca.filter((f) => passaNoFiltro(f, { momento: "Combate", cenario: "Medieval" })).map((f) => f.id))
      .toEqual(["clash"]);
  });

  it("desativa a opção sem faixa que combine com o outro filtro", () => {
    const filtro = { momento: null, cenario: "Masmorra / Caverna" };
    expect(opcaoDisponivel(biblioteca, "momento", "Exploração / Viagem", filtro)).toBe(true);
    expect(opcaoDisponivel(biblioteca, "momento", "Combate", filtro)).toBe(false);
    // O próprio filtro escolhido não restringe as opções do mesmo campo.
    expect(opcaoDisponivel(biblioteca, "cenario", "Medieval", filtro)).toBe(true);
    expect(opcaoDisponivel(biblioteca, "cenario", "Cidade / Vila", { momento: null, cenario: null })).toBe(false);
  });

  it("formata minutos", () => {
    expect(minutos(75)).toBe("1:15");
    expect(minutos(376.9)).toBe("6:16");
  });
});
