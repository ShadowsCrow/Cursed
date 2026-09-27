import { describe, expect, it } from "vitest";

import { validarEquipar, type ItemGrade, type ParametrosGrade } from "./gridEngine";
import { equiparOuGuardar, guardarMochila } from "./mochila";

const P: ParametrosGrade = { forca: 3, tamanho: "medio" };
const item = (extra: Partial<ItemGrade> & Pick<ItemGrade, "id" | "nome" | "subtipo">): ItemGrade => ({
  largura: 1, altura: 1, coluna: null, linha: null, girado: false, equipado: false, ...extra,
});
const viagem = item({ id: "m1", nome: "Mochila de viagem", subtipo: "mochila", largura: 2, altura: 2, equipado: true,
  ampliacao: { linhas: 1, colunas: 0 } });
const bolsa = item({ id: "m2", nome: "Bolsa de cintura", subtipo: "mochila", ampliacao: { linhas: 0, colunas: 1 } });

describe("mochilas", () => {
  it("não deixa equipar uma segunda mochila", () => {
    expect(validarEquipar([viagem, bolsa], bolsa, 3)).toMatchObject({ ok: false, motivo: "peca_repetida" });
  });

  it("desequipar põe a mochila na grade como item carregado, se houver espaço", () => {
    const [mochila] = guardarMochila(P, [viagem], "m1");
    expect(mochila).toMatchObject({ equipado: false, coluna: 0, linha: 0 });
  });

  it("sem espaço, a mochila fica fora da grade esperando ser colocada ou equipada", () => {
    const bloco = item({ id: "b", nome: "Baú", subtipo: "outro", largura: 4, altura: 6, coluna: 0, linha: 0 });
    const resultado = guardarMochila(P, [viagem, bloco], "m1");
    expect(resultado.find((i) => i.id === "m1")).toMatchObject({ equipado: false, coluna: null, linha: null });
  });

  it("equipar tira a mochila da grade, porque equipada ela não ocupa célula", () => {
    const naGrade = { ...bolsa, coluna: 1, linha: 1 };
    expect(equiparOuGuardar(P, [naGrade], "m2", true)[0]).toMatchObject({ equipado: true, coluna: null, linha: null });
  });

  it("equipar outra mochila substitui a antiga, que vira item carregado já com a ampliação da nova", () => {
    const resultado = equiparOuGuardar(P, [viagem, { ...bolsa, coluna: 3, linha: 0 }], "m2", true);
    expect(resultado.find((i) => i.id === "m2")).toMatchObject({ equipado: true, coluna: null, linha: null });
    expect(resultado.find((i) => i.id === "m1")).toMatchObject({ equipado: false, coluna: 0, linha: 0 });
    expect(resultado.filter((i) => i.equipado)).toHaveLength(1);
  });

  it("outros itens só trocam o estado de equipado", () => {
    const espada = item({ id: "s", nome: "Espada", subtipo: "uma_mao", altura: 3, coluna: 0, linha: 0 });
    expect(equiparOuGuardar(P, [espada], "s", true)[0]).toMatchObject({ equipado: true, coluna: 0, linha: 0 });
  });
});
