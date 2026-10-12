import type { CatalogoItens } from "../characters/sheet/catalogoApi";

/** O mínimo de um item para classificar e buscar (inventário da ficha, chão ou baú). */
export interface ItemClassificavel {
  id: string;
  nome: string;
  tipo?: string | null;
  subtipo?: string | null;
  categoria?: string | null;
}

/**
 * Categoria efetiva do item (reformular-visual-da-ficha, D6). O servidor já manda a categoria resolvida;
 * sem ela (dado antigo), vale a do subtipo, depois a do tipo e, por fim, a padrão de Outros.
 */
export function categoriaDoItem(item: ItemClassificavel, catalogo: CatalogoItens): string {
  const escolhas = catalogo.categorias.filter((c) => c.escolha_em_outros).map((c) => c.id);
  const doSubtipo = (subtipo: string) => catalogo.categorias.find((c) => (c.subtipos ?? []).includes(subtipo))?.id;
  const derivada = item.subtipo ? doSubtipo(item.subtipo)
    : item.tipo === "arma" ? doSubtipo("uma_mao")
      : item.tipo === "armadura" ? doSubtipo("peitoral")
        : undefined;
  if (derivada) return derivada;
  if (item.categoria && (escolhas.includes(item.categoria) || catalogo.categorias.some((c) => c.id === item.categoria))) {
    return item.categoria;
  }
  return catalogo.categorias.find((c) => c.padrao_outros)?.id ?? "diversos";
}

/** Quantos itens há em cada categoria, na ordem do catálogo; categorias vazias aparecem com zero. */
export function contarPorCategoria(itens: readonly ItemClassificavel[], catalogo: CatalogoItens): Array<{ id: string; rotulo: string; icone: string; total: number }> {
  const contagem = new Map<string, number>();
  for (const item of itens) {
    const categoria = categoriaDoItem(item, catalogo);
    contagem.set(categoria, (contagem.get(categoria) ?? 0) + 1);
  }
  return catalogo.categorias.map((c) => ({ id: c.id, rotulo: c.rotulo, icone: c.icone, total: contagem.get(c.id) ?? 0 }));
}

/** Texto comparável: sem acento, minúsculas e espaços simples. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Ids dos itens que correspondem à categoria e à busca; `null` quando não há filtro (nada é esmaecido).
 * A grade destaca estes itens e esmaece o resto, sem esconder nem mover (inventario-em-grade).
 */
export function itensEmDestaque(
  itens: readonly ItemClassificavel[], catalogo: CatalogoItens | undefined, categoria: string | null, busca: string,
): Set<string> | null {
  const termo = normalizar(busca);
  if (!categoria && !termo) return null;
  return new Set(itens
    .filter((item) => !categoria || !catalogo || categoriaDoItem(item, catalogo) === categoria)
    .filter((item) => !termo || normalizar(item.nome).includes(termo))
    .map((item) => item.id));
}
