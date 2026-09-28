/**
 * Rascunho do assistente no navegador (design D5 de criacao-guiada-e-nova-estetica).
 *
 * É conveniência do jogador, não dado da mesa: fica no `localStorage`, por mesa e por usuário,
 * e nunca vai ao servidor. Todo acesso passa por `try/catch`; armazenamento bloqueado, rascunho
 * corrompido ou de esquema desconhecido simplesmente não é oferecido. O rascunho tem o texto do
 * jogador e é removido ao concluir e ao descartar.
 */

import { ETAPAS, ehEtapa, indiceDa, type EstadoAssistente, type FichaRascunho } from "./modelo";

export const VERSAO_ESQUEMA = 1;

interface RascunhoGravado {
  versao_esquema: typeof VERSAO_ESQUEMA;
  atualizado_em: string;
  estado: EstadoAssistente;
}

export function chaveRascunho(mesaId: string, usuarioId: string): string {
  return `cursed:rascunho-personagem:v1:${mesaId}:${usuarioId}`;
}

/** `localStorage` quando disponível; `null` quando o navegador bloqueia o acesso. */
export function armazenamentoLocal(): Storage | null {
  try {
    const armazenamento = window.localStorage;
    return armazenamento ?? null;
  } catch {
    return null;
  }
}

const texto = (valor: unknown): string => (typeof valor === "string" ? valor : "");

function valores(bruto: unknown): Record<string, number | undefined> {
  const saida: Record<string, number | undefined> = {};
  if (!bruto || typeof bruto !== "object") return saida;
  for (const [nome, valor] of Object.entries(bruto)) {
    if (typeof valor === "number" && Number.isFinite(valor)) saida[nome] = valor;
  }
  return saida;
}

function fichaDe(bruta: unknown): FichaRascunho | null {
  if (!bruta || typeof bruta !== "object") return null;
  const ficha = bruta as Record<string, unknown>;
  const personagem = (ficha.personagem ?? {}) as Record<string, unknown>;
  const personalidade: Record<string, string> = {};
  for (const [chave, valor] of Object.entries((ficha.personalidade ?? {}) as Record<string, unknown>)) {
    if (typeof valor === "string") personalidade[chave] = valor;
  }
  return {
    personagem: {
      nome: texto(personagem.nome), idade: texto(personagem.idade), sexo: texto(personagem.sexo),
      raca: texto(personagem.raca), altura: texto(personagem.altura),
      fora_da_media: personagem.fora_da_media === "acima" || personagem.fora_da_media === "abaixo" ? personagem.fora_da_media : "",
      tamanho: texto(personagem.tamanho), classe: texto(personagem.classe), arquetipo: texto(personagem.arquetipo),
    },
    atributos: valores(ficha.atributos),
    pericias: valores(ficha.pericias),
    personalidade,
  };
}

function estadoDe(bruto: unknown): EstadoAssistente | null {
  if (!bruto || typeof bruto !== "object") return null;
  const estado = bruto as Record<string, unknown>;
  const ficha = fichaDe(estado.ficha);
  if (!ficha || !ehEtapa(estado.etapa)) return null;
  const alcancada = ehEtapa(estado.alcancada) && indiceDa(estado.alcancada) >= indiceDa(estado.etapa) ? estado.alcancada : estado.etapa;
  const fora = (estado.foraDoPadrao ?? {}) as Record<string, unknown>;
  return {
    etapa: estado.etapa,
    alcancada,
    ficha,
    foraDoPadrao: { atributos: fora.atributos === true, pericias: fora.pericias === true },
  };
}

export function lerRascunho(armazenamento: Storage | null, mesaId: string, usuarioId: string): EstadoAssistente | null {
  if (!armazenamento) return null;
  try {
    const bruto = armazenamento.getItem(chaveRascunho(mesaId, usuarioId));
    if (!bruto) return null;
    const gravado = JSON.parse(bruto) as Partial<RascunhoGravado>;
    if (gravado?.versao_esquema !== VERSAO_ESQUEMA) return null;
    return estadoDe(gravado.estado);
  } catch {
    return null;
  }
}

export function gravarRascunho(armazenamento: Storage | null, mesaId: string, usuarioId: string, estado: EstadoAssistente): boolean {
  if (!armazenamento) return false;
  try {
    const gravado: RascunhoGravado = { versao_esquema: VERSAO_ESQUEMA, atualizado_em: new Date().toISOString(), estado };
    armazenamento.setItem(chaveRascunho(mesaId, usuarioId), JSON.stringify(gravado));
    return true;
  } catch {
    return false;
  }
}

export function descartarRascunho(armazenamento: Storage | null, mesaId: string, usuarioId: string): void {
  if (!armazenamento) return;
  try {
    armazenamento.removeItem(chaveRascunho(mesaId, usuarioId));
  } catch {
    // Armazenamento indisponível: não há o que remover.
  }
}

/** Resumo para oferecer a retomada ("Lia, parado na etapa Atributos"). */
export function resumoDoRascunho(estado: EstadoAssistente): { nome: string; etapa: number; total: number } {
  return { nome: estado.ficha.personagem.nome.trim(), etapa: indiceDa(estado.etapa) + 1, total: ETAPAS.length };
}
