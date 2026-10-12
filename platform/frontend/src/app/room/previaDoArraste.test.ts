import { describe, expect, it, vi } from "vitest";

// PixiJS de mentira que registra o que foi desenhado: o jsdom não desenha WebGL.
vi.mock("pixi.js", () => {
  class Graphics {
    comandos: string[] = [];
    cores: number[] = [];
    moveTo() { this.comandos.push("moveTo"); return this; }
    lineTo() { this.comandos.push("lineTo"); return this; }
    roundRect() { this.comandos.push("roundRect"); return this; }
    fill() { return this; }
    stroke(estilo: { color: number }) { this.cores.push(estilo.color); return this; }
    destroy() {}
  }
  class Text {
    text: string; style: { fill: number }; width = 80; height = 16;
    anchor = { set: () => undefined }; position = { set: () => undefined };
    constructor({ text, style }: { text: string; style: { fill: number } }) { this.text = text; this.style = style; }
    destroy() {}
  }
  class Container {
    filhos: unknown[] = [];
    escala = 1;
    scale = { set: (valor: number) => { this.escala = valor; } };
    position = { set: () => undefined };
    addChild(...novos: unknown[]) { this.filhos.push(...novos); }
    removeChildren() { const antigos = this.filhos; this.filhos = []; return antigos; }
    destroy() {}
  }
  return { Container, Graphics, Text };
});

import { Container, Graphics, Text } from "pixi.js";
import { custoEmMetros, medirArraste } from "./medidaDoArraste";
import { COR_DA_PREVIA, desenharRastro, FONTE_DA_LEGENDA } from "./rastroDoArraste";
import type { CombateDoTurno, ParticipanteDoTurno } from "./useModoDeTurno";

const participante = (id: string, parcial: Partial<ParticipanteDoTurno> = {}): ParticipanteDoTurno => ({
  id, personagem_id: id, nome: id, token_id: `t-${id}`, tokens: 1, token_ids: [`t-${id}`], rolou: true, total: 10, meu: false, do_jogador: true,
  fora_da_cena: false, ...parcial,
});
const combate = (gasto: number, limite = 9): CombateDoTurno => ({
  id: "c", estado: "combate", rodada: 1, vez_participante_id: "lion",
  participantes: [participante("lion", { meu: true, movimento: { gasto, limite, correndo: false } }), participante("goblin", { do_jogador: false })],
});
const medir = (parcial: Partial<Parameters<typeof medirArraste>[0]> = {}) => medirArraste({
  combate: combate(0), tokenId: "t-lion", narrador: false, livre: false, origem: { x: 0, y: 0 }, destino: { x: 4, y: 0 }, ...parcial,
});

describe("medida do arraste no modo turno", () => {
  it("custa 1 m por casa, inclusive na diagonal", () => {
    expect(custoEmMetros({ x: 2, y: 2 }, { x: 5, y: 4 })).toBe(3);
    expect(custoEmMetros({ x: 5, y: 5 }, { x: 1, y: 1 })).toBe(4);
  });

  it("na vez: quanto sobra, ou quanto falta em vermelho", () => {
    expect(medir()).toEqual({ texto: "4 m · restam 5 m", excede: false });
    expect(medir({ combate: combate(4, 9), destino: { x: 7, y: 3 } })).toEqual({ texto: "7 m · faltam 2 m", excede: true });
    expect(medir({ combate: combate(0), destino: { x: 9, y: 0 } })).toEqual({ texto: "9 m · restam 0 m", excede: false });
  });

  it("movimento livre, fora da vez do Narrador e fora da vez do jogador", () => {
    expect(medir({ narrador: true, livre: true })).toEqual({ texto: "4 m · livre", excede: false });
    expect(medir({ narrador: true, tokenId: "t-goblin" })).toEqual({ texto: "Fora da vez: ligue o Movimento livre", excede: true });
    expect(medir({ narrador: true, livre: true, tokenId: "t-goblin" })).toEqual({ texto: "4 m · livre", excede: false });
    expect(medir({ tokenId: "t-goblin" })).toEqual({ texto: "Não é a sua vez", excede: true });
  });

  it("o token próprio da mesma ficha tem a vez dele, e o grupo não (D8d)", () => {
    // Bug relatado pelo usuário (2026-10-05): o Largato-macaco 2, na vez dele, aparecia "Fora da vez".
    const goblins: CombateDoTurno = {
      id: "c", estado: "combate", rodada: 1, vez_participante_id: "goblin-2",
      participantes: [
        participante("goblin", { do_jogador: false, tokens: 2, token_ids: ["t-goblin-a", "t-goblin-b"] }),
        participante("goblin-2", { personagem_id: "goblin", do_jogador: false, token_ids: ["t-goblin-c"],
          movimento: { gasto: 0, limite: 6, correndo: false } }),
      ],
    };
    expect(medir({ combate: goblins, narrador: true, tokenId: "t-goblin-c" })).toEqual({ texto: "4 m · restam 2 m", excede: false });
    expect(medir({ combate: goblins, narrador: true, tokenId: "t-goblin-b" }))
      .toEqual({ texto: "Fora da vez: ligue o Movimento livre", excede: true });
  });

  it("sem prévia fora da disputa, na iniciativa e para quem não participa", () => {
    expect(medir({ combate: null })).toBeNull();
    expect(medir({ combate: { ...combate(0), estado: "iniciativa" } })).toBeNull();
    // Na iniciativa, o Narrador vê o aviso, ou os metros com o movimento livre.
    expect(medir({ combate: { ...combate(0), estado: "iniciativa" }, narrador: true }))
      .toEqual({ texto: "Fora da vez: ligue o Movimento livre", excede: true });
    expect(medir({ combate: { ...combate(0), estado: "iniciativa" }, narrador: true, livre: true }))
      .toEqual({ texto: "4 m · livre", excede: false });
    expect(medir({ tokenId: "t-bau" })).toBeNull();
  });
});

describe("desenho da prévia", () => {
  it("contorno e linha tracejados e a legenda; dourado quando cabe", () => {
    const camada = new Container() as unknown as Container & { filhos: unknown[] };
    desenharRastro(camada, { x: 0, y: 0 }, { x: 4, y: 0 }, 1, { texto: "4 m · restam 5 m", excede: false });
    const [contorno, linha, legenda] = camada.filhos as [Graphics & { comandos: string[]; cores: number[] },
      Graphics & { comandos: string[] }, Container & { filhos: unknown[] }];
    expect(camada.filhos).toHaveLength(3);
    // Tracejado: vários segmentos, não uma linha só.
    expect(contorno.comandos.filter((c) => c === "moveTo").length).toBeGreaterThan(4);
    expect(linha.comandos.filter((c) => c === "moveTo").length).toBeGreaterThan(1);
    expect(contorno.cores).toEqual([COR_DA_PREVIA.cabe]);
    const texto = legenda.filhos[1] as Text & { style: { fontSize: number } };
    expect(texto.text).toBe("4 m · restam 5 m");
    expect(texto.style.fontSize).toBe(FONTE_DA_LEGENDA);
  });

  it("a legenda tem o mesmo tamanho na tela em qualquer zoom", () => {
    const camada = new Container() as unknown as Container & { filhos: unknown[] };
    desenharRastro(camada, { x: 0, y: 0 }, { x: 4, y: 0 }, 1, { texto: "4 m · restam 5 m", excede: false }, 0.5);
    expect((camada.filhos[2] as unknown as { escala: number }).escala).toBe(2);
    desenharRastro(camada, { x: 0, y: 0 }, { x: 4, y: 0 }, 1, { texto: "4 m · restam 5 m", excede: false }, 2);
    expect((camada.filhos[2] as unknown as { escala: number }).escala).toBe(0.5);
  });

  it("vermelho quando passa do saldo, e some sem medida", () => {
    const camada = new Container() as unknown as Container & { filhos: unknown[] };
    desenharRastro(camada, { x: 0, y: 0 }, { x: 7, y: 0 }, 1, { texto: "7 m · faltam 2 m", excede: true });
    const legenda = camada.filhos[2] as Container & { filhos: unknown[] };
    expect((legenda.filhos[1] as Text).style.fill).toBe(COR_DA_PREVIA.excede);
    desenharRastro(camada, { x: 0, y: 0 }, { x: 0, y: 0 }, 1, null);
    expect(camada.filhos).toHaveLength(0);
  });
});
