import type { CatalogoItens } from "../catalogoApi";
import { ListaCategorias } from "../InventarioFicha";
import {
  filtrarCartas, opcoesDeOrigem, opcoesDeTipo, ORIGENS, type CartaFiltravel, type Filtros, type OpcaoDeOrigem, type Origem,
} from "./apresentacao";

const UNIDADE = ["carta", "cartas"] as const;

/**
 * Barra de filtros da aba Cartas (redesenhar-aba-cartas, D5): Origem no topo e Tipo abaixo, na
 * construção da lista de categorias do Inventário. É uma barra só: ao lado da grade nas telas largas e,
 * nas estreitas, o CSS a transforma em duas fileiras roláveis acima da grade. A biblioteca da mesa usa a
 * mesma barra sobre o catálogo, com o rótulo da terceira origem próprio dela.
 */
export function FiltrosDasCartas({ cartas, catalogo, filtros, onMudar, origens = ORIGENS }: {
  cartas: readonly CartaFiltravel[]; catalogo: CatalogoItens | undefined; filtros: Filtros; onMudar: (filtros: Filtros) => void;
  origens?: readonly OpcaoDeOrigem[];
}) {
  const buscadas = filtrarCartas(cartas, { origem: null, tipo: null, busca: filtros.busca }, catalogo);
  const daOrigem = filtrarCartas(cartas, { origem: filtros.origem, tipo: null, busca: filtros.busca }, catalogo);
  return (
    <div className="cartas-filtros">
      <ListaCategorias
        variante="lista" titulo="Origem" rotuloTodos="Todas" unidade={UNIDADE} manterVazias
        categorias={opcoesDeOrigem(cartas, filtros.busca, origens)} total={buscadas.length} ativa={filtros.origem}
        onEscolher={(id) => onMudar({ ...filtros, origem: id as Origem | null })}
      />
      <ListaCategorias
        variante="lista" titulo="Tipo" rotuloTodos="Todos" unidade={UNIDADE} manterVazias
        categorias={opcoesDeTipo(cartas, catalogo, filtros)} total={daOrigem.length} ativa={filtros.tipo}
        onEscolher={(id) => onMudar({ ...filtros, tipo: id })}
      />
    </div>
  );
}
