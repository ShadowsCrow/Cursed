import { describe, expect, it, vi } from "vitest";

// PixiJS de mentira que registra os círculos: o jsdom não desenha WebGL.
vi.mock("pixi.js", () => {
  class Ponto { x = 0; y = 0; set(x: number, y = x) { this.x = x; this.y = y; } }
  class Graphics {
    circulos: { raio: number; tipo: string; alpha?: number }[] = [];
    pivot = new Ponto(); position = new Ponto(); scale = new Ponto(); alpha = 1;
    private ultimo = 0;
    circle(_x: number, _y: number, raio: number) { this.ultimo = raio; return this; }
    fill(estilo: { alpha?: number }) { this.circulos.push({ raio: this.ultimo, tipo: "halo", alpha: estilo.alpha }); return this; }
    stroke() { this.circulos.push({ raio: this.ultimo, tipo: "aro" }); return this; }
  }
  return { Graphics };
});

import { aplicarPulso, criarBrilhoDaVez, PERIODO_DO_BRILHO, pulsoDoBrilho, tokensDaVez } from "./brilhoDaVez";
import type { CombateDoTurno, ParticipanteDoTurno } from "./useModoDeTurno";

type Halo = ReturnType<typeof criarBrilhoDaVez> & { circulos: { raio: number; tipo: string }[] };

const participante = (id: string, token_ids: string[]): ParticipanteDoTurno => ({
  id, personagem_id: id, nome: id, token_id: token_ids[0], tokens: token_ids.length, token_ids, rolou: true, total: 10,
  meu: false, do_jogador: false, fora_da_cena: false,
});

describe("brilho do token da vez (D8e)", () => {
  it("é um halo em degradê por fora do token, com um aro, centrado para pulsar no lugar", () => {
    const halo = criarBrilhoDaVez(48) as Halo;
    const raio = 48 / 2 - 3;
    const aneis = halo.circulos.filter((c) => c.tipo === "halo");
    expect(aneis).toHaveLength(6);
    expect(aneis.every((c) => c.raio > raio)).toBe(true);
    expect(halo.circulos.some((c) => c.tipo === "aro")).toBe(true);
    expect([halo.pivot.x, halo.position.x]).toEqual([24, 24]);
  });

  it("pulsa devagar: apagado no começo, aceso na metade do período e de volta ao fim", () => {
    expect(pulsoDoBrilho(0, false)).toEqual({ alpha: 0.45, escala: 1 });
    const meio = pulsoDoBrilho(PERIODO_DO_BRILHO / 2, false);
    expect(meio.alpha).toBeCloseTo(1);
    expect(meio.escala).toBeCloseTo(1.08);
    expect(pulsoDoBrilho(PERIODO_DO_BRILHO, false).alpha).toBeCloseTo(0.45);
  });

  it("com menos movimento pedido, fica parado", () => {
    expect(pulsoDoBrilho(0, true)).toEqual(pulsoDoBrilho(PERIODO_DO_BRILHO / 3, true));
  });

  it("aplica o pulso a todos os halos", () => {
    const halos = [criarBrilhoDaVez(48), criarBrilhoDaVez(96)];
    aplicarPulso(halos, PERIODO_DO_BRILHO / 2, false);
    expect(halos.map((h) => h.alpha.toFixed(2))).toEqual(["1.00", "1.00"]);
    expect(halos[1]!.scale.x).toBeCloseTo(1.08);
  });

  it("brilham só os tokens de quem está na vez, durante a disputa", () => {
    const combate: CombateDoTurno = {
      id: "c", estado: "combate", rodada: 1, vez_participante_id: "goblin-2",
      participantes: [participante("goblin", ["t-a", "t-b"]), participante("goblin-2", ["t-c"])],
    };
    expect(tokensDaVez(combate)).toEqual(["t-c"]);
    expect(tokensDaVez({ ...combate, vez_participante_id: "goblin" })).toEqual(["t-a", "t-b"]);
    expect(tokensDaVez({ ...combate, estado: "iniciativa" })).toEqual([]);
    expect(tokensDaVez(null)).toEqual([]);
  });
});
