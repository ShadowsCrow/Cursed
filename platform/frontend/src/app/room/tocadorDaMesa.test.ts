import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FaixaDeMusica, Posicao } from "./musica";
import { TocadorDaMesa, type AlvoDoTocador } from "./tocadorDaMesa";

class AudioFalso {
  paused = true;
  currentTime = 0;
  readyState = 4;
  volume = 1;
  loop = false;
  preload = "";
  bloquear = false;
  descartado = false;
  constructor(readonly src: string) {}
  play() {
    if (this.bloquear) return Promise.reject(new DOMException("sem gesto", "NotAllowedError"));
    this.paused = false;
    return Promise.resolve();
  }
  pause() { this.paused = true; }
  addEventListener() {}
  removeAttribute() { this.descartado = true; }
  load() {}
}

const faixa = (id: string): FaixaDeMusica => ({
  id, tipo: "ambiente", estilos: ["Medieval"], titulo: id, autor: "A", licenca: "CC0", licenca_url: "", origem_url: "", arquivo: `/musica/${id}.ogg`,
  duracao_s: 100, momento: "Ambiente", cenario: "Medieval", sem_emenda: true,
});

function alvo(id: string | null, tocando: boolean, posicao: Partial<Posicao> = {}, repetir = true): AlvoDoTocador {
  return { faixa: id ? faixa(id) : null, tocando, repetir, posicao: () => ({ segundos: 0, terminou: false, ...posicao }) };
}

describe("tocador da mesa", () => {
  let audios: AudioFalso[];
  let bloqueios: boolean[];
  let tocador: TocadorDaMesa;
  let bloquearNovos: boolean;

  beforeEach(() => {
    vi.useFakeTimers();
    audios = [];
    bloqueios = [];
    bloquearNovos = false;
    tocador = new TocadorDaMesa((b) => bloqueios.push(b), (endereco) => {
      const audio = new AudioFalso(endereco);
      audio.bloquear = bloquearNovos;
      audios.push(audio);
      return audio as unknown as HTMLAudioElement;
    });
    tocador.definirVolume(0.6);
  });
  afterEach(() => { tocador.destruir(); vi.useRealTimers(); });

  it("toca a faixa na posição esperada e sobe até o volume da pessoa", async () => {
    tocador.sincronizar(alvo("masmorra", true, { segundos: 30 }));
    expect(audios).toHaveLength(1);
    expect(audios[0]!.src).toBe("/musica/masmorra.ogg");
    expect(audios[0]!.currentTime).toBe(30);
    expect(audios[0]!.loop).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(audios[0]!.paused).toBe(false);
    expect(audios[0]!.volume).toBeCloseTo(0.6);
    expect(bloqueios).toEqual([false]);
  });

  it("na troca de faixa, a anterior baixa enquanto a nova sobe, e no fim só a nova toca", async () => {
    tocador.sincronizar(alvo("masmorra", true));
    await vi.advanceTimersByTimeAsync(2000);
    tocador.sincronizar(alvo("clash", true));
    await vi.advanceTimersByTimeAsync(750);
    const [anterior, nova] = audios;
    expect(anterior!.volume).toBeGreaterThan(0.1);
    expect(anterior!.volume).toBeLessThan(0.5);
    expect(nova!.volume).toBeGreaterThan(0.1);
    expect(nova!.volume).toBeLessThan(0.5);
    await vi.advanceTimersByTimeAsync(1000);
    expect(anterior!.paused).toBe(true);
    expect(anterior!.descartado).toBe(true);
    expect(nova!.paused).toBe(false);
    expect(nova!.volume).toBeCloseTo(0.6);
  });

  it("pausa e continua de forma suave, na posição guardada", async () => {
    tocador.sincronizar(alvo("masmorra", true));
    await vi.advanceTimersByTimeAsync(2000);
    tocador.sincronizar(alvo("masmorra", false, { segundos: 42 }));
    await vi.advanceTimersByTimeAsync(200);
    expect(audios[0]!.paused).toBe(false);
    expect(audios[0]!.volume).toBeLessThan(0.6);
    await vi.advanceTimersByTimeAsync(300);
    expect(audios[0]!.paused).toBe(true);
    tocador.sincronizar(alvo("masmorra", true, { segundos: 42 }));
    expect(audios).toHaveLength(1);
    expect(audios[0]!.currentTime).toBe(42);
    await vi.advanceTimersByTimeAsync(500);
    expect(audios[0]!.paused).toBe(false);
    expect(audios[0]!.volume).toBeCloseTo(0.6);
  });

  it("corrige a posição só quando sai mais de 1,5 s do compasso", async () => {
    tocador.sincronizar(alvo("masmorra", true, { segundos: 10 }));
    await vi.advanceTimersByTimeAsync(2000);
    audios[0]!.currentTime = 11;
    tocador.sincronizar(alvo("masmorra", true, { segundos: 12 }));
    expect(audios[0]!.currentTime).toBe(11);
    tocador.sincronizar(alvo("masmorra", true, { segundos: 14 }));
    expect(audios[0]!.currentTime).toBe(14);
  });

  it("faixa terminada sem repetir não toca; parar descarta", async () => {
    tocador.sincronizar(alvo("clash", true, { segundos: 100, terminou: true }, false));
    expect(audios).toHaveLength(0);
    tocador.sincronizar(alvo("masmorra", true));
    await vi.advanceTimersByTimeAsync(2000);
    tocador.sincronizar(alvo(null, false));
    await vi.advanceTimersByTimeAsync(500);
    expect(audios[0]!.paused).toBe(true);
    expect(audios[0]!.descartado).toBe(true);
  });

  it("som bloqueado pelo navegador avisa, e o gesto da pessoa libera", async () => {
    bloquearNovos = true;
    tocador.sincronizar(alvo("masmorra", true, { segundos: 5 }));
    await vi.advanceTimersByTimeAsync(10);
    expect(bloqueios).toEqual([true]);
    expect(audios[0]!.paused).toBe(true);
    audios[0]!.bloquear = false;
    tocador.liberar();
    await vi.advanceTimersByTimeAsync(500);
    expect(bloqueios).toEqual([true, false]);
    expect(audios[0]!.paused).toBe(false);
  });

  it("volume e silenciar valem na hora", async () => {
    tocador.sincronizar(alvo("masmorra", true));
    await vi.advanceTimersByTimeAsync(2000);
    tocador.definirVolume(0.2);
    expect(audios[0]!.volume).toBeCloseTo(0.2);
    tocador.definirVolume(0);
    expect(audios[0]!.volume).toBe(0);
  });
});
