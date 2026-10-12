import { useRef, useState } from "react";

import { Dialog } from "../../ui/primitives";
import type { ParticipanteResumo } from "./types";

const tipoOptions: { value: "personagem" | "npc" | "monstro"; label: string }[] = [
  { value: "personagem", label: "Personagem" },
  { value: "npc", label: "NPC" },
  { value: "monstro", label: "Monstro" },
];

export interface NovaEntidade {
  nome: string;
  tipo: "personagem" | "npc" | "monstro";
  visibilidade: "mesa" | "narrador";
  proprietarioId: string | null;
}

export interface CreateEntityDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (entidade: NovaEntidade) => void;
  pending: boolean;
  error: string | null;
  participantes: ParticipanteResumo[];
}

/**
 * Criação de entidade pelo Narrador (8.1): personagem, NPC ou monstro,
 * oculto por padrão. Só o Narrador vê esta ação — o jogador continua com o
 * diálogo simples de criação da própria ficha.
 */
export function CreateEntityDialog({ open, onClose, onCreate, pending, error, participantes }: CreateEntityDialogProps) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"personagem" | "npc" | "monstro">("personagem");
  const [visibilidade, setVisibilidade] = useState<"mesa" | "narrador">("narrador");
  const [proprietarioId, setProprietarioId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setNome("");
    setTipo("personagem");
    setVisibilidade("narrador");
    setProprietarioId("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Nova entidade"
      description="Personagens, NPCs e monstros começam ocultos do grupo até você revelá-los."
      initialFocusRef={inputRef}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!nome.trim()) return;
          onCreate({ nome: nome.trim(), tipo, visibilidade, proprietarioId: proprietarioId || null });
        }}
      >
        <label htmlFor="nova-entidade-nome">Nome</label>
        <input id="nova-entidade-nome" ref={inputRef} required value={nome} onChange={(event) => setNome(event.target.value)} />

        <label htmlFor="nova-entidade-tipo">Tipo</label>
        <select id="nova-entidade-tipo" value={tipo} onChange={(event) => setTipo(event.target.value as typeof tipo)}>
          {tipoOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <fieldset>
          <legend>Visibilidade inicial</legend>
          <label>
            <input
              type="radio"
              name="nova-entidade-visibilidade"
              checked={visibilidade === "narrador"}
              onChange={() => setVisibilidade("narrador")}
            /> Oculta (só o Narrador vê)
          </label>
          <label>
            <input
              type="radio"
              name="nova-entidade-visibilidade"
              checked={visibilidade === "mesa"}
              onChange={() => setVisibilidade("mesa")}
            /> Visível para a mesa
          </label>
        </fieldset>

        <label htmlFor="nova-entidade-proprietario">Proprietário (opcional)</label>
        <select id="nova-entidade-proprietario" value={proprietarioId} onChange={(event) => setProprietarioId(event.target.value)}>
          <option value="">Controle exclusivo do Narrador</option>
          {participantes.map((participante) => (
            <option key={participante.usuario_id} value={participante.usuario_id}>
              {participante.papel === "narrador" ? "Narrador" : "Jogador"} · {participante.usuario_id}
            </option>
          ))}
        </select>

        {error && <p role="alert">{error}</p>}
        <div className="confirmation__actions">
          <button type="button" className="button button--ghost" onClick={handleClose}>Cancelar</button>
          <button type="submit" className="button button--primary" disabled={pending}>
            {pending ? "Criando…" : "Criar entidade"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
