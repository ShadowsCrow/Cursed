import { useRef, useState } from "react";

import { Glyph, Portrait } from "../../ui/Display";
import { Confirmation, Dialog, Menu, type MenuItem } from "../../ui/primitives";
import {
  useCriarPersonagem,
  useExcluirPersonagem,
  usePersonagens,
  usePoliticaMesa,
  useParticipantes,
  useRestaurarPersonagem,
  useTransferirPersonagem,
} from "./api";
import type { ApiClient, ParticipanteResumo, PersonagemResumo } from "./types";

export interface CharacterListProps {
  api: ApiClient;
  mesaId: string;
  userId: string;
  role: "narrador" | "jogador";
  onOpen: (personagemId: string) => void;
}

const tipoLabel: Record<PersonagemResumo["tipo"], string> = {
  personagem: "Personagem",
  npc: "NPC",
  monstro: "Monstro",
};

function formatarPrazo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function CreateCharacterDialog({
  open,
  onClose,
  onCreate,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (nome: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [nome, setNome] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Criar personagem"
      description="Escolha um nome para começar. Os demais campos podem ser preenchidos depois, na ficha."
      initialFocusRef={inputRef}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (nome.trim()) onCreate(nome.trim());
        }}
      >
        <label htmlFor="novo-personagem-nome">Nome</label>
        <input
          id="novo-personagem-nome"
          ref={inputRef}
          required
          value={nome}
          onChange={(event) => setNome(event.target.value)}
        />
        {error && <p role="alert">{error}</p>}
        <div className="confirmation__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button button--primary" disabled={pending}>
            {pending ? "Criando…" : "Criar personagem"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function TransferMenu({
  personagem,
  participantes,
  onTransfer,
}: {
  personagem: PersonagemResumo;
  participantes: ParticipanteResumo[];
  onTransfer: (proprietarioId: string | null) => void;
}) {
  const items: MenuItem[] = [
    ...participantes.map((participante) => ({
      id: participante.usuario_id,
      label: `${participante.papel === "narrador" ? "Narrador" : "Jogador"} · ${participante.usuario_id}${participante.usuario_id === personagem.proprietario_id ? " (atual)" : ""}`,
      onSelect: () => onTransfer(participante.usuario_id),
      disabled: participante.usuario_id === personagem.proprietario_id,
    })),
    {
      id: "__narrador__",
      label: `Controle exclusivo do Narrador${personagem.proprietario_id === null ? " (atual)" : ""}`,
      onSelect: () => onTransfer(null),
      disabled: personagem.proprietario_id === null,
    },
  ];
  return <Menu label={`Transferir ${personagem.nome}`} triggerContent="Transferir" triggerClassName="button button--ghost" items={items} />;
}

export function CharacterList({ api, mesaId, userId, role, onOpen }: CharacterListProps) {
  const [tab, setTab] = useState<"ativos" | "lixeira">("ativos");
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PersonagemResumo | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const personagens = usePersonagens(api, mesaId, tab === "lixeira");
  const politica = usePoliticaMesa(api, mesaId);
  const participantes = useParticipantes(api, mesaId, { enabled: role === "narrador" });

  const criar = useCriarPersonagem(api, mesaId);
  const excluir = useExcluirPersonagem(api, mesaId);
  const transferir = useTransferirPersonagem(api, mesaId);
  const restaurar = useRestaurarPersonagem(api, mesaId);

  function setError(id: string, message: string | null) {
    setRowError((prev) => {
      const next = { ...prev };
      if (message) next[id] = message; else delete next[id];
      return next;
    });
  }

  function handleCreate(nome: string) {
    criar.mutate(
      { nome },
      {
        onSuccess: (data) => {
          setCreateOpen(false);
          criar.reset();
          if (data) onOpen(data.personagem_id);
        },
      },
    );
  }

  function handleDeleteConfirm() {
    if (!pendingDelete) return;
    excluir.mutate(
      { personagemId: pendingDelete.id, versaoEsperada: pendingDelete.versao },
      {
        onSuccess: () => setPendingDelete(null),
        onError: (error) => setError(pendingDelete.id, error instanceof Error ? error.message : "Não foi possível excluir."),
      },
    );
  }

  function handleTransfer(personagem: PersonagemResumo, proprietarioId: string | null) {
    setError(personagem.id, null);
    transferir.mutate(
      { personagemId: personagem.id, proprietarioId, versaoEsperada: personagem.versao },
      { onError: (error) => setError(personagem.id, error instanceof Error ? error.message : "Não foi possível transferir.") },
    );
  }

  function handleRestore(personagem: PersonagemResumo) {
    setError(personagem.id, null);
    restaurar.mutate(
      { personagemId: personagem.id, versaoEsperada: personagem.versao },
      { onError: (error) => setError(personagem.id, error instanceof Error ? error.message : "Não foi possível restaurar.") },
    );
  }

  const podeCriar = role === "narrador" || politica.data?.permitir_criacao_propria === true;
  const podeExcluirProprio = role === "narrador" || politica.data?.permitir_exclusao_propria === true;

  return (
    <section className="panel panel--wide" aria-label={role === "narrador" ? "Personagens da mesa" : "Suas fichas"}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">{role === "narrador" ? "PERSONAGENS" : "MINHA FICHA"}</span>
          <h2>{role === "narrador" ? "O elenco da mesa" : "Suas fichas"}</h2>
        </div>
        {podeCriar ? (
          <button type="button" className="button button--primary" onClick={() => setCreateOpen(true)}>
            <Glyph name="spark" size={16} /> Criar personagem
          </button>
        ) : (
          politica.isSuccess && <p className="preview-note">Criação de personagem não permitida nesta mesa.</p>
        )}
      </div>

      {role === "narrador" && (
        <div className="sheet-tabs" role="tablist" aria-label="Personagens ou lixeira">
          <button type="button" role="tab" aria-selected={tab === "ativos"} onClick={() => setTab("ativos")}>Ativos</button>
          <button type="button" role="tab" aria-selected={tab === "lixeira"} onClick={() => setTab("lixeira")}>Lixeira</button>
        </div>
      )}

      {personagens.isPending && <p>Carregando personagens…</p>}
      {personagens.isError && <p role="alert">{personagens.error.message}</p>}
      {personagens.isSuccess && personagens.data.length === 0 && (
        <p className="preview-note">{tab === "lixeira" ? "Nenhum personagem na lixeira." : "Nenhum personagem disponível ainda."}</p>
      )}

      {personagens.isSuccess && personagens.data.length > 0 && (
        <ul className="character-list character-list-reset">
          {personagens.data.map((personagem) => {
            const prazo = formatarPrazo(personagem.restauravel_ate);
            const proprio = personagem.proprietario_id === userId;
            return (
              <li key={personagem.id} className="character-tile character-tile--static">
                <Portrait name={personagem.nome} hue={role === "narrador" ? "copper" : "violet"} />
                <span className="character-tile__text">
                  <strong>{personagem.nome}</strong>
                  <small>
                    {tipoLabel[personagem.tipo]}
                    {personagem.visibilidade === "narrador" ? " · Oculto do grupo" : ""}
                    {tab === "lixeira" && prazo ? ` · Recuperável até ${prazo}` : ""}
                  </small>
                </span>
                <div className="character-tile__actions">
                  {tab === "ativos" && (
                    <button type="button" className="button button--secondary" onClick={() => onOpen(personagem.id)}>
                      Abrir
                    </button>
                  )}
                  {tab === "ativos" && role === "narrador" && (
                    <TransferMenu
                      personagem={personagem}
                      participantes={participantes.data ?? []}
                      onTransfer={(proprietarioId) => handleTransfer(personagem, proprietarioId)}
                    />
                  )}
                  {tab === "ativos" && (role === "narrador" || (proprio && podeExcluirProprio)) && (
                    <button type="button" className="button button--ghost" onClick={() => setPendingDelete(personagem)}>
                      Excluir
                    </button>
                  )}
                  {tab === "lixeira" && role === "narrador" && (
                    <button type="button" className="button button--primary" onClick={() => handleRestore(personagem)}>
                      Restaurar
                    </button>
                  )}
                </div>
                {rowError[personagem.id] && <p role="alert">{rowError[personagem.id]}</p>}
              </li>
            );
          })}
        </ul>
      )}

      <CreateCharacterDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); criar.reset(); }}
        onCreate={handleCreate}
        pending={criar.isPending}
        error={criar.isError ? criar.error.message : null}
      />

      <Confirmation
        open={pendingDelete !== null}
        title={`Excluir ${pendingDelete?.nome ?? "personagem"}?`}
        description="A ficha fica recuperável por um período de retenção antes de ser removida definitivamente."
        tone="danger"
        confirmLabel="Excluir"
        pending={excluir.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
