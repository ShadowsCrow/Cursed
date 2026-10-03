import { describe, expect, it } from "vitest";

import { CATALOGO_ITENS } from "../../../inventory/catalogoItensTeste";
import {
  categoriaDaCarta, ehCorpo, filtrarCartas, rotuloDaCategoria, opcoesDeOrigem, opcoesDeTipo, ordenarCartas, origemDaCarta, rotuloDaOrigem,
  SEM_FILTROS, type Carta,
} from "./apresentacao";

let sequencia = 0;
function carta(parcial: Partial<Carta> & { conteudo?: Record<string, unknown> } = {}): Carta {
  const { conteudo = {}, ...resto } = parcial;
  const tipo = resto.tipo ?? "habilidade";
  sequencia += 1;
  return {
    id: `c${sequencia}`, personagem_id: "lion", tipo, estado: "aprendida", origem: "concessao",
    excecao_aprendizado: false, adquirida_em: `2026-09-${String(10 + sequencia).padStart(2, "0")}T12:00:00Z`,
    concedida_por: null,
    carta: { versao_id: `v${sequencia}`, definicao_id: `d${sequencia}`, numero: 1, tipo,
      conteudo: { titulo: `Carta ${sequencia}`, texto: "Texto.", ...conteudo } },
    ...resto,
  } as Carta;
}

describe("origem e pílula", () => {
  it("classe e arquétipo são da classe; raça é da raça; o resto é concedido", () => {
    const casos: [Partial<Carta>, string, string][] = [
      [{ concedida_por: "classe:Especialista de Combate" }, "classe", "Classe: Especialista de Combate - automática"],
      [{ concedida_por: "arquetipo:Druida/Animalista" }, "classe", "Arquétipo: Animalista - automática"],
      [{ concedida_por: "raca:Elfo" }, "raca", "Raça: Elfo - automática"],
      [{ origem: "oferta" }, "concedidas", "Escolhida em oferta"],
      [{ origem: "concessao" }, "concedidas", "Concedida pelo Narrador"],
      [{ excecao_aprendizado: true }, "concedidas", "Concedida como aprendida (exceção)"],
    ];
    for (const [parcial, origem, rotulo] of casos) {
      const c = carta(parcial);
      expect(origemDaCarta(c)).toBe(origem);
      expect(rotuloDaOrigem(c)).toBe(rotulo);
    }
  });
});

describe("categoria do filtro de tipo", () => {
  it("habilidade, magia e efeito têm categoria própria", () => {
    expect(categoriaDaCarta(carta({ tipo: "habilidade" }), CATALOGO_ITENS)).toBe("habilidades");
    expect(categoriaDaCarta(carta({ tipo: "magia" }), CATALOGO_ITENS)).toBe("magias");
    expect(categoriaDaCarta(carta({ tipo: "efeito" }), CATALOGO_ITENS)).toBe("efeitos");
  });

  it("item pelo subtipo, pela categoria de Outros ou, sem formato, pelo tipo", () => {
    const espada = carta({ tipo: "item", conteudo: { item_tipo: "arma", formato: { subtipo: "uma_mao", largura: 1, altura: 3 } } });
    const escudo = carta({ tipo: "item", conteudo: { item_tipo: "armadura", formato: { subtipo: "escudo", largura: 2, altura: 2 } } });
    const pocao = carta({ tipo: "item", conteudo: { item_tipo: "outro", formato: { subtipo: "outro", categoria: "consumiveis", largura: 1, altura: 1 } } });
    const antiga = carta({ tipo: "item", conteudo: { item_tipo: "armadura" } });
    const semNada = carta({ tipo: "item", conteudo: { item_tipo: "outro" } });
    expect(categoriaDaCarta(espada, CATALOGO_ITENS)).toBe("armas");
    expect(categoriaDaCarta(escudo, CATALOGO_ITENS)).toBe("escudos");
    expect(categoriaDaCarta(pocao, CATALOGO_ITENS)).toBe("consumiveis");
    expect(categoriaDaCarta(antiga, CATALOGO_ITENS)).toBe("armaduras");
    expect(categoriaDaCarta(semNada, CATALOGO_ITENS)).toBe("diversos");
  });

  it("os corpos do sistema ficam na categoria Corpos, separados dos demais itens (experiencia-da-mesa, item 6)", () => {
    const formato = { subtipo: "outro", largura: 4, altura: 5 };
    const corpo = carta({ tipo: "item", conteudo: { item_tipo: "outro", tags: ["corpo", "padrão"], formato } });
    const soCorpo = carta({ tipo: "item", conteudo: { item_tipo: "outro", tags: ["corpo"], formato } });
    const magia = carta({ tipo: "magia", conteudo: { tags: ["corpo", "padrão"] } });
    expect(ehCorpo("item", corpo.carta.conteudo)).toBe(true);
    expect(categoriaDaCarta(corpo, CATALOGO_ITENS)).toBe("corpos");
    expect(rotuloDaCategoria("corpos", CATALOGO_ITENS)).toEqual({ rotulo: "Corpos", icone: "corpos" });
    expect(ehCorpo("item", soCorpo.carta.conteudo)).toBe(false);
    expect(categoriaDaCarta(soCorpo, CATALOGO_ITENS)).toBe("diversos");
    expect(ehCorpo("magia", magia.carta.conteudo)).toBe(false);
    expect(categoriaDaCarta(magia, CATALOGO_ITENS)).toBe("magias");
  });
});

describe("filtros combinados", () => {
  const classe = [1, 2, 3, 4, 5].map(() => carta({ concedida_por: "classe:Especialista de Combate" }));
  const raca = [carta({ concedida_por: "raca:Elfo" }), carta({ tipo: "magia", concedida_por: "raca:Elfo" })];
  const arma = carta({ tipo: "item", estado: "no_inventario", conteudo: { item_tipo: "arma", formato: { subtipo: "duas_maos", largura: 1, altura: 4 } } });
  const armaOferta = carta({ tipo: "item", origem: "oferta", estado: "no_inventario", conteudo: { item_tipo: "arma", formato: { subtipo: "uma_mao", largura: 1, altura: 2 } } });
  const todas = [...classe, ...raca, arma, armaOferta];

  it("as três origens aparecem sempre, com contagem", () => {
    expect(opcoesDeOrigem(classe, "").map((o) => [o.rotulo, o.total])).toEqual([["Da classe", 5], ["Da raça", 0], ["Concedidas", 0]]);
  });

  it("origem e tipo se combinam", () => {
    expect(filtrarCartas(todas, { ...SEM_FILTROS, origem: "raca" }, CATALOGO_ITENS)).toEqual(raca);
    expect(filtrarCartas(todas, { origem: "concedidas", tipo: "armas", busca: "" }, CATALOGO_ITENS)).toEqual([arma, armaOferta]);
  });

  it("os tipos contam depois da origem, só com cartas, na ordem da barra", () => {
    expect(opcoesDeTipo(todas, CATALOGO_ITENS, SEM_FILTROS).map((o) => [o.id, o.rotulo, o.total])).toEqual([
      ["habilidades", "Habilidades", 6], ["magias", "Magias", 1], ["armas", "Armas", 2],
    ]);
    expect(opcoesDeTipo(todas, CATALOGO_ITENS, { ...SEM_FILTROS, origem: "raca" }).map((o) => [o.id, o.total]))
      .toEqual([["habilidades", 1], ["magias", 1]]);
  });

  it("o tipo ativo continua na lista com zero quando a origem o esvazia", () => {
    expect(opcoesDeTipo(todas, CATALOGO_ITENS, { origem: "raca", tipo: "armas", busca: "" }).map((o) => [o.id, o.total]))
      .toEqual([["habilidades", 1], ["magias", 1], ["armas", 0]]);
  });
});

describe("busca e ordem", () => {
  const canalizacao = carta({ conteudo: { titulo: "Canalização arcana", texto: "Concentra energia." } });
  const segundo = carta({ conteudo: { titulo: "Segundo round", texto: "Ação extra.", tags: ["Combate"] } });
  const combinacao = carta({ conteudo: { titulo: "Combinação tática", texto: "Ataque em grupo." } });

  it("busca sem acento nem maiúsculas no título, no texto e nas marcações", () => {
    expect(filtrarCartas([canalizacao, segundo], { ...SEM_FILTROS, busca: "CANALIZACAO" }, CATALOGO_ITENS)).toEqual([canalizacao]);
    expect(filtrarCartas([canalizacao, segundo], { ...SEM_FILTROS, busca: "energia" }, CATALOGO_ITENS)).toEqual([canalizacao]);
    expect(filtrarCartas([canalizacao, segundo], { ...SEM_FILTROS, busca: "combate" }, CATALOGO_ITENS)).toEqual([segundo]);
  });

  it("ordena por nome nos dois sentidos e por data de recebimento", () => {
    const titulos = (lista: Carta[]) => lista.map((c) => c.carta.conteudo.titulo);
    expect(titulos(ordenarCartas([segundo, canalizacao, combinacao], "nome-az"))).toEqual(["Canalização arcana", "Combinação tática", "Segundo round"]);
    expect(titulos(ordenarCartas([segundo, canalizacao, combinacao], "nome-za"))).toEqual(["Segundo round", "Combinação tática", "Canalização arcana"]);
    expect(titulos(ordenarCartas([canalizacao, segundo, combinacao], "recentes"))).toEqual(["Combinação tática", "Segundo round", "Canalização arcana"]);
  });
});
