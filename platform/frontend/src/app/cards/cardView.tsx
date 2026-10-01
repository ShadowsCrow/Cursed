import { useCatalogoItens, type CatalogoItens } from "../characters/sheet/catalogoApi";
import { CartaVisual } from "../characters/sheet/cartas/CartaDaFicha";
import type { ApiClient } from "../characters/types";
import { categoriaDoConteudo, texto } from "./cardFormat";
import type { TipoCarta } from "./types";

type Conteudo = Record<string, unknown>;

function CartaDoCatalogo(props: CardFaceProps & { catalogo: CatalogoItens | undefined }) {
  const { tipo, conteudo, numero, api, mesaId, narrador = false, catalogo, rodape, selo, onAbrir, rotulo } = props;
  return (
    <CartaVisual
      tipo={tipo} conteudo={conteudo} titulo={texto(conteudo.titulo, "Sem título")}
      categoria={categoriaDoConteudo(tipo, conteudo, catalogo)} catalogo={catalogo} narrador={narrador}
      rodape={rodape ?? (numero !== undefined ? `Versão ${numero}` : "Sem versão publicada")} selo={selo} api={api} mesaId={mesaId}
      onAbrir={onAbrir} rotulo={rotulo}
    />
  );
}

function CartaComCatalogo(props: CardFaceProps) {
  const catalogo = useCatalogoItens(props.api, props.mesaId).data;
  return <CartaDoCatalogo {...props} catalogo={catalogo} />;
}

interface CardFaceProps {
  tipo: TipoCarta; conteudo: Conteudo; numero?: number; api?: ApiClient; mesaId?: string; narrador?: boolean;
  /** Aviso no canto da carta (ex.: "Rascunho"). */
  selo?: string;
  /** Texto da pílula do pé; sem ele, o número da versão. */
  rodape?: string;
  /** Com ele, a carta é o botão que abre o detalhe, como na ficha. */
  onAbrir?: () => void;
  rotulo?: string;
}

/**
 * Carta da biblioteca, do editor e das ofertas: o mesmo desenho da aba Cartas da ficha. `narrador` mostra os custos
 * reservados a ele (Custo de aprendizado, Descansos mínimos) e o legado.
 */
export function CardFace(props: CardFaceProps) {
  const legado = props.narrador ? texto(props.conteudo.custo_legado) : "";
  return (
    <div className="card-face">
      {props.api && props.mesaId ? <CartaComCatalogo {...props} /> : <CartaDoCatalogo {...props} catalogo={undefined} />}
      {legado && <p className="card-face__legacy">Custo legado (apenas histórico): {legado}</p>}
    </div>
  );
}
