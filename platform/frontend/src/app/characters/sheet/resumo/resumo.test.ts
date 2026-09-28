import { describe, expect, it } from "vitest";

import type { CartaPersonagemResumo } from "../../../cards/types";
import type { FichaContrato, ItemInventarioResumo, ValorDerivadoResumo } from "../../types";
import { GRUPOS_ATRIBUTOS, GRUPOS_PERICIAS, chaveDerivada } from "../sheetCatalog";
import { IMAGEM_PADRAO } from "./modelo";
import {
  atributosAgrupados, habilidadesAprendidas, historiaDe, imagemCentral, itensEquipados, periciasEmDestaque, recursosDoResumo,
} from "./resumo";

function valor(chave: string, total: number | null, extra: Partial<ValorDerivadoResumo> = {}): ValorDerivadoResumo {
  return { chave, rotulo: chave.split(":")[1] ?? chave, grupo: "pericia", total, fontes: [], ...extra } as ValorDerivadoResumo;
}
const pericia = (nome: string, total: number | null) => valor(chaveDerivada("pericia", nome), total, { rotulo: nome });

describe("periciasEmDestaque", () => {
  it("personagem recém-criado: seis mais altas, empate pela ordem do livro", () => {
    const valores = [
      pericia("Arcanismo", 3), pericia("Ocultismo", 2), pericia("Investigação", 2), pericia("Esquiva", 2),
      pericia("Prontidão", 1), pericia("Furtividade", 1), pericia("Medicina", 1), pericia("Natureza", 1),
      pericia("Briga", 0),
    ];
    expect(periciasEmDestaque(valores, GRUPOS_PERICIAS).map((p) => [p.nome, p.valor])).toEqual([
      ["Arcanismo", 3], ["Esquiva", 2], ["Investigação", 2], ["Ocultismo", 2], ["Prontidão", 1], ["Furtividade", 1],
    ]);
  });

  it("nenhuma perícia acima de 0, ou sem valor calculado, deixa a lista vazia", () => {
    expect(periciasEmDestaque([pericia("Arcanismo", 0), pericia("Briga", null)], GRUPOS_PERICIAS)).toEqual([]);
  });

  it("ícone próprio do JSON, senão o do grupo; ícone desconhecido é ignorado", () => {
    const icones = { Arcanismo: "arcanismo", "Técnicas": "tecnicas", Talentos: "nao-existe" };
    const [arcanismo, furtividade, briga] = periciasEmDestaque([pericia("Arcanismo", 3), pericia("Furtividade", 2), pericia("Briga", 1)], GRUPOS_PERICIAS, 6, icones);
    expect([arcanismo?.icone, furtividade?.icone, briga?.icone]).toEqual(["arcanismo", "tecnicas", undefined]);
  });
});

describe("atributosAgrupados", () => {
  it("os nove atributos nos três grupos, com o total do servidor e o rótulo dele", () => {
    const valores = [valor(chaveDerivada("atributo", "Força"), 4, { rotulo: "Força" }), valor(chaveDerivada("atributo", "Proposito"), 2, { rotulo: "Propósito" }),
      valor(chaveDerivada("atributo", "Vigor"), null, { motivo: "Sem valor." })];
    const grupos = atributosAgrupados(valores, GRUPOS_ATRIBUTOS);
    expect(grupos.map((g) => g.titulo)).toEqual(["Físicos", "Sociais", "Mentais"]);
    expect(grupos.flatMap((g) => g.itens)).toHaveLength(9);
    const [forca, , vigor] = grupos[0]!.itens;
    expect([forca?.nome, forca?.valor, vigor?.valor, vigor?.motivo]).toEqual(["Força", 4, null, "Sem valor."]);
    expect(grupos[1]!.itens[2]).toMatchObject({ nome: "Propósito", valor: 2 });
  });
});

function item(nome: string, equipado: boolean, extra: Partial<ItemInventarioResumo> = {}): ItemInventarioResumo {
  return { id: nome, tipo: "outro", nome, quantidade: 1, equipado, dados: {}, efeitos: [], girado: false, ...extra } as ItemInventarioResumo;
}

describe("itensEquipados", () => {
  it("só os equipados, com arte ou ícone de grade e descrição; mais de cinco vira 'e mais N'", () => {
    const inventario = [
      item("Espada", true, { tipo: "arma", dados: { imagem_ativo: "arte.png", descricao: "Aço velho." } }),
      item("Corda", false),
      item("Escudo", true, { tipo: "armadura", dados: { icone_grade: "grade.png" } }),
      item("Tocha", true, { cargas_atuais: 2, cargas_maximas: 3 }),
      item("A", true), item("B", true), item("C", true),
    ];
    const { visiveis, restantes } = itensEquipados(inventario);
    expect(visiveis.map((i) => i.nome)).toEqual(["Espada", "Escudo", "Tocha", "A", "B"]);
    expect(restantes).toBe(1);
    expect(visiveis[0]).toMatchObject({ tipo: "arma", descricao: "Aço velho.", caminhoArte: "arte.png" });
    expect(visiveis[1]?.caminhoArte).toBe("grade.png");
    expect(visiveis[2]?.descricao).toBe("Cargas: 2/3");
  });
});

function carta(titulo: string, tipo: CartaPersonagemResumo["tipo"], estado: CartaPersonagemResumo["estado"], adquirida: string, ativos: string[] = []): CartaPersonagemResumo {
  return {
    id: titulo, personagem_id: "p", tipo, estado, origem: "concessao", excecao_aprendizado: false, adquirida_em: adquirida,
    carta: { versao_id: "v", definicao_id: "d", numero: 1, tipo, conteudo: { titulo, texto: `Texto de ${titulo}`, ativos } },
  } as CartaPersonagemResumo;
}

describe("habilidadesAprendidas", () => {
  it("só habilidades e magias aprendidas, pela ordem de aquisição, com arte", () => {
    const cartas = [
      carta("Passo Etéreo", "magia", "em_aprendizado", "2026-01-03T00:00:00Z"),
      carta("Escudo Místico", "magia", "aprendida", "2026-01-02T00:00:00Z"),
      carta("Projétil Arcano", "magia", "aprendida", "2026-01-01T00:00:00Z", ["arte.png"]),
      carta("Poção", "item", "no_inventario", "2026-01-01T00:00:00Z"),
      carta("Bênção", "efeito", "aplicada", "2026-01-01T00:00:00Z"),
      carta("Saber Antigo", "habilidade", "aprendida", "2026-01-04T00:00:00Z"),
      carta("Esquecida", "habilidade", "removida", "2026-01-05T00:00:00Z"),
    ];
    const { visiveis, restantes } = habilidadesAprendidas(cartas);
    expect(visiveis.map((h) => h.nome)).toEqual(["Projétil Arcano", "Escudo Místico", "Saber Antigo"]);
    expect(restantes).toBe(0);
    expect(visiveis[0]).toMatchObject({ tipo: "magia", caminhoArte: "arte.png", descricao: "Texto de Projétil Arcano" });
    expect(habilidadesAprendidas([...cartas, carta("X", "magia", "aprendida", "2026-02-01T00:00:00Z"), carta("Y", "magia", "aprendida", "2026-02-02T00:00:00Z")]).restantes).toBe(1);
  });
});

describe("imagemCentral, recursos e História", () => {
  it("ilustração, senão retrato, senão a arte padrão", () => {
    expect(imagemCentral("i.webp", "r.webp")).toEqual({ src: "i.webp", origem: "ilustracao" });
    expect(imagemCentral(undefined, "r.webp")).toEqual({ src: "r.webp", origem: "retrato" });
    expect(imagemCentral()).toEqual({ src: IMAGEM_PADRAO, origem: "padrao" });
  });

  it("PV e PP com atual da ficha e máximo do servidor; sem valor, o motivo", () => {
    const ficha = { recursos: { pv: { atual: 14 } } } as unknown as FichaContrato;
    const valores = [valor("recurso:pv_maximo", 22), valor("recurso:pp_maximo", null, { motivo: "Classe não definida." }), valor("defesa:esquiva", 11)];
    expect(recursosDoResumo(ficha, valores)).toEqual({
      pv: { valor: 22, atual: 14 }, pp: { valor: null, motivo: "Classe não definida." },
      defesa: { valor: 11 }, armadura: { valor: null }, rdb: { valor: null },
    });
  });

  it("História vazia ou só com espaços conta como não escrita", () => {
    expect(historiaDe({ personalidade: { historia: "  " } } as unknown as FichaContrato)).toBeUndefined();
    expect(historiaDe({} as FichaContrato)).toBeUndefined();
    expect(historiaDe({ personalidade: { historia: "Era uma vez." } } as unknown as FichaContrato)).toBe("Era uma vez.");
  });
});
