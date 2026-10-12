import { describe, expect, it } from "vitest";

import { custosDaCarta } from "./cardFormat";

const COMPLETA = { custo_aprendizado: 22, potencia_uso: 11 };
const CALCULADOS = { grau: "simples", descansos_minimos: 4, custo_uso_framework: 2 };

describe("custosDaCarta — custos reservados ao Narrador (redesenhar-aba-cartas)", () => {
  it("mostra os quatro custos ao Narrador, com Não definido quando o valor falta", () => {
    expect(custosDaCarta("magia", COMPLETA, { narrador: true, calculados: CALCULADOS })).toEqual([
      { label: "Custo de aprendizado", value: "22" },
      { label: "Descansos mínimos", value: "4" },
      { label: "Potência de uso", value: "11" },
      { label: "Custo de uso", value: "2" },
    ]);
    expect(custosDaCarta("magia", COMPLETA, { narrador: true })).toEqual([
      { label: "Custo de aprendizado", value: "22" },
      { label: "Descansos mínimos", value: "Não definido" },
      { label: "Potência de uso", value: "11" },
      { label: "Custo de uso", value: "Não definido" },
    ]);
  });

  it("o jogador vê só a Potência e o Custo de uso, mesmo que a chave reservada chegue", () => {
    expect(custosDaCarta("habilidade", { ...COMPLETA, descansos_minimos: 4 }, { calculados: CALCULADOS })).toEqual([
      { label: "Potência de uso", value: "11" },
      { label: "Custo de uso", value: "2" },
    ]);
    expect(custosDaCarta("habilidade", {}, { narrador: false })).toEqual([
      { label: "Potência de uso", value: "Não definido" },
      { label: "Custo de uso", value: "Não definido" },
    ]);
  });

  it("o Custo de Uso registrado pelo Narrador prevalece sobre o do Framework (adaptar-cartas-ao-framework)", () => {
    expect(custosDaCarta("habilidade", { ...COMPLETA, custo_uso: 3 }, { calculados: CALCULADOS }).at(-1))
      .toEqual({ label: "Custo de uso", value: "3" });
  });

  it("custos adicionais aparecem para os dois papéis; itens e efeitos não têm custos", () => {
    const adicional = { custos_adicionais: [{ recurso: "Exaustão", valor: 1 }] };
    expect(custosDaCarta("magia", adicional).at(-1)).toEqual({ label: "Exaustão", value: "1" });
    expect(custosDaCarta("item", COMPLETA, { narrador: true })).toEqual([]);
    expect(custosDaCarta("efeito", COMPLETA)).toEqual([]);
  });
});
