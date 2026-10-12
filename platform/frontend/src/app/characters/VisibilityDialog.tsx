import { useRef, useState } from "react";

import { Portrait } from "../../ui/Display";
import { Dialog } from "../../ui/primitives";
import type { PersonagemResumo } from "./types";

export interface VisibilityDialogProps {
  personagem: PersonagemResumo;
  onClose: () => void;
  onSubmit: (visibilidade: "mesa" | "narrador", revelacao: { nome_publico: string | null; imagem: boolean }) => void;
  pending: boolean;
  error: string | null;
}

/**
 * Controle de visibilidade granular do Narrador (8.2): visível para a mesa ou
 * oculta, com revelação parcial (nome público e retrato) independente uma da
 * outra. A pré-visualização usa exatamente os mesmos campos que o servidor
 * aplica em `entidade_publica` — nome público substitui o nome real só quando
 * preenchido, e quando a entidade está oculta sem nome público nem retrato
 * revelados, nada é mostrado ao grupo.
 */
export function VisibilityDialog({ personagem, onClose, onSubmit, pending, error }: VisibilityDialogProps) {
  const [visibilidade, setVisibilidade] = useState<"mesa" | "narrador">(personagem.visibilidade);
  const [nomePublico, setNomePublico] = useState(personagem.revelacao?.nome_publico ?? "");
  const [imagem, setImagem] = useState(personagem.revelacao?.imagem ?? false);
  const inputRef = useRef<HTMLInputElement>(null);

  const nomePublicoLimpo = nomePublico.trim();
  const previewNome = visibilidade === "mesa" ? (nomePublicoLimpo || personagem.nome) : (nomePublicoLimpo || null);
  const previewVisivel = previewNome !== null || imagem;

  function handleSubmit() {
    onSubmit(visibilidade, { nome_publico: nomePublicoLimpo || null, imagem });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Visibilidade de ${personagem.nome}`}
      description="Decida o que o grupo pode ver desta entidade — a ficha completa nunca é exposta por aqui."
      initialFocusRef={inputRef}
    >
      <fieldset>
        <legend>Visibilidade</legend>
        <label>
          <input
            type="radio"
            name={`visibilidade-${personagem.id}`}
            checked={visibilidade === "mesa"}
            onChange={() => setVisibilidade("mesa")}
          /> Visível para a mesa
        </label>
        <label>
          <input
            type="radio"
            name={`visibilidade-${personagem.id}`}
            checked={visibilidade === "narrador"}
            onChange={() => setVisibilidade("narrador")}
          /> Oculta
        </label>
      </fieldset>

      <label htmlFor={`nome-publico-${personagem.id}`}>Nome público</label>
      <input
        id={`nome-publico-${personagem.id}`}
        ref={inputRef}
        value={nomePublico}
        placeholder={visibilidade === "mesa" ? personagem.nome : "Não revelado"}
        onChange={(event) => setNomePublico(event.target.value)}
      />

      <label>
        <input type="checkbox" checked={imagem} onChange={(event) => setImagem(event.target.checked)} /> Mostrar retrato
      </label>

      <div className="visibility-preview">
        <span className="eyebrow">COMO OS JOGADORES VEEM</span>
        {previewVisivel ? (
          <div className="visibility-preview__card">
            <Portrait name={previewNome ?? "Figura desconhecida"} hue="teal" />
            <span>{previewNome ?? "Figura desconhecida"}</span>
          </div>
        ) : (
          <p className="preview-note">Nada será revelado ao grupo com estes campos.</p>
        )}
      </div>

      {error && <p role="alert">{error}</p>}
      <div className="confirmation__actions">
        <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
        <button type="button" className="button button--primary" onClick={handleSubmit} disabled={pending}>
          {pending ? "Salvando…" : "Salvar visibilidade"}
        </button>
      </div>
    </Dialog>
  );
}
