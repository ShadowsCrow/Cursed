import { Portrait, ResourceBar } from "../../../ui/Display";
import { personagemInfo, recurso } from "./fichaAccess";
import type { FichaContrato } from "../types";

function ResourceStatus({ label, kind, ficha, chave }: { label: string; kind: "life" | "power"; ficha: FichaContrato; chave: string }) {
  const valor = recurso(ficha, chave);
  if (!valor) {
    return (
      <div className="resource resource--unregistered">
        <div className="resource__head"><span>{label}</span></div>
        <p className="preview-note">Não registrado</p>
      </div>
    );
  }
  return <ResourceBar label={label} current={valor.atual} max={valor.maximo} kind={kind} />;
}

export function SheetHeader({ ficha }: { ficha: FichaContrato }) {
  const info = personagemInfo(ficha);
  const eyebrow = [info.classe, info.raca].filter(Boolean).join(" · ");
  return (
    <section className="character-hero">
      <div className="character-hero__portrait">
        <Portrait name={info.nome} imageUrl={info.imagemUrl} hue="violet" size="large" />
      </div>
      <div className="character-hero__identity">
        <span className="eyebrow">{eyebrow || "Identidade não preenchida"}</span>
        <h1>{info.nome}</h1>
        <div className="tag-row">
          {info.arquetipo && <span className="tag">{info.arquetipo}</span>}
          {info.idade !== undefined && <span className="tag">{info.idade} anos</span>}
        </div>
      </div>
      <div className="character-hero__resources">
        <ResourceStatus label="Pontos de Vida" kind="life" ficha={ficha} chave="pv" />
        <ResourceStatus label="Pontos de Poder" kind="power" ficha={ficha} chave="pp" />
      </div>
    </section>
  );
}
