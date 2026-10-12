import { useState } from "react";

import { Glyph, Portrait } from "../../ui/Display";
import { Confirmation, Menu, type MenuItem } from "../../ui/primitives";
import { CreateEntityDialog, type NovaEntidade } from "./CreateEntityDialog";
import { VisibilityDialog } from "./VisibilityDialog";
import {
  useAlterarVisibilidade,
  useCriarEntidade,
  useExcluirPersonagem,
  usePersonagens,
  usePoliticaMesa,
  useParticipantes,
  useRestaurarPersonagem,
  useTransferirPersonagem,
} from "./api";
import type { ApiClient, ParticipanteResumo, PersonagemResumo } from "./types";
import { armazenamentoLocal, lerRascunho } from "./creation/rascunho";

export interface CharacterListProps {
  api: ApiClient;
  mesaId: string;
  userId: string;
  role: "narrador" | "jogador";
  onOpen: (personagemId: string) => void;
  /** Jogador: abre o assistente de criação; `retomar` continua o rascunho guardado no navegador. */
  onCriarPersonagem?: (opcoes: { retomar: boolean }) => void;
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
      label: `${participante.nome ?? participante.usuario_id} (${participante.papel === "narrador" ? "Narrador" : "jogador"})${participante.usuario_id === personagem.proprietario_id ? " · atual" : ""}`,
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

export function CharacterList({ api, mesaId, userId, role, onOpen, onCriarPersonagem }: CharacterListProps) {
  const [tab, setTab] = useState<"ativos" | "lixeira">("ativos");
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PersonagemResumo | null>(null);
  const [visibilityTarget, setVisibilityTarget] = useState<PersonagemResumo | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const personagens = usePersonagens(api, mesaId, tab === "lixeira");
  const politica = usePoliticaMesa(api, mesaId);
  const participantes = useParticipantes(api, mesaId, { enabled: role === "narrador" });

  const criarEntidade = useCriarEntidade(api, mesaId);
  const excluir = useExcluirPersonagem(api, mesaId);
  const transferir = useTransferirPersonagem(api, mesaId);
  const restaurar = useRestaurarPersonagem(api, mesaId);
  const alterarVisibilidade = useAlterarVisibilidade(api, mesaId);

  function setError(id: string, message: string | null) {
    setRowError((prev) => {
      const next = { ...prev };
      if (message) next[id] = message; else delete next[id];
      return next;
    });
  }

  function handleCreateEntity(entidade: NovaEntidade) {
    criarEntidade.mutate(entidade, {
      onSuccess: (data) => {
        setCreateOpen(false);
        criarEntidade.reset();
        if (data) onOpen(data.id);
      },
    });
  }

  function handleVisibilitySubmit(
    visibilidade: "mesa" | "narrador",
    revelacao: { nome_publico: string | null; imagem: boolean },
  ) {
    if (!visibilityTarget) return;
    alterarVisibilidade.mutate(
      { personagemId: visibilityTarget.id, visibilidade, revelacao, versaoEsperada: visibilityTarget.versao },
      {
        onSuccess: () => {
          setVisibilityTarget(null);
          alterarVisibilidade.reset();
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
  const rascunho = role === "jogador" ? lerRascunho(armazenamentoLocal(), mesaId, userId) : null;
  const podeExcluirProprio = role === "narrador" || politica.data?.permitir_exclusao_propria === true;

  return (
    <section className="panel panel--wide" aria-label={role === "narrador" ? "Personagens da mesa" : "Suas fichas"}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">{role === "narrador" ? "PERSONAGENS" : "MINHA FICHA"}</span>
          <h2>{role === "narrador" ? "Personagens e entidades" : "Suas fichas"}</h2>
        </div>
        {podeCriar && role === "narrador" && (
          <button type="button" className="button button--primary" onClick={() => setCreateOpen(true)}>
            <Glyph name="spark" size={16} /> Nova entidade
          </button>
        )}
        {podeCriar && role === "jogador" && (
          <div className="section-heading__actions">
            {rascunho && (
              <button type="button" className="button button--secondary" onClick={() => onCriarPersonagem?.({ retomar: true })}>
                Continuar rascunho{rascunho.ficha.personagem.nome.trim() ? ` (${rascunho.ficha.personagem.nome.trim()})` : ""}
              </button>
            )}
            <button type="button" className="button button--primary" onClick={() => onCriarPersonagem?.({ retomar: false })}>
              <Glyph name="spark" size={16} /> Criar personagem
            </button>
          </div>
        )}
        {!podeCriar && (
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
                    {tab === "lixeira" && prazo ? ` · Recuperável até ${prazo}` : ""}
                  </small>
                </span>
                {role === "narrador" && personagem.tipo !== "personagem" && (
                  <span className="tag">{tipoLabel[personagem.tipo]}</span>
                )}
                {role === "narrador" && personagem.visibilidade === "narrador" && (
                  <span className="tag tag--accent">Oculto</span>
                )}
                <div className="character-tile__actions">
                  {tab === "ativos" && (
                    <button type="button" className="button button--secondary" onClick={() => onOpen(personagem.id)}>
                      Abrir
                    </button>
                  )}
                  {tab === "ativos" && role === "narrador" && (
                    <button type="button" className="button button--ghost" onClick={() => setVisibilityTarget(personagem)}>
                      Visibilidade
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

      {role === "narrador" && (
        <CreateEntityDialog
          open={createOpen}
          onClose={() => { setCreateOpen(false); criarEntidade.reset(); }}
          onCreate={handleCreateEntity}
          pending={criarEntidade.isPending}
          error={criarEntidade.isError ? criarEntidade.error.message : null}
          participantes={participantes.data ?? []}
        />
      )}

      {visibilityTarget && (
        <VisibilityDialog
          personagem={visibilityTarget}
          onClose={() => { setVisibilityTarget(null); alterarVisibilidade.reset(); }}
          onSubmit={handleVisibilitySubmit}
          pending={alterarVisibilidade.isPending}
          error={alterarVisibilidade.isError ? alterarVisibilidade.error.message : null}
        />
      )}

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
