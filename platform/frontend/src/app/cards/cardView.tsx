import { ContentCard } from "../../ui/Display";
import { useAssetImage } from "../assets/useAssetImage";
import type { ApiClient } from "../characters/types";
import { custosDaCarta, EMBLEMA, metaDaCarta, texto } from "./cardFormat";
import { ROTULO_TIPO, type TipoCarta } from "./types";

type Conteudo = Record<string, unknown>;

function ArteDaCarta({ api, mesaId, caminho, titulo }: { api: ApiClient; mesaId: string; caminho: string; titulo: string }) {
  const imagem = useAssetImage(api, mesaId, caminho);
  if (imagem.isError) return <p role="note">Arte indisponível.</p>;
  return imagem.data ? <img className="card-face__art" src={imagem.data} alt={`Arte de ${titulo}`} /> : null;
}

export function CardFace({ tipo, conteudo, numero, api, mesaId }: {
  tipo: TipoCarta; conteudo: Conteudo; numero?: number; api?: ApiClient; mesaId?: string;
}) {
  const legado = texto(conteudo.custo_legado);
  const caminhos = [...(Array.isArray(conteudo.ativos) ? conteudo.ativos : []),
    ...(Array.isArray(conteudo.ativos_privados) ? conteudo.ativos_privados : [])];
  const arte = caminhos.find((item): item is string => typeof item === "string");
  const titulo = texto(conteudo.titulo, "Sem título");
  return (
    <div className="card-face">
      {arte && api && mesaId && <ArteDaCarta api={api} mesaId={mesaId} caminho={arte} titulo={titulo} />}
      <ContentCard
        kind={ROTULO_TIPO[tipo].toUpperCase()}
        title={titulo}
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
