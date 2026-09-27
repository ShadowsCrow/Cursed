import { describe, expect, it } from "vitest";

import casos from "../../../../../fixtures/grade/casos.json";
import {
  avaliar, calcularGrade, distribuirMoedas, encontrarEspaco, limitesFisicos, lugarParaGirar, validarEquipar, validarPosicao,
  type Bolsa, type ItemGrade, type ParametrosGrade,
} from "./gridEngine";

const itensDe = (lista: unknown) => lista as ItemGrade[];
const parametrosDe = (p: unknown) => p as ParametrosGrade;

function porId(itens: ItemGrade[], id: string): ItemGrade {
  const item = itens.find((i) => i.id === id);
  if (!item) throw new Error(`Item ${id} ausente do caso.`);
  return item;
}

describe("motor da grade — casos compartilhados com o servidor", () => {
  it.each(casos.grade.map((c) => [c.nome, c] as const))("grade: %s", (_nome, caso) => {
    const grade = calcularGrade(parametrosDe(caso.parametros), itensDe(caso.itens));
    expect({ colunasVerdes: grade.colunasVerdes, linhasVerdes: grade.linhasVerdes }).toEqual(caso.esperado);
  });

  it.each(casos.posicao.map((c) => [c.nome, c] as const))("posição: %s", (_nome, caso) => {
    const itens = itensDe(caso.itens);
    const grade = calcularGrade(parametrosDe(caso.parametros), itens);
    const { id, coluna, linha, girado } = caso.mover;
    expect(validarPosicao(grade, itens, porId(itens, id), coluna, linha, girado)).toEqual(caso.esperado);
  });

  it.each(casos.avaliacao.map((c) => [c.nome, c] as const))("avaliação: %s", (_nome, caso) => {
    const itens = itensDe(caso.itens);
    const resultado = avaliar(calcularGrade(parametrosDe(caso.parametros), itens), itens);
    expect(resultado).toMatchObject(caso.esperado);
  });

  it.each(casos.equipar.map((c) => [c.nome, c] as const))("equipar: %s", (_nome, caso) => {
    const itens = itensDe(caso.itens);
    const resultado = validarEquipar(itens, porId(itens, caso.equipar), Number(caso.forca));
    expect(resultado).toMatchObject(caso.esperado);
  });

  it.each(casos.moedas.map((c) => [c.nome, c] as const))("moedas: %s", (_nome, caso) => {
    const pilhas = distribuirMoedas(caso.bolsa as Bolsa, caso.porPilha);
    if ("esperado" in caso) expect(pilhas).toEqual(caso.esperado);
    if ("esperadoQuantidade" in caso) expect(pilhas).toHaveLength(Number(caso.esperadoQuantidade));
  });
});

describe("motor da grade — comportamento complementar", () => {
  const medio3 = calcularGrade({ forca: 3, tamanho: "medio" });
  const item = (extra: Partial<ItemGrade>): ItemGrade => ({
    id: "x", nome: "Item", subtipo: "outro", largura: 1, altura: 1, coluna: null, linha: null, girado: false, equipado: false, ...extra,
  });

  it("estende os limites exibidos até itens deixados em linhas perdidas", () => {
    const itens = [item({ id: "c", largura: 1, altura: 2, coluna: 3, linha: 5 })];
    const grade = calcularGrade({ forca: 2, tamanho: "medio" });
    expect(limitesFisicos(grade, itens)).toEqual({ colunas: 5, linhas: 7 });
  });

  it("encontra espaço girando o item quando só assim ele cabe", () => {
    const cheio = [item({ id: "a", largura: 5, altura: 5, coluna: 0, linha: 0 })];
    const espada = item({ id: "e", largura: 1, altura: 3 });
    expect(encontrarEspaco(medio3, cheio, espada)).toEqual({ coluna: 0, linha: 5, girado: true });
    expect(encontrarEspaco(medio3, cheio, espada, { permitirVermelho: false })).toBeNull();
  });

  describe("giro inteligente", () => {
    // Médio com Força 3: 5 colunas e 5 linhas verdes, mais a linha vermelha (linha 5).
    const espada = (coluna: number, linha: number, girado = false) =>
      item({ id: "e", nome: "Espada", subtipo: "uma_mao", largura: 1, altura: 3, coluna, linha, girado });

    it("gira no mesmo lugar quando cabe", () => {
      expect(lugarParaGirar(medio3, [espada(0, 0)], espada(0, 0))).toEqual({ coluna: 0, linha: 0, girado: true });
    });

    it("encostada na borda direita, desliza para a esquerda para caber deitada", () => {
      expect(lugarParaGirar(medio3, [espada(4, 0)], espada(4, 0))).toEqual({ coluna: 2, linha: 0, girado: true });
    });

    it("deitada na última linha verde, sobe para caber em pé sem entrar no vermelho", () => {
      expect(lugarParaGirar(medio3, [espada(0, 4, true)], espada(0, 4, true))).toEqual({ coluna: 0, linha: 2, girado: false });
    });

    it("sem espaço ao redor, procura o lugar livre mais próximo", () => {
      const bloqueio = item({ id: "b", largura: 4, altura: 3, coluna: 0, linha: 0 });
      const itens = [bloqueio, espada(4, 0)];
      expect(lugarParaGirar(medio3, itens, espada(4, 0))).toEqual({ coluna: 2, linha: 3, girado: true });
    });

    it("sem lugar em toda a grade, não gira", () => {
      const cheio = item({ id: "b", largura: 4, altura: 5, coluna: 0, linha: 0 });
      const cheio2 = item({ id: "c", largura: 5, altura: 1, coluna: 0, linha: 5 });
      expect(lugarParaGirar(medio3, [cheio, cheio2, espada(4, 0)], espada(4, 0))).toBeNull();
    });
  });

  it("recusa moedas por pilha inválido", () => {
    expect(() => distribuirMoedas({ cobre: 1, prata: 0, ouro: 0, platina: 0 }, 0)).toThrow();
  });
});
