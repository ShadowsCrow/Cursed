/**
 * Música e ambiente da mesa (musica-da-sala): biblioteca em dois tipos, que tocam em duas camadas ao mesmo tempo
 * (ambiente, classificado por Cenário; música, por Momento e Cenário), e a posição esperada de cada faixa.
 *
 * O servidor guarda a faixa, se toca, a posição no momento da última mudança e esse momento, no relógio dele. Cada
 * navegador calcula onde a música deve estar agora: posição guardada + tempo passado, medido no relógio do servidor
 * (a diferença entre os relógios vem do `agora` de cada resposta). Com "Repetir", dá a volta pelo começo; sem ele, a
 * faixa termina.
 */
import type { components } from "../../api/generated/schema";

export type FaixaDeMusica = components["schemas"]["FaixaDeMusica"];
export type EstadoDaMusica = components["schemas"]["EstadoDaMusica"];
export type EstadoDaCamada = components["schemas"]["EstadoDaCamada"];
export type Camada = "ambiente" | "musica";
export const CAMADAS: readonly Camada[] = ["ambiente", "musica"];

/** Acima disso o navegador corrige a posição tocada (segundos). */
export const TOLERANCIA_S = 1.5;
/** Troca de faixa: a anterior baixa enquanto a nova sobe (ms). */
export const TRANSICAO_MS = 1500;
/** Pausar e continuar (ms). */
export const PAUSA_MS = 400;
/** Volume de cada camada, de cada pessoa, guardado neste navegador. */
export const CHAVE_VOLUME: Record<Camada, string> = {
  ambiente: "cursed:mesa:volume-do-ambiente",
  musica: "cursed:mesa:volume-da-musica",
};
export const CHAVE_MUSICA_SILENCIADA = "cursed:mesa:musica-silenciada";
/** Faixas favoritas da biblioteca, de cada pessoa, guardadas neste navegador (valem em todas as mesas). */
export const CHAVE_FAVORITAS = "cursed:musica:favoritas";
export const VOLUME_PADRAO: Record<Camada, number> = { ambiente: 0.5, musica: 0.6 };

export interface Posicao {
  /** Onde a faixa deve estar agora, em segundos. */
  segundos: number;
  /** A faixa passou do fim sem "Repetir". */
  terminou: boolean;
}

/**
 * Posição esperada da faixa do estado. `diferencaMs` é quanto o relógio do servidor está à frente deste
 * navegador; `agoraLocalMs` é `Date.now()`.
 */
export function posicaoEsperada(estado: Pick<EstadoDaCamada, "tocando" | "posicao_ms" | "repetir" | "alterada_em">,
  duracaoS: number, agoraLocalMs: number, diferencaMs: number): Posicao {
  let ms = estado.posicao_ms;
  if (estado.tocando && estado.alterada_em) {
    const desde = Date.parse(estado.alterada_em);
    if (Number.isFinite(desde)) ms += Math.max(0, agoraLocalMs + diferencaMs - desde);
  }
  const segundos = ms / 1000;
  if (duracaoS <= 0) return { segundos, terminou: false };
  if (segundos < duracaoS) return { segundos, terminou: false };
  if (estado.repetir) return { segundos: segundos % duracaoS, terminou: false };
  return { segundos: duracaoS, terminou: true };
}

/** Diferença entre o relógio do servidor (`agora` da resposta) e o deste navegador, no momento da chegada. */
export function diferencaDoRelogio(agoraDoServidor: string | undefined, agoraLocalMs: number): number {
  const servidor = agoraDoServidor ? Date.parse(agoraDoServidor) : NaN;
  return Number.isFinite(servidor) ? servidor - agoraLocalMs : 0;
}

export interface FiltroDeMusica {
  momento: string | null;
  cenario: string | null;
}

export function passaNoFiltro(faixa: FaixaDeMusica, filtro: FiltroDeMusica): boolean {
  return (!filtro.momento || faixa.momento === filtro.momento) && (!filtro.cenario || faixa.cenario === filtro.cenario);
}

/** Uma opção de filtro fica disponível se alguma faixa a tem e passa no outro filtro. */
export function opcaoDisponivel(faixas: FaixaDeMusica[], campo: "momento" | "cenario", valor: string,
  filtro: FiltroDeMusica): boolean {
  const outro = campo === "momento" ? { ...filtro, momento: null } : { ...filtro, cenario: null };
  return faixas.some((faixa) => faixa[campo] === valor && passaNoFiltro(faixa, outro));
}

/** Os valores da lista que alguma das faixas tem, na ordem da lista: o filtro só mostra o que existe ali. */
export function valoresPresentes(faixas: FaixaDeMusica[], campo: "momento" | "cenario", lista: string[]): string[] {
  return lista.filter((valor) => faixas.some((faixa) => faixa[campo] === valor));
}

/** 75 → "1:15". */
export function minutos(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
