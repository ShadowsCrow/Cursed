import { useQueryClient } from "@tanstack/react-query";

import { ImageUpload } from "../assets/ImageUpload";
import type { ApiClient } from "../characters/types";
import { catalogoKeys, useEfeitosDefault } from "../characters/sheet/catalogoApi";
import { EffectImage } from "../characters/sheet/EffectImage";

/**
 * Ícones das condições nesta mesa: o Narrador envia, troca ou remove o ícone de cada efeito default.
 * Vale só nesta mesa; sem ícone próprio, vale o do catálogo e, por fim, a interrogação padrão.
 */
export function EffectIconsPanel({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  const efeitos = useEfeitosDefault(api, mesaId);
  const queryClient = useQueryClient();
  if (!efeitos.data?.length) return null;
  return (
    <section className="panel" aria-label="Ícones das condições">
      <div className="section-heading"><div><span className="eyebrow">NESTA MESA</span><h2>Ícones das condições</h2></div></div>
      <ul className="effect-icons-panel">
        {efeitos.data.map((efeito) => (
          <li key={efeito.associacao}>
            <span className="effect-icon effect-icon--imagem" aria-hidden="true"><EffectImage icone={efeito.icone} api={api} mesaId={mesaId} /></span>
            <strong>{efeito.nome}</strong>
            <small>{efeito.icone.origem === "mesa" ? "Ícone desta mesa" : efeito.icone.origem === "catalogo" ? "Ícone do sistema" : "Ícone padrão"}</small>
            <ImageUpload api={api} mesaId={mesaId} destino="icone-efeito" alvo={efeito.associacao} rotulo={`ícone de ${efeito.nome}`}
              temImagem={efeito.icone.origem === "mesa"}
              onConcluido={() => {
                void queryClient.invalidateQueries({ queryKey: catalogoKeys.efeitosDefault(mesaId) });
                void queryClient.invalidateQueries({ queryKey: ["efeitos"] });
              }} />
          </li>
        ))}
      </ul>
    </section>
  );
}
