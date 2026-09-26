import { ContentCard } from "../../ui/Display";
import { custosDaCarta, EMBLEMA, metaDaCarta, texto } from "./cardFormat";
import { ROTULO_TIPO, type TipoCarta } from "./types";

type Conteudo = Record<string, unknown>;

export function CardFace({ tipo, conteudo, numero }: { tipo: TipoCarta; conteudo: Conteudo; numero?: number }) {
  const legado = texto(conteudo.custo_legado);
  return (
    <div className="card-face">
      <ContentCard
        kind={ROTULO_TIPO[tipo].toUpperCase()}
        title={texto(conteudo.titulo, "Sem título")}
        description={texto(conteudo.texto, "Sem texto.")}
        meta={metaDaCarta(tipo, conteudo, numero)}
        emblem={EMBLEMA[tipo]}
        type={tipo}
        costs={custosDaCarta(tipo, conteudo)}
      />
      {legado && <p className="card-face__legacy">Custo legado (apenas histórico): {legado}</p>}
    </div>
  );
}
