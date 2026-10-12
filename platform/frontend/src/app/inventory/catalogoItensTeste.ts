import itens from "../../../../../cursed_platform/catalogos/itens.json";
import type { CatalogoItens } from "../characters/sheet/catalogoApi";

type CampoBruto = { rotulo: string; tipo: string; icone: string; lista?: string; exemplo?: string; unidade?: string };

/** O catálogo real de itens, no formato da API, para os testes (sem copiar as listas para o código). */
export const CATALOGO_ITENS: CatalogoItens = {
  raridades: itens.raridades,
  categorias: itens.categorias.map((c) => ({
    subtipos: [], escolha_em_outros: false, padrao_outros: false, ...c,
  })),
  listas: itens.listas,
  campos: Object.entries(itens.campos as Record<string, CampoBruto>).map(([id, campo]) => ({
    id, lista: null, exemplo: null, unidade: null, ...campo,
  })) as CatalogoItens["campos"],
  campos_por_subtipo: Object.fromEntries(Object.entries(itens.campos_por_subtipo).map(([subtipo, campos]) => [
    subtipo, (campos as (string | { campo: string; sugestoes: string })[]).map((c) => (typeof c === "string" ? { campo: c, sugestoes: null } : c)),
  ])),
};
