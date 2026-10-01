import { describe, expect, it } from "vitest";

import { CATALOGO_ITENS } from "./catalogoItensTeste";
import { categoriaDoItem, contarPorCategoria, itensEmDestaque, normalizar } from "./filtro";

const ITENS = [
  { id: "pocao", nome: "Poção de Vida Menor", subtipo: "outro", categoria: "consumiveis" },
  { id: "adaga", nome: "Adaga", subtipo: "uma_mao" },
  { id: "aljava", nome: "Aljava", subtipo: "aljava" },
  { id: "moedas", nome: "Moedas (24 ouro)", subtipo: "moedas" },
  { id: "corda", nome: "Corda", subtipo: "outro" },
  { id: "antiga", nome: "Espada antiga", tipo: "arma", subtipo: null },
];

describe("filtro do inventário", () => {
  it("categoria pelo subtipo, pela escolha em Outros, pelo tipo antigo ou a padrão", () => {
    const categorias = Object.fromEntries(ITENS.map((i) => [i.id, categoriaDoItem(i, CATALOGO_ITENS)]));
    expect(categorias).toEqual({
      pocao: "consumiveis", adaga: "armas", aljava: "acessorios", moedas: "moedas", corda: "diversos", antiga: "armas",
    });
    // Uma categoria de Outros gravada numa arma não vale: a arma é sempre Armas.
    expect(categoriaDoItem({ id: "x", nome: "X", subtipo: "uma_mao", categoria: "chaves" }, CATALOGO_ITENS)).toBe("armas");
  });

  it("conta por categoria na ordem do catálogo, com as vazias em zero", () => {
    const contagem = contarPorCategoria(ITENS, CATALOGO_ITENS);
    expect(contagem.map((c) => c.id)).toEqual(CATALOGO_ITENS.categorias.map((c) => c.id));
    expect(Object.fromEntries(contagem.map((c) => [c.id, c.total]))).toMatchObject({
      armas: 2, acessorios: 1, moedas: 1, consumiveis: 1, diversos: 1, chaves: 0,
    });
  });

  it("busca sem diferenciar acento nem maiúsculas", () => {
    expect(normalizar("  Poção   DE vida ")).toBe("pocao de vida");
    expect(itensEmDestaque(ITENS, CATALOGO_ITENS, null, "poç")).toEqual(new Set(["pocao"]));
    expect(itensEmDestaque(ITENS, CATALOGO_ITENS, null, "POC")).toEqual(new Set(["pocao"]));
  });

  it("combina categoria e busca; sem filtro, nada é esmaecido", () => {
    expect(itensEmDestaque(ITENS, CATALOGO_ITENS, "armas", "")).toEqual(new Set(["adaga", "antiga"]));
    expect(itensEmDestaque(ITENS, CATALOGO_ITENS, "armas", "adag")).toEqual(new Set(["adaga"]));
    expect(itensEmDestaque(ITENS, CATALOGO_ITENS, null, "   ")).toBeNull();
    expect(itensEmDestaque(ITENS, CATALOGO_ITENS, "chaves", "")).toEqual(new Set());
  });
});
