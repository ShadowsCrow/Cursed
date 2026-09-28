import { describe, expect, it } from "vitest";

import { estadoInicial, type EstadoAssistente } from "./modelo";
import { chaveRascunho, descartarRascunho, gravarRascunho, lerRascunho } from "./rascunho";

class Memoria implements Storage {
  private dados = new Map<string, string>();
  get length() { return this.dados.size; }
  clear() { this.dados.clear(); }
  getItem(chave: string) { return this.dados.get(chave) ?? null; }
  key(indice: number) { return [...this.dados.keys()][indice] ?? null; }
  removeItem(chave: string) { this.dados.delete(chave); }
  setItem(chave: string, valor: string) { this.dados.set(chave, valor); }
}

class Bloqueado extends Memoria {
  getItem(): string | null { throw new DOMException("bloqueado", "SecurityError"); }
  setItem(): void { throw new DOMException("cheio", "QuotaExceededError"); }
  removeItem(): void { throw new DOMException("bloqueado", "SecurityError"); }
}

function emAtributos(): EstadoAssistente {
  const estado = estadoInicial();
  estado.etapa = "atributos";
  estado.alcancada = "atributos";
  estado.ficha.personagem = { ...estado.ficha.personagem, nome: "Lia", raca: "Elfo", classe: "Mago", arquetipo: "Mutante Arcano" };
  estado.ficha.atributos = { Vigor: 3 };
  estado.foraDoPadrao.pericias = true;
  return estado;
}

describe("rascunho do assistente", () => {
  it("usa uma chave por mesa e usuário, com versão", () => {
    expect(chaveRascunho("mesa-1", "ana")).toBe("cursed:rascunho-personagem:v1:mesa-1:ana");
  });

  it("retoma o que foi gravado", () => {
    const armazenamento = new Memoria();
    expect(gravarRascunho(armazenamento, "mesa-1", "ana", emAtributos())).toBe(true);
    expect(lerRascunho(armazenamento, "mesa-1", "ana")).toEqual(emAtributos());
  });

  it("descartar remove o rascunho", () => {
    const armazenamento = new Memoria();
    gravarRascunho(armazenamento, "mesa-1", "ana", emAtributos());
    descartarRascunho(armazenamento, "mesa-1", "ana");
    expect(lerRascunho(armazenamento, "mesa-1", "ana")).toBeNull();
    expect(armazenamento.length).toBe(0);
  });

  it("outra mesa e outro usuário não veem o rascunho", () => {
    const armazenamento = new Memoria();
    gravarRascunho(armazenamento, "mesa-1", "ana", emAtributos());
    expect(lerRascunho(armazenamento, "mesa-2", "ana")).toBeNull();
    expect(lerRascunho(armazenamento, "mesa-1", "bia")).toBeNull();
  });

  it("esquema desconhecido ou corrompido é ignorado, sem lançar", () => {
    const armazenamento = new Memoria();
    const chave = chaveRascunho("mesa-1", "ana");
    armazenamento.setItem(chave, JSON.stringify({ versao_esquema: 2, estado: emAtributos() }));
    expect(lerRascunho(armazenamento, "mesa-1", "ana")).toBeNull();
    armazenamento.setItem(chave, "{não é json");
    expect(lerRascunho(armazenamento, "mesa-1", "ana")).toBeNull();
    armazenamento.setItem(chave, JSON.stringify({ versao_esquema: 1, estado: { etapa: "voar", ficha: {} } }));
    expect(lerRascunho(armazenamento, "mesa-1", "ana")).toBeNull();
  });

  it("armazenamento bloqueado não quebra: nada é oferecido nem gravado", () => {
    const armazenamento = new Bloqueado();
    expect(gravarRascunho(armazenamento, "mesa-1", "ana", emAtributos())).toBe(false);
    expect(lerRascunho(armazenamento, "mesa-1", "ana")).toBeNull();
    expect(() => descartarRascunho(armazenamento, "mesa-1", "ana")).not.toThrow();
    expect(lerRascunho(null, "mesa-1", "ana")).toBeNull();
    expect(gravarRascunho(null, "mesa-1", "ana", emAtributos())).toBe(false);
  });
});
