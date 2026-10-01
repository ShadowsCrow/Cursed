import { paraGrade } from "../characters/sheet/gradeFicha";
import { chaveDerivada, GRUPOS_PERICIAS } from "../characters/sheet/sheetCatalog";
import type { ApiClient, GradeInventario, ItemInventarioResumo } from "../characters/types";
import { avaliar, calcularGrade, limitesFisicos, validarPosicao, type ItemGrade, type Tamanho } from "../inventory/gridEngine";
import itensCatalogo from "../../../../../cursed_platform/catalogos/itens.json";
import classesCatalogo from "../../../../../cursed_platform/catalogos/classes.json";
import racasCatalogo from "../../../../../cursed_platform/catalogos/racas.json";
import listasCatalogo from "../../../../../cursed_platform/catalogos/listas_ficha.json";
import { categoriaDoItem } from "../inventory/filtro";
import type { CatalogoItens } from "../characters/sheet/catalogoApi";
import type { CartaPersonagemResumo } from "../cards/types";
import { criarApiDeDemonstracao, estadoDeDemonstracao } from "./apiDemonstracao";
import { CARTAS_DA_REFERENCIA, CARTAS_PARA_FILTROS, semCustosReservados } from "./cartasDemonstracao";

const CATALOGO = {
  raridades: itensCatalogo.raridades,
  categorias: itensCatalogo.categorias.map((c) => ({ subtipos: [], escolha_em_outros: false, padrao_outros: false, ...c })),
} as CatalogoItens;
// Classes, raças e sexos do JSON do sistema: a aba Informações básicas mostra o conceito e o Tamanho base.
const CLASSES = classesCatalogo.map(({ nome, cor, habilidades, arquetipos }) => ({ nome, cor, habilidades, arquetipos }));
const RACAS = racasCatalogo.map(({ nome, deslocamento, tamanho, habilidades }) => ({ nome, deslocamento, tamanho, habilidades }));

/*
 * Ficha completa em memória para a prévia `/preview/ficha` (reformular-visual-da-ficha, 5A.1): a página
 * real da ficha, com um personagem de exemplo e uma grade do tamanho escolhido. Nada sai do navegador;
 * as gravações só mudam o estado local.
 */

type Resposta = { data?: unknown; error?: unknown; response: { status: number } };
type Parametros = { params?: { path?: Record<string, string>; query?: Record<string, unknown> }; body?: unknown };

export interface OpcoesFichaDemonstracao {
  tamanho: Tamanho;
  forca: number;
  mochila: boolean;
  /** Narrador vê e edita tudo; jogador edita a própria ficha; leitura só lê. */
  papel: "jogador" | "narrador" | "leitura";
  /** Nome do personagem de exemplo (para testar nomes longos). */
  nome?: string;
  /** "referencia": as perícias da imagem de referência da aba Perícias (redesenhar-aba-pericias, D9). */
  pericias?: "referencia";
  /**
   * Cartas da referência da aba Cartas (redesenhar-aba-cartas, D11): "imagem" traz só as dez da imagem;
   * "referencia", mais duas armas e uma magia da raça, para os filtros.
   */
  cartas?: "referencia" | "imagem";
  /** Personalidade toda em branco (estados vazios da aba Personalidade). */
  personalidadeVazia?: boolean;
}

export const MESA_FICHA = "ordem";
export const PERSONAGEM_FICHA = "lion";

/** Perícias do Lion na imagem de referência da aba Perícias (2026-09-29): Prontidão 3 com ajuste 3. */
export const PERICIAS_DA_REFERENCIA = {
  valores: { "Prontidão": 3, "Esportes": 1, "Briga": 1, "Esquiva": 1, "Empatia": 1, "Expressão": 2, "Intimidação": 2, "Liderança": 2 },
  ajustes: { "Prontidão": 3 },
};

const ok = (data: unknown, status = 200): Resposta => ({ data, response: { status } });

type Semente = Omit<ItemInventarioResumo, "id" | "equipado" | "girado" | "efeitos" | "cargas_atuais" | "cargas_maximas" | "quantidade"
  | "tipo"> & { id: string; tipo?: ItemInventarioResumo["tipo"]; equipado?: boolean; quantidade?: number };

/** Itens de exemplo, na ordem em que a demonstração tenta encaixá-los na grade. */
const SEMENTES: Semente[] = [
  { id: "pocao", nome: "Poção de Vida Menor", subtipo: "outro", largura: 1, altura: 1, pilha_max: 5, quantidade: 3, maos: 0,
    dados: { raridade: "comum", categoria: "consumiveis", descricao: "Uma poção de cor rubra que restaura parte da vitalidade. O gosto é amargo, mas eficaz." } },
  { id: "adaga", nome: "Adaga de Prata", tipo: "arma", subtipo: "uma_mao", largura: 1, altura: 2, equipado: true, maos: 1,
    dados: { raridade: "incomum", descricao: "Lâmina curta de prata batida, boa contra o que teme a lua." } },
  { id: "pergaminho", nome: "Pergaminho Selado", subtipo: "outro", largura: 1, altura: 1, quantidade: 2, pilha_max: 3, maos: 0,
    dados: { raridade: "raro", categoria: "itens_de_missao", descricao: "Selo de cera negra com o brasão da Ordem. Não deve ser aberto." } },
  { id: "ervas", nome: "Ervas de Cura", subtipo: "outro", largura: 1, altura: 1, quantidade: 4, pilha_max: 10, maos: 0,
    dados: { raridade: "comum", categoria: "materiais" } },
  { id: "pao", nome: "Pão de Viagem", subtipo: "outro", largura: 1, altura: 1, maos: 0,
    dados: { raridade: "comum", categoria: "consumiveis" } },
  { id: "moedas", nome: "Moedas (3 cobre, 17 prata, 24 ouro)", subtipo: "moedas", largura: 1, altura: 1,
    dados: { cobre: 3, prata: 17, ouro: 24 } },
  { id: "chave", nome: "Chave de Ferro", subtipo: "outro", largura: 1, altura: 1, maos: 0,
    dados: { raridade: "incomum", categoria: "chaves", descricao: "Abre a porta da cripta sob a capela." } },
  { id: "cristal", nome: "Cristal Azul", subtipo: "outro", largura: 1, altura: 1, maos: 0,
    dados: { raridade: "epico", categoria: "materiais" } },
  { id: "lanterna", nome: "Lanterna", subtipo: "outro", largura: 1, altura: 2, maos: 1,
    dados: { raridade: "comum", categoria: "diversos" } },
  { id: "couraca", nome: "Couraça de Couro", tipo: "armadura", subtipo: "peitoral", largura: 2, altura: 2, equipado: true,
    dados: { raridade: "comum", descricao: "Couro fervido e reforçado nos ombros." } },
  { id: "aljava", nome: "Aljava", subtipo: "aljava", largura: 1, altura: 2, dados: { raridade: "comum", capacidade_flechas: 20, flechas: 6 } },
  { id: "tecido", nome: "Tecido Dobrado", subtipo: "outro", largura: 1, altura: 1, maos: 0, dados: { raridade: "comum" } },
  { id: "chifre", nome: "Chifre de Caça", subtipo: "outro", largura: 1, altura: 1, maos: 0,
    dados: { raridade: "lendario", categoria: "itens_de_missao", descricao: "Dizem que o som dele chama os mortos da colina." } },
  { id: "pocao-verde", nome: "Tônico Verde", subtipo: "outro", largura: 1, altura: 1, quantidade: 2, pilha_max: 5, maos: 0,
    dados: { raridade: "incomum", categoria: "consumiveis" } },
];

const MOCHILA: Semente = {
  id: "mochila", nome: "Mochila de Viagem", subtipo: "mochila", largura: 2, altura: 2, equipado: true,
  dados: { raridade: "comum", ampliacao: { linhas: 1, colunas: 1 }, requisito_forca: 1 },
};

function completo(semente: Semente): ItemInventarioResumo {
  const tipo = semente.tipo ?? "outro";
  const dados = semente.dados ?? {};
  // Como o servidor: raridade, categoria e descrição já resolvidas.
  const categoria = categoriaDoItem({ id: semente.id, nome: semente.nome, tipo, subtipo: semente.subtipo,
    categoria: typeof dados.categoria === "string" ? dados.categoria : null }, CATALOGO);
  return {
    efeitos: [], cargas_atuais: null, cargas_maximas: null, girado: false, coluna: null, linha: null,
    ...semente, tipo, equipado: semente.equipado ?? false, quantidade: semente.quantidade ?? 1,
    raridade: typeof dados.raridade === "string" ? dados.raridade : "comum", categoria,
    descricao: typeof dados.descricao === "string" ? dados.descricao : null,
  };
}

/** Encaixa os itens na ordem, no primeiro lugar livre da área verde; o que não cabe fica fora da grade. */
function arrumar(opcoes: OpcoesFichaDemonstracao): ItemInventarioResumo[] {
  const itens = [...(opcoes.mochila ? [MOCHILA] : []), ...SEMENTES].map(completo);
  const colocados: ItemInventarioResumo[] = [];
  const parametros = { forca: opcoes.forca, tamanho: opcoes.tamanho };
  for (const item of itens) {
    if (item.subtipo === "mochila") { colocados.push(item); continue; }
    const atuais = colocados.map(paraGrade);
    const grade = calcularGrade(parametros, atuais);
    let lugar: { coluna: number; linha: number } | null = null;
    for (let linha = 0; linha < grade.linhasVerdes && !lugar; linha += 1) {
      for (let coluna = 0; coluna < grade.colunasVerdes && !lugar; coluna += 1) {
        const candidato = paraGrade(item);
        const cabe = validarPosicao(grade, atuais, candidato, coluna, linha, false).ok
          && linha + (item.altura ?? 1) <= grade.linhasVerdes && coluna + (item.largura ?? 1) <= grade.colunasVerdes;
        if (cabe) lugar = { coluna, linha };
      }
    }
    colocados.push(lugar ? { ...item, ...lugar } : { ...item, equipado: false });
  }
  return colocados;
}

function gradeResumo(versao: number, opcoes: OpcoesFichaDemonstracao, itens: ItemInventarioResumo[]): GradeInventario {
  const itensGrade: ItemGrade[] = itens.map(paraGrade);
  const grade = calcularGrade({ forca: opcoes.forca, tamanho: opcoes.tamanho }, itensGrade);
  const avaliacao = avaliar(grade, itensGrade);
  const limites = limitesFisicos(grade, itensGrade);
  return {
    versao, forca: opcoes.forca, tamanho: opcoes.tamanho, tamanho_origem: "raca",
    colunas_verdes: grade.colunasVerdes, linhas_verdes: grade.linhasVerdes, colunas: limites.colunas, linhas: limites.linhas,
    ampliacoes: grade.ampliacoes.map((a) => ({ fonte: a.fonte as "mochila", rotulo: a.rotulo, linhas: a.linhas, colunas: a.colunas })),
    sobrecarga: avaliacao.sobrecarga, itens_em_sobrecarga: avaliacao.itensEmSobrecarga, maos_ocupadas: avaliacao.maosOcupadas,
    celulas_ocupadas: avaliacao.celulasOcupadas, celulas_verdes: avaliacao.celulasVerdes, itens,
  };
}

const FICHA = {
  personagem: { nome: "Lion", idade: 15, sexo: "Masculino", raca: "Elfo", classe: "Especialista de Combate", arquetipo: "Antimago", nivel: 2 },
  // A personalidade da imagem de referência da aba (reformular-personalidade-da-ficha, D10), com o pecado vazio.
  personalidade: {
    alinhamento: "Leal | Bom", coisa_favorita: "Runas antigas", quando_me_veem: "Um sábio distante",
    vivo_para: "Proteger os inocentes", medo: "Aranhas gigantes", odeia: "Traição", manias: "Roer unha",
    meu_lema: "O dever acima de tudo", valor_inquebravel: "Lealdade", religiao: "Deusa da Lua",
    frase: "Conhecimento é a única arma que nunca podem me tirar.",
    tracos: ["Leal", "Disciplinado", "Reservado", "Idealista"],
    historia: "Veio de terras antigas, carrega perdas silenciosas e segue em frente movido por dever e conhecimento.",
  } as Record<string, unknown>,
  atributos: { valores: { "Força": 3, "Destreza": 3, "Vigor": 2, "Carisma": 1, "Manipulação": 1, "Proposito": 2, "Percepção": 2, "Inteligência": 1, "Raciocínio": 2 } },
  pericias: { valores: { "Briga": 2, "Esquiva": 2, "Armas Brancas": 3, "Prontidão": 1, "Furtividade": 1, "Sobrevivência": 1 } },
  recursos: { pv: { atual: 25 }, pp: { atual: 6 } },
};

const faixa = (id: string, nome: string, min: number, max: number) => ({ id, nome, min, max, efeito: "" });

export function criarApiDaFichaDemonstracao(opcoes: OpcoesFichaDemonstracao) {
  const base = criarApiDeDemonstracao(estadoDeDemonstracao());
  let versao = 3;
  let itens = arrumar(opcoes);
  let ficha: Record<string, unknown> = {
    ...FICHA, personagem: { ...FICHA.personagem, nome: opcoes.nome || FICHA.personagem.nome },
    personalidade: opcoes.personalidadeVazia ? {} : FICHA.personalidade,
    atributos: { valores: { ...FICHA.atributos.valores, "Força": opcoes.forca } },
    pericias: opcoes.pericias === "referencia" ? PERICIAS_DA_REFERENCIA : FICHA.pericias,
  };
  const narrador = opcoes.papel === "narrador";
  let cartas: CartaPersonagemResumo[] = opcoes.cartas
    ? [...CARTAS_DA_REFERENCIA, ...(opcoes.cartas === "referencia" ? CARTAS_PARA_FILTROS : [])].map((c) => ({ ...c, personagem_id: PERSONAGEM_FICHA }))
    : [];
  // Como o servidor: quem não é Narrador não recebe o Custo de Aprendizado nem os Descansos Mínimos.
  const cartasVisiveis = () => (narrador ? cartas : semCustosReservados(cartas));
  const snapshot = () => ({ mesa_id: MESA_FICHA, personagem_id: PERSONAGEM_FICHA, versao, tipo: "personagem", ficha, avisos: [] });
  const editar = opcoes.papel !== "leitura";

  const rotas: Record<string, (p: Parametros) => Resposta> = {
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/ficha": () => ok(snapshot()),
    // Gravação de campos (aba Personalidade e outras): só muda a ficha em memória.
    "PUT /mesas/{mesa_id}/personagens/{personagem_id}/ficha": ({ body }) => {
      ficha = (body as { ficha: Record<string, unknown> }).ficha;
      versao += 1;
      return ok(snapshot());
    },
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/permissoes": () => ok({
      papel: opcoes.papel === "narrador" ? "narrador" : "jogador", editar, excluir: false, transferir: false,
      campos_bloqueados: [], campos_exigem_aprovacao: [],
    }),
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/valores-derivados": () => {
      const valor = (chave: string, rotulo: string, grupo: string, total: number) => ({
        chave, rotulo, grupo, calculavel: true, motivo: null, total, fontes: [], situacionais: [],
      });
      return ok([
        ...Object.entries((ficha.atributos as { valores: Record<string, number> }).valores).map(([nome, total]) => valor(`atributo:${nome.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()}`, nome, "atributo", total)),
        // Total da perícia: base mais ajuste, como o servidor calcula sem efeitos.
        ...GRUPOS_PERICIAS.flatMap((g) => g.nomes).map((nome) => {
          const pericias = ficha.pericias as { valores?: Record<string, number>; ajustes?: Record<string, number> };
          const total = (pericias.valores?.[nome] ?? 0) + (pericias.ajustes?.[nome] ?? 0);
          return valor(chaveDerivada("pericia", nome), nome, "pericia", total);
        }),
        valor("recurso:pv_maximo", "PV máximo", "recurso", 25),
        valor("recurso:pp_maximo", "PP máximo", "recurso", 6),
        valor("defesa:esquiva", "Defesa (Esquiva)", "defesa", 4),
        valor("defesa:armadura", "Defesa (Armadura)", "defesa", 2),
      ]);
    },
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/desgaste": () => ok([
      { recurso: "exaustao", atual: 0, maximo: 5, registrado: true, faixa: faixa("estavel", "Estável", 0, 0) },
      { recurso: "estresse", atual: 0, maximo: 10, registrado: true, faixa: faixa("controlado", "Controlado", 0, 2) },
    ]),
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/efeitos": () => ok([]),
    ...(opcoes.cartas ? {
      "GET /mesas/{mesa_id}/personagens/{personagem_id}/cartas": () => ok(cartasVisiveis()),
      "POST /mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/transicoes/{acao}": ({ params }: Parametros) => {
        const { carta_id: cartaId, acao } = (params?.path ?? {}) as { carta_id?: string; acao?: string };
        const estados: Record<string, CartaPersonagemResumo["estado"]> = {
          iniciar_aprendizado: "em_aprendizado", interromper_aprendizado: "disponivel", concluir_aprendizado: "aprendida", remover: "removida",
        };
        cartas = cartas.map((c) => (c.id === cartaId && acao && estados[acao] ? { ...c, estado: estados[acao] } : c))
          .filter((c) => c.estado !== "removida");
        versao += 1;
        return ok({ versao, cartas: cartasVisiveis().filter((c) => c.id === cartaId) });
      },
    } : {}),
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/consequencias": () => ok([]),
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/inventario": () => ok(itens),
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/inventario/grade": () => ok(gradeResumo(versao, opcoes, itens)),
    "PUT /mesas/{mesa_id}/personagens/{personagem_id}/inventario/arrumacao": ({ body }) => {
      const pedido = body as { itens: Array<{ id: string; coluna: number | null; linha: number | null; girado: boolean; equipado: boolean; maos?: number | null }> };
      itens = itens.map((item) => {
        const novo = pedido.itens.find((p) => p.id === item.id);
        return novo ? { ...item, coluna: novo.coluna, linha: novo.linha, girado: novo.girado, equipado: novo.equipado, maos: novo.maos ?? item.maos } : item;
      });
      versao += 1;
      return ok(gradeResumo(versao, opcoes, itens));
    },
    "POST /mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/largar": ({ params }) => {
      itens = itens.filter((i) => i.id !== params?.path?.item_id);
      versao += 1;
      return ok(gradeResumo(versao, opcoes, itens));
    },
    "GET /mesas/{mesa_id}/politicas": () => ok({ moedas_por_pilha: 100 }),
    "GET /mesas/{mesa_id}/ofertas-item": () => ok([]),
    "GET /mesas/{mesa_id}/entidades-publicas": () => ok([]),
    "GET /mesas/{mesa_id}/catalogos/itens": () => ok(itensCatalogo),
    "GET /mesas/{mesa_id}/catalogos/classes": () => ok(CLASSES),
    "GET /mesas/{mesa_id}/catalogos/racas": () => ok(RACAS),
    "GET /mesas/{mesa_id}/catalogos/efeitos-default": () => ok([]),
    // As listas do JSON do sistema: a aba Personalidade monta os grupos, os ícones e os campos a partir delas.
    "GET /mesas/{mesa_id}/catalogos/listas-ficha": () => ok(listasCatalogo),
  };

  const chamar = (metodo: "GET" | "POST" | "PUT" | "DELETE") => async (caminho: string, parametros: Parametros = {}) => {
    // Gravações com a demora de um servidor de verdade: a tela precisa ficar estável enquanto espera.
    if (metodo !== "GET") await new Promise((resolver) => setTimeout(resolver, 250));
    const rota = rotas[`${metodo} ${caminho}`];
    return rota ? rota(parametros) : (base.api[metodo] as unknown as (c: string, p: Parametros) => Promise<Resposta>)(caminho, parametros);
  };
  return { GET: chamar("GET"), POST: chamar("POST"), PUT: chamar("PUT"), DELETE: chamar("DELETE") } as unknown as ApiClient;
}
