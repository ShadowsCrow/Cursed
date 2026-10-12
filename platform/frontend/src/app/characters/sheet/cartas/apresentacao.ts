import type { CatalogoItens } from "../catalogoApi";
import { ROTULO_TIPO, type CartaPersonagemResumo, type EstadoCarta } from "../../../cards/types";
import { categoriaDoItem, normalizar } from "../../../inventory/filtro";

/**
 * Regras de apresentação da aba Cartas (redesenhar-aba-cartas, D5–D7): origem, categoria, pílula,
 * filtros, busca e ordem. Funções puras; a folha só as liga à tela.
 */

export type Carta = CartaPersonagemResumo;
export type Origem = "classe" | "raca" | "concedidas";

/**
 * O que os filtros leem de uma carta. Serve à carta do personagem e à do catálogo da mesa, que a
 * biblioteca do Narrador adapta (o `concedida_por` sai da origem no catálogo do sistema).
 */
export type CartaFiltravel = Pick<Carta, "id" | "tipo" | "concedida_por"> & { carta: { conteudo: Carta["carta"]["conteudo"] } };
export type Ordem = "nome-az" | "nome-za" | "recentes";

export interface OpcaoFiltro { id: string; rotulo: string; icone: string; total: number }

export type OpcaoDeOrigem = { id: Origem; rotulo: string; icone: string };

export const ORIGENS: readonly OpcaoDeOrigem[] = [
  { id: "classe", rotulo: "Da classe", icone: "origem_classe" },
  { id: "raca", rotulo: "Da raça", icone: "origem_raca" },
  { id: "concedidas", rotulo: "Concedidas", icone: "origem_concedida" },
];

export const ORDENS: readonly { id: Ordem; rotulo: string }[] = [
  { id: "nome-az", rotulo: "Nome (A-Z)" },
  { id: "nome-za", rotulo: "Nome (Z-A)" },
  { id: "recentes", rotulo: "Mais recentes" },
];

/** Seções da grade, na ordem do painel antigo. */
export const SECOES: readonly { id: string; estados: EstadoCarta[]; titulo: string; nota?: string }[] = [
  { id: "aprendidas", estados: ["aprendida"], titulo: "Aprendidas" },
  { id: "em-aprendizado", estados: ["em_aprendizado"], titulo: "Em aprendizado" },
  { id: "disponiveis", estados: ["disponivel"], titulo: "Disponíveis para aprender",
    nota: "Selecionar uma habilidade ou magia não a torna aprendida: o aprendizado segue as regras da mesa." },
  { id: "itens", estados: ["no_inventario"], titulo: "Itens recebidos" },
  { id: "efeitos", estados: ["aplicada"], titulo: "Efeitos de cartas" },
];

/** Categorias que não são de item, com o rótulo do filtro. */
const CATEGORIAS_DE_CARTA = {
  habilidades: { rotulo: "Habilidades", icone: "habilidades" },
  magias: { rotulo: "Magias", icone: "magias" },
  efeitos: { rotulo: "Efeitos", icone: "efeitos" },
  // Corpos do sistema: categoria própria com figura humanoide (experiencia-da-mesa, item 6).
  corpos: { rotulo: "Corpos", icone: "corpos" },
} as const;

type Conteudo = Record<string, unknown>;
const conteudoDe = (carta: CartaFiltravel): Conteudo => carta.carta.conteudo as Conteudo;
const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");

export function tituloDaCarta(carta: CartaFiltravel): string {
  return texto(conteudoDe(carta).titulo).trim() || "Sem título";
}

/** Primeira imagem própria da carta, enviada pelo Narrador (foto do item ou arte da carta). */
export function imagemPropria(conteudo: Conteudo): string | undefined {
  const caminhos = [...(Array.isArray(conteudo.ativos) ? conteudo.ativos : []),
    ...(Array.isArray(conteudo.ativos_privados) ? conteudo.ativos_privados : [])];
  return caminhos.find((item): item is string => typeof item === "string");
}

/** Nome acessível da carta: tipo, título e origem. */
export function rotuloDaCarta(carta: Carta): string {
  return `${ROTULO_TIPO[carta.tipo]}: ${tituloDaCarta(carta)}. ${rotuloDaOrigem(carta)}`;
}

/** "classe:X" e "arquetipo:X/Y" são da classe; "raca:X", da raça; o resto (Narrador, oferta, exceção) é concedido. */
export function origemDaCarta(carta: CartaFiltravel): Origem {
  const tipo = (carta.concedida_por ?? "").split(":")[0];
  if (tipo === "classe" || tipo === "arquetipo") return "classe";
  if (tipo === "raca") return "raca";
  return "concedidas";
}

/** Texto da pílula da origem, com o hífen da referência ("Classe: Especialista de Combate - automática"). */
export function rotuloDaOrigem(carta: Carta): string {
  if (carta.concedida_por) {
    const [tipo = "", nome = ""] = carta.concedida_por.split(":");
    const prefixo: Record<string, string> = { classe: "Classe", arquetipo: "Arquétipo", raca: "Raça" };
    return `${prefixo[tipo] ?? tipo}: ${nome.split("/").pop()} - automática`;
  }
  if (carta.excecao_aprendizado) return "Concedida como aprendida (exceção)";
  return carta.origem === "oferta" ? "Escolhida em oferta" : "Concedida pelo Narrador";
}

/**
 * Corpo do sistema (Corpo Minúsculo… Grande, inteiro ou "com ajuda"): item com as etiquetas "corpo" e
 * "padrão" juntas, gravadas por `cursed_platform/corpos.py`. O dado continua sendo item Outros (D7 de
 * carga-por-espacos); só a apresentação o separa dos demais itens (experiencia-da-mesa, item 6).
 */
export function ehCorpo(tipo: string, conteudo: Conteudo): boolean {
  if (tipo !== "item" || !Array.isArray(conteudo.tags)) return false;
  return conteudo.tags.includes("corpo") && conteudo.tags.includes("padrão");
}

/** Categoria do filtro de tipo: habilidades, magias, efeitos, corpos ou a categoria do item no catálogo. */
export function categoriaDaCarta(carta: CartaFiltravel, catalogo: CatalogoItens | undefined): string {
  if (carta.tipo === "habilidade") return "habilidades";
  if (carta.tipo === "magia") return "magias";
  if (carta.tipo === "efeito") return "efeitos";
  const conteudo = conteudoDe(carta);
  // Corpo é pessoa carregada, não fera: categoria e figura próprias, e não as de Criaturas (pedido do usuário).
  if (ehCorpo(carta.tipo, conteudo)) return "corpos";
  const formato = (conteudo.formato ?? {}) as Conteudo;
  const item = {
    id: carta.id, nome: tituloDaCarta(carta), tipo: texto(conteudo.item_tipo) || null,
    subtipo: texto(formato.subtipo) || null, categoria: texto(formato.categoria) || null,
  };
  return catalogo ? categoriaDoItem(item, catalogo) : "diversos";
}

/** Rótulo e ícone de uma categoria do filtro de tipo. */
export function rotuloDaCategoria(id: string, catalogo: CatalogoItens | undefined): { rotulo: string; icone: string } {
  if (id in CATEGORIAS_DE_CARTA) return CATEGORIAS_DE_CARTA[id as keyof typeof CATEGORIAS_DE_CARTA];
  const categoria = catalogo?.categorias.find((c) => c.id === id);
  return { rotulo: categoria?.rotulo ?? "Outros itens", icone: categoria?.icone ?? "diversos" };
}

export function atendeBusca(carta: CartaFiltravel, busca: string): boolean {
  const termo = normalizar(busca);
  if (!termo) return true;
  const conteudo = conteudoDe(carta);
  const tags = Array.isArray(conteudo.tags) ? conteudo.tags.filter((t): t is string => typeof t === "string") : [];
  return [tituloDaCarta(carta), texto(conteudo.texto), ...tags].some((campo) => normalizar(campo).includes(termo));
}

export interface Filtros { origem: Origem | null; tipo: string | null; busca: string }
export const SEM_FILTROS: Filtros = { origem: null, tipo: null, busca: "" };

export function filtrarCartas<T extends CartaFiltravel>(cartas: readonly T[], filtros: Filtros, catalogo: CatalogoItens | undefined): T[] {
  return cartas.filter((carta) =>
    (!filtros.origem || origemDaCarta(carta) === filtros.origem)
    && (!filtros.tipo || categoriaDaCarta(carta, catalogo) === filtros.tipo)
    && atendeBusca(carta, filtros.busca));
}

/** As três origens sempre aparecem, com a contagem sobre a busca atual (zero quando for o caso). */
export function opcoesDeOrigem(
  cartas: readonly CartaFiltravel[], busca: string, origens: readonly OpcaoDeOrigem[] = ORIGENS,
): OpcaoFiltro[] {
  const buscadas = cartas.filter((carta) => atendeBusca(carta, busca));
  return origens.map((o) => ({ ...o, total: buscadas.filter((carta) => origemDaCarta(carta) === o.id).length }));
}

/**
 * Tipos com cartas depois da origem e da busca, na ordem: habilidades, magias, categorias de item do
 * catálogo e efeitos. O tipo ativo continua na lista com zero, para explicar a grade vazia.
 */
export function opcoesDeTipo(
  cartas: readonly CartaFiltravel[], catalogo: CatalogoItens | undefined, filtros: Filtros,
): OpcaoFiltro[] {
  const base = filtrarCartas(cartas, { ...filtros, tipo: null }, catalogo);
  const contagem = new Map<string, number>();
  for (const carta of base) {
    const id = categoriaDaCarta(carta, catalogo);
    contagem.set(id, (contagem.get(id) ?? 0) + 1);
  }
  const ordem = ["habilidades", "magias", ...(catalogo?.categorias.map((c) => c.id) ?? []), "efeitos"];
  for (const id of contagem.keys()) if (!ordem.includes(id)) ordem.splice(ordem.length - 1, 0, id);
  return ordem
    .filter((id) => (contagem.get(id) ?? 0) > 0 || id === filtros.tipo)
    .map((id) => ({ id, ...rotuloDaCategoria(id, catalogo), total: contagem.get(id) ?? 0 }));
}

const COMPARAR_NOMES = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export function ordenarCartas(cartas: readonly Carta[], ordem: Ordem): Carta[] {
  const lista = [...cartas];
  if (ordem === "recentes") {
    return lista.sort((a, b) => b.adquirida_em.localeCompare(a.adquirida_em) || a.id.localeCompare(b.id));
  }
  const sinal = ordem === "nome-az" ? 1 : -1;
  return lista.sort((a, b) => sinal * COMPARAR_NOMES.compare(tituloDaCarta(a), tituloDaCarta(b)) || a.id.localeCompare(b.id));
}
