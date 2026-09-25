import { Portrait } from "../../ui/Display";
import { useEntidadesPublicas } from "./api";
import { imagemDataUrl, type ApiClient } from "./types";

export interface PublicEntitiesProps {
  api: ApiClient;
  mesaId: string;
}

/**
 * Visão "Grupo": o que qualquer participante da mesa (Narrador incluído) pode
 * ver de cada entidade — nome público (ou "Figura desconhecida" quando só o
 * retrato foi revelado) e retrato, nunca a ficha (8.2). Entidades sem nenhuma
 * revelação simplesmente não aparecem aqui — o servidor já as omite.
 */
export function PublicEntities({ api, mesaId }: PublicEntitiesProps) {
  const entidades = useEntidadesPublicas(api, mesaId);

  return (
    <section className="panel panel--wide" aria-label="Grupo">
      <div className="section-heading">
        <div>
          <span className="eyebrow">GRUPO</span>
          <h2>Quem está em cena</h2>
        </div>
      </div>

      {entidades.isPending && <p>Carregando o grupo…</p>}
      {entidades.isError && <p role="alert">{entidades.error.message}</p>}
      {entidades.isSuccess && entidades.data.length === 0 && (
        <p className="preview-note">Nenhuma entidade revelada ao grupo ainda.</p>
      )}
      {entidades.isSuccess && entidades.data.length > 0 && (
        <ul className="public-entities-grid character-list-reset">
          {entidades.data.map((entidade) => {
            const nome = entidade.nome_publico ?? "Figura desconhecida";
            return (
              <li key={entidade.id} className="public-entity-card">
                <Portrait name={nome} imageUrl={imagemDataUrl(entidade.imagem)} hue="teal" />
                <span>{nome}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
